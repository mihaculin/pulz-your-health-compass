import Foundation
import WatchConnectivity

@MainActor
final class ConnectivitySession: NSObject {
    static let shared = ConnectivitySession()

    private(set) var receivedSample: BiometricSample?
    private(set) var receivedEvent: ImpulseEvent?

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    override init() {
        super.init()
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        activateIfSupported()
    }

    func activateIfSupported() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func send(sample: BiometricSample, state: EmotionalState) {
        guard WCSession.default.activationState == .activated else { return }
        let payload = encode(sample)
        var message: [String: Any] = ["state": state.rawValue]
        if let payload {
            message["sample"] = payload
        }
        WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)
        try? WCSession.default.updateApplicationContext(message)
    }

    func send(event: ImpulseEvent) {
        guard WCSession.default.activationState == .activated else { return }
        guard let payload = encode(event) else { return }
        let message: [String: Any] = ["event": payload]
        WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: nil)
        try? WCSession.default.updateApplicationContext(message)
    }

    private func handle(message: [String: Any]) {
        if let payload = message["sample"] as? Data,
           let sample = try? decoder.decode(BiometricSample.self, from: payload) {
            receivedSample = sample
        }

        if let payload = message["event"] as? Data,
           let event = try? decoder.decode(ImpulseEvent.self, from: payload) {
            receivedEvent = event
        }
    }

    private func encode<T: Encodable>(_ value: T) -> Data? {
        try? encoder.encode(value)
    }
}

extension ConnectivitySession: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: (any Error)?) {}

#if os(iOS)
    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}
    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
#endif

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            handle(message: message)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            handle(message: applicationContext)
        }
    }
}
