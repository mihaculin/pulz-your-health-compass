import Foundation
import Observation
#if os(watchOS)
import WatchKit
#endif

@MainActor
@Observable
final class WatchSessionViewModel {
    var state: EmotionalState = .calm
    var latestSample: BiometricSample = DashboardSnapshot.placeholder().latestSample
    var alertMessage = "Monitoring gently in the background."
    var latestEvent: ImpulseEvent?
    var trainingStatus = DashboardSnapshot.placeholder().trainingStatus

    private let dashboardViewModel: PulzDashboardViewModel
    private let connectivity: ConnectivitySession

    init(
        dashboardViewModel: PulzDashboardViewModel? = nil,
        connectivity: ConnectivitySession? = nil
    ) {
        self.dashboardViewModel = dashboardViewModel ?? PulzDashboardViewModel()
        self.connectivity = connectivity ?? .shared
    }

    func start() async {
        await dashboardViewModel.start()
        await dashboardViewModel.refreshLiveState()
        syncFromDashboard()
        refreshFromConnectivity()
    }

    func refreshFromConnectivity() {
        if let sample = connectivity.receivedSample {
            latestSample = sample
        }
        if let event = connectivity.receivedEvent {
            state = event.state
            latestEvent = event
            alertMessage = event.interventionText
#if os(watchOS)
            WKInterfaceDevice.current().play(.notification)
#endif
        }
    }

    func triggerManualRefresh() async {
        await dashboardViewModel.refreshLiveState()
        syncFromDashboard()
        if state == .highRisk {
#if os(watchOS)
            WKInterfaceDevice.current().play(.directionUp)
#endif
            alertMessage = "Possible high-risk window"
        } else {
            alertMessage = state.supportiveText
        }
    }

    func breathe() {
        alertMessage = "Breathe in for 4. Out for 6. Stay with this cycle."
    }

    func dismiss() {
        state = .calm
        alertMessage = "Check-in dismissed. You can return any time."
    }

    func openOnPhone() {
        alertMessage = "Open the phone for your timeline, journal, and support tools."
    }

    func labelLatestEvent(_ label: TrainingLabel) {
        guard let latestEvent else { return }
        dashboardViewModel.labelEvent(latestEvent, as: label)
        syncFromDashboard()
        alertMessage = switch label {
        case .confirmed:
            "Thanks. That helps PULZ learn your baseline."
        case .rejected:
            "Logged as not accurate. PULZ will stay more conservative."
        case .uncertain:
            "Logged as uncertain. That still improves the training period."
        }
    }

    private func syncFromDashboard() {
        latestSample = dashboardViewModel.snapshot.latestSample
        state = dashboardViewModel.snapshot.state
        latestEvent = dashboardViewModel.snapshot.events.first
        trainingStatus = dashboardViewModel.snapshot.trainingStatus
    }
}
