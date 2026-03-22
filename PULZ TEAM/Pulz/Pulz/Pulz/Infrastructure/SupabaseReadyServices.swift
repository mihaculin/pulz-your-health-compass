import Foundation

struct SupabaseConfiguration {
    let projectURL: URL?
    let anonKey: String

    static let placeholder = SupabaseConfiguration(projectURL: nil, anonKey: "")
}

struct AuthAccount {
    let id: UUID
    let email: String
    let fullName: String
}

struct IntakePayload {
    let fullName: String
    let dateOfBirth: Date
    let selectedConcerns: [String]
    let commonTriggers: [String]
    let selectedDevice: String
    let selectedTheme: String
    let selectedTone: String
    let supportMessage: String
}

protocol AuthServicing {
    func signIn(email: String, password: String) async throws -> AuthAccount
    func signUp(email: String, password: String, fullName: String) async throws -> AuthAccount
    func signOut() async
}

protocol IntakeSyncServicing {
    func saveIntake(_ payload: IntakePayload, for account: AuthAccount) async throws
}

enum StubServiceError: LocalizedError {
    case invalidCredentials
    case invalidInput

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Please enter both email and password."
        case .invalidInput:
            return "Please complete the required fields first."
        }
    }
}

actor MockAuthService: AuthServicing {
    func signIn(email: String, password: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty else {
            throw StubServiceError.invalidCredentials
        }

        return AuthAccount(id: UUID(), email: email, fullName: "Andrada")
    }

    func signUp(email: String, password: String, fullName: String) async throws -> AuthAccount {
        guard !email.isEmpty, !password.isEmpty, !fullName.isEmpty else {
            throw StubServiceError.invalidInput
        }

        return AuthAccount(id: UUID(), email: email, fullName: fullName)
    }

    func signOut() async {}
}

actor MockIntakeSyncService: IntakeSyncServicing {
    func saveIntake(_ payload: IntakePayload, for account: AuthAccount) async throws {
        _ = payload
        _ = account
    }
}

struct AppEnvironment {
    let supabase: SupabaseConfiguration
    let authService: AuthServicing
    let intakeSyncService: IntakeSyncServicing

    static let local = AppEnvironment(
        supabase: .placeholder,
        authService: MockAuthService(),
        intakeSyncService: MockIntakeSyncService()
    )
}
