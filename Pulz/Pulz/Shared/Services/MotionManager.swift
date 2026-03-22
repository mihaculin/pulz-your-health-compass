import CoreMotion
import Foundation

@MainActor
final class MotionManager {
    static let shared = MotionManager()

    private(set) var movementLevel: Double = 0.25

    private let manager = CMMotionActivityManager()
    private let pedometer = CMPedometer()

    func start() {
        if CMPedometer.isStepCountingAvailable() {
            pedometer.startUpdates(from: .now) { [weak self] data, _ in
                let distance = data?.distance?.doubleValue ?? 0
                Task { @MainActor in
                    self?.movementLevel = min(1, max(0.05, distance / 35))
                }
            }
        }

        guard CMMotionActivityManager.isActivityAvailable() else { return }
        manager.startActivityUpdates(to: .main) { [weak self] activity in
            let confidence = Double(activity?.confidence.rawValue ?? 1) / 2
            let movement: Double
            if activity?.running == true {
                movement = 1
            } else if activity?.walking == true {
                movement = 0.75
            } else if activity?.stationary == true {
                movement = 0.1
            } else {
                movement = 0.3 + confidence * 0.2
            }

            Task { @MainActor in
                self?.movementLevel = movement
            }
        }
    }

    func stop() {
        pedometer.stopUpdates()
        manager.stopActivityUpdates()
    }
}
