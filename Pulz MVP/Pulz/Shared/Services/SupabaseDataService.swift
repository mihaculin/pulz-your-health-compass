import Foundation
#if os(iOS) && canImport(Supabase)
import Supabase
#endif

#if os(iOS) && canImport(Supabase)
@MainActor
final class SupabaseDataService {
    static let shared = SupabaseDataService(configuration: .live)

    private let client: SupabaseClient

    init(configuration: SupabaseConfiguration) {
        guard let url = configuration.projectURL else {
            fatalError("Supabase project URL is missing.")
        }
        self.client = SupabaseClient(supabaseURL: url, supabaseKey: configuration.anonKey)
    }

    func fetchLatestSensorSample(userId: String) async -> SupabaseSensorSampleRecord? {
        do {
            let response: PostgrestResponse<[SupabaseSensorSampleRecord]> = try await client
                .from("sensor_samples")
                .select()
                .eq("user_id", value: userId)
                .order("timestamp", ascending: false)
                .limit(1)
                .execute()
            return response.value.first
        } catch {
            return nil
        }
    }

    func fetchTodaySensorSamples(userId: String) async -> [SupabaseSensorSampleRecord] {
        do {
            let startOfDay = Calendar.current.startOfDay(for: Date())
            let response: PostgrestResponse<[SupabaseSensorSampleRecord]> = try await client
                .from("sensor_samples")
                .select("timestamp, heart_rate, stress_score, skin_temperature_delta, activity_state, confidence")
                .eq("user_id", value: userId)
                .gte("timestamp", value: SupabaseDateFormatter.isoString(startOfDay))
                .order("timestamp", ascending: true)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    func fetchLatestRiskWindow(userId: String) async -> SupabaseRiskWindowRecord? {
        do {
            let response: PostgrestResponse<[SupabaseRiskWindowRecord]> = try await client
                .from("risk_windows")
                .select()
                .eq("user_id", value: userId)
                .order("started_at", ascending: false)
                .limit(1)
                .execute()
            return response.value.first
        } catch {
            return nil
        }
    }

    func fetchTodaySelfReports(userId: String) async -> [SupabaseSelfReportRecord] {
        do {
            let startOfDay = Calendar.current.startOfDay(for: Date())
            let response: PostgrestResponse<[SupabaseSelfReportRecord]> = try await client
                .from("self_reports")
                .select()
                .eq("user_id", value: userId)
                .gte("timestamp", value: SupabaseDateFormatter.isoString(startOfDay))
                .order("timestamp", ascending: false)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    func fetchRecentSelfReports(userId: String, limit: Int) async -> [SupabaseSelfReportRecord] {
        do {
            let response: PostgrestResponse<[SupabaseSelfReportRecord]> = try await client
                .from("self_reports")
                .select()
                .eq("user_id", value: userId)
                .order("timestamp", ascending: false)
                .limit(limit)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    func fetchSelfReports(userId: String, since: Date) async -> [SupabaseSelfReportRecord] {
        do {
            let response: PostgrestResponse<[SupabaseSelfReportRecord]> = try await client
                .from("self_reports")
                .select()
                .eq("user_id", value: userId)
                .gte("timestamp", value: SupabaseDateFormatter.isoString(since))
                .order("timestamp", ascending: true)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    func insertSelfReport(_ record: SupabaseSelfReportInsert, userId: String) async throws {
        try await client
            .from("self_reports")
            .insert(record.withUserId(userId))
            .execute()
    }

    func fetchProgressSnapshots(userId: String, limit: Int) async -> [SupabaseProgressSnapshotRecord] {
        do {
            let response: PostgrestResponse<[SupabaseProgressSnapshotRecord]> = try await client
                .from("user_progress_snapshots")
                .select()
                .eq("user_id", value: userId)
                .order("snapshot_date", ascending: false)
                .limit(limit)
                .execute()
            return response.value
        } catch {
            return []
        }
    }

    func fetchPersonalisationSettings(userId: String) async -> SupabasePersonalisationSettingsRecord? {
        do {
            let response: PostgrestResponse<[SupabasePersonalisationSettingsRecord]> = try await client
                .from("personalisation_settings")
                .select()
                .eq("user_id", value: userId)
                .limit(1)
                .execute()
            return response.value.first
        } catch {
            return nil
        }
    }

    func upsertPersonalisationSettings(_ record: SupabasePersonalisationSettingsUpsert, userId: String) async throws {
        try await client
            .from("personalisation_settings")
            .upsert(record.withUserId(userId))
            .execute()
    }

    func upsertClientProfile(_ record: SupabaseClientProfileUpsert, userId: String) async throws {
        try await client
            .from("client_profiles")
            .upsert(record.withUserId(userId))
            .execute()
    }

    func upsertProfile(_ record: SupabaseProfileUpsert, userId: String) async throws {
        try await client
            .from("profiles")
            .upsert(record.withUserId(userId))
            .execute()
    }

    func fetchDeviceConnection(userId: String) async -> SupabaseDeviceConnectionRecord? {
        do {
            let response: PostgrestResponse<[SupabaseDeviceConnectionRecord]> = try await client
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

    func channel(name: String) -> RealtimeChannelV2 {
        client.channel(name)
    }

    func removeChannel(_ channel: RealtimeChannelV2) async {
        await client.removeChannel(channel)
    }
}
#endif

struct SupabaseDateFormatter {
    static let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static func isoString(_ date: Date) -> String {
        iso.string(from: date)
    }

    static func date(from string: String) -> Date? {
        iso.date(from: string) ?? ISO8601DateFormatter().date(from: string)
    }
}

struct SupabaseSensorSampleRecord: Decodable, Sendable {
    let timestamp: String
    let heartRate: Double?
    let stressScore: Double?
    let skinTemperatureDelta: Double?
    let activityState: String?
    let confidence: String?

    private enum CodingKeys: String, CodingKey {
        case timestamp = "timestamp"
        case heartRate = "heart_rate"
        case stressScore = "stress_score"
        case skinTemperatureDelta = "skin_temperature_delta"
        case activityState = "activity_state"
        case confidence = "confidence"
    }
}

struct SupabaseRiskWindowRecord: Decodable, Sendable {
    let startedAt: String?
    let urgeRiskScore: Double?
    let bingeRiskScore: Double?
    let confidenceLevel: String?
    let dominantDrivers: [String]?
    let recommendedAction: String?

    private enum CodingKeys: String, CodingKey {
        case startedAt = "started_at"
        case urgeRiskScore = "urge_risk_score"
        case bingeRiskScore = "binge_risk_score"
        case confidenceLevel = "confidence_level"
        case dominantDrivers = "dominant_drivers"
        case recommendedAction = "recommended_action"
    }
}

struct SupabaseSelfReportRecord: Decodable, Sendable, Identifiable {
    let id: String?
    let timestamp: String
    let urgeLevel: Double?
    let triggers: [String]?
    let emotionalState: [String]?
    let bingeOccurred: Bool?
    let purgeOccurred: Bool?
    let notes: String?

    private enum CodingKeys: String, CodingKey {
        case id
        case timestamp
        case urgeLevel = "urge_level"
        case triggers
        case emotionalState = "emotional_state"
        case bingeOccurred = "binge_occurred"
        case purgeOccurred = "purge_occurred"
        case notes
    }
}

struct SupabaseSelfReportInsert: Encodable, Sendable {
    let timestamp: String
    let urgeLevel: Double
    let bingeOccurred: Bool
    let purgeOccurred: Bool
    let overeatingOccurred: Bool
    let mealSkipped: Bool
    let anxietyLevel: Double
    let shameLevel: Double
    let lonelinessLevel: Double
    let emotionalState: [String]
    let triggers: [String]
    let notes: String

    private enum CodingKeys: String, CodingKey {
        case timestamp
        case urgeLevel = "urge_level"
        case bingeOccurred = "binge_occurred"
        case purgeOccurred = "purge_occurred"
        case overeatingOccurred = "overeating_occurred"
        case mealSkipped = "meal_skipped"
        case anxietyLevel = "anxiety_level"
        case shameLevel = "shame_level"
        case lonelinessLevel = "loneliness_level"
        case emotionalState = "emotional_state"
        case triggers
        case notes
    }

    func withUserId(_ userId: String) -> SupabaseSelfReportInsertWithUserId {
        SupabaseSelfReportInsertWithUserId(
            userId: userId,
            timestamp: timestamp,
            urgeLevel: urgeLevel,
            bingeOccurred: bingeOccurred,
            purgeOccurred: purgeOccurred,
            overeatingOccurred: overeatingOccurred,
            mealSkipped: mealSkipped,
            anxietyLevel: anxietyLevel,
            shameLevel: shameLevel,
            lonelinessLevel: lonelinessLevel,
            emotionalState: emotionalState,
            triggers: triggers,
            notes: notes
        )
    }
}

struct SupabaseSelfReportInsertWithUserId: Encodable, Sendable {
    let userId: String
    let timestamp: String
    let urgeLevel: Double
    let bingeOccurred: Bool
    let purgeOccurred: Bool
    let overeatingOccurred: Bool
    let mealSkipped: Bool
    let anxietyLevel: Double
    let shameLevel: Double
    let lonelinessLevel: Double
    let emotionalState: [String]
    let triggers: [String]
    let notes: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case timestamp
        case urgeLevel = "urge_level"
        case bingeOccurred = "binge_occurred"
        case purgeOccurred = "purge_occurred"
        case overeatingOccurred = "overeating_occurred"
        case mealSkipped = "meal_skipped"
        case anxietyLevel = "anxiety_level"
        case shameLevel = "shame_level"
        case lonelinessLevel = "loneliness_level"
        case emotionalState = "emotional_state"
        case triggers
        case notes
    }
}

struct SupabaseProgressSnapshotRecord: Decodable, Sendable {
    let snapshotDate: String?
    let totalEntries: Int?
    let avgUrgeLevel: Double?
    let mostCommonTrigger: String?
    let mostCommonEmotion: String?
    let calmDays: Int?

    private enum CodingKeys: String, CodingKey {
        case snapshotDate = "snapshot_date"
        case totalEntries = "total_entries"
        case avgUrgeLevel = "avg_urge_level"
        case mostCommonTrigger = "most_common_trigger"
        case mostCommonEmotion = "most_common_emotion"
        case calmDays = "calm_days"
    }
}

struct SupabasePersonalisationSettingsRecord: Decodable, Sendable {
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

struct SupabasePersonalisationSettingsUpsert: Encodable, Sendable {
    let theme: String
    let accentColor: String
    let messageTone: String
    let interventionMessage1: String
    let interventionMessage2: String
    let interventionMessage3: String
    let vibrationPattern: String
    let vibrationIntensity: Double
    let soundEnabled: Bool
    let soundType: String
    let soundVolume: Double
    let language: String
    let crisisContactName: String
    let crisisContactPhone: String

    private enum CodingKeys: String, CodingKey {
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

    func withUserId(_ userId: String) -> SupabasePersonalisationSettingsUpsertWithUserId {
        SupabasePersonalisationSettingsUpsertWithUserId(
            userId: userId,
            theme: theme,
            accentColor: accentColor,
            messageTone: messageTone,
            interventionMessage1: interventionMessage1,
            interventionMessage2: interventionMessage2,
            interventionMessage3: interventionMessage3,
            vibrationPattern: vibrationPattern,
            vibrationIntensity: vibrationIntensity,
            soundEnabled: soundEnabled,
            soundType: soundType,
            soundVolume: soundVolume,
            language: language,
            crisisContactName: crisisContactName,
            crisisContactPhone: crisisContactPhone
        )
    }
}

struct SupabasePersonalisationSettingsUpsertWithUserId: Encodable, Sendable {
    let userId: String
    let theme: String
    let accentColor: String
    let messageTone: String
    let interventionMessage1: String
    let interventionMessage2: String
    let interventionMessage3: String
    let vibrationPattern: String
    let vibrationIntensity: Double
    let soundEnabled: Bool
    let soundType: String
    let soundVolume: Double
    let language: String
    let crisisContactName: String
    let crisisContactPhone: String

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

struct SupabaseClientProfileUpsert: Encodable, Sendable {
    let dateOfBirth: String?
    let heightCm: Double?
    let weightKg: Double?
    let primaryConcerns: [String]?
    let intakeSurveyResponses: [String: String]?
    let coOccurringConditions: [String]?
    let intakeSurveyCompleted: Bool?

    private enum CodingKeys: String, CodingKey {
        case dateOfBirth = "date_of_birth"
        case heightCm = "height_cm"
        case weightKg = "weight_kg"
        case primaryConcerns = "primary_concerns"
        case intakeSurveyResponses = "intake_survey_responses"
        case coOccurringConditions = "co_occurring_conditions"
        case intakeSurveyCompleted = "intake_survey_completed"
    }

    func withUserId(_ userId: String) -> SupabaseClientProfileUpsertWithUserId {
        SupabaseClientProfileUpsertWithUserId(
            id: userId,
            dateOfBirth: dateOfBirth,
            heightCm: heightCm,
            weightKg: weightKg,
            primaryConcerns: primaryConcerns,
            intakeSurveyResponses: intakeSurveyResponses,
            coOccurringConditions: coOccurringConditions,
            intakeSurveyCompleted: intakeSurveyCompleted
        )
    }
}

struct SupabaseClientProfileUpsertWithUserId: Encodable, Sendable {
    let id: String
    let dateOfBirth: String?
    let heightCm: Double?
    let weightKg: Double?
    let primaryConcerns: [String]?
    let intakeSurveyResponses: [String: String]?
    let coOccurringConditions: [String]?
    let intakeSurveyCompleted: Bool?

    private enum CodingKeys: String, CodingKey {
        case id
        case dateOfBirth = "date_of_birth"
        case heightCm = "height_cm"
        case weightKg = "weight_kg"
        case primaryConcerns = "primary_concerns"
        case intakeSurveyResponses = "intake_survey_responses"
        case coOccurringConditions = "co_occurring_conditions"
        case intakeSurveyCompleted = "intake_survey_completed"
    }
}

struct SupabaseProfileUpsert: Encodable, Sendable {
    let fullName: String

    private enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
    }

    func withUserId(_ userId: String) -> SupabaseProfileUpsertWithUserId {
        SupabaseProfileUpsertWithUserId(userId: userId, fullName: fullName)
    }
}

struct SupabaseProfileUpsertWithUserId: Encodable, Sendable {
    let userId: String
    let fullName: String

    private enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case fullName = "full_name"
    }
}

struct SupabaseDeviceConnectionRecord: Decodable, Sendable {
    let deviceType: String?
    let lastSync: String?
    let isActive: Bool?

    private enum CodingKeys: String, CodingKey {
        case deviceType = "device_type"
        case lastSync = "last_sync"
        case isActive = "is_active"
    }
}
