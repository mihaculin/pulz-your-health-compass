import Foundation
import Observation
#if os(iOS) && canImport(Supabase)
import Supabase
#endif

@MainActor
@Observable
final class JournalViewModel {
    var entries: [JournalEntryItem] = []
    var statusMessage: String?
    var isSubmitting = false

    private var userId: String?
#if os(iOS) && canImport(Supabase)
    private let supabaseService: SupabaseDataService = .shared
    private var realtimeChannel: RealtimeChannelV2?
    private var realtimeSubscriptions: [RealtimeSubscription] = []
#endif

    func configure(account: AuthAccount?) async {
        let nextUserId = account?.id.uuidString
        guard nextUserId != userId else { return }
        userId = nextUserId
        await loadEntries()
#if os(iOS) && canImport(Supabase)
        await stopRealtimeSubscriptions()
        if let nextUserId {
            await startRealtimeSubscriptions(userId: nextUserId)
        }
#endif
    }

    func loadEntries() async {
#if os(iOS) && canImport(Supabase)
        guard let userId else { return }
        let records = await supabaseService.fetchRecentSelfReports(userId: userId, limit: 20)
        entries = records.map { JournalEntryItem(record: $0) }
#endif
    }

    func saveEntry(
        timestamp: Date,
        intensity: Double,
        triggers: [String],
        feelings: [String],
        note: String
    ) async {
#if os(iOS) && canImport(Supabase)
        guard let userId else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        let payload = SupabaseSelfReportInsert(
            timestamp: SupabaseDateFormatter.isoString(timestamp),
            urgeLevel: intensity,
            bingeOccurred: false,
            purgeOccurred: false,
            overeatingOccurred: false,
            mealSkipped: false,
            anxietyLevel: intensity,
            shameLevel: intensity,
            lonelinessLevel: intensity,
            emotionalState: feelings,
            triggers: triggers,
            notes: note
        )

        do {
            try await supabaseService.insertSelfReport(payload, userId: userId)
            statusMessage = "Saved to Supabase."
        } catch {
            statusMessage = error.localizedDescription
        }
#endif
    }

#if os(iOS) && canImport(Supabase)
    private func startRealtimeSubscriptions(userId: String) async {
        guard realtimeChannel == nil else { return }
        let channel = supabaseService.channel(name: "pulz-journal-\(userId)")
        let reportSubscription = channel.onPostgresChange(AnyAction.self, schema: "public", table: "self_reports", filter: "user_id=eq.\(userId)") { [weak self] action in
            self?.handleReportAction(action)
        }
        realtimeSubscriptions = [reportSubscription]
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
            let entry = JournalEntryItem(record: record)
            entries.removeAll { $0.id == entry.id }
            entries.insert(entry, at: 0)
            entries = Array(entries.prefix(20))
        }
    }
#endif
}

struct JournalEntryItem: Identifiable {
    let id: String
    let timestamp: Date
    let intensity: Double
    let triggers: [String]
    let feelings: [String]
    let note: String

    init(record: SupabaseSelfReportRecord) {
        self.id = record.id ?? UUID().uuidString
        self.timestamp = SupabaseDateFormatter.date(from: record.timestamp) ?? .now
        self.intensity = record.urgeLevel ?? 0
        self.triggers = record.triggers ?? []
        self.feelings = record.emotionalState ?? []
        self.note = record.notes ?? ""
    }

    var timestampText: String {
        timestamp.formatted(date: .abbreviated, time: .shortened)
    }

    var summary: String {
        if let trigger = triggers.first {
            return trigger
        }
        if let feeling = feelings.first {
            return feeling
        }
        return "Journal entry"
    }
}

@MainActor
@Observable
final class ProgressViewModel {
    var weeklyEpisodes: [ChartSample] = []
    var calmTrend: [ChartSample] = []
    var triggerStats: [TriggerSample] = []
    var totalEpisodes: Int = 0
    var commonTrigger: String = "—"
    var avgIntensity: String = "—"
    var improvementText: String = "—"

    private var userId: String?
#if os(iOS) && canImport(Supabase)
    private let supabaseService: SupabaseDataService = .shared
#endif

    func configure(account: AuthAccount?) async {
        let nextUserId = account?.id.uuidString
        guard nextUserId != userId else { return }
        userId = nextUserId
        await refresh()
    }

    func refresh() async {
#if os(iOS) && canImport(Supabase)
        guard let userId else { return }
        let now = Date()
        let last7Start = Calendar.current.date(byAdding: .day, value: -6, to: Calendar.current.startOfDay(for: now)) ?? now
        let last14Start = Calendar.current.date(byAdding: .day, value: -13, to: Calendar.current.startOfDay(for: now)) ?? now
        let last30Start = Calendar.current.date(byAdding: .day, value: -29, to: Calendar.current.startOfDay(for: now)) ?? now

        async let reportsLast7 = supabaseService.fetchSelfReports(userId: userId, since: last7Start)
        async let reportsLast14 = supabaseService.fetchSelfReports(userId: userId, since: last14Start)
        async let reportsLast30 = supabaseService.fetchSelfReports(userId: userId, since: last30Start)

        let recent7 = await reportsLast7
        let recent14 = await reportsLast14
        let recent30 = await reportsLast30

        weeklyEpisodes = buildDailyCounts(from: recent7, days: 7)
        calmTrend = buildDailyAverages(from: recent7, days: 7)
        triggerStats = buildTriggerStats(from: recent30)

        totalEpisodes = recent7.count
        if let topTrigger = triggerStats.first?.name {
            commonTrigger = topTrigger
        }

        let avg = averageUrge(from: recent7)
        avgIntensity = avg > 0 ? String(format: "%.1f", avg) : "—"
        improvementText = improvement(from: recent14)
#endif
    }

    private func buildDailyCounts(from reports: [SupabaseSelfReportRecord], days: Int) -> [ChartSample] {
        let dayBuckets = buildDayBuckets(days: days)
        var counts: [String: Double] = dayBuckets.reduce(into: [:]) { $0[$1.label] = 0 }
        for report in reports {
            let dayKey = dayLabel(for: report.timestamp)
            counts[dayKey, default: 0] += 1
        }
        return dayBuckets.map { ChartSample(day: $0.label, value: counts[$0.label] ?? 0) }
    }

    private func buildDailyAverages(from reports: [SupabaseSelfReportRecord], days: Int) -> [ChartSample] {
        let dayBuckets = buildDayBuckets(days: days)
        var sums: [String: Double] = dayBuckets.reduce(into: [:]) { $0[$1.label] = 0 }
        var counts: [String: Double] = dayBuckets.reduce(into: [:]) { $0[$1.label] = 0 }

        for report in reports {
            let dayKey = dayLabel(for: report.timestamp)
            sums[dayKey, default: 0] += report.urgeLevel ?? 0
            counts[dayKey, default: 0] += 1
        }

        return dayBuckets.map { bucket in
            let count = counts[bucket.label, default: 0]
            let value = count > 0 ? (sums[bucket.label, default: 0] / count) : 0
            return ChartSample(day: bucket.label, value: value)
        }
    }

    private func buildTriggerStats(from reports: [SupabaseSelfReportRecord]) -> [TriggerSample] {
        var counts: [String: Double] = [:]
        for report in reports {
            (report.triggers ?? []).forEach { trigger in
                counts[trigger, default: 0] += 1
            }
        }
        return counts
            .map { TriggerSample(name: $0.key, value: $0.value) }
            .sorted { $0.value > $1.value }
            .prefix(5)
            .map { $0 }
    }

    private func averageUrge(from reports: [SupabaseSelfReportRecord]) -> Double {
        let values = reports.compactMap { $0.urgeLevel }
        guard !values.isEmpty else { return 0 }
        return values.reduce(0, +) / Double(values.count)
    }

    private func improvement(from reports: [SupabaseSelfReportRecord]) -> String {
        guard reports.count > 7 else { return "—" }
        let sorted = reports.sorted {
            SupabaseDateFormatter.date(from: $0.timestamp) ?? .distantPast < SupabaseDateFormatter.date(from: $1.timestamp) ?? .distantPast
        }
        let midIndex = max(0, sorted.count / 2)
        let firstHalf = Array(sorted.prefix(midIndex))
        let secondHalf = Array(sorted.suffix(sorted.count - midIndex))
        let firstAvg = averageUrge(from: firstHalf)
        let secondAvg = averageUrge(from: secondHalf)
        guard firstAvg > 0 else { return "—" }
        let change = ((secondAvg - firstAvg) / firstAvg) * 100
        return String(format: "%+.0f%%", change)
    }

    private func dayLabel(for timestamp: String) -> String {
        let date = SupabaseDateFormatter.date(from: timestamp) ?? .now
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    private func buildDayBuckets(days: Int) -> [(date: Date, label: String)] {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        let today = Calendar.current.startOfDay(for: Date())
        return (0..<days).compactMap { offset in
            guard let date = Calendar.current.date(byAdding: .day, value: -(days - 1 - offset), to: today) else { return nil }
            return (date, formatter.string(from: date))
        }
    }
}

struct ChartSample: Identifiable {
    let id = UUID()
    let day: String
    let value: Double
}

struct TriggerSample: Identifiable {
    let id = UUID()
    let name: String
    let value: Double
}

@MainActor
@Observable
final class PersonalisationViewModel {
    var theme: String = "Aqua Bloom"
    var accentColor: String = "#4FD1C5"
    var messageTone: String = "Warm & nurturing"
    var groundingMessage: String = "Take a slow breath. You're safe right now."
    var urgeMessage: String = "Let's pause together. One breath at a time."
    var recoveryMessage: String = "You got through it. That took strength."
    var vibrationPattern: String = "Gentle pulse"
    var vibrationIntensity: Double = 3
    var soundEnabled: Bool = false
    var soundType: String = "default"
    var soundVolume: Double = 0.6
    var language: String = "Romanian"
    var crisisContactName: String = ""
    var crisisContactPhone: String = ""
    var statusMessage: String?

    private var userId: String?
#if os(iOS) && canImport(Supabase)
    private let supabaseService: SupabaseDataService = .shared
    private var realtimeChannel: RealtimeChannelV2?
    private var realtimeSubscriptions: [RealtimeSubscription] = []
#endif

    func configure(account: AuthAccount?) async {
        let nextUserId = account?.id.uuidString
        guard nextUserId != userId else { return }
        userId = nextUserId
        await load()
#if os(iOS) && canImport(Supabase)
        await stopRealtimeSubscriptions()
        if let nextUserId {
            await startRealtimeSubscriptions(userId: nextUserId)
        }
#endif
    }

    func load() async {
#if os(iOS) && canImport(Supabase)
        guard let userId else { return }
        if let record = await supabaseService.fetchPersonalisationSettings(userId: userId) {
            apply(record)
        }
#endif
    }

    func save() async {
#if os(iOS) && canImport(Supabase)
        guard let userId else { return }
        let record = SupabasePersonalisationSettingsUpsert(
            theme: theme,
            accentColor: accentColor,
            messageTone: messageTone,
            interventionMessage1: groundingMessage,
            interventionMessage2: urgeMessage,
            interventionMessage3: recoveryMessage,
            vibrationPattern: vibrationPattern,
            vibrationIntensity: vibrationIntensity,
            soundEnabled: soundEnabled,
            soundType: soundType,
            soundVolume: soundVolume,
            language: language,
            crisisContactName: crisisContactName,
            crisisContactPhone: crisisContactPhone
        )
        do {
            try await supabaseService.upsertPersonalisationSettings(record, userId: userId)
            statusMessage = "Saved to Supabase."
        } catch {
            statusMessage = error.localizedDescription
        }
#endif
    }

#if os(iOS) && canImport(Supabase)
    private func startRealtimeSubscriptions(userId: String) async {
        guard realtimeChannel == nil else { return }
        let channel = supabaseService.channel(name: "pulz-personalisation-\(userId)")
        let subscription = channel.onPostgresChange(AnyAction.self, schema: "public", table: "personalisation_settings", filter: "user_id=eq.\(userId)") { [weak self] action in
            self?.handlePersonalisationAction(action)
        }
        realtimeSubscriptions = [subscription]
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

    private func handlePersonalisationAction(_ action: AnyAction) {
        let decoder = JSONDecoder()
        let record: SupabasePersonalisationSettingsRecord?
        switch action {
        case .insert(let insertAction):
            record = try? insertAction.decodeRecord(as: SupabasePersonalisationSettingsRecord.self, decoder: decoder)
        case .update(let updateAction):
            record = try? updateAction.decodeRecord(as: SupabasePersonalisationSettingsRecord.self, decoder: decoder)
        case .delete:
            record = nil
        }

        guard let record else { return }
        Task { @MainActor in
            apply(record)
        }
    }
#endif

    private func apply(_ record: SupabasePersonalisationSettingsRecord) {
        theme = record.theme ?? theme
        accentColor = record.accentColor ?? accentColor
        messageTone = record.messageTone ?? messageTone
        groundingMessage = record.interventionMessage1 ?? groundingMessage
        urgeMessage = record.interventionMessage2 ?? urgeMessage
        recoveryMessage = record.interventionMessage3 ?? recoveryMessage
        vibrationPattern = record.vibrationPattern ?? vibrationPattern
        vibrationIntensity = record.vibrationIntensity ?? vibrationIntensity
        soundEnabled = record.soundEnabled ?? soundEnabled
        soundType = record.soundType ?? soundType
        soundVolume = record.soundVolume ?? soundVolume
        language = record.language ?? language
        crisisContactName = record.crisisContactName ?? crisisContactName
        crisisContactPhone = record.crisisContactPhone ?? crisisContactPhone
    }
}
