import Foundation
import Observation

@MainActor
@Observable
final class PulzDashboardViewModel {
    var snapshot: DashboardSnapshot
    var availableTags = ImpulseTag.allCases
    var selectedTag: ImpulseTag?
    var recoveryMessage = "PULZ provides wellness insights only and does not diagnose or treat medical or psychiatric conditions."

    private let healthKitManager: HealthKitManager
    private let motionManager: MotionManager
    private let notificationManager: NotificationManager
    private let connectivity: ConnectivitySession
    private let detectionEngine = DetectionEngine()
    private let mockGenerator = MockSignalGenerator()
    private var baselineHeartRate: Double = 72

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
    }

    func start() async {
        await notificationManager.requestAuthorization()
        await healthKitManager.requestAuthorization()
        motionManager.start()

        if snapshot.trends.count <= 1 {
            snapshot = buildSnapshot(from: mockGenerator.makeHistory())
        }

        await refreshLiveState()
    }

    func refreshLiveState() async {
        await healthKitManager.refreshLatestSignals()

        var trendSamples = snapshot.trends
        let nextSample = makeLiveSample(previous: trendSamples.last)
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
        if let event = detection.event, shouldInsert(event: event, into: events) {
            events.insert(event, at: 0)
            await notificationManager.sendImpulseAlert(for: event.state)
            if event.state == .highRisk {
                await notificationManager.sendImpulseAlert(for: event.state, followUp: true)
                connectivity.send(event: event)
            }
        }

        snapshot = DashboardSnapshot(
            state: detection.state,
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
