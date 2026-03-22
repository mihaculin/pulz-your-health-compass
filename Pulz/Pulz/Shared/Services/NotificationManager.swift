import Foundation
import UserNotifications

@MainActor
final class NotificationManager {
    static let shared = NotificationManager()

    func requestAuthorization() async {
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func sendImpulseAlert(for state: EmotionalState, followUp: Bool = false) async {
        let content = UNMutableNotificationContent()
        content.title = followUp ? "PULZ follow-up" : "PULZ self-check"
        content.body = followUp
            ? "How accurate was that risk window? Your answer helps PULZ learn during training."
            : state.supportiveText
        content.sound = .default

        let identifier = followUp ? "pulz.followup.\(UUID().uuidString)" : "pulz.alert.\(UUID().uuidString)"
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: followUp ? 50 : 1, repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        try? await UNUserNotificationCenter.current().add(request)
    }
}
