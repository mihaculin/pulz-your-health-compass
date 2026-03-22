import Foundation

struct MockSignalGenerator {
    func makeHistory(now: Date = .now, count: Int = 36) -> [BiometricSample] {
        (0..<count).map { index in
            let minutesAgo = Double((count - index) * 20)
            let timestamp = now.addingTimeInterval(-minutesAgo * 60)
            let normalized = Double(index) / Double(max(count - 1, 1))
            let eveningBias = normalized > 0.6 ? 0.16 : 0
            let wave = (sin(normalized * .pi * 2.3) + 1) * 0.5
            let heartRate = 70 + wave * 16 + eveningBias * 25
            let movement = max(0.05, 0.7 - wave * 0.45 - eveningBias)
            let stress = min(1, 0.18 + wave * 0.5 + eveningBias)
            let ecg = min(1, 0.12 + max(0, wave - 0.58) * 1.2)
            let temperature = normalized > 0.75 ? 0.28 : 0.1 + wave * 0.08

            return BiometricSample(
                timestamp: timestamp,
                heartRate: heartRate,
                movement: movement,
                wristTemperatureDelta: temperature,
                derivedStress: stress,
                ecgIrregularityScore: ecg,
                source: .mock
            )
        }
    }

    func nextSample(from previous: BiometricSample?, now: Date = .now) -> BiometricSample {
        let seed = now.timeIntervalSince1970.truncatingRemainder(dividingBy: 60)
        let drift = sin(seed / 60 * .pi * 2)
        let previousHeartRate = previous?.heartRate ?? 74
        let nextHeartRate = max(56, min(128, previousHeartRate + drift * 4))
        let movement = max(0.05, min(1, (previous?.movement ?? 0.34) + cos(seed / 60 * .pi * 2) * 0.08))
        let temperature = ((previous?.wristTemperatureDelta ?? 0.15) + drift * 0.02)
        let stress = min(1, max(0.08, 0.2 + abs(drift) * 0.45))

        return BiometricSample(
            timestamp: now,
            heartRate: nextHeartRate,
            movement: movement,
            wristTemperatureDelta: temperature,
            derivedStress: stress,
            ecgIrregularityScore: min(1, stress * 0.76),
            source: .mock
        )
    }
}
