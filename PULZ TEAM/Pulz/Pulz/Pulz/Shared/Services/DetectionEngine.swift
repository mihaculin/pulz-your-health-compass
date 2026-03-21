import Foundation

struct DetectionOutput {
    let state: EmotionalState
    let confidence: ConfidenceLevel
    let event: ImpulseEvent?
}

struct DetectionEngine {
    func evaluate(
        samples: [BiometricSample],
        baselineHeartRate: Double,
        manualECG: ManualECGReading?,
        activeTag: ImpulseTag?
    ) -> DetectionOutput {
        guard let latestSample = samples.last else {
            return DetectionOutput(state: .calm, confidence: .low, event: nil)
        }

        let baselineDelta = latestSample.heartRate - baselineHeartRate
        let lowMovement = latestSample.movement < 0.35
        let temperatureElevated = (latestSample.wristTemperatureDelta ?? 0) > 0.24
        let repeatedSpikes = samples.suffix(6).filter { $0.heartRate - baselineHeartRate > 14 }.count >= 3
        let ecgConcern = manualECG?.classification.contributesToRisk == true
        let ecgPattern = latestSample.ecgIrregularityScore > 0.72

        let triggers = [
            baselineDelta > 11,
            lowMovement,
            temperatureElevated,
            repeatedSpikes,
            ecgConcern || ecgPattern
        ]
        let score = triggers.filter { $0 }.count

        let state: EmotionalState
        let confidence: ConfidenceLevel
        if score >= 4 {
            state = .highRisk
            confidence = .high
        } else if score >= 2 {
            state = .elevated
            confidence = .medium
        } else {
            state = .calm
            confidence = .low
        }

        guard state != .calm else {
            return DetectionOutput(state: state, confidence: confidence, event: nil)
        }

        var drivers: [String] = []
        if baselineDelta > 11 { drivers.append("HR above baseline") }
        if lowMovement { drivers.append("Stillness") }
        if temperatureElevated { drivers.append("Temperature shift") }
        if repeatedSpikes { drivers.append("Repeated spikes") }
        if ecgConcern { drivers.append("Manual ECG context") }
        if drivers.isEmpty { drivers.append("Personal baseline deviation") }

        let event = ImpulseEvent(
            timestamp: latestSample.timestamp,
            state: state,
            severity: state == .highRisk ? 3 : 2,
            note: nil,
            tags: activeTag.map { [$0] } ?? [.stress, .emotionalDiscomfort],
            confidence: confidence,
            dominantDrivers: Array(drivers.prefix(3)),
            interventionText: state == .highRisk
                ? "This may be a vulnerable window. Would a grounding step help right now?"
                : "Your body looks more activated than usual. A short pause may help."
        )

        return DetectionOutput(state: state, confidence: confidence, event: event)
    }
}
