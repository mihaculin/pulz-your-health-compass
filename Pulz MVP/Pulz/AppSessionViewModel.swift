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
    var connectionStatusMessage: String?
    var isSubmitting = false
    private(set) var account: AuthAccount?
    private var hasAttemptedRestore = false

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
    var recentRiskWindows: [RiskWindowRecord] = []
    var recentInterventions: [InterventionEventRecord] = []

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
#if os(iOS) && canImport(Supabase)
    private let supabaseDataService = SupabaseDataService.shared
#endif

    init(environment: AppEnvironment? = nil) {
#if os(iOS)
        self.environment = environment ?? .live
#else
        self.environment = environment ?? .local
#endif
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
            let bootstrap = await environment.profileSyncService.fetchBootstrap(for: account)
            applyBootstrap(bootstrap)
            authErrorMessage = nil
            connectionStatusMessage = nil
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
            await environment.profileSyncService.prepareNewUser(account: account, fullName: fullName)
            let bootstrap = await environment.profileSyncService.fetchBootstrap(for: account)
            applyBootstrap(bootstrap)
            authErrorMessage = nil
            connectionStatusMessage = nil
            isAuthenticated = true
            screen = .onboarding
        } catch {
            authErrorMessage = error.localizedDescription
        }
    }

    func restoreSessionIfNeeded() async {
        guard !hasAttemptedRestore else { return }
        hasAttemptedRestore = true
        guard !isAuthenticated else { return }

        if let account = await environment.authService.currentAccount() {
            self.account = account
            fullName = account.fullName
            let bootstrap = await environment.profileSyncService.fetchBootstrap(for: account)
            applyBootstrap(bootstrap)
            isAuthenticated = true
            screen = onboardingCompleted ? .dashboard : .onboarding
        }
    }

    func testSupabaseConnection() async {
        connectionStatusMessage = "Checking Supabase connection..."
        let account = await environment.authService.currentAccount()
        if account != nil {
            connectionStatusMessage = "Supabase reachable. Active session detected."
        } else {
            connectionStatusMessage = "Supabase check complete. No active session (or offline)."
        }
    }

    func goToNextOnboardingStep() async {
        guard let currentIndex = OnboardingStep.allCases.firstIndex(of: onboardingStep) else { return }
        if let account {
            await syncOnboardingStep(onboardingStep, account: account)
        }

        if currentIndex < OnboardingStep.allCases.count - 1 {
            onboardingStep = OnboardingStep.allCases[currentIndex + 1]
        } else {
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

    private func syncOnboardingStep(_ step: OnboardingStep, account: AuthAccount) async {
#if os(iOS) && canImport(Supabase)
        let userId = account.id.uuidString
        switch step {
        case .aboutYou:
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: SupabaseDateFormatter.isoString(dateOfBirth),
                heightCm: parseNumeric(heightText),
                weightKg: parseNumeric(weightText),
                primaryConcerns: nil,
                intakeSurveyResponses: nil,
                coOccurringConditions: nil,
                intakeSurveyCompleted: nil
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        case .relationshipWithFood:
            let concerns = selectedConcerns.filter { $0 != "None of the above" }
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: nil,
                heightCm: nil,
                weightKg: nil,
                primaryConcerns: Array(concerns),
                intakeSurveyResponses: nil,
                coOccurringConditions: nil,
                intakeSurveyCompleted: nil
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        case .emotionalPatterns:
            let responses = makeSurveyResponses([
                "emotional_ratings": jsonString(emotionalRatings),
                "vulnerable_times": jsonString(Array(vulnerableTimes)),
                "common_triggers": jsonString(Array(commonTriggers))
            ])
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: nil,
                heightCm: nil,
                weightKg: nil,
                primaryConcerns: nil,
                intakeSurveyResponses: responses,
                coOccurringConditions: nil,
                intakeSurveyCompleted: nil
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        case .physicalHealth:
            let responses = makeSurveyResponses([
                "specialist_code": specialistCode,
                "conditions_text": conditionsText,
                "medications": medicationsText,
                "works_with_specialist": worksWithSpecialist ? "true" : "false"
            ])
            let conditions = selectedPhysicalHealthItems.filter { $0 != "None" }
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: nil,
                heightCm: nil,
                weightKg: nil,
                primaryConcerns: nil,
                intakeSurveyResponses: responses,
                coOccurringConditions: Array(conditions),
                intakeSurveyCompleted: nil
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        case .connectDevice:
            let responses = makeSurveyResponses([
                "preferred_device": selectedDevice
            ])
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: nil,
                heightCm: nil,
                weightKg: nil,
                primaryConcerns: nil,
                intakeSurveyResponses: responses,
                coOccurringConditions: nil,
                intakeSurveyCompleted: nil
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        case .personalise:
            let settings = SupabasePersonalisationSettingsUpsert(
                theme: selectedTheme,
                accentColor: "#4FD1C5",
                messageTone: selectedTone,
                interventionMessage1: firstSupportMessage,
                interventionMessage2: "",
                interventionMessage3: "",
                vibrationPattern: "Gentle pulse",
                vibrationIntensity: 3,
                soundEnabled: false,
                soundType: "default",
                soundVolume: 0.6,
                language: "Romanian",
                crisisContactName: crisisContactName,
                crisisContactPhone: crisisContactPhone
            )
            try? await supabaseDataService.upsertPersonalisationSettings(settings, userId: userId)
        case .safety:
            let settings = SupabasePersonalisationSettingsUpsert(
                theme: selectedTheme,
                accentColor: "#4FD1C5",
                messageTone: selectedTone,
                interventionMessage1: firstSupportMessage,
                interventionMessage2: "",
                interventionMessage3: "",
                vibrationPattern: "Gentle pulse",
                vibrationIntensity: 3,
                soundEnabled: false,
                soundType: "default",
                soundVolume: 0.6,
                language: "Romanian",
                crisisContactName: crisisContactName,
                crisisContactPhone: crisisContactPhone
            )
            try? await supabaseDataService.upsertPersonalisationSettings(settings, userId: userId)
            let record = SupabaseClientProfileUpsert(
                dateOfBirth: nil,
                heightCm: nil,
                weightKg: nil,
                primaryConcerns: nil,
                intakeSurveyResponses: nil,
                coOccurringConditions: nil,
                intakeSurveyCompleted: true
            )
            try? await supabaseDataService.upsertClientProfile(record, userId: userId)
        }
#else
        _ = step
        _ = account
#endif
    }

    private func parseNumeric(_ text: String) -> Double? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let normalized = trimmed.replacingOccurrences(of: ",", with: ".")
        return Double(normalized)
    }

    private func jsonString<T: Encodable>(_ value: T) -> String {
        guard let data = try? JSONEncoder().encode(value),
              let string = String(data: data, encoding: .utf8) else {
            return ""
        }
        return string
    }

    private func makeSurveyResponses(_ responses: [String: String]) -> [String: String]? {
        let filtered = responses.filter { !$0.value.isEmpty }
        return filtered.isEmpty ? nil : filtered
    }

    private func parseStringArray(from jsonString: String?) -> [String]? {
        guard let jsonString, let data = jsonString.data(using: .utf8) else { return nil }
        return (try? JSONDecoder().decode([String].self, from: data))
    }

    private func applyBootstrap(_ bootstrap: BootstrapSnapshot) {
        if let name = bootstrap.profile?.fullName {
            fullName = name
        }
        if let dateString = bootstrap.clientProfile?.dateOfBirth,
           let parsedDate = SupabasePayloadsHelper.isoDate(from: dateString) {
            dateOfBirth = parsedDate
        }
        if let concerns = bootstrap.clientProfile?.primaryConcerns, !concerns.isEmpty {
            selectedConcerns = Set(concerns)
        }
        if let responses = bootstrap.clientProfile?.intakeSurveyResponses {
            if let triggers = parseStringArray(from: responses["common_triggers"]), !triggers.isEmpty {
                commonTriggers = Set(triggers)
            }
            if let vulnerable = parseStringArray(from: responses["vulnerable_times"]), !vulnerable.isEmpty {
                vulnerableTimes = Set(vulnerable)
            }
            if let device = responses["preferred_device"], !device.isEmpty {
                selectedDevice = device
            }
        }
        if let theme = bootstrap.personalisation?.theme {
            selectedTheme = theme
        }
        if let tone = bootstrap.personalisation?.messageTone {
            selectedTone = tone
        }
        if let message = bootstrap.personalisation?.interventionMessage1 {
            firstSupportMessage = message
        }
        if bootstrap.clientProfile?.intakeSurveyCompleted == true {
            onboardingCompleted = true
        }
        recentRiskWindows = bootstrap.recentRiskWindows
        recentInterventions = bootstrap.recentInterventions
    }
}

private enum SupabasePayloadsHelper {
    static func isoDate(from string: String) -> Date? {
        ISO8601DateFormatter().date(from: string)
    }
}
