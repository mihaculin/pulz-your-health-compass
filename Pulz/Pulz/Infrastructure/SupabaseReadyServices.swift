import Foundation
#if os(iOS) && canImport(Supabase)
import Supabase
#endif

struct SupabaseConfiguration {
    let projectURL: URL?
    let anonKey: String

    static let placeholder = SupabaseConfiguration(projectURL: nil, anonKey: "")
    static let live = SupabaseConfiguration(
        projectURL: URL(string: "https://gmvnhfwgzhcgkyirdjfa.supabase.co"),
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtdm5oZndnemhjZ2t5aXJkamZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwODY1MTgsImV4cCI6MjA4OTY2MjUxOH0.i1oxf2ISkzHfk_TPMpNa_RlDsX-4XepCXNCHyam9R3M"
    )
}

struct AuthAccount {
    let id: UUID
    let email: String
    let fullName: String
}

struct IntakePayload {
    let fullName: String
    let dateOfBirth: Date
    let selectedConcerns: [String]
    let commonTriggers: [String]
    let selectedDevice: String
    let selectedTheme: String
    let selectedTone: String
    let supportMessage: String
}

protocol AuthServicing {
    func signIn(email: String, password: String) async throws -> AuthAccount
    func signUp(email: String, password: String, fullName: String) async throws -> AuthAccount
    func currentAccount() async -> AuthAccount?
    func signOut() async
}

protocol IntakeSyncServicing {
    func saveIntake(_ payload: IntakePayload, for account: AuthAccount) async throws
}

protocol CloudSyncServicing {
    func send(sample: BiometricSample, state: EmotionalState) async
    func send(event: ImpulseEvent) async
}

enum SyncStatus: String {
    case connecting
    case connected
    case disconnected
}

struct BootstrapSnapshot {
    let profile: ProfileRecord?
    let clientProfile: ClientProfileRecord?
    let personalisation: PersonalisationSettingsRecord?
    let recentRiskWindows: [RiskWindowRecord]
    let recentInterventions: [InterventionEventRecord]
}

protocol ProfileSyncServicing {
    func prepareNewUser(account: AuthAccount, fullName: String) async
    func fetchBootstrap(for account: AuthAccount) async -> BootstrapSnapshot
    func updateClientProfile(_ record: ClientProfileUpdateRecord) async
    func upsertPersonalisation(_ record: PersonalisationUpdateRecord) async
}

enum StubServiceError: LocalizedError {
    case invalidCredentials
    case invalidInput

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Please enter both email and password."
        case .invalidInput:
            return "Please complete the required fields first."
        }
    }
}

actor MockAuthService: AuthServicing {
    func signIn(email: String, password: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty else {
            throw StubServiceError.invalidCredentials
        }

        return AuthAccount(id: UUID(), email: email, fullName: "Andrada")
    }

    func signUp(email: String, password: String, fullName: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty, !fullName.isEmpty else {
            throw StubServiceError.invalidInput
        }

        return AuthAccount(id: UUID(), email: email, fullName: fullName)
    }

    func signOut() async {}

    func currentAccount() async -> AuthAccount? {
        nil
    }
}

actor MockIntakeSyncService: IntakeSyncServicing {
    func saveIntake(_ payload: IntakePayload, for account: AuthAccount) async throws {
        _ = payload
        _ = account
    }
}

actor MockCloudSyncService: CloudSyncServicing {
    func send(sample: BiometricSample, state: EmotionalState) async {
        _ = sample
        _ = state
    }

    func send(event: ImpulseEvent) async {
        _ = event
    }
}

actor MockProfileSyncService: ProfileSyncServicing {
    func prepareNewUser(account: AuthAccount, fullName: String) async {
        _ = account
        _ = fullName
    }

    func fetchBootstrap(for account: AuthAccount) async -> BootstrapSnapshot {
        _ = account
        return BootstrapSnapshot(
            profile: nil,
            clientProfile: nil,
            personalisation: nil,
            recentRiskWindows: [],
            recentInterventions: []
        )
    }

    func updateClientProfile(_ record: ClientProfileUpdateRecord) async {
        _ = record
    }

    func upsertPersonalisation(_ record: PersonalisationUpdateRecord) async {
        _ = record
    }
}

#if os(iOS) && canImport(Supabase)
actor SupabaseAuthService: AuthServicing {
    private let client: SupabaseClient

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func signIn(email: String, password: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty else {
            throw StubServiceError.invalidCredentials
        }
        try await client.auth.signIn(email: email, password: password)
        let session = try await client.auth.session
        let user = session.user
        let resolvedName = user.email ?? email
        return AuthAccount(id: user.id, email: user.email ?? email, fullName: resolvedName)
    }

    func signUp(email: String, password: String, fullName: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty, !fullName.isEmpty else {
            throw StubServiceError.invalidInput
        }

        try await client.auth.signUp(email: email, password: password)
        let session = try await client.auth.session
        let user = session.user
        return AuthAccount(id: user.id, email: user.email ?? email, fullName: fullName)
    }

    func signOut() async {
        try? await client.auth.signOut()
    }

    func currentAccount() async -> AuthAccount? {
        do {
            let session = try await client.auth.session
            let user = session.user
            let resolvedName = user.email ?? ""
            return AuthAccount(id: user.id, email: user.email ?? "", fullName: resolvedName)
        } catch {
            return nil
        }
    }
}

actor SupabaseIntakeSyncService: IntakeSyncServicing {
    private let client: SupabaseClient

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func saveIntake(_ payload: IntakePayload, for account: AuthAccount) async throws {
        let record = PersonalisationUpdateRecord(
            userId: account.id.uuidString,
            theme: payload.selectedTheme,
            accentColor: nil,
            messageTone: payload.selectedTone,
            interventionMessage1: payload.supportMessage,
            interventionMessage2: nil,
            interventionMessage3: nil,
            vibrationPattern: nil,
            vibrationIntensity: nil,
            soundEnabled: nil,
            soundType: nil,
            soundVolume: nil,
            language: nil,
            crisisContactName: nil,
            crisisContactPhone: nil
        )

        try await client
            .from("personalisation_settings")
            .upsert(record)
            .execute()
    }
}

actor SupabaseCloudSyncService: CloudSyncServicing {
    private let client: SupabaseClient

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func send(sample: BiometricSample, state: EmotionalState) async {
        do {
            let session = try await client.auth.session
            let record = SensorSampleInsertRecord(
                userId: session.user.id.uuidString,
                timestamp: SupabasePayloads.isoString(sample.timestamp),
                deviceType: sample.source == .mock ? "iphone" : "apple_watch",
                sourcePlatform: "healthkit",
                heartRate: sample.heartRate,
                restingHeartRate: nil,
                hrvSDNN: nil,
                skinTemperatureDelta: sample.wristTemperatureDelta,
                steps: nil,
                activityState: SupabasePayloads.activityState(for: sample.movement),
                sleepState: nil,
                stressScore: sample.derivedStress * 100,
                confidence: state == .highRisk ? "high" : (state == .elevated ? "medium" : "low")
            )
            try await client
                .from("sensor_samples")
                .insert(record)
                .execute()
        } catch {
            // Ignore background sync errors for now.
        }
    }

    func send(event: ImpulseEvent) async {
        do {
            let session = try await client.auth.session
            let record = RiskWindowInsertRecord(
                userId: session.user.id.uuidString,
                startedAt: SupabasePayloads.isoString(event.timestamp),
                urgeRiskScore: Double(event.severity) * 30,
                bingeRiskScore: Double(event.severity) * 20,
                confidenceLevel: event.confidence.rawValue,
                dominantDrivers: event.dominantDrivers,
                recommendedAction: event.interventionText
            )
            try await client
                .from("risk_windows")
                .insert(record)
                .execute()
        } catch {
            // Ignore background sync errors for now.
        }
    }
}

actor SupabaseProfileSyncService: ProfileSyncServicing {
    private let client: SupabaseClient

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func prepareNewUser(account: AuthAccount, fullName: String) async {
        let profile = ProfileUpsertRecord(userId: account.id.uuidString, fullName: fullName)
        let clientProfile = ClientProfileUpsertRecord(id: account.id.uuidString)

        do {
            try await client.from("profiles").upsert(profile).execute()
            try await client.from("client_profiles").upsert(clientProfile).execute()
        } catch {
            // Ignore bootstrap errors for now.
        }
    }

    func fetchBootstrap(for account: AuthAccount) async -> BootstrapSnapshot {
        async let profile: ProfileRecord? = fetchProfile(for: account.id.uuidString)
        async let clientProfile: ClientProfileRecord? = fetchClientProfile(for: account.id.uuidString)
        async let personalisation: PersonalisationSettingsRecord? = fetchPersonalisation(for: account.id.uuidString)
        async let recentRiskWindows: [RiskWindowRecord] = fetchRiskWindows(for: account.id.uuidString)
        async let recentInterventions: [InterventionEventRecord] = fetchInterventions(for: account.id.uuidString)

        return await BootstrapSnapshot(
            profile: profile,
            clientProfile: clientProfile,
            personalisation: personalisation,
            recentRiskWindows: recentRiskWindows,
            recentInterventions: recentInterventions
        )
    }

    func updateClientProfile(_ record: ClientProfileUpdateRecord) async {
        do {
            try await client.from("client_profiles").upsert(record).execute()
        } catch {
            // Ignore update errors for now.
        }
    }

    func upsertPersonalisation(_ record: PersonalisationUpdateRecord) async {
        do {
            try await client.from("personalisation_settings").upsert(record).execute()
        } catch {
            // Ignore update errors for now.
        }
    }

    private func fetchProfile(for userId: String) async -> ProfileRecord? {
        await fetchOptionalSingle(from: "profiles", matching: "user_id", value: userId)
    }

    private func fetchClientProfile(for userId: String) async -> ClientProfileRecord? {
        await fetchOptionalSingle(from: "client_profiles", matching: "id", value: userId)
    }

    private func fetchPersonalisation(for userId: String) async -> PersonalisationSettingsRecord? {
        await fetchOptionalSingle(from: "personalisation_settings", matching: "user_id", value: userId)
    }

    private func fetchRiskWindows(for userId: String) async -> [RiskWindowRecord] {
        do {
            let response: PostgrestResponse<[RiskWindowRecord]> = try await client
                .from("risk_windows")
                .select()
                .eq("user_id", value: userId)
                .order("started_at", ascending: false)
                .limit(12)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    private func fetchInterventions(for userId: String) async -> [InterventionEventRecord] {
        do {
            let response: PostgrestResponse<[InterventionEventRecord]> = try await client
                .from("intervention_events")
                .select()
                .eq("user_id", value: userId)
                .order("timestamp", ascending: false)
                .limit(12)
                .execute()
            return response.value
        } catch {
            return []
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
}

nonisolated private struct ProfileUpsertRecord: Encodable {
    let userId: String
    let fullName: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case fullName = "full_name"
    }
}

nonisolated private struct ClientProfileUpsertRecord: Encodable {
    let id: String
}

nonisolated struct ClientProfileUpdateRecord: Encodable {
    let id: String
    let dateOfBirth: String?
    let primaryConcerns: [String]?
    let heightCm: Double?
    let weightKg: Double?
    let coOccurringConditions: [String]?
    let intakeSurveyResponses: [String: AnyEncodable]?
    let intakeSurveyCompleted: Bool?

    private enum CodingKeys: String, CodingKey {
        case id = "id"
        case dateOfBirth = "date_of_birth"
        case primaryConcerns = "primary_concerns"
        case heightCm = "height_cm"
        case weightKg = "weight_kg"
        case coOccurringConditions = "co_occurring_conditions"
        case intakeSurveyResponses = "intake_survey_responses"
        case intakeSurveyCompleted = "intake_survey_completed"
    }
}

nonisolated struct PersonalisationUpdateRecord: Encodable {
    let userId: String
    let theme: String?
    let accentColor: String?
    let messageTone: String?
    let interventionMessage1: String?
    let interventionMessage2: String?
    let interventionMessage3: String?
    let vibrationPattern: String?
    let vibrationIntensity: Double?
    let soundEnabled: Bool?
    let soundType: String?
    let soundVolume: Double?
    let language: String?
    let crisisContactName: String?
    let crisisContactPhone: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case theme = "theme"
        case accentColor = "accent_color"
        case messageTone = "message_tone"
        case interventionMessage1 = "intervention_message_1"
        case interventionMessage2 = "intervention_message_2"
        case interventionMessage3 = "intervention_message_3"
        case vibrationPattern = "vibration_pattern"
        case vibrationIntensity = "vibration_intensity"
        case soundEnabled = "sound_enabled"
        case soundType = "sound_type"
        case soundVolume = "sound_volume"
        case language = "language"
        case crisisContactName = "crisis_contact_name"
        case crisisContactPhone = "crisis_contact_phone"
    }
}

nonisolated struct SelfReportInsertRecord: Encodable {
    let userId: String
    let timestamp: String
    let urgeLevel: Double?
    let bingeOccurred: Bool?
    let purgeOccurred: Bool?
    let overeatingOccurred: Bool?
    let mealSkipped: Bool?
    let anxietyLevel: Double?
    let shameLevel: Double?
    let lonelinessLevel: Double?
    let emotionalState: [String]?
    let triggers: [String]?
    let notes: String?
    let reportType: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case urgeLevel = "urge_level"
        case bingeOccurred = "binge_occurred"
        case purgeOccurred = "purge_occurred"
        case overeatingOccurred = "overeating_occurred"
        case mealSkipped = "meal_skipped"
        case anxietyLevel = "anxiety_level"
        case shameLevel = "shame_level"
        case lonelinessLevel = "loneliness_level"
        case emotionalState = "emotional_state"
        case triggers = "triggers"
        case notes = "notes"
        case reportType = "report_type"
    }
}

struct AnyEncodable: Encodable {
    private let encodeClosure: (Encoder) throws -> Void

    init<T: Encodable>(_ value: T) {
        encodeClosure = value.encode(to:)
    }

    func encode(to encoder: Encoder) throws {
        try encodeClosure(encoder)
    }
}

nonisolated private enum SupabasePayloads {
    nonisolated static func isoString(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    nonisolated static func activityState(for movement: Double) -> String {
        switch movement {
        case ..<0.2:
            return "low"
        case ..<0.6:
            return "moderate"
        default:
            return "active"
        }
    }
}

nonisolated private struct SensorSampleInsertRecord: Encodable {
    let userId: String
    let timestamp: String
    let deviceType: String
    let sourcePlatform: String
    let heartRate: Double
    let restingHeartRate: Double?
    let hrvSDNN: Double?
    let skinTemperatureDelta: Double?
    let steps: Double?
    let activityState: String
    let sleepState: String?
    let stressScore: Double
    let confidence: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case deviceType = "device_type"
        case sourcePlatform = "source_platform"
        case heartRate = "heart_rate"
        case restingHeartRate = "resting_heart_rate"
        case hrvSDNN = "hrv_sdnn"
        case skinTemperatureDelta = "skin_temperature_delta"
        case steps = "steps"
        case activityState = "activity_state"
        case sleepState = "sleep_state"
        case stressScore = "stress_score"
        case confidence = "confidence"
    }
}

nonisolated private struct RiskWindowInsertRecord: Encodable {
    let userId: String
    let startedAt: String
    let urgeRiskScore: Double
    let bingeRiskScore: Double
    let confidenceLevel: String
    let dominantDrivers: [String]
    let recommendedAction: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case startedAt = "started_at"
        case urgeRiskScore = "urge_risk_score"
        case bingeRiskScore = "binge_risk_score"
        case confidenceLevel = "confidence_level"
        case dominantDrivers = "dominant_drivers"
        case recommendedAction = "recommended_action"
    }
}
#endif

nonisolated struct ProfileRecord: Decodable {
    let userId: String
    let fullName: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case fullName = "full_name"
    }
}

nonisolated struct ClientProfileRecord: Decodable {
    let id: String?
    let dateOfBirth: String?
    let primaryConcerns: [String]?
    let heightCm: Double?
    let weightKg: Double?
    let subscriptionTier: String?
    let subscriptionStatus: String?
    let intakeSurveyCompleted: Bool?

    private enum CodingKeys: String, CodingKey {
        case id = "id"
        case dateOfBirth = "date_of_birth"
        case primaryConcerns = "primary_concerns"
        case heightCm = "height_cm"
        case weightKg = "weight_kg"
        case subscriptionTier = "subscription_tier"
        case subscriptionStatus = "subscription_status"
        case intakeSurveyCompleted = "intake_survey_completed"
    }
}

nonisolated struct PersonalisationSettingsRecord: Decodable {
    let userId: String?
    let theme: String?
    let accentColor: String?
    let messageTone: String?
    let interventionMessage1: String?
    let interventionMessage2: String?
    let interventionMessage3: String?
    let vibrationPattern: String?
    let vibrationIntensity: Double?
    let soundEnabled: Bool?
    let soundType: String?
    let soundVolume: Double?
    let language: String?
    let crisisContactName: String?
    let crisisContactPhone: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case theme = "theme"
        case accentColor = "accent_color"
        case messageTone = "message_tone"
        case interventionMessage1 = "intervention_message_1"
        case interventionMessage2 = "intervention_message_2"
        case interventionMessage3 = "intervention_message_3"
        case vibrationPattern = "vibration_pattern"
        case vibrationIntensity = "vibration_intensity"
        case soundEnabled = "sound_enabled"
        case soundType = "sound_type"
        case soundVolume = "sound_volume"
        case language = "language"
        case crisisContactName = "crisis_contact_name"
        case crisisContactPhone = "crisis_contact_phone"
    }
}

nonisolated struct RiskWindowRecord: Decodable {
    let userId: String?
    let startedAt: String?
    let urgeRiskScore: Double?
    let bingeRiskScore: Double?
    let confidenceLevel: String?
    let dominantDrivers: [String]?
    let recommendedAction: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case startedAt = "started_at"
        case urgeRiskScore = "urge_risk_score"
        case bingeRiskScore = "binge_risk_score"
        case confidenceLevel = "confidence_level"
        case dominantDrivers = "dominant_drivers"
        case recommendedAction = "recommended_action"
    }
}

nonisolated struct InterventionEventRecord: Decodable {
    let id: String?
    let userId: String?
    let timestamp: String?
    let kind: String?
    let note: String?

    private enum CodingKeys: String, CodingKey {
        case id = "id"
        case userId = "user_id"
        case timestamp = "timestamp"
        case kind = "kind"
        case note = "note"
    }
}

nonisolated struct SensorSampleRecord: Decodable {
    let userId: String?
    let timestamp: String?
    let deviceType: String?
    let sourcePlatform: String?
    let heartRate: Double?
    let restingHeartRate: Double?
    let hrvSDNN: Double?
    let skinTemperatureDelta: Double?
    let steps: Double?
    let activityState: String?
    let sleepState: String?
    let stressScore: Double?
    let confidence: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case deviceType = "device_type"
        case sourcePlatform = "source_platform"
        case heartRate = "heart_rate"
        case restingHeartRate = "resting_heart_rate"
        case hrvSDNN = "hrv_sdnn"
        case skinTemperatureDelta = "skin_temperature_delta"
        case steps = "steps"
        case activityState = "activity_state"
        case sleepState = "sleep_state"
        case stressScore = "stress_score"
        case confidence = "confidence"
    }
}

nonisolated struct SelfReportRecord: Decodable {
    let id: String?
    let userId: String?
    let timestamp: String?
    let urgeLevel: Double?
    let bingeOccurred: Bool?
    let purgeOccurred: Bool?
    let overeatingOccurred: Bool?
    let mealSkipped: Bool?
    let anxietyLevel: Double?
    let shameLevel: Double?
    let lonelinessLevel: Double?
    let emotionalState: [String]?
    let triggers: [String]?
    let notes: String?
    let reportType: String?

    private enum CodingKeys: String, CodingKey {
        case id = "id"
        case userId = "user_id"
        case timestamp = "timestamp"
        case urgeLevel = "urge_level"
        case bingeOccurred = "binge_occurred"
        case purgeOccurred = "purge_occurred"
        case overeatingOccurred = "overeating_occurred"
        case mealSkipped = "meal_skipped"
        case anxietyLevel = "anxiety_level"
        case shameLevel = "shame_level"
        case lonelinessLevel = "loneliness_level"
        case emotionalState = "emotional_state"
        case triggers = "triggers"
        case notes = "notes"
        case reportType = "report_type"
    }
}

nonisolated struct DeviceConnectionRecord: Decodable {
    let userId: String?
    let deviceType: String?
    let lastSync: String?
    let isActive: Bool?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case deviceType = "device_type"
        case lastSync = "last_sync"
        case isActive = "is_active"
    }
}

nonisolated struct UserProgressSnapshotRecord: Decodable {
    let userId: String?
    let snapshotDate: String?
    let totalEntries: Int?
    let avgUrgeLevel: Double?
    let mostCommonTrigger: String?
    let mostCommonEmotion: String?
    let calmDays: Int?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case snapshotDate = "snapshot_date"
        case totalEntries = "total_entries"
        case avgUrgeLevel = "avg_urge_level"
        case mostCommonTrigger = "most_common_trigger"
        case mostCommonEmotion = "most_common_emotion"
        case calmDays = "calm_days"
    }
}

struct AppEnvironment {
    let supabase: SupabaseConfiguration
    let authService: AuthServicing
    let intakeSyncService: IntakeSyncServicing
    let cloudSyncService: CloudSyncServicing
    let profileSyncService: ProfileSyncServicing

    static let local = AppEnvironment(
        supabase: .placeholder,
        authService: MockAuthService(),
        intakeSyncService: MockIntakeSyncService(),
        cloudSyncService: MockCloudSyncService(),
        profileSyncService: MockProfileSyncService()
    )

#if os(iOS) && canImport(Supabase)
    static let live = AppEnvironment(
        supabase: .live,
        authService: SupabaseAuthService(configuration: .live),
        intakeSyncService: SupabaseIntakeSyncService(configuration: .live),
        cloudSyncService: SupabaseCloudSyncService(configuration: .live),
        profileSyncService: SupabaseProfileSyncService(configuration: .live)
    )
#else
    static let live = AppEnvironment(
        supabase: .placeholder,
        authService: MockAuthService(),
        intakeSyncService: MockIntakeSyncService(),
        cloudSyncService: MockCloudSyncService(),
        profileSyncService: MockProfileSyncService()
    )
#endif
}

#if os(iOS) && canImport(Supabase)
enum SupabaseSyncHub {
    static let shared: CloudSyncServicing = SupabaseCloudSyncService(configuration: .live)
}
#endif
