import Foundation

enum EmotionalState: String, CaseIterable, Codable {
    case calm = "Calm"
    case elevated = "Elevated"
    case highRisk = "High Risk"

    var supportiveText: String {
        switch self {
        case .calm:
            return "Your body looks settled right now. Keep moving gently with your day."
        case .elevated:
            return "Your body looks more activated than usual. A grounding step may help."
        case .highRisk:
            return "This may be a vulnerable window. A self-check is recommended."
        }
    }

    var riskSummary: String {
        switch self {
        case .calm:
            return "No elevated risk detected"
        case .elevated:
            return "Possible high-risk window"
        case .highRisk:
            return "Physiologic stress pattern"
        }
    }

    var severityLabel: String {
        switch self {
        case .calm:
            return "Stable"
        case .elevated:
            return "Watchful"
        case .highRisk:
            return "High"
        }
    }
}

enum ConfidenceLevel: String, Codable {
    case low = "Low confidence"
    case medium = "Medium confidence"
    case high = "High confidence"
}

enum ImpulseTag: String, CaseIterable, Codable, Identifiable {
    case stress = "Stress"
    case anxiety = "Anxiety"
    case overwhelm = "Overwhelm"
    case stressEating = "Stress eating"
    case urgeToIsolate = "Urge to isolate"
    case restlessness = "Restlessness"
    case emotionalDiscomfort = "Emotional discomfort"
    case resistedUrge = "Resisted urge"

    var id: String { rawValue }
}

enum RecoveryTool: String, CaseIterable, Identifiable {
    case breathing = "Breathe"
    case grounding = "Ground"
    case journal = "Journal this"

    var id: String { rawValue }

    var subtitle: String {
        switch self {
        case .breathing:
            return "Slow your physiology with a guided breathing cycle."
        case .grounding:
            return "Reconnect to the room and your senses."
        case .journal:
            return "Capture what this moment feels like before it passes."
        }
    }
}

enum TrainingLabel: String, CaseIterable, Codable, Identifiable {
    case confirmed = "Yes"
    case rejected = "No"
    case uncertain = "Not sure"

    var id: String { rawValue }

    nonisolated var storedValue: String {
        switch self {
        case .confirmed:
            return "confirmed_episode"
        case .rejected:
            return "no_episode"
        case .uncertain:
            return "uncertain"
        }
    }
}

struct TrainingPeriodStatus: Codable {
    let totalDays: Int
    let completedDays: Int
    let labelsCollected: Int
    let targetLabels: Int

    var isActive: Bool {
        completedDays < totalDays || labelsCollected < targetLabels
    }

    var daysRemaining: Int {
        max(0, totalDays - completedDays)
    }

    var progressValue: Double {
        let dayProgress = Double(completedDays) / Double(max(totalDays, 1))
        let labelProgress = Double(labelsCollected) / Double(max(targetLabels, 1))
        return min(1, (dayProgress + labelProgress) / 2)
    }
}

struct BiometricSample: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let heartRate: Double
    let movement: Double
    let wristTemperatureDelta: Double?
    let derivedStress: Double
    let ecgIrregularityScore: Double
    let source: DataOrigin

    init(
        id: UUID = UUID(),
        timestamp: Date,
        heartRate: Double,
        movement: Double,
        wristTemperatureDelta: Double?,
        derivedStress: Double,
        ecgIrregularityScore: Double,
        source: DataOrigin
    ) {
        self.id = id
        self.timestamp = timestamp
        self.heartRate = heartRate
        self.movement = movement
        self.wristTemperatureDelta = wristTemperatureDelta
        self.derivedStress = derivedStress
        self.ecgIrregularityScore = ecgIrregularityScore
        self.source = source
    }
}

enum DataOrigin: String, Codable {
    case live
    case blended
    case mock
}

enum ECGClassification: String, Codable {
    case sinusRhythm = "Sinus rhythm"
    case atrialFibrillation = "Atrial fibrillation"
    case inconclusive = "Inconclusive"
    case highHeartRate = "High heart rate"
    case lowHeartRate = "Low heart rate"
    case poorRecording = "Poor recording"
    case unavailable = "No manual ECG"

    var displayTone: String {
        switch self {
        case .sinusRhythm:
            return "Your latest manual ECG looked steady."
        case .atrialFibrillation, .highHeartRate, .lowHeartRate:
            return "A manual ECG adds useful context to recent baseline shifts."
        case .inconclusive, .poorRecording:
            return "Your latest ECG didn’t provide a clear pattern."
        case .unavailable:
            return "No manual ECG has been recorded yet."
        }
    }

    var contributesToRisk: Bool {
        switch self {
        case .atrialFibrillation, .highHeartRate, .lowHeartRate:
            return true
        case .sinusRhythm, .inconclusive, .poorRecording, .unavailable:
            return false
        }
    }
}

struct ManualECGReading: Codable {
    let timestamp: Date
    let classification: ECGClassification
    let averageHeartRate: Double?
    let symptomsLogged: Bool
    let source: DataOrigin
}

struct EventNote: Codable {
    let text: String
}

struct ImpulseEvent: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let state: EmotionalState
    let severity: Int
    let note: EventNote?
    let tags: [ImpulseTag]
    let confidence: ConfidenceLevel
    let dominantDrivers: [String]
    let interventionText: String
    var trainingLabel: TrainingLabel?

    init(
        id: UUID = UUID(),
        timestamp: Date,
        state: EmotionalState,
        severity: Int,
        note: EventNote? = nil,
        tags: [ImpulseTag],
        confidence: ConfidenceLevel,
        dominantDrivers: [String],
        interventionText: String,
        trainingLabel: TrainingLabel? = nil
    ) {
        self.id = id
        self.timestamp = timestamp
        self.state = state
        self.severity = severity
        self.note = note
        self.tags = tags
        self.confidence = confidence
        self.dominantDrivers = dominantDrivers
        self.interventionText = interventionText
        self.trainingLabel = trainingLabel
    }
}

struct TriggerInsight: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
}

struct WeeklySummary {
    let stabilityScore: Int
    let alertsCount: Int
    let improvementText: String
    let encouragement: String
}

struct DashboardSnapshot {
    let state: EmotionalState
    let latestSample: BiometricSample
    let trends: [BiometricSample]
    let events: [ImpulseEvent]
    let insights: [TriggerInsight]
    let weeklySummary: WeeklySummary
    let selectedTag: ImpulseTag?
    let manualECG: ManualECGReading?
    let trainingStatus: TrainingPeriodStatus
    let processingModeText: String
}

extension DashboardSnapshot {
    static func placeholder(now: Date = .now) -> DashboardSnapshot {
        let sample = BiometricSample(
            timestamp: now,
            heartRate: 74,
            movement: 0.3,
            wristTemperatureDelta: 0.1,
            derivedStress: 0.24,
            ecgIrregularityScore: 0.12,
            source: .mock
        )

        let event = ImpulseEvent(
            timestamp: now.addingTimeInterval(-5_400),
            state: .elevated,
            severity: 2,
            note: EventNote(text: "Paused, stepped outside, and the window softened."),
            tags: [.stress, .resistedUrge],
            confidence: .medium,
            dominantDrivers: ["HR above baseline", "Low movement"],
            interventionText: "Would a grounding step help right now?"
        )

        return DashboardSnapshot(
            state: .calm,
            latestSample: sample,
            trends: [sample],
            events: [event],
            insights: [
                TriggerInsight(title: "Most vulnerable", detail: "Evening stillness remains your most sensitive window."),
                TriggerInsight(title: "Body pattern", detail: "Stress rises after longer periods of inactivity."),
                TriggerInsight(title: "Learning mode", detail: "PULZ is still learning what feels accurate for you.")
            ],
            weeklySummary: WeeklySummary(
                stabilityScore: 82,
                alertsCount: 4,
                improvementText: "You’re responding earlier than last week.",
                encouragement: "Small pauses are adding up. That matters."
            ),
            selectedTag: .stress,
            manualECG: ManualECGReading(
                timestamp: now.addingTimeInterval(-86_400),
                classification: .inconclusive,
                averageHeartRate: 78,
                symptomsLogged: false,
                source: .mock
            ),
            trainingStatus: TrainingPeriodStatus(totalDays: 14, completedDays: 5, labelsCollected: 3, targetLabels: 10),
            processingModeText: "Wellness insights only. PULZ does not diagnose or treat medical or psychiatric conditions."
        )
    }
}
