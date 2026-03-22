import Charts
import SwiftUI

struct ContentView: View {
    @State private var session = AppSessionViewModel()
    @State private var dashboard = PulzDashboardViewModel()
    @State private var journal = JournalViewModel()
    @State private var progress = ProgressViewModel()
    @State private var personalisation = PersonalisationViewModel()

    var body: some View {
        ZStack {
            PulzBackground()

            if session.isAuthenticated && session.screen == .dashboard {
                DashboardTabs(session: session, viewModel: dashboard, journal: journal, progress: progress, personalisation: personalisation)
            } else {
                AuthFlowView(session: session)
            }
        }
        .preferredColorScheme(.light)
        .task {
            await session.restoreSessionIfNeeded()
            await dashboard.configure(account: session.account)
            await journal.configure(account: session.account)
            await progress.configure(account: session.account)
            await personalisation.configure(account: session.account)
            if session.isAuthenticated && session.screen == .dashboard {
                await dashboard.start()
            }
        }
        .onChange(of: session.account?.id) { _, _ in
            Task {
                await dashboard.configure(account: session.account)
                await journal.configure(account: session.account)
                await progress.configure(account: session.account)
                await personalisation.configure(account: session.account)
            }
        }
    }
}

private struct AuthFlowView: View {
    @Bindable var session: AppSessionViewModel

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 22) {
                VStack(spacing: 8) {
                    Image("logo_nobackground")
                        .resizable()
                        .scaledToFit()
                        .frame(height: 230)
                }
                .padding(.top, 28)

                switch session.screen {
                case .welcome:
                    welcomeCard
                case .signIn:
                    signInCard
                case .signUp:
                    signUpCard
                case .onboarding:
                    OnboardingFlowView(session: session)
                case .dashboard:
                    EmptyView()
                }

                if let authErrorMessage = session.authErrorMessage {
                    Text(authErrorMessage)
                        .font(PulzType.body(13, weight: .semibold))
                        .foregroundStyle(PulzPalette.alert)
                }

                if let connectionStatusMessage = session.connectionStatusMessage {
                    Text(connectionStatusMessage)
                        .font(PulzType.body(12, weight: .medium))
                        .foregroundStyle(PulzPalette.soft)
                }
            }
            .frame(maxWidth: 430)
            .padding(.horizontal, 24)
            .padding(.bottom, 28)
            .padding(.top, -30)
        }
    }

    private var welcomeCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("The space between impulse and action.")
                .font(PulzType.title(30))
                .foregroundStyle(PulzPalette.text)
            Text("Start your onboarding to personalise insights and connect your wearable.")
                .font(PulzType.body(16))
                .foregroundStyle(PulzPalette.soft)
            Button("Create account") {
                session.showSignUp()
            }
            .buttonStyle(PulzPrimaryButtonStyle())
            Button("Sign in") {
                session.showSignIn()
            }
            .buttonStyle(PulzOutlineButtonStyle())
        }
        .screenCard()
    }

    private var signInCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Sign in")
                .font(PulzType.title(30))
                .foregroundStyle(PulzPalette.text)
            authField("Email", text: $session.email)
            authField("Password", text: $session.password, secure: true)
            Button(session.isSubmitting ? "Signing in..." : "Continue") {
                Task { await session.authenticate() }
            }
            .buttonStyle(PulzPrimaryButtonStyle())
            .disabled(session.isSubmitting)
#if DEBUG
            Button("Test Supabase") {
                Task { await session.testSupabaseConnection() }
            }
            .buttonStyle(PulzOutlineButtonStyle())
            .disabled(session.isSubmitting)
#endif
            Button("Back") {
                session.goBackToWelcome()
            }
            .buttonStyle(PulzOutlineButtonStyle())
        }
        .screenCard()
    }

    private var signUpCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Create account")
                .font(PulzType.title(30))
                .foregroundStyle(PulzPalette.text)
            authField("Full name", text: $session.fullName)
            authField("Email", text: $session.email)
            authField("Password", text: $session.password, secure: true)
            Toggle(isOn: $session.consentGiven) {
                Text("I understand PULZ is a wellness support tool, not a medical device.")
                    .font(PulzType.body(13))
                    .foregroundStyle(PulzPalette.soft)
            }
            .tint(PulzPalette.turq)
            Button(session.isSubmitting ? "Creating..." : "Continue") {
                Task { await session.createAccount() }
            }
            .buttonStyle(PulzPrimaryButtonStyle())
            .disabled(!session.consentGiven || session.isSubmitting)
            Button("Back") {
                session.goBackToWelcome()
            }
            .buttonStyle(PulzOutlineButtonStyle())
        }
        .screenCard()
    }

    private func authField(_ title: String, text: Binding<String>, secure: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(PulzType.body(13, weight: .semibold))
                .foregroundStyle(PulzPalette.text)
            if secure {
                SecureField(title, text: text)
                    .textFieldStyle(PulzTextFieldStyle())
            } else {
                TextField(title, text: text)
                    .textFieldStyle(PulzTextFieldStyle())
            }
        }
    }
}

private struct DashboardTabs: View {
    @Bindable var session: AppSessionViewModel
    @Bindable var viewModel: PulzDashboardViewModel
    @Bindable var journal: JournalViewModel
    @Bindable var progress: ProgressViewModel
    @Bindable var personalisation: PersonalisationViewModel
    @State private var selectedTab = 0
    @State private var activeRecoveryTool: RecoveryTool?

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardHomeView(session: session, viewModel: viewModel)
                .environment(\.openRecoveryTool, OpenRecoveryToolAction { tool in
                    activeRecoveryTool = tool
                    viewModel.useRecoveryTool(tool)
                })
                .tabItem { Label("Home", systemImage: "house") }
                .tag(0)

            JournalView(session: session, viewModel: journal)
                .tabItem { Label("Journal", systemImage: "book") }
                .tag(1)

            ProgressPage(viewModel: progress)
                .tabItem { Label("Progress", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(2)

            MyPulzView(session: session, viewModel: viewModel, personalisation: personalisation)
                .tabItem { Label("My PULZ", systemImage: "person.crop.circle") }
                .tag(3)
        }
        .tint(PulzPalette.petrol)
        .background(
            PulzBackground()
                .ignoresSafeArea()
        )
        .toolbarBackground(PulzPalette.bg, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .sheet(item: $activeRecoveryTool) { tool in
            RecoveryToolSheet(tool: tool, message: viewModel.recoveryMessage)
        }
        .task {
            await viewModel.start()
        }
    }
}

private struct DashboardHomeView: View {
    @Bindable var session: AppSessionViewModel
    @Bindable var viewModel: PulzDashboardViewModel
    @Environment(\.openRecoveryTool) private var openRecoveryTool

    var body: some View {
        NavigationStack {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 12) {
                    header
                        .padding(.bottom, -6)
                    selfCheckCard
                    trainingCard
                    biometricsCard
                    assessmentCard
                    timelineCard
                    supportActionsCard
                    insightsCard
                    todaysWindowsCard
                    disclaimerCard
                }
                .padding(20)
            }
            .background(Color.clear)
            .navigationBarHidden(true)
            .refreshable {
                await viewModel.refreshLiveState()
            }
        }
        .background(
            PulzBackground()
                .ignoresSafeArea()
        )
    }

    private var pendingTrainingEvent: ImpulseEvent? {
        viewModel.snapshot.events.first(where: { $0.trainingLabel == nil })
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image("logo_nobackground")
                .resizable()
                .scaledToFit()
                .frame(height: 82)

            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Good afternoon, \(session.fullName)")
                        .font(PulzType.title(28))
                        .foregroundStyle(PulzPalette.text)
                    Text(Date.now.formatted(date: .complete, time: .omitted))
                        .font(PulzType.body(13, weight: .medium))
                        .foregroundStyle(PulzPalette.soft)
                    Text(viewModel.healthKitStatusText)
                        .font(PulzType.body(11, weight: .semibold))
                        .foregroundStyle(PulzPalette.mauve)
                }
                Spacer()
                Text(viewModel.snapshot.state.rawValue.uppercased())
                    .font(PulzType.body(12, weight: .bold))
                    .foregroundStyle(PulzPalette.color(for: viewModel.snapshot.state))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(PulzPalette.tintBackground(for: viewModel.snapshot.state), in: Capsule())
                    .overlay(Capsule().stroke(PulzPalette.color(for: viewModel.snapshot.state).opacity(0.25), lineWidth: 1))
            }
        }
    }

    private var selfCheckCard: some View {
        Group {
            if let event = pendingTrainingEvent, viewModel.snapshot.trainingStatus.isActive {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("PULZ self-check")
                            .font(PulzType.title(22))
                            .foregroundStyle(PulzPalette.text)
                        Spacer()
                        Text(event.confidence.rawValue)
                            .font(PulzType.body(12, weight: .bold))
                            .foregroundStyle(PulzPalette.mauve)
                    }

                    Text("PULZ noticed a possible high-risk window at \(event.timestamp.formatted(date: .omitted, time: .shortened)). Was this accurate for you?")
                        .font(PulzType.body(14))
                        .foregroundStyle(PulzPalette.text)

                    HStack(spacing: 8) {
                        ForEach(TrainingLabel.allCases) { label in
                            Button(label.rawValue) {
                                viewModel.labelEvent(event, as: label)
                            }
                            .buttonStyle(PulzChipButtonStyle(selected: false))
                        }
                    }
                }
                .glassCard(accent: PulzPalette.alert)
            }
        }
    }


    private var trainingCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Training period")
                    .font(PulzType.title(22))
                Spacer()
                Text("\(viewModel.snapshot.trainingStatus.daysRemaining) days left")
                    .font(PulzType.mono(13))
                    .foregroundStyle(PulzPalette.mauve)
            }

            Text("For the first 14 days, PULZ asks whether a flagged window felt accurate. Your answers help tailor alerts to your baseline.")
                .font(PulzType.body(14))
                .foregroundStyle(PulzPalette.soft)

            SwiftUI.ProgressView(value: viewModel.snapshot.trainingStatus.progressValue)
                .tint(PulzPalette.turq)

            Text("\(viewModel.snapshot.trainingStatus.labelsCollected)/\(viewModel.snapshot.trainingStatus.targetLabels) confirmations collected")
                .font(PulzType.mono(13))
                .foregroundStyle(PulzPalette.text)
        }
        .glassCard(accent: PulzPalette.lavender)
    }

    private var biometricsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 10) {
                metricLine(title: "Heart Rate ❤️", value: "\(Int(viewModel.snapshot.latestSample.heartRate)) BPM")
                metricLine(title: "Stress ⚠️", value: "\(Int(viewModel.snapshot.latestSample.derivedStress * 100)) %")
                metricLine(title: "Temperature 🌡️", value: temperatureValue)
                metricLine(title: "Movement 🏃", value: movementValue)
            }
            Text(viewModel.snapshot.state.supportiveText)
                .font(PulzType.title(16))
                .italic()
                .foregroundStyle(PulzPalette.soft)
            Text(viewModel.secondaryMetricsText)
                .font(PulzType.body(11))
                .foregroundStyle(PulzPalette.soft)
        }
        .glassCard(accent: PulzPalette.aqua)
        .background(
            LinearGradient(colors: [PulzPalette.aquaMist, PulzPalette.lavenderMist], startPoint: .topLeading, endPoint: .bottomTrailing)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        )
    }

    private var assessmentCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Your body right now")
                .font(PulzType.title(22))

            HStack {
                Text(viewModel.snapshot.state.riskSummary)
                    .font(PulzType.body(15, weight: .semibold))
                    .foregroundStyle(PulzPalette.color(for: viewModel.snapshot.state))
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(PulzPalette.tintBackground(for: viewModel.snapshot.state), in: Capsule())
                Spacer()
                Text(viewModel.snapshot.events.first?.confidence.rawValue ?? ConfidenceLevel.low.rawValue)
                    .font(PulzType.body(12, weight: .bold))
                    .foregroundStyle(PulzPalette.mauve)
            }

            HStack(spacing: 8) {
                ForEach(viewModel.snapshot.events.first?.dominantDrivers ?? [], id: \.self) { driver in
                    Text(driver)
                        .font(PulzType.body(12, weight: .semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(PulzPalette.lavenderMist, in: Capsule())
                }
            }

            Button(viewModel.snapshot.events.first?.interventionText ?? "Would a grounding step help right now?") {
                openRecoveryTool(.grounding)
            }
            .buttonStyle(PulzCompactButtonStyle())
            .lineLimit(2)
            .minimumScaleFactor(0.85)
            .multilineTextAlignment(.leading)

            Text("Wellness insight only. Not a diagnosis.")
                .font(PulzType.body(12, weight: .medium))
                .foregroundStyle(PulzPalette.soft)
        }
        .glassCard(accent: PulzPalette.aqua)
    }

    private var timelineCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Daily timeline")
                .font(PulzType.title(22))

            Chart {
                ForEach(viewModel.snapshot.trends) { sample in
                    LineMark(x: .value("Time", sample.timestamp), y: .value("Heart rate", sample.heartRate))
                        .foregroundStyle(PulzPalette.turq)
                        .interpolationMethod(.catmullRom)

                    LineMark(x: .value("Time", sample.timestamp), y: .value("Stress", sample.derivedStress * 100))
                        .foregroundStyle(PulzPalette.mauve)
                        .lineStyle(StrokeStyle(lineWidth: 2, dash: [4, 4]))
                        .interpolationMethod(.catmullRom)
                }

                ForEach(viewModel.snapshot.events) { event in
                    RuleMark(x: .value("Window", event.timestamp))
                        .foregroundStyle(PulzPalette.alert.opacity(0.25))
                    PointMark(x: .value("Time", event.timestamp), y: .value("Risk", Double(event.severity * 20 + 40)))
                        .foregroundStyle(PulzPalette.alert)
                }
            }
            .frame(height: 220)
        }
        .glassCard(accent: PulzPalette.aqua)
    }

    private var supportActionsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Support actions")
                .font(PulzType.title(22))

            HStack(alignment: .top, spacing: 12) {
                ForEach(RecoveryTool.allCases) { tool in
                    Button {
                        openRecoveryTool(tool)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(tool.rawValue)
                                .font(PulzType.body(15, weight: .semibold))
                                .foregroundStyle(PulzPalette.text)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(tool.subtitle)
                                .font(PulzType.body(12))
                                .foregroundStyle(PulzPalette.soft)
                                .multilineTextAlignment(tool == .journal ? .center : .leading)
                                .lineLimit(nil)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(14)
                        .background(tool == .breathing ? PulzPalette.aquaMist : PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .frame(maxWidth: .infinity, minHeight: 140)
                    .buttonStyle(.plain)
                }
            }

            Text(viewModel.recoveryMessage)
                .font(PulzType.body(13, weight: .medium))
                .foregroundStyle(PulzPalette.text)
        }
        .glassCard(accent: PulzPalette.lavender)
    }

    private var insightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Insights")
                .font(PulzType.title(22))

            ForEach(viewModel.snapshot.insights) { insight in
                VStack(alignment: .leading, spacing: 4) {
                    Text(insight.title)
                        .font(PulzType.body(14, weight: .semibold))
                        .foregroundStyle(PulzPalette.mauve)
                    Text(insight.detail)
                        .font(PulzType.body(14))
                        .foregroundStyle(PulzPalette.text)
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .glassCard(accent: PulzPalette.lavender)
    }

    private var todaysWindowsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Today's episode")
                .font(PulzType.title(22))

            ForEach(viewModel.todayReports) { report in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(report.timestampText)
                            .font(PulzType.mono(13))
                            .foregroundStyle(PulzPalette.soft)
                        Spacer()
                        Text("Urge \(Int(report.urgeLevel))/10")
                            .font(PulzType.body(12, weight: .bold))
                            .foregroundStyle(PulzPalette.mauve)
                    }

                    let tagText = report.triggers.isEmpty ? report.emotionalState.joined(separator: " • ") : report.triggers.joined(separator: " • ")
                    if !tagText.isEmpty {
                        Text(tagText)
                            .font(PulzType.body(13))
                            .foregroundStyle(PulzPalette.soft)
                    }

                    if let note = report.note, !note.isEmpty {
                        Text(note)
                            .font(PulzType.body(14))
                            .foregroundStyle(PulzPalette.text)
                    }
                }
                .padding(16)
                .background(PulzPalette.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(PulzPalette.border, lineWidth: 1)
                )
            }
        }
        .glassCard(accent: PulzPalette.alert)
    }

    private var disclaimerCard: some View {
        Text(viewModel.snapshot.processingModeText)
            .font(PulzType.body(12, weight: .semibold))
            .foregroundStyle(PulzPalette.soft)
            .glassCard()
    }

    private func metric(title: String, value: String, suffix: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(PulzType.body(11, weight: .bold))
                .foregroundStyle(PulzPalette.soft)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value)
                    .font(PulzType.mono(20, weight: .bold))
                    .foregroundStyle(PulzPalette.text)
                if !suffix.isEmpty {
                    Text(suffix)
                        .font(PulzType.body(11, weight: .bold))
                        .foregroundStyle(PulzPalette.soft)
                }
            }
            SwiftUI.ProgressView(value: min(1, max(0.08, title == "Movement" ? viewModel.snapshot.latestSample.movement : title.contains("Stress") ? viewModel.snapshot.latestSample.derivedStress : title.contains("Heart Beat") ? viewModel.snapshot.latestSample.heartRate / 120 : 0.45)))
                .tint(color)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func metricInline(symbol: String, title: String, value: String, suffix: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(symbol)
                    .font(.system(size: 18))
                    .frame(width: 34, height: 34)
                    .background(color.opacity(0.12), in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(PulzType.body(11, weight: .bold))
                        .foregroundStyle(PulzPalette.soft)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(value)
                            .font(PulzType.mono(18, weight: .bold))
                            .foregroundStyle(PulzPalette.text)
                        if !suffix.isEmpty {
                            Text(suffix)
                                .font(PulzType.body(11, weight: .bold))
                                .foregroundStyle(PulzPalette.soft)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func metricLine(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(PulzType.body(13, weight: .semibold))
                .foregroundStyle(PulzPalette.text)
            Spacer()
            Text(value)
                .font(PulzType.mono(14, weight: .bold))
                .foregroundStyle(PulzPalette.text)
        }
        .padding(.vertical, 4)
    }
    private var temperatureValue: String {
        if let temp = viewModel.snapshot.latestSample.wristTemperatureDelta {
            return String(format: "%+.1f °C", temp)
        }
        return "N/A"
    }

    private var movementValue: String {
        switch viewModel.snapshot.latestSample.movement {
        case ..<0.2: return "Low"
        case ..<0.6: return "Moderate"
        default: return "Active"
        }
    }
}

private struct OnboardingFlowView: View {
    @Bindable var session: AppSessionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Help us understand you so PULZ can support you better.")
                .font(PulzType.title(30))
                .foregroundStyle(PulzPalette.text)

            Text(session.onboardingStep.title)
                .font(PulzType.body(14, weight: .bold))
                .foregroundStyle(PulzPalette.mauve)

            SwiftUI.ProgressView(
                value: Double(session.onboardingStep.rawValue + 1),
                total: Double(AppSessionViewModel.OnboardingStep.allCases.count)
            )
            .tint(PulzPalette.turq)

            VStack(alignment: .leading, spacing: 16) {
                switch session.onboardingStep {
                case .aboutYou:
                    aboutYouStep
                case .relationshipWithFood:
                    relationshipStep
                case .emotionalPatterns:
                    emotionalStep
                case .physicalHealth:
                    physicalHealthStep
                case .connectDevice:
                    deviceStep
                case .personalise:
                    personaliseStep
                case .safety:
                    safetyStep
                }
            }
            .glassCard(accent: PulzPalette.aqua)

            HStack(spacing: 12) {
                Button("Back") {
                    session.goToPreviousOnboardingStep()
                }
                .buttonStyle(PulzOutlineButtonStyle())

                Button(session.onboardingStep == .safety ? "Let's begin" : "Next") {
                    Task { await session.goToNextOnboardingStep() }
                }
                .buttonStyle(PulzPrimaryButtonStyle())
            }
        }
        .padding(24)
        .scrollDismissesKeyboard(.interactively)
    }

    private var aboutYouStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            DatePicker("Date of birth", selection: $session.dateOfBirth, displayedComponents: .date)
                .font(PulzType.body(15))
            TextField("Height in cm (optional)", text: $session.heightText)
                .textFieldStyle(PulzTextFieldStyle())
            TextField("Weight in kg (optional)", text: $session.weightText)
                .textFieldStyle(PulzTextFieldStyle())
            Toggle("I track my menstrual cycle", isOn: $session.tracksCycle)
                .tint(PulzPalette.turq)
        }
    }

    private var relationshipStep: some View {
        chipGrid(session.concernOptions, selected: session.selectedConcerns) { session.toggleConcern($0) }
    }

    private var emotionalStep: some View {
        VStack(alignment: .leading, spacing: 14) {
            ForEach(Array(session.emotionalRatings.keys.sorted()), id: \.self) { key in
                VStack(alignment: .leading, spacing: 6) {
                    Text(key)
                        .font(PulzType.body(14, weight: .semibold))
                        .foregroundStyle(PulzPalette.text)
                    Slider(
                        value: Binding(
                            get: { session.emotionalRatings[key] ?? 3 },
                            set: { session.emotionalRatings[key] = $0 }
                        ),
                        in: 1...5,
                        step: 1
                    )
                    .tint(PulzPalette.turq)
                }
            }

            Text("Most vulnerable times")
                .font(PulzType.body(14, weight: .semibold))
            chipGrid(session.timeOptions, selected: session.vulnerableTimes) { session.toggleVulnerableTime($0) }

            Text("Common triggers")
                .font(PulzType.body(14, weight: .semibold))
            chipGrid(session.triggerOptions, selected: session.commonTriggers) { session.toggleTrigger($0) }
        }
    }

    private var physicalHealthStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Conditions relevant to your care (optional)", text: $session.conditionsText, axis: .vertical)
                .textFieldStyle(PulzTextFieldStyle())
            Toggle("I’m currently working with a specialist", isOn: $session.worksWithSpecialist)
                .tint(PulzPalette.turq)
            if session.worksWithSpecialist {
                TextField("PULZ specialist code", text: $session.specialistCode)
                    .textFieldStyle(PulzTextFieldStyle())
            }
            TextField("Medications (optional)", text: $session.medicationsText, axis: .vertical)
                .textFieldStyle(PulzTextFieldStyle())
        }
    }

    private var deviceStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Connect your wearable for real-time insights.")
                .font(PulzType.body(14))
                .foregroundStyle(PulzPalette.soft)
            ForEach(session.deviceOptions, id: \.self) { device in
                Button {
                    session.selectedDevice = device
                } label: {
                    HStack {
                        Text(device)
                            .font(PulzType.body(15, weight: .semibold))
                            .foregroundStyle(PulzPalette.text)
                        Spacer()
                        if session.selectedDevice == device {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(PulzPalette.petrol)
                        }
                    }
                    .padding(14)
                    .background(session.selectedDevice == device ? PulzPalette.aquaMist : Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var personaliseStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("How would you like PULZ to speak to you?")
                .font(PulzType.body(14, weight: .semibold))
            chipGrid(session.toneOptions, selected: Set([session.selectedTone])) { session.selectedTone = $0 }

            TextField("Your first support message", text: $session.firstSupportMessage, axis: .vertical)
                .textFieldStyle(PulzTextFieldStyle())
        }
    }

    private var safetyStep: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Crisis contact name (optional)", text: $session.crisisContactName)
                .textFieldStyle(PulzTextFieldStyle())
            TextField("Crisis contact phone (optional)", text: $session.crisisContactPhone)
                .textFieldStyle(PulzTextFieldStyle())
            Text("PULZ provides wellness insights only and does not diagnose or treat medical or psychiatric conditions. If you are in crisis or need immediate help, contact a healthcare professional or emergency services.")
                .font(PulzType.body(13))
                .foregroundStyle(PulzPalette.soft)
                .padding(14)
                .background(PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private func chipGrid(_ options: [String], selected: Set<String>, action: @escaping (String) -> Void) -> some View {
        FlowLayout(spacing: 10) {
            ForEach(options, id: \.self) { option in
                Button(option) {
                    action(option)
                }
                .buttonStyle(PulzChipButtonStyle(selected: selected.contains(option)))
            }
        }
    }
}

private struct JournalView: View {
    @Bindable var session: AppSessionViewModel
    @Bindable var viewModel: JournalViewModel
    @State private var selectedDate = Date.now
    @State private var intensity: Double = 5
    @State private var selectedTriggers: Set<String> = ["Work stress"]
    @State private var selectedFeelings: Set<String> = ["Anxious"]
    @State private var noteText = ""

    private let triggerOptions = [
        "Work stress", "Loneliness", "Fatigue", "Boredom", "Conflict", "Body image", "Social event", "Other"
    ]

    private let feelingOptions = [
        "Anxious", "Lonely", "Bored", "Stressed", "Tired", "Angry", "Empty", "Numb",
        "Overwhelmed", "Ashamed", "Sad", "Calm"
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Journal")
                    .font(PulzType.title(28))
                    .foregroundStyle(PulzPalette.text)
                Text("Capture the moment and how it felt.")
                    .font(PulzType.body(15))
                    .foregroundStyle(PulzPalette.soft)

                VStack(alignment: .leading, spacing: 14) {
                    Text("When did it happen?")
                        .font(PulzType.body(14, weight: .semibold))
                    HStack(spacing: 12) {
                        DatePicker("", selection: $selectedDate, displayedComponents: .date)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                        DatePicker("", selection: $selectedDate, displayedComponents: .hourAndMinute)
                            .labelsHidden()
                            .datePickerStyle(.compact)
                    }

                    Text("How intense was it?")
                        .font(PulzType.body(14, weight: .semibold))
                    VStack(alignment: .leading, spacing: 6) {
                        Slider(value: $intensity, in: 0...10, step: 1)
                            .tint(PulzPalette.petrol)
                        HStack {
                            Text("Low")
                                .font(PulzType.body(11))
                                .foregroundStyle(PulzPalette.soft)
                            Spacer()
                            Text("\(Int(intensity))/10")
                                .font(PulzType.mono(12))
                                .foregroundStyle(PulzPalette.soft)
                            Spacer()
                            Text("Complete")
                                .font(PulzType.body(11))
                                .foregroundStyle(PulzPalette.soft)
                        }
                    }

                    Text("What triggered it?")
                        .font(PulzType.body(14, weight: .semibold))
                    chipGrid(triggerOptions, selected: selectedTriggers) { toggle(&selectedTriggers, value: $0) }

                    Text("How do you feel right now?")
                        .font(PulzType.body(14, weight: .semibold))
                    chipGrid(feelingOptions, selected: selectedFeelings) { toggle(&selectedFeelings, value: $0) }

                    Text("Note (optional)")
                        .font(PulzType.body(14, weight: .semibold))
                    TextEditor(text: $noteText)
                        .frame(minHeight: 90)
                        .padding(8)
                        .background(Color.white.opacity(0.85), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(PulzPalette.border, lineWidth: 1)
                        )

                    Button(viewModel.isSubmitting ? "Saving..." : "Save this moment") {
                        saveEntry()
                    }
                    .buttonStyle(PulzPrimaryButtonStyle())
                    .disabled(viewModel.isSubmitting)
                }
                .glassCard(accent: PulzPalette.lavender)

                if let statusMessage = viewModel.statusMessage {
                    Text(statusMessage)
                        .font(PulzType.body(12, weight: .medium))
                        .foregroundStyle(PulzPalette.soft)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Recent entries")
                        .font(PulzType.body(14, weight: .semibold))
                    ForEach(viewModel.entries) { entry in
                        HStack {
                            Text(entry.timestampText)
                                .font(PulzType.mono(12))
                                .foregroundStyle(PulzPalette.soft)
                            Spacer()
                            Text(entry.summary)
                                .font(PulzType.body(12, weight: .semibold))
                                .foregroundStyle(PulzPalette.text)
                        }
                        .padding(12)
                        .background(PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
                .glassCard(accent: PulzPalette.aqua)
            }
            .padding(20)
        }
        .task {
            await viewModel.configure(account: session.account)
        }
        .background(
            PulzBackground()
                .ignoresSafeArea()
        )
    }

    private func chipGrid(_ options: [String], selected: Set<String>, action: @escaping (String) -> Void) -> some View {
        FlowLayout(spacing: 10) {
            ForEach(options, id: \.self) { option in
                Button(option) {
                    action(option)
                }
                .buttonStyle(PulzChipButtonStyle(selected: selected.contains(option)))
            }
        }
        .background(
            PulzBackground()
                .ignoresSafeArea()
        )
    }

    private func toggle(_ set: inout Set<String>, value: String) {
        if set.contains(value) {
            set.remove(value)
        } else {
            set.insert(value)
        }
    }

    private func saveEntry() {
        let note = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        Task {
            await viewModel.saveEntry(
                timestamp: selectedDate,
                intensity: intensity,
                triggers: Array(selectedTriggers).sorted(),
                feelings: Array(selectedFeelings).sorted(),
                note: note
            )
            noteText = ""
        }
    }
}

private struct ProgressPage: View {
    @Bindable var viewModel: ProgressViewModel
    @State private var selectedRange = "This week"

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Progress")
                            .font(PulzType.title(28))
                            .foregroundStyle(PulzPalette.text)
                        Text("Track patterns and celebrate growth.")
                            .font(PulzType.body(15))
                            .foregroundStyle(PulzPalette.soft)
                    }
                    Spacer()
                }

                HStack(spacing: 8) {
                    rangePill("This week")
                    rangePill("This month")
                    rangePill("Last 3 months")
                }

                chartCard(title: "Episode frequency") {
                    Chart(viewModel.weeklyEpisodes) { item in
                        BarMark(
                            x: .value("Day", item.day),
                            y: .value("Episodes", item.value)
                        )
                        .foregroundStyle(item.day == "Thu" ? PulzPalette.petrol : PulzPalette.aqua)
                        .cornerRadius(6)
                    }
                    .frame(height: 180)
                }

                chartCard(title: "Average urge") {
                    Chart(viewModel.calmTrend) { item in
                        LineMark(
                            x: .value("Day", item.day),
                            y: .value("Score", item.value)
                        )
                        .foregroundStyle(PulzPalette.mauve)
                        .interpolationMethod(.catmullRom)
                        PointMark(
                            x: .value("Day", item.day),
                            y: .value("Score", item.value)
                        )
                        .foregroundStyle(PulzPalette.mauve)
                    }
                    .frame(height: 180)
                }

                chartCard(title: "Trigger frequency") {
                    Chart(viewModel.triggerStats) { item in
                        BarMark(
                            x: .value("Count", item.value),
                            y: .value("Trigger", item.name)
                        )
                        .foregroundStyle(PulzPalette.mauveMid)
                        .cornerRadius(6)
                    }
                    .frame(height: 180)
                }

                HStack(alignment: .top, spacing: 12) {
                    progressStat(title: "Total episodes", value: "\(viewModel.totalEpisodes)", caption: "This week")
                    progressStat(title: "Common trigger", value: viewModel.commonTrigger, caption: "Most frequent")
                }

                HStack(alignment: .top, spacing: 12) {
                    progressStat(title: "Avg intensity", value: viewModel.avgIntensity, caption: "/10 daily")
                    progressStat(title: "Improvement", value: viewModel.improvementText, caption: "vs last week")
                }

                chartCard(title: "Pattern insights") {
                    HStack(spacing: 12) {
                        Image(systemName: "lightbulb.fill")
                            .foregroundStyle(PulzPalette.petrol)
                        Text("Your progress updates in real-time from Supabase.")
                            .font(PulzType.body(13))
                            .foregroundStyle(PulzPalette.text)
                    }
                }
            }
            .padding(20)
        }
        .refreshable {
            await viewModel.refresh()
        }
        .background(
            PulzBackground()
                .ignoresSafeArea()
        )
    }

    private func rangePill(_ title: String) -> some View {
        Button(title) {
            selectedRange = title
        }
        .font(PulzType.body(12, weight: .semibold))
        .foregroundStyle(selectedRange == title ? PulzPalette.petrol : PulzPalette.soft)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(selectedRange == title ? PulzPalette.aquaMist : Color.white, in: Capsule())
        .overlay(
            Capsule().stroke(selectedRange == title ? PulzPalette.turq : PulzPalette.border, lineWidth: 1)
        )
    }

    private func chartCard(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(PulzType.body(14, weight: .semibold))
                .foregroundStyle(PulzPalette.text)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(accent: PulzPalette.aqua)
    }

    private func progressStat(title: String, value: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(PulzType.body(12, weight: .semibold))
                .foregroundStyle(PulzPalette.soft)
            Text(value)
                .font(PulzType.mono(22, weight: .bold))
                .foregroundStyle(PulzPalette.text)
            Text(caption)
                .font(PulzType.body(11))
                .foregroundStyle(PulzPalette.soft)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassCard(accent: PulzPalette.aqua)
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? 320
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > maxWidth {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }

        return CGSize(width: maxWidth, height: currentY + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var currentX = bounds.minX
        var currentY = bounds.minY
        var lineHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if currentX + size.width > bounds.maxX {
                currentX = bounds.minX
                currentY += lineHeight + spacing
                lineHeight = 0
            }

            subview.place(at: CGPoint(x: currentX, y: currentY), proposal: ProposedViewSize(width: size.width, height: size.height))
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}

private struct MyPulzView: View {
    @Bindable var session: AppSessionViewModel
    @Bindable var viewModel: PulzDashboardViewModel
    @Bindable var personalisation: PersonalisationViewModel
    @State private var watchVibrationEnabled = true
    @State private var phoneBannerEnabled = true
    @State private var inAppAlertEnabled = true
    @State private var phoneSoundEnabled = false
    @State private var promptContact = false
    @State private var selfCareNotes = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("My PULZ")
                    .font(PulzType.title(28))
                    .foregroundStyle(PulzPalette.text)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Your words, your way")
                        .font(PulzType.body(15, weight: .semibold))
                    Text("Edit the messages PULZ sends when it detects a difficult moment.")
                        .font(PulzType.body(13))
                        .foregroundStyle(PulzPalette.soft)

                    messageField(title: "WHEN YOU NEED GROUNDING", text: $personalisation.groundingMessage)
                    messageField(title: "WHEN AN URGE IS DETECTED", text: $personalisation.urgeMessage)
                    messageField(title: "AFTER A DIFFICULT MOMENT", text: $personalisation.recoveryMessage)
                }
                .glassCard(accent: PulzPalette.lavender)

                VStack(alignment: .leading, spacing: 12) {
                    Text("How PULZ reaches you")
                        .font(PulzType.body(15, weight: .semibold))
                    Text("Control exactly how interventions arrive on your watch and phone.")
                        .font(PulzType.body(13))
                        .foregroundStyle(PulzPalette.soft)

                    HStack(spacing: 10) {
                        selectionPill(title: "Gentle pulse", subtitle: "Two soft vibrations", selected: personalisation.vibrationPattern == "Gentle pulse") {
                            personalisation.vibrationPattern = "Gentle pulse"
                        }
                        selectionPill(title: "Steady reminder", subtitle: "One medium vibration", selected: personalisation.vibrationPattern == "Steady reminder") {
                            personalisation.vibrationPattern = "Steady reminder"
                        }
                        selectionPill(title: "Urgent alert", subtitle: "Three quick vibrations", selected: personalisation.vibrationPattern == "Urgent alert") {
                            personalisation.vibrationPattern = "Urgent alert"
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Vibration intensity")
                            .font(PulzType.body(12, weight: .semibold))
                        HStack {
                            Text("1 — barely there")
                                .font(PulzType.body(11))
                                .foregroundStyle(PulzPalette.soft)
                            Spacer()
                            Text("5 — strong")
                                .font(PulzType.body(11))
                                .foregroundStyle(PulzPalette.soft)
                        }
                        Slider(value: $personalisation.vibrationIntensity, in: 1...5, step: 1)
                            .tint(PulzPalette.petrol)
                    }

                    Toggle("Sound", isOn: $personalisation.soundEnabled)
                        .tint(PulzPalette.petrol)

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Notification channels")
                            .font(PulzType.body(12, weight: .semibold))
                            .foregroundStyle(PulzPalette.soft)
                        Toggle("Smartwatch vibration", isOn: $watchVibrationEnabled)
                        Toggle("Phone notification banner", isOn: $phoneBannerEnabled)
                        Toggle("In-app alert card", isOn: $inAppAlertEnabled)
                        Toggle("Sound on phone", isOn: $phoneSoundEnabled)
                    }
                    .tint(PulzPalette.petrol)

                    Text("PULZ notifications are always on. Quiet hours are not available for clients. PULZ will always reach you when it detects an elevated risk pattern — day or night.")
                        .font(PulzType.body(12))
                        .foregroundStyle(PulzPalette.soft)
                        .padding(12)
                        .background(PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .glassCard(accent: PulzPalette.aqua)

                VStack(alignment: .leading, spacing: 12) {
                    Text("The tone that feels right")
                        .font(PulzType.body(15, weight: .semibold))
                    Text("Choose how PULZ speaks to you.")
                        .font(PulzType.body(13))
                        .foregroundStyle(PulzPalette.soft)

                    HStack(spacing: 10) {
                        toneCard(title: "Warm & nurturing", subtitle: "\"You're doing beautifully. This too shall pass.\"", selected: personalisation.messageTone == "Warm & nurturing") {
                            personalisation.messageTone = "Warm & nurturing"
                        }
                        toneCard(title: "Clear & direct", subtitle: "\"Urge detected. Time to pause and breathe.\"", selected: personalisation.messageTone == "Clear & direct") {
                            personalisation.messageTone = "Clear & direct"
                        }
                        toneCard(title: "Curious & gentle", subtitle: "\"Interesting moment. What's happening inside?\"", selected: personalisation.messageTone == "Curious & gentle") {
                            personalisation.messageTone = "Curious & gentle"
                        }
                    }

                    HStack(spacing: 10) {
                        Text("Intervention language")
                            .font(PulzType.body(12, weight: .semibold))
                            .foregroundStyle(PulzPalette.soft)
                        Spacer()
                        Picker("Language", selection: $personalisation.language) {
                            Text("Romanian").tag("Romanian")
                            Text("English").tag("English")
                        }
                        .pickerStyle(.menu)
                    }
                }
                .glassCard(accent: PulzPalette.lavender)

                VStack(alignment: .leading, spacing: 12) {
                    Text("If things feel really hard")
                        .font(PulzType.body(15, weight: .semibold))
                    Text("Set up who or what helps you most in intense moments.")
                        .font(PulzType.body(13))
                        .foregroundStyle(PulzPalette.soft)

                    HStack(spacing: 12) {
                        TextField("Contact name", text: $personalisation.crisisContactName)
                            .textFieldStyle(PulzTextFieldStyle())
                        TextField("Phone number", text: $personalisation.crisisContactPhone)
                            .textFieldStyle(PulzTextFieldStyle())
                    }

                    Toggle("Send me a prompt to text them when TRIGGER RISK is detected", isOn: $promptContact)
                        .tint(PulzPalette.petrol)

                    Text("If you're in crisis, reaching out to a professional is always okay.")
                        .font(PulzType.body(12))
                        .foregroundStyle(PulzPalette.soft)
                        .padding(12)
                        .background(PulzPalette.lavenderMist, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .glassCard(accent: PulzPalette.aqua)

                VStack(alignment: .leading, spacing: 12) {
                    Text("Self-care notes")
                        .font(PulzType.body(15, weight: .semibold))
                    TextEditor(text: $selfCareNotes)
                        .frame(minHeight: 120)
                        .padding(8)
                        .background(Color.white.opacity(0.85), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(PulzPalette.border, lineWidth: 1)
                        )
                }
                .glassCard(accent: PulzPalette.lavender)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Manual ECG")
                        .font(PulzType.body(15, weight: .semibold))
                    Text(viewModel.snapshot.manualECG?.classification.displayTone ?? "No manual ECG recorded yet.")
                        .font(PulzType.body(14))
                        .foregroundStyle(PulzPalette.soft)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .glassCard(accent: PulzPalette.aqua)

                Button("Save all settings") {
                    Task { await personalisation.save() }
                }
                .buttonStyle(PulzPrimaryButtonStyle())

                if let statusMessage = personalisation.statusMessage {
                    Text(statusMessage)
                        .font(PulzType.body(12, weight: .medium))
                        .foregroundStyle(PulzPalette.soft)
                }

                Button("Sign out") {
                    Task { await session.signOut() }
                }
                .buttonStyle(PulzOutlineButtonStyle())
            }
            .padding(20)
        }
    }

    private func themeCard(title: String, subtitle: String, colors: [Color], selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(height: 70)
                    .overlay(alignment: .topTrailing) {
                        if selected {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(PulzPalette.petrol)
                                .padding(8)
                        }
                    }
                Text(title)
                    .font(PulzType.body(13, weight: .semibold))
                    .foregroundStyle(PulzPalette.text)
                Text(subtitle)
                    .font(PulzType.body(11))
                    .foregroundStyle(PulzPalette.soft)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .leading)
            .multilineTextAlignment(.leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(selected ? PulzPalette.petrol.opacity(0.5) : PulzPalette.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func messageField(title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(PulzType.body(11, weight: .bold))
                    .foregroundStyle(PulzPalette.soft)
                Spacer()
                Text("Preview")
                    .font(PulzType.body(11, weight: .semibold))
                    .foregroundStyle(PulzPalette.mauve)
            }
            TextField("", text: text, axis: .vertical)
                .textFieldStyle(PulzTextFieldStyle())
        }
    }

    private func selectionPill(title: String, subtitle: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(PulzType.body(12, weight: .semibold))
                    .foregroundStyle(PulzPalette.text)
                Text(subtitle)
                    .font(PulzType.body(11))
                    .foregroundStyle(PulzPalette.soft)
                    .lineLimit(2)
                    .minimumScaleFactor(0.9)
            }
            .padding(12)
            .frame(maxWidth: .infinity, minHeight: 104, maxHeight: 104, alignment: .leading)
            .multilineTextAlignment(.leading)
            .background(selected ? PulzPalette.aquaMist : Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(selected ? PulzPalette.turq : PulzPalette.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func toneCard(title: String, subtitle: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Text(title)
                    .font(PulzType.body(12, weight: .semibold))
                    .foregroundStyle(PulzPalette.text)
                Text(subtitle)
                    .font(PulzType.body(11))
                    .foregroundStyle(PulzPalette.soft)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(selected ? PulzPalette.lavenderMist : Color.white, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(selected ? PulzPalette.mauve : PulzPalette.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct PulzPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulzType.body(16, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(PulzPalette.petrol, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

private struct PulzOutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulzType.body(16, weight: .bold))
            .foregroundStyle(PulzPalette.petrol)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PulzPalette.petrol.opacity(0.35), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

private struct PulzCompactButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulzType.body(12, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .background(PulzPalette.petrol, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
    }
}

private struct PulzChipButtonStyle: ButtonStyle {
    let selected: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(PulzType.body(12, weight: .bold))
            .foregroundStyle(selected ? PulzPalette.petrol : PulzPalette.text)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(selected ? PulzPalette.aquaMist : Color.white, in: Capsule())
            .overlay(Capsule().stroke(selected ? PulzPalette.turq : PulzPalette.border, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private struct PulzTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<_Label>) -> some View {
        configuration
            .padding(14)
            .background(Color.white.opacity(0.85), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PulzPalette.border, lineWidth: 1)
            )
    }
}

private struct RecoveryToolSheet: View {
    let tool: RecoveryTool
    let message: String
    @Environment(\.dismiss) private var dismiss
    @State private var animateCircle = false
    @State private var completedCycles = 0
    @State private var checkInResponse: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Text(tool.rawValue)
                    .font(PulzType.title(30))
                    .foregroundStyle(PulzPalette.text)

                if tool == .breathing {
                    ZStack {
                        Circle()
                            .fill(PulzPalette.aquaMist)
                            .frame(width: 220, height: 220)
                            .scaleEffect(animateCircle ? 1 : 0.56)
                            .animation(.easeInOut(duration: 4).repeatCount(6, autoreverses: true), value: animateCircle)

                        Circle()
                            .stroke(PulzPalette.turq.opacity(0.5), lineWidth: 2)
                            .frame(width: 240, height: 240)

                        VStack(spacing: 8) {
                            Text(phaseTitle)
                                .font(PulzType.title(24))
                            Text("Cycle \(min(completedCycles + 1, 3)) of 3")
                                .font(PulzType.mono(13))
                                .foregroundStyle(PulzPalette.soft)
                        }
                    }
                    .onAppear {
                        animateCircle = true
                        Task {
                            for index in 1...3 {
                                try? await Task.sleep(for: .seconds(12))
                                completedCycles = index
                            }
                        }
                    }
                } else {
                    Image(systemName: tool == .grounding ? "sparkles.rectangle.stack" : "book.closed")
                        .font(.system(size: 48))
                        .foregroundStyle(PulzPalette.petrol)
                }

                Text(message)
                    .font(PulzType.body(15))
                    .foregroundStyle(PulzPalette.soft)
                    .multilineTextAlignment(.center)

                if completedCycles >= 3 || tool != .breathing {
                    VStack(spacing: 10) {
                        Text("Beautiful. That took courage.")
                            .font(PulzType.title(22))
                            .foregroundStyle(PulzPalette.petrol)

                        HStack(spacing: 10) {
                            Button("Better") {
                                checkInResponse = "Better"
                            }
                            .buttonStyle(PulzChipButtonStyle(selected: checkInResponse == "Better"))

                            Button("Still struggling") {
                                checkInResponse = "Still struggling"
                            }
                            .buttonStyle(PulzChipButtonStyle(selected: checkInResponse == "Still struggling"))
                        }
                    }
                }

                Spacer()
            }
            .padding(24)
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(PulzPalette.petrol)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private var phaseTitle: String {
        let phase = completedCycles % 3
        switch phase {
        case 0: return "Inhale"
        case 1: return "Hold"
        default: return "Exhale"
        }
    }
}

private struct OpenRecoveryToolAction {
    let perform: (RecoveryTool) -> Void

    func callAsFunction(_ tool: RecoveryTool) {
        perform(tool)
    }
}

private struct OpenRecoveryToolKey: EnvironmentKey {
    static let defaultValue = OpenRecoveryToolAction { _ in }
}

private extension EnvironmentValues {
    var openRecoveryTool: OpenRecoveryToolAction {
        get { self[OpenRecoveryToolKey.self] }
        set { self[OpenRecoveryToolKey.self] = newValue }
    }
}

#Preview {
    ContentView()
}
