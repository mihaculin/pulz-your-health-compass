import Foundation
import HealthKit

@MainActor
final class HealthKitManager {
    static let shared = HealthKitManager()

    private(set) var latestHeartRate: Double?
    private(set) var wristTemperatureDelta: Double?
    private(set) var latestManualECG: ManualECGReading?
    private(set) var latestHRV: Double?
    private(set) var latestRestingHeartRate: Double?
    private(set) var latestStepCount: Double?
    private(set) var latestActiveEnergy: Double?
    private(set) var latestExerciseMinutes: Double?
    private(set) var latestSleepState: String?
    private(set) var authorizationGranted = false

    private let store = HKHealthStore()
    private var observerQueries: [HKObserverQuery] = []

    func requestAuthorization() async {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let readTypes = Set<HKObjectType>([
            HKObjectType.quantityType(forIdentifier: .heartRate),
            HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature),
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            HKObjectType.quantityType(forIdentifier: .restingHeartRate),
            HKObjectType.quantityType(forIdentifier: .stepCount),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
            HKObjectType.quantityType(forIdentifier: .appleExerciseTime),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
            HKObjectType.categoryType(forIdentifier: .irregularHeartRhythmEvent),
            HKObjectType.electrocardiogramType()
        ].compactMap { $0 })

        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            authorizationGranted = true
            await refreshLatestSignals()
            startObservers()
            enableBackgroundDelivery(for: readTypes)
        } catch {
            authorizationGranted = false
        }
    }

    func refreshLatestSignals() async {
        async let heartRate = fetchLatestHeartRate()
        async let temperature = fetchLatestWristTemperature()
        async let ecg = fetchLatestManualECG()
        async let hrv = fetchLatestHRV()
        async let restingHR = fetchLatestRestingHeartRate()
        async let steps = fetchLatestStepCount()
        async let activeEnergy = fetchLatestActiveEnergy()
        async let exerciseMinutes = fetchLatestExerciseMinutes()
        async let sleep = fetchLatestSleepState()
        latestHeartRate = await heartRate
        wristTemperatureDelta = await temperature
        latestManualECG = await ecg
        latestHRV = await hrv
        latestRestingHeartRate = await restingHR
        latestStepCount = await steps
        latestActiveEnergy = await activeEnergy
        latestExerciseMinutes = await exerciseMinutes
        latestSleepState = await sleep
    }

    private func startObservers() {
        observerQueries.forEach(store.stop)
        observerQueries.removeAll()

        let queryTypes: [HKSampleType] = [
            HKObjectType.quantityType(forIdentifier: .heartRate),
            HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature),
            HKObjectType.quantityType(forIdentifier: .heartRateVariabilitySDNN),
            HKObjectType.quantityType(forIdentifier: .restingHeartRate),
            HKObjectType.quantityType(forIdentifier: .stepCount),
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned),
            HKObjectType.quantityType(forIdentifier: .appleExerciseTime),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis),
            HKObjectType.electrocardiogramType()
        ].compactMap { $0 }

        for type in queryTypes {
            let query = HKObserverQuery(sampleType: type, predicate: nil) { [weak self] _, _, _ in
                Task { @MainActor in
                    await self?.refreshLatestSignals()
                }
            }
            store.execute(query)
            observerQueries.append(query)
        }
    }

    private func fetchLatestHeartRate() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return nil }
        return await fetchLatestQuantity(for: type, unit: HKUnit.count().unitDivided(by: .minute()))
    }

    private func fetchLatestWristTemperature() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .appleSleepingWristTemperature) else { return nil }
        return await fetchLatestQuantity(for: type, unit: .degreeCelsius())
    }

    private func fetchLatestHRV() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else { return nil }
        return await fetchLatestQuantity(for: type, unit: .secondUnit(with: .milli))
    }

    private func fetchLatestRestingHeartRate() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .restingHeartRate) else { return nil }
        return await fetchLatestQuantity(for: type, unit: HKUnit.count().unitDivided(by: .minute()))
    }

    private func fetchLatestStepCount() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .stepCount) else { return nil }
        return await fetchLatestQuantity(for: type, unit: .count())
    }

    private func fetchLatestActiveEnergy() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) else { return nil }
        return await fetchLatestQuantity(for: type, unit: .kilocalorie())
    }

    private func fetchLatestExerciseMinutes() async -> Double? {
        guard let type = HKQuantityType.quantityType(forIdentifier: .appleExerciseTime) else { return nil }
        return await fetchLatestQuantity(for: type, unit: .minute())
    }

    private func fetchLatestSleepState() async -> String? {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return nil }
        return await withCheckedContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                guard let sample = samples?.first as? HKCategorySample else {
                    continuation.resume(returning: nil)
                    return
                }
                let state: String
                switch HKCategoryValueSleepAnalysis(rawValue: sample.value) {
                case .asleepDeep:
                    state = "Deep"
                case .asleepCore:
                    state = "Core"
                case .asleepREM:
                    state = "REM"
                case .asleepUnspecified:
                    state = "Asleep"
                case .awake:
                    state = "Awake"
                case .inBed:
                    state = "In bed"
                default:
                    state = "Unknown"
                }
                continuation.resume(returning: state)
            }
            store.execute(query)
        }
    }

    private func fetchLatestManualECG() async -> ManualECGReading? {
        await withCheckedContinuation { continuation in
            let type = HKObjectType.electrocardiogramType()
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                guard let sample = samples?.first as? HKElectrocardiogram else {
                    continuation.resume(returning: nil)
                    return
                }

                let averageHeartRate = sample.averageHeartRate?.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
                let reading = ManualECGReading(
                    timestamp: sample.endDate,
                    classification: Self.map(classification: sample.classification),
                    averageHeartRate: averageHeartRate,
                    symptomsLogged: sample.symptomsStatus == .present,
                    source: .live
                )
                continuation.resume(returning: reading)
            }
            store.execute(query)
        }
    }

    private func fetchLatestQuantity(for type: HKQuantityType, unit: HKUnit) async -> Double? {
        await withCheckedContinuation { continuation in
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
                let quantity = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit)
                continuation.resume(returning: quantity)
            }
            store.execute(query)
        }
    }

    private func enableBackgroundDelivery(for types: Set<HKObjectType>) {
        for type in types {
            guard let sampleType = type as? HKSampleType else { continue }
            store.enableBackgroundDelivery(for: sampleType, frequency: .immediate) { _, _ in }
        }
    }

    nonisolated private static func map(classification: HKElectrocardiogram.Classification) -> ECGClassification {
        switch classification {
        case .sinusRhythm:
            return .sinusRhythm
        case .atrialFibrillation:
            return .atrialFibrillation
        case .inconclusiveLowHeartRate:
            return .lowHeartRate
        case .inconclusiveHighHeartRate:
            return .highHeartRate
        case .inconclusivePoorReading:
            return .poorRecording
        case .notSet:
            return .unavailable
        default:
            return .inconclusive
        }
    }
}
