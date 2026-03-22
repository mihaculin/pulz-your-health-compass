import Foundation
#if os(iOS) && canImport(Supabase)
import Observation
import Supabase

@MainActor
@Observable
final class SupabaseSyncStore {
    private let client: SupabaseClient
    private var channels: [RealtimeChannelV2] = []
    private var tasks: [Task<Void, Never>] = []
    private var userId: String?
    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    var status: SyncStatus = .disconnected
    var latestSensorSample: SensorSampleRecord?
    var todaySensorSamples: [SensorSampleRecord] = []
    var latestRiskWindow: RiskWindowRecord?
    var todayReports: [SelfReportRecord] = []
    var recentReports: [SelfReportRecord] = []
    var progressSnapshots: [UserProgressSnapshotRecord] = []
    var personalisation: PersonalisationSettingsRecord?
    var clientProfile: ClientProfileRecord?
    var profile: ProfileRecord?
    var deviceConnection: DeviceConnectionRecord?
    var currentUserId: String? { userId }

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func start(userId: String) async {
        self.userId = userId
        await stop()
        status = .connecting
        await loadInitialData(userId: userId)
        await subscribe(userId: userId)
    }

    func stop() async {
        tasks.forEach { $0.cancel() }
        tasks.removeAll()
        for channel in channels {
            await channel.unsubscribe()
        }
        channels.removeAll()
        status = .disconnected
    }

    func createSelfReport(_ record: SelfReportInsertRecord) async {
        do {
            try await client.from("self_reports").insert(record).execute()
        } catch {
            // Ignore insert errors for now.
        }
    }

    func updatePersonalisation(_ record: PersonalisationUpdateRecord) async {
        do {
            try await client.from("personalisation_settings").upsert(record).execute()
        } catch {
            // Ignore update errors for now.
        }
    }

    private func loadInitialData(userId: String) async {
        async let profile: ProfileRecord? = fetchProfile(userId: userId)
        async let clientProfile: ClientProfileRecord? = fetchClientProfile(userId: userId)
        async let personalisation: PersonalisationSettingsRecord? = fetchPersonalisation(userId: userId)
        async let latestSensor: SensorSampleRecord? = fetchLatestSensorSample(userId: userId)
        async let todaySensors: [SensorSampleRecord] = fetchTodaySensorSamples(userId: userId)
        async let latestRisk: RiskWindowRecord? = fetchLatestRiskWindow(userId: userId)
        async let todayReports: [SelfReportRecord] = fetchTodayReports(userId: userId)
        async let recentReports: [SelfReportRecord] = fetchRecentReports(userId: userId)
        async let snapshots: [UserProgressSnapshotRecord] = fetchSnapshots(userId: userId)
        async let device: DeviceConnectionRecord? = fetchDeviceConnection(userId: userId)

        self.profile = await profile
        self.clientProfile = await clientProfile
        self.personalisation = await personalisation
        self.latestSensorSample = await latestSensor
        self.todaySensorSamples = await todaySensors
        self.latestRiskWindow = await latestRisk
        self.todayReports = await todayReports
        self.recentReports = await recentReports
        self.progressSnapshots = await snapshots
        self.deviceConnection = await device
    }

    private func subscribe(userId: String) async {
        await subscribeToSensorSamples(userId: userId)
        await subscribeToRiskWindows(userId: userId)
        await subscribeToSelfReports(userId: userId)
        await subscribeToPersonalisation(userId: userId)
        status = .connected
    }

    private func subscribeToSensorSamples(userId: String) async {
        let channel = client.realtimeV2.channel("public:sensor_samples")
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "sensor_samples",
            filter: .eq("user_id", value: userId)
        )

        try? await channel.subscribeWithError()
        channels.append(channel)

        tasks.append(Task { [weak self] in
            for await change in changes {
                await self?.handleSensorSample(change)
            }
        })
    }

    private func subscribeToRiskWindows(userId: String) async {
        let channel = client.realtimeV2.channel("public:risk_windows")
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "risk_windows",
            filter: .eq("user_id", value: userId)
        )

        try? await channel.subscribeWithError()
        channels.append(channel)

        tasks.append(Task { [weak self] in
            for await change in changes {
                await self?.handleRiskWindow(change)
            }
        })
    }

    private func subscribeToSelfReports(userId: String) async {
        let channel = client.realtimeV2.channel("public:self_reports")
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "self_reports",
            filter: .eq("user_id", value: userId)
        )

        try? await channel.subscribeWithError()
        channels.append(channel)

        tasks.append(Task { [weak self] in
            for await change in changes {
                await self?.handleSelfReport(change)
            }
        })
    }

    private func subscribeToPersonalisation(userId: String) async {
        let channel = client.realtimeV2.channel("public:personalisation_settings")
        let changes = channel.postgresChange(
            AnyAction.self,
            schema: "public",
            table: "personalisation_settings",
            filter: .eq("user_id", value: userId)
        )

        try? await channel.subscribeWithError()
        channels.append(channel)

        tasks.append(Task { [weak self] in
            for await change in changes {
                await self?.handlePersonalisation(change)
            }
        })
    }

    private func handleSensorSample(_ action: AnyAction) async {
        do {
            switch action {
            case .insert(let action):
                let record = try action.decodeRecord(as: SensorSampleRecord.self, decoder: decoder)
                latestSensorSample = record
                insertSensorSample(record)
            case .update(let action):
                let record = try action.decodeRecord(as: SensorSampleRecord.self, decoder: decoder)
                latestSensorSample = record
                insertSensorSample(record)
            case .delete:
                break
            }
        } catch {
            return
        }
    }

    private func handleRiskWindow(_ action: AnyAction) async {
        do {
            switch action {
            case .insert(let action):
                let record = try action.decodeRecord(as: RiskWindowRecord.self, decoder: decoder)
                latestRiskWindow = record
            case .update(let action):
                let record = try action.decodeRecord(as: RiskWindowRecord.self, decoder: decoder)
                latestRiskWindow = record
            case .delete:
                break
            }
        } catch {
            return
        }
    }

    private func handleSelfReport(_ action: AnyAction) async {
        do {
            switch action {
            case .insert(let action):
                let record = try action.decodeRecord(as: SelfReportRecord.self, decoder: decoder)
                upsertSelfReport(record)
            case .update(let action):
                let record = try action.decodeRecord(as: SelfReportRecord.self, decoder: decoder)
                upsertSelfReport(record)
            case .delete:
                break
            }
        } catch {
            return
        }
    }

    private func handlePersonalisation(_ action: AnyAction) async {
        do {
            switch action {
            case .insert(let action):
                let record = try action.decodeRecord(as: PersonalisationSettingsRecord.self, decoder: decoder)
                personalisation = record
            case .update(let action):
                let record = try action.decodeRecord(as: PersonalisationSettingsRecord.self, decoder: decoder)
                personalisation = record
            case .delete:
                break
            }
        } catch {
            return
        }
    }

    private func insertSensorSample(_ record: SensorSampleRecord) {
        let timestamp = SupabaseDateHelper.date(from: record.timestamp) ?? .now
        todaySensorSamples.removeAll { SupabaseDateHelper.date(from: $0.timestamp) == timestamp }
        todaySensorSamples.append(record)
        todaySensorSamples.sort { SupabaseDateHelper.date(from: $0.timestamp) ?? .distantPast < SupabaseDateHelper.date(from: $1.timestamp) ?? .distantPast }
    }

    private func upsertSelfReport(_ record: SelfReportRecord) {
        let timestamp = SupabaseDateHelper.date(from: record.timestamp) ?? .now
        if SupabaseDateHelper.isToday(timestamp) {
            todayReports.removeAll { $0.id == record.id }
            todayReports.insert(record, at: 0)
        }
        recentReports.removeAll { $0.id == record.id }
        recentReports.insert(record, at: 0)
        recentReports = Array(recentReports.prefix(20))
    }

    private func fetchProfile(userId: String) async -> ProfileRecord? {
        await fetchOptionalSingle(from: "profiles", matching: "user_id", value: userId)
    }

    private func fetchClientProfile(userId: String) async -> ClientProfileRecord? {
        await fetchOptionalSingle(from: "client_profiles", matching: "id", value: userId)
    }

    private func fetchPersonalisation(userId: String) async -> PersonalisationSettingsRecord? {
        await fetchOptionalSingle(from: "personalisation_settings", matching: "user_id", value: userId)
    }

    private func fetchLatestSensorSample(userId: String) async -> SensorSampleRecord? {
        let records: [SensorSampleRecord] = await fetchList(
            from: "sensor_samples",
            matching: "user_id",
            value: userId,
            gte: nil,
            lte: nil,
            orderBy: "timestamp",
            ascending: false,
            limit: 1
        )
        return records.first
    }

    private func fetchTodaySensorSamples(userId: String) async -> [SensorSampleRecord] {
        let start = SupabaseDateHelper.startOfTodayISO()
        let end = SupabaseDateHelper.endOfTodayISO()
        return await fetchList(
            from: "sensor_samples",
            matching: "user_id",
            value: userId,
            gte: ("timestamp", start),
            lte: ("timestamp", end),
            orderBy: "timestamp",
            ascending: true
        )
    }

    private func fetchLatestRiskWindow(userId: String) async -> RiskWindowRecord? {
        let records: [RiskWindowRecord] = await fetchList(
            from: "risk_windows",
            matching: "user_id",
            value: userId,
            gte: nil,
            lte: nil,
            orderBy: "started_at",
            ascending: false,
            limit: 1
        )
        return records.first
    }

    private func fetchTodayReports(userId: String) async -> [SelfReportRecord] {
        let start = SupabaseDateHelper.startOfTodayISO()
        return await fetchList(
            from: "self_reports",
            matching: "user_id",
            value: userId,
            gte: ("timestamp", start),
            lte: nil,
            orderBy: "timestamp",
            ascending: false
        )
    }

    private func fetchRecentReports(userId: String) async -> [SelfReportRecord] {
        return await fetchList(
            from: "self_reports",
            matching: "user_id",
            value: userId,
            gte: nil,
            lte: nil,
            orderBy: "timestamp",
            ascending: false,
            limit: 20
        )
    }

    private func fetchSnapshots(userId: String) async -> [UserProgressSnapshotRecord] {
        return await fetchList(
            from: "user_progress_snapshots",
            matching: "user_id",
            value: userId,
            gte: nil,
            lte: nil,
            orderBy: "snapshot_date",
            ascending: false,
            limit: 14
        )
    }

    private func fetchDeviceConnection(userId: String) async -> DeviceConnectionRecord? {
        do {
            let response: PostgrestResponse<[DeviceConnectionRecord]> = try await client
                .from("device_connections")
                .select()
                .eq("user_id", value: userId)
                .eq("is_active", value: true)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
            return response.value.first
        } catch {
            return nil
        }
    }

    private func fetchOptionalSingle<T: Decodable>(
        from table: String,
        matching key: String,
        value: String
    ) async -> T? {
        do {
            let response: PostgrestResponse<T> = try await client
                .from(table)
                .select()
                .eq(key, value: value)
                .single()
                .execute()
            return response.value
        } catch {
            return nil
        }
    }

    private func fetchList<T: Decodable>(
        from table: String,
        matching key: String,
        value: String,
        gte: (String, String)?,
        lte: (String, String)?,
        orderBy: String,
        ascending: Bool,
        limit: Int? = nil
    ) async -> [T] {
        do {
            var query = client.from(table).select().eq(key, value: value)
            if let gte {
                query = query.gte(gte.0, value: gte.1)
            }
            if let lte {
                query = query.lte(lte.0, value: lte.1)
            }
            let ordered = query.order(orderBy, ascending: ascending)
            let response: PostgrestResponse<[T]> = try await {
                if let limit {
                    return try await ordered.limit(limit).execute()
                }
                return try await ordered.execute()
            }()
            return response.value
        } catch {
            return []
        }
    }
}

private enum SupabaseDateHelper {
    static func date(from isoString: String?) -> Date? {
        guard let isoString else { return nil }
        return ISO8601DateFormatter().date(from: isoString)
    }

    static func isToday(_ date: Date) -> Bool {
        Calendar.current.isDateInToday(date)
    }

    static func startOfTodayISO() -> String {
        let start = Calendar.current.startOfDay(for: .now)
        return ISO8601DateFormatter().string(from: start)
    }

    static func endOfTodayISO() -> String {
        let end = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: .now))?.addingTimeInterval(-1) ?? .now
        return ISO8601DateFormatter().string(from: end)
    }
}

#endif
