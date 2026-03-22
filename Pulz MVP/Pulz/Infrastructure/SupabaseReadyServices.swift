import Foundation
#if os(iOS) && canImport(Supabase)
import Supabase
#endif

struct SupabaseConfiguration {
    let projectURL: URL?
    let anonKey: String

    static let placeholder = SupabaseConfiguration(projectURL: nil, anonKey: "")
    static let live = SupabaseConfiguration(
        projectURL: URL(string: "https://hayuavltgmpmvbqtnzno.supabase.co"),
        anonKey: "sb_publishable_pY4BAu9SMuiE9a-RrsFOqg_4rROgAL6"
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
        let record = IntakeInsertRecord(
            userId: account.id.uuidString,
            fullName: payload.fullName,
            dateOfBirth: SupabasePayloads.isoString(payload.dateOfBirth),
            selectedConcerns: payload.selectedConcerns,
            commonTriggers: payload.commonTriggers,
            selectedDevice: payload.selectedDevice,
            selectedTheme: payload.selectedTheme,
            selectedTone: payload.selectedTone,
            supportMessage: payload.supportMessage
        )

        try await client
            .from("personalisation_settings")
            .insert(record)
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
                heartRate: sample.heartRate,
                movement: sample.movement,
                wristTemperatureDelta: sample.wristTemperatureDelta,
                derivedStress: sample.derivedStress,
                ecgIrregularityScore: sample.ecgIrregularityScore,
                source: sample.source.rawValue,
                state: state.rawValue
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
                timestamp: SupabasePayloads.isoString(event.timestamp),
                state: event.state.rawValue,
                severity: event.severity,
                confidence: event.confidence.rawValue,
                dominantDrivers: event.dominantDrivers,
                tags: event.tags.map(\.rawValue),
                interventionText: event.interventionText,
                trainingLabel: event.trainingLabel?.storedValue,
                note: event.note?.text
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
                .order("timestamp", ascending: false)
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

nonisolated private enum SupabasePayloads {
    nonisolated static func isoString(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }
}

nonisolated private struct IntakeInsertRecord: Encodable {
    let userId: String
    let fullName: String
    let dateOfBirth: String
    let selectedConcerns: [String]
    let commonTriggers: [String]
    let selectedDevice: String
    let selectedTheme: String
    let selectedTone: String
    let supportMessage: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case fullName = "full_name"
        case dateOfBirth = "date_of_birth"
        case selectedConcerns = "selected_concerns"
        case commonTriggers = "common_triggers"
        case selectedDevice = "selected_device"
        case selectedTheme = "selected_theme"
        case selectedTone = "selected_tone"
        case supportMessage = "support_message"
    }
}

nonisolated private struct SensorSampleInsertRecord: Encodable {
    let userId: String
    let timestamp: String
    let heartRate: Double
    let movement: Double
    let wristTemperatureDelta: Double?
    let derivedStress: Double
    let ecgIrregularityScore: Double
    let source: String
    let state: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case heartRate = "heart_rate"
        case movement = "movement"
        case wristTemperatureDelta = "wrist_temperature_delta"
        case derivedStress = "derived_stress"
        case ecgIrregularityScore = "ecg_irregularity_score"
        case source = "source"
        case state = "state"
    }
}

nonisolated private struct RiskWindowInsertRecord: Encodable {
    let userId: String
    let timestamp: String
    let state: String
    let severity: Int
    let confidence: String
    let dominantDrivers: [String]
    let tags: [String]
    let interventionText: String
    let trainingLabel: String?
    let note: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case state = "state"
        case severity = "severity"
        case confidence = "confidence"
        case dominantDrivers = "dominant_drivers"
        case tags = "tags"
        case interventionText = "intervention_text"
        case trainingLabel = "training_label"
        case note = "note"
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
    let intakeSurveyResponses: [String: String]?
    let intakeSurveyCompleted: Bool?

    private enum CodingKeys: String, CodingKey {
        case id
        case dateOfBirth = "date_of_birth"
        case primaryConcerns = "primary_concerns"
        case intakeSurveyResponses = "intake_survey_responses"
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
        case theme
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
        case language
        case crisisContactName = "crisis_contact_name"
        case crisisContactPhone = "crisis_contact_phone"
    }
}

nonisolated struct RiskWindowRecord: Decodable {
    let userId: String?
    let timestamp: String?
    let state: String?
    let severity: Int?
    let confidence: String?
    let dominantDrivers: [String]?
    let tags: [String]?
    let interventionText: String?
    let trainingLabel: String?
    let note: String?

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp = "timestamp"
        case state = "state"
        case severity = "severity"
        case confidence = "confidence"
        case dominantDrivers = "dominant_drivers"
        case tags = "tags"
        case interventionText = "intervention_text"
        case trainingLabel = "training_label"
        case note = "note"
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
