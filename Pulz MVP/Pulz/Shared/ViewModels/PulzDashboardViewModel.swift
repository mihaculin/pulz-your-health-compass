import Foundation
import Observation
#if os(iOS) && canImport(Supabase)
import Supabase
#endif

@MainActor
@Observable
final class PulzDashboardViewModel {
    var snapshot: DashboardSnapshot
    var availableTags = ImpulseTag.allCases
    var selectedTag: ImpulseTag?
    var todayReports: [DashboardReport] = []
    var recoveryMessage = "PULZ provides wellness insights only and does not diagnose or treat medical or psychiatric conditions."
    var healthKitStatusText: String {
        healthKitManager.authorizationGranted ? "HealthKit connected" : "HealthKit not connected"
    }

    var secondaryMetricsText: String {
        let hrvText = healthKitManager.latestHRV.map { "HRV \($0.rounded()) ms" } ?? "HRV —"
        let restingText = healthKitManager.latestRestingHeartRate.map { "Resting HR \(Int($0)) BPM" } ?? "Resting HR —"
        let stepsText = healthKitManager.latestStepCount.map { "Steps \(Int($0))" } ?? "Steps —"
        return [hrvText, restingText, stepsText].joined(separator: " • ")
    }

    private let healthKitManager: HealthKitManager
    private let motionManager: MotionManager
    private let notificationManager: NotificationManager
    private let connectivity: ConnectivitySession
    private let detectionEngine = DetectionEngine()
    private let mockGenerator = MockSignalGenerator()
    private var baselineHeartRate: Double = 72
    private var latestProgressSnapshot: SupabaseProgressSnapshotRecord?
#if os(iOS) && canImport(Supabase)
    private let supabaseService: SupabaseDataService
    private var supabaseUserId: String?
    private var realtimeChannel: RealtimeChannelV2?
    private var realtimeSubscriptions: [RealtimeSubscription] = []
#endif

    init(
        snapshot: DashboardSnapshot? = nil,
        healthKitManager: HealthKitManager? = nil,
        motionManager: MotionManager? = nil,
        notificationManager: NotificationManager? = nil,
        connectivity: ConnectivitySession? = nil
    ) {
        let resolvedSnapshot = snapshot ?? DashboardSnapshot.placeholder()
        self.snapshot = resolvedSnapshot
        self.selectedTag = resolvedSnapshot.selectedTag
        self.healthKitManager = healthKitManager ?? .shared
        self.motionManager = motionManager ?? .shared
        self.notificationManager = notificationManager ?? .shared
        self.connectivity = connectivity ?? .shared
#if os(iOS) && canImport(Supabase)
        self.supabaseService = .shared
#endif
    }

    func start() async {
        await notificationManager.requestAuthorization()
        await healthKitManager.requestAuthorization()
        motionManager.start()

#if os(iOS) && canImport(Supabase)
        if let supabaseUserId {
            await loadSupabaseSnapshot(userId: supabaseUserId)
            await startRealtimeSubscriptions(userId: supabaseUserId)
            return
        }
#endif
        if snapshot.trends.count <= 1 {
            snapshot = buildSnapshot(from: mockGenerator.makeHistory())
        }

        await refreshLiveState()
    }

    func refreshLiveState() async {
#if os(iOS) && canImport(Supabase)
        if let supabaseUserId {
            await loadSupabaseSnapshot(userId: supabaseUserId)
            return
        }
#endif
        await healthKitManager.refreshLatestSignals()

        var trendSamples = snapshot.trends
        let receivedSample = connectivity.receivedSample
        let nextSample: BiometricSample
        if let receivedSample,
           receivedSample.timestamp > (trendSamples.last?.timestamp ?? .distantPast) {
            baselineHeartRate = ((baselineHeartRate * 5) + receivedSample.heartRate) / 6
            nextSample = receivedSample
        } else {
            nextSample = makeLiveSample(previous: trendSamples.last)
        }
        trendSamples.append(nextSample)
        trendSamples = Array(trendSamples.suffix(48))

        let manualECG = healthKitManager.latestManualECG ?? snapshot.manualECG
        let detection = detectionEngine.evaluate(
            samples: trendSamples,
            baselineHeartRate: baselineHeartRate,
            manualECG: manualECG,
            activeTag: selectedTag
        )

        var events = snapshot.events
        var stateOverride: EmotionalState?
        if let receivedEvent = connectivity.receivedEvent, shouldInsert(event: receivedEvent, into: events) {
            events.insert(receivedEvent, at: 0)
            stateOverride = receivedEvent.state
#if os(iOS)
            await SupabaseSyncHub.shared.send(event: receivedEvent)
#endif
        } else if let event = detection.event, shouldInsert(event: event, into: events) {
            events.insert(event, at: 0)
            await notificationManager.sendImpulseAlert(for: event.state)
            if event.state == .highRisk {
                await notificationManager.sendImpulseAlert(for: event.state, followUp: true)
                connectivity.send(event: event)
            }
#if os(iOS)
            await SupabaseSyncHub.shared.send(event: event)
#endif
        }

        snapshot = DashboardSnapshot(
            state: stateOverride ?? detection.state,
            latestSample: nextSample,
            trends: trendSamples,
            events: Array(events.prefix(12)),
            insights: makeInsights(from: trendSamples, events: events, ecg: manualECG),
            weeklySummary: makeWeeklySummary(events: events),
            selectedTag: selectedTag,
            manualECG: manualECG,
            trainingStatus: nextTrainingStatus(from: events),
            processingModeText: processingModeText(for: nextSample)
        )

        connectivity.send(sample: nextSample, state: detection.state)
#if os(iOS)
        await SupabaseSyncHub.shared.send(sample: nextSample, state: detection.state)
#endif
    }

    func configure(account: AuthAccount?) async {
#if os(iOS) && canImport(Supabase)
        let nextUserId = account?.id.uuidString
        guard nextUserId != supabaseUserId else { return }
        supabaseUserId = nextUserId
        await stopRealtimeSubscriptions()
        if let nextUserId {
            await loadSupabaseSnapshot(userId: nextUserId)
            await startRealtimeSubscriptions(userId: nextUserId)
        }
#else
        _ = account
#endif
    }

    func setTag(_ tag: ImpulseTag) {
        selectedTag = tag
        snapshot = DashboardSnapshot(
            state: snapshot.state,
            latestSample: snapshot.latestSample,
            trends: snapshot.trends,
            events: snapshot.events,
            insights: snapshot.insights,
            weeklySummary: snapshot.weeklySummary,
            selectedTag: tag,
            manualECG: snapshot.manualECG,
            trainingStatus: snapshot.trainingStatus,
            processingModeText: snapshot.processingModeText
        )
    }

    func useRecoveryTool(_ tool: RecoveryTool) {
        recoveryMessage = switch tool {
        case .breathing:
            "Inhale for 4, exhale for 6, and repeat three rounds."
        case .grounding:
            "Try naming 5 things you see, 4 you feel, 3 you hear, 2 you smell, and 1 you taste."
        case .journal:
            "Write one sentence about what feels hard right now and one sentence about what you need."
        }
    }

    func labelEvent(_ event: ImpulseEvent, as label: TrainingLabel) {
        let updatedEvents = snapshot.events.map { current -> ImpulseEvent in
            guard current.id == event.id else { return current }
            var updated = current
            updated.trainingLabel = label
            return updated
        }

        snapshot = DashboardSnapshot(
            state: snapshot.state,
            latestSample: snapshot.latestSample,
            trends: snapshot.trends,
            events: updatedEvents,
            insights: makeInsights(from: snapshot.trends, events: updatedEvents, ecg: snapshot.manualECG),
            weeklySummary: makeWeeklySummary(events: updatedEvents),
            selectedTag: snapshot.selectedTag,
            manualECG: snapshot.manualECG,
            trainingStatus: nextTrainingStatus(from: updatedEvents),
            processingModeText: snapshot.processingModeText
        )
    }

#if os(iOS) && canImport(Supabase)
    private func loadSupabaseSnapshot(userId: String) async {
        async let latestSampleRecord = supabaseService.fetchLatestSensorSample(userId: userId)
        async let trendRecords = supabaseService.fetchTodaySensorSamples(userId: userId)
        async let riskRecord = supabaseService.fetchLatestRiskWindow(userId: userId)
        async let reportRecords = supabaseService.fetchTodaySelfReports(userId: userId)
        async let progressSnapshots = supabaseService.fetchProgressSnapshots(userId: userId, limit: 14)

        var trendSamples = await trendRecords.map { makeBiometricSample(from: $0) }
        if trendSamples.isEmpty, let latest = await latestSampleRecord {
            trendSamples = [makeBiometricSample(from: latest)]
        }

        let latestSample = trendSamples.last ?? snapshot.latestSample
        let riskEvent = await riskRecord.flatMap { makeRiskEvent(from: $0) }
        let riskEvents = riskEvent.map { [$0] } ?? []
        let reports = await reportRecords.map { makeDashboardReport(from: $0) }
        todayReports = reports.sorted { $0.timestamp > $1.timestamp }

        let snapshots = await progressSnapshots
        latestProgressSnapshot = snapshots.first

        snapshot = DashboardSnapshot(
            state: riskEvent?.state ?? .calm,
            latestSample: latestSample,
            trends: trendSamples,
            events: riskEvents,
            insights: makeSupabaseInsights(from: snapshots, reports: todayReports),
            weeklySummary: makeWeeklySummary(events: riskEvents),
            selectedTag: selectedTag,
            manualECG: healthKitManager.latestManualECG ?? snapshot.manualECG,
            trainingStatus: nextTrainingStatus(from: riskEvents),
            processingModeText: processingModeText(for: latestSample)
        )
    }

    private func startRealtimeSubscriptions(userId: String) async {
        guard realtimeChannel == nil else { return }
        let channel = supabaseService.channel(name: "pulz-dashboard-\(userId)")

        let sensorSubscription = channel.onPostgresChange(AnyAction.self, schema: "public", table: "sensor_samples", filter: "user_id=eq.\(userId)") { [weak self] action in
            self?.handleSensorAction(action)
        }

        let riskSubscription = channel.onPostgresChange(AnyAction.self, schema: "public", table: "risk_windows", filter: "user_id=eq.\(userId)") { [weak self] action in
            self?.handleRiskAction(action)
        }

        let reportSubscription = channel.onPostgresChange(AnyAction.self, schema: "public", table: "self_reports", filter: "user_id=eq.\(userId)") { [weak self] action in
            self?.handleReportAction(action)
        }

        realtimeSubscriptions = [sensorSubscription, riskSubscription, reportSubscription]
        await channel.subscribe()
        realtimeChannel = channel
    }

    private func stopRealtimeSubscriptions() async {
        if let realtimeChannel {
            await supabaseService.removeChannel(realtimeChannel)
        }
        realtimeChannel = nil
        realtimeSubscriptions.removeAll()
    }

    private func handleSensorAction(_ action: AnyAction) {
        let decoder = JSONDecoder()
        let record: SupabaseSensorSampleRecord?
        switch action {
        case .insert(let insertAction):
            record = try? insertAction.decodeRecord(as: SupabaseSensorSampleRecord.self, decoder: decoder)
        case .update(let updateAction):
            record = try? updateAction.decodeRecord(as: SupabaseSensorSampleRecord.self, decoder: decoder)
        case .delete:
            record = nil
        }

        guard let record else { return }
        Task { @MainActor in
            let sample = makeBiometricSample(from: record)
            var trendSamples = snapshot.trends
            trendSamples.append(sample)
            trendSamples = Array(trendSamples.suffix(48))
            snapshot = DashboardSnapshot(
                state: snapshot.state,
                latestSample: sample,
                trends: trendSamples,
                events: snapshot.events,
                insights: snapshot.insights,
                weeklySummary: snapshot.weeklySummary,
                selectedTag: snapshot.selectedTag,
                manualECG: snapshot.manualECG,
                trainingStatus: snapshot.trainingStatus,
                processingModeText: processingModeText(for: sample)
            )
        }
    }

    private func handleRiskAction(_ action: AnyAction) {
        let decoder = JSONDecoder()
        let record: SupabaseRiskWindowRecord?
        switch action {
        case .insert(let insertAction):
            record = try? insertAction.decodeRecord(as: SupabaseRiskWindowRecord.self, decoder: decoder)
        case .update(let updateAction):
            record = try? updateAction.decodeRecord(as: SupabaseRiskWindowRecord.self, decoder: decoder)
        case .delete:
            record = nil
        }

        guard let record, let event = makeRiskEvent(from: record) else { return }
        Task { @MainActor in
            snapshot = DashboardSnapshot(
                state: event.state,
                latestSample: snapshot.latestSample,
                trends: snapshot.trends,
                events: [event],
                insights: snapshot.insights,
                weeklySummary: makeWeeklySummary(events: [event]),
                selectedTag: snapshot.selectedTag,
                manualECG: snapshot.manualECG,
                trainingStatus: nextTrainingStatus(from: [event]),
                processingModeText: snapshot.processingModeText
            )
        }
    }

    private func handleReportAction(_ action: AnyAction) {
        let decoder = JSONDecoder()
        let record: SupabaseSelfReportRecord?
        switch action {
        case .insert(let insertAction):
            record = try? insertAction.decodeRecord(as: SupabaseSelfReportRecord.self, decoder: decoder)
        case .update(let updateAction):
            record = try? updateAction.decodeRecord(as: SupabaseSelfReportRecord.self, decoder: decoder)
        case .delete:
            record = nil
        }

        guard let record else { return }
        Task { @MainActor in
            let report = makeDashboardReport(from: record)
            todayReports.insert(report, at: 0)
            todayReports = Array(todayReports.prefix(20))
        }
    }

    private func makeBiometricSample(from record: SupabaseSensorSampleRecord) -> BiometricSample {
        let stressValue = record.stressScore ?? 0
        let normalizedStress = stressValue > 1 ? min(1, max(0, stressValue / 100)) : min(1, max(0, stressValue))
        let movementValue = movementScore(from: record.activityState)
        return BiometricSample(
            timestamp: SupabaseDateFormatter.date(from: record.timestamp) ?? .now,
            heartRate: record.heartRate ?? 0,
            movement: movementValue,
            wristTemperatureDelta: record.skinTemperatureDelta,
            derivedStress: normalizedStress,
            ecgIrregularityScore: 0.1,
            source: .live
        )
    }

    private func movementScore(from activityState: String?) -> Double {
        switch activityState?.lowercased() {
        case "low":
            return 0.15
        case "moderate":
            return 0.45
        case "active":
            return 0.8
        default:
            return 0.3
        }
    }

    private func makeRiskEvent(from record: SupabaseRiskWindowRecord) -> ImpulseEvent? {
        let riskScore = max(record.urgeRiskScore ?? 0, record.bingeRiskScore ?? 0)
        guard riskScore > 0 else { return nil }
        let state: EmotionalState
        switch riskScore {
        case 70...:
            state = .highRisk
        case 40..<70:
            state = .elevated
        default:
            state = .calm
        }

        let severity = max(1, min(5, Int((riskScore / 20).rounded())))
        let confidence = confidenceLevel(from: record.confidenceLevel)
        let timestamp = SupabaseDateFormatter.date(from: record.startedAt ?? "") ?? .now

        return ImpulseEvent(
            timestamp: timestamp,
            state: state,
            severity: severity,
            note: nil,
            tags: [],
            confidence: confidence,
            dominantDrivers: record.dominantDrivers ?? [],
            interventionText: record.recommendedAction ?? "Would a grounding step help right now?",
            trainingLabel: nil
        )
    }

    private func confidenceLevel(from value: String?) -> ConfidenceLevel {
        switch value?.lowercased() {
        case "high":
            return .high
        case "medium":
            return .medium
        default:
            return .low
        }
    }

    private func makeDashboardReport(from record: SupabaseSelfReportRecord) -> DashboardReport {
        let timestamp = SupabaseDateFormatter.date(from: record.timestamp) ?? .now
        return DashboardReport(
            id: record.id ?? UUID().uuidString,
            timestamp: timestamp,
            triggers: record.triggers ?? [],
            emotionalState: record.emotionalState ?? [],
            urgeLevel: record.urgeLevel ?? 0,
            note: record.notes
        )
    }

    private func makeSupabaseInsights(from snapshots: [SupabaseProgressSnapshotRecord], reports: [DashboardReport]) -> [TriggerInsight] {
        guard let latest = snapshots.first else {
            let fallbackTrigger = reports.first?.summary ?? "No data yet"
            return [
                TriggerInsight(title: "Most common trigger", detail: fallbackTrigger),
                TriggerInsight(title: "Peak window", detail: "Still learning your patterns."),
                TriggerInsight(title: "Calm streak", detail: "Collect more entries to see trends.")
            ]
        }

        let trigger = latest.mostCommonTrigger ?? "No trigger yet"
        let emotion = latest.mostCommonEmotion ?? "No emotion yet"
        let calmDays = latest.calmDays ?? 0

        return [
            TriggerInsight(title: "Most common trigger", detail: trigger),
            TriggerInsight(title: "Most common emotion", detail: emotion),
            TriggerInsight(title: "Calm streak", detail: "\(calmDays) calm day(s) in the last two weeks.")
        ]
    }
#endif

    private func makeLiveSample(previous: BiometricSample?) -> BiometricSample {
        let base = mockGenerator.nextSample(from: previous)
        let liveHeartRate = healthKitManager.latestHeartRate
        let liveTemperature = healthKitManager.wristTemperatureDelta
        let movement = motionManager.movementLevel
        let heartRate = liveHeartRate ?? base.heartRate
        baselineHeartRate = ((baselineHeartRate * 5) + heartRate) / 6
        let source: DataOrigin = liveHeartRate == nil ? .mock : (liveTemperature == nil ? .blended : .live)

        return BiometricSample(
            timestamp: .now,
            heartRate: heartRate,
            movement: movement,
            wristTemperatureDelta: liveTemperature ?? base.wristTemperatureDelta,
            derivedStress: min(1, max(0, ((heartRate - baselineHeartRate) / 26) + (1 - movement) * 0.35)),
            ecgIrregularityScore: min(1, base.ecgIrregularityScore + ((heartRate - baselineHeartRate) / 50)),
            source: source
        )
    }

    private func buildSnapshot(from trends: [BiometricSample]) -> DashboardSnapshot {
        let latest = trends.last ?? BiometricSample(
            timestamp: .now,
            heartRate: 74,
            movement: 0.2,
            wristTemperatureDelta: nil,
            derivedStress: 0.2,
            ecgIrregularityScore: 0.15,
            source: .mock
        )

        let events = demoEvents()
        let ecg = demoECGReading()

        return DashboardSnapshot(
            state: .calm,
            latestSample: latest,
            trends: trends,
            events: events,
            insights: makeInsights(from: trends, events: events, ecg: ecg),
            weeklySummary: WeeklySummary(
                stabilityScore: 79,
                alertsCount: 5,
                improvementText: "More windows are being interrupted earlier than last week.",
                encouragement: "Awareness before action is meaningful progress."
            ),
            selectedTag: selectedTag,
            manualECG: ecg,
            trainingStatus: nextTrainingStatus(from: events),
            processingModeText: "Wellness insights only. PULZ does not diagnose or treat medical or psychiatric conditions."
        )
    }

    private func makeInsights(from trends: [BiometricSample], events: [ImpulseEvent], ecg: ManualECGReading?) -> [TriggerInsight] {
        let eveningEvents = events.filter { Calendar.current.component(.hour, from: $0.timestamp) >= 18 }.count
        let lowMovementCount = trends.filter { $0.movement < 0.25 && $0.derivedStress > 0.5 }.count
        let ecgText = ecg?.classification.displayTone ?? "No manual ECG has been recorded yet."

        return [
            TriggerInsight(title: "Most vulnerable", detail: "Higher-risk windows cluster later in the day (\(eveningEvents) recent windows)."),
            TriggerInsight(title: "Body pattern", detail: "Stress rises after stillness in \(lowMovementCount) recent samples."),
            TriggerInsight(title: "Manual ECG context", detail: ecgText)
        ]
    }

    private func makeWeeklySummary(events: [ImpulseEvent]) -> WeeklySummary {
        let alerts = events.count
        let stability = max(52, 92 - alerts * 4)

        return WeeklySummary(
            stabilityScore: stability,
            alertsCount: alerts,
            improvementText: alerts < 5 ? "Fewer high-risk windows than your demo baseline." : "Patterns are still active, but your check-ins are increasing.",
            encouragement: alerts < 5 ? "Steady progress. Early support is helping." : "This is information, not judgment. One pause still matters."
        )
    }

    private func nextTrainingStatus(from events: [ImpulseEvent]) -> TrainingPeriodStatus {
        let labels = events.compactMap(\.trainingLabel).count
        return TrainingPeriodStatus(
            totalDays: 14,
            completedDays: min(14, snapshot.trainingStatus.completedDays + 1),
            labelsCollected: labels,
            targetLabels: 10
        )
    }

    private func processingModeText(for sample: BiometricSample) -> String {
        switch sample.source {
        case .live:
            return "Live heart rate, motion, and temperature are shaping your personal baseline. Wellness insights only."
        case .blended:
            return "Using live watch data where available, with fallback demo history filling the gaps."
        case .mock:
            return "Live signals are unavailable, so PULZ is running in guided demo mode."
        }
    }

    private func demoEvents() -> [ImpulseEvent] {
        [
            ImpulseEvent(
                timestamp: .now.addingTimeInterval(-1_800),
                state: .highRisk,
                severity: 3,
                note: EventNote(text: "This window followed a stressful conversation and long stillness."),
                tags: [.anxiety, .urgeToIsolate],
                confidence: .high,
                dominantDrivers: ["HR above baseline", "Stillness", "Manual ECG context"],
                interventionText: "Would a grounding step help right now?",
                trainingLabel: .confirmed
            ),
            ImpulseEvent(
                timestamp: .now.addingTimeInterval(-14_400),
                state: .elevated,
                severity: 2,
                note: EventNote(text: "The window softened after a snack and short walk."),
                tags: [.stressEating, .restlessness],
                confidence: .medium,
                dominantDrivers: ["Repeated spikes", "Low movement"],
                interventionText: "A short pause may help.",
                trainingLabel: nil
            )
        ]
    }

    private func demoECGReading() -> ManualECGReading {
        ManualECGReading(
            timestamp: .now.addingTimeInterval(-43_200),
            classification: .sinusRhythm,
            averageHeartRate: 76,
            symptomsLogged: false,
            source: .mock
        )
    }

    private func shouldInsert(event: ImpulseEvent, into events: [ImpulseEvent]) -> Bool {
        guard let latest = events.first else { return true }
        return abs(latest.timestamp.timeIntervalSince(event.timestamp)) > 900 || latest.state != event.state
    }
}

struct DashboardReport: Identifiable {
    let id: String
    let timestamp: Date
    let triggers: [String]
    let emotionalState: [String]
    let urgeLevel: Double
    let note: String?

    var timestampText: String {
        timestamp.formatted(date: .omitted, time: .shortened)
    }

    var summary: String {
        if let trigger = triggers.first {
            return trigger
        }
        if let emotion = emotionalState.first {
            return emotion
        }
        return "Journal entry"
    }
}
