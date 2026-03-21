import Foundation
import Observation

@MainActor
@Observable
final class AppSessionViewModel {
    enum Screen {
        case welcome
        case signIn
        case signUp
        case onboarding
        case dashboard
    }

    enum OnboardingStep: Int, CaseIterable {
        case aboutYou
        case relationshipWithFood
        case emotionalPatterns
        case physicalHealth
        case connectDevice
        case personalise
        case safety

        var title: String {
            switch self {
            case .aboutYou:
                return "About you"
            case .relationshipWithFood:
                return "Your relationship with food"
            case .emotionalPatterns:
                return "Emotional patterns"
            case .physicalHealth:
                return "Physical health"
            case .connectDevice:
                return "Connect your device"
            case .personalise:
                return "Personalise your PULZ"
            case .safety:
                return "Safety setup"
            }
        }
    }

    var screen: Screen = .welcome
    var email = ""
    var password = ""
    var fullName = "Andrada"
    var consentGiven = false
    var isAuthenticated = false
    var roleLabel = "Client"
    var onboardingCompleted = false
    var onboardingStep: OnboardingStep = .aboutYou
    var authErrorMessage: String?
    var isSubmitting = false
    private(set) var account: AuthAccount?

    var dateOfBirth = Date.now.addingTimeInterval(-86400 * 365 * 27)
    var heightText = ""
    var weightText = ""
    var tracksCycle = false
    var heightUnit = "cm"
    var weightUnit = "kg"
    var selectedConcerns: Set<String> = ["None of the above"]
    var emotionalRatings: [String: Double] = [
        "Anxiety": 3,
        "Stress": 3,
        "Low mood": 3,
        "Irritability": 3
    ]
    var vulnerableTimes: Set<String> = ["Evening"]
    var commonTriggers: Set<String> = ["Work stress", "Loneliness"]
    var selectedPhysicalHealthItems: Set<String> = []
    var conditionsText = ""
    var worksWithSpecialist = false
    var specialistCode = ""
    var medicationsText = ""
    var selectedDevice = "Apple Watch"
    var selectedTheme = "Aqua Bloom"
    var selectedTone = "Gentle"
    var firstSupportMessage = "Take a slow breath. You're safe right now."
    var crisisContactName = ""
    var crisisContactPhone = ""
    var safetyConsent = false

    let concernOptions = [
        "Binge eating",
        "Restrictive eating",
        "Emotional eating",
        "Purging behaviours",
        "Overeating",
        "Food anxiety",
        "Body image concerns",
        "None of the above"
    ]

    let triggerOptions = [
        "Work stress",
        "Relationships",
        "Loneliness",
        "Financial stress",
        "Health concerns",
        "Body image",
        "Social situations",
        "Other"
    ]

    let timeOptions = ["Morning", "Afternoon", "Evening", "Night", "Varies"]
    let deviceOptions = ["Apple Watch", "Garmin", "Fitbit", "Samsung Health", "I'll connect later"]
    let toneOptions = ["Gentle", "Direct", "Clinical"]
    let themeOptions = ["Aqua Bloom", "Rose Mist", "Sky Pearl", "Forest Dew"]
    let physicalHealthOptions = [
        "Diabetes",
        "PCOS",
        "IBS / digestive issues",
        "Thyroid condition",
        "Chronic pain",
        "Mental health diagnosis",
        "None"
    ]
    private let environment: AppEnvironment

    init(environment: AppEnvironment? = nil) {
        self.environment = environment ?? .local
    }

    func showSignIn() {
        screen = .signIn
    }

    func showSignUp() {
        screen = .signUp
    }

    func goBackToWelcome() {
        screen = .welcome
    }

    func authenticate() async {
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let account = try await environment.authService.signIn(email: email, password: password)
            self.account = account
            fullName = account.fullName
            authErrorMessage = nil
            isAuthenticated = true
            screen = onboardingCompleted ? .dashboard : .onboarding
        } catch {
            authErrorMessage = error.localizedDescription
        }
    }

    func createAccount() async {
        guard consentGiven else {
            authErrorMessage = "Consent is required before creating an account."
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let account = try await environment.authService.signUp(email: email, password: password, fullName: fullName)
            self.account = account
            authErrorMessage = nil
            isAuthenticated = true
            screen = .onboarding
        } catch {
            authErrorMessage = error.localizedDescription
        }
    }

    func goToNextOnboardingStep() async {
        guard let currentIndex = OnboardingStep.allCases.firstIndex(of: onboardingStep) else { return }
        if currentIndex < OnboardingStep.allCases.count - 1 {
            onboardingStep = OnboardingStep.allCases[currentIndex + 1]
        } else {
            if let account {
                let payload = IntakePayload(
                    fullName: fullName,
                    dateOfBirth: dateOfBirth,
                    selectedConcerns: Array(selectedConcerns),
                    commonTriggers: Array(commonTriggers),
                    selectedDevice: selectedDevice,
                    selectedTheme: selectedTheme,
                    selectedTone: selectedTone,
                    supportMessage: firstSupportMessage
                )
                try? await environment.intakeSyncService.saveIntake(payload, for: account)
            }
            onboardingCompleted = true
            screen = .dashboard
        }
    }

    func goToPreviousOnboardingStep() {
        guard let currentIndex = OnboardingStep.allCases.firstIndex(of: onboardingStep), currentIndex > 0 else {
            screen = .signUp
            return
        }
        onboardingStep = OnboardingStep.allCases[currentIndex - 1]
    }

    func toggleConcern(_ concern: String) {
        if concern == "None of the above" {
            selectedConcerns = [concern]
            return
        }
        selectedConcerns.remove("None of the above")
        if selectedConcerns.contains(concern) {
            selectedConcerns.remove(concern)
        } else {
            selectedConcerns.insert(concern)
        }
    }

    func toggleTrigger(_ trigger: String) {
        if commonTriggers.contains(trigger) {
            commonTriggers.remove(trigger)
        } else {
            commonTriggers.insert(trigger)
        }
    }

    func setHeightUnit(_ unit: String) {
        heightUnit = unit
    }

    func setWeightUnit(_ unit: String) {
        weightUnit = unit
    }

    func togglePhysicalHealth(_ item: String) {
        if item == "None" {
            selectedPhysicalHealthItems = [item]
            return
        }
        selectedPhysicalHealthItems.remove("None")
        if selectedPhysicalHealthItems.contains(item) {
            selectedPhysicalHealthItems.remove(item)
        } else {
            selectedPhysicalHealthItems.insert(item)
        }
    }

    func toggleVulnerableTime(_ time: String) {
        if vulnerableTimes.contains(time) {
            vulnerableTimes.remove(time)
        } else {
            vulnerableTimes.insert(time)
        }
    }

    func signOut() async {
        await environment.authService.signOut()
        isAuthenticated = false
        screen = .welcome
        email = ""
        password = ""
        account = nil
    }
}
