import Foundation
import UserNotifications

@MainActor
final class NotificationManager {
    static let shared = NotificationManager()
    private let checkInIdentifier = "pulz.checkin.minute"

    func requestAuthorization() async {
        let center = UNUserNotificationCenter.current()
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
    }

    func scheduleCheckInEveryMinute() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [checkInIdentifier])

        let content = UNMutableNotificationContent()
        content.title = "PULZ check-in"
        content.body = "How are you feeling right now?"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: true)
        let request = UNNotificationRequest(identifier: checkInIdentifier, content: content, trigger: trigger)
        try? await center.add(request)
    }

    func cancelCheckInNotifications() async {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [checkInIdentifier])
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
