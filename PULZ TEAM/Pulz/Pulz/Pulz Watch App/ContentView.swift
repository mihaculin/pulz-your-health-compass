import SwiftUI

struct ContentView: View {
    @State private var viewModel = WatchSessionViewModel()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    WatchPalette.bg,
                    Color(red: 0.96, green: 0.94, blue: 0.97),
                    WatchPalette.aquaMist
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Spacer()
                        Image("logo_nobackground")
                            .resizable()
                            .scaledToFit()
                            .frame(height: 114)
                        Spacer()
                    }
                    .padding(.top, -60)
                    statusPanel
                        .padding(.top, -25)
                    actionsPanel
                    metricsPanel
                    trainingPanel
                    privacyPanel
                }
                .padding()
            }
        }
        .task {
            await viewModel.start()
        }
    }

    private var statusPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Circle()
                    .fill(WatchPalette.color(for: viewModel.state))
                    .frame(width: 10, height: 10)
                Text(viewModel.state.riskSummary)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundStyle(WatchPalette.text)
            }

            Text(viewModel.alertMessage)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(WatchPalette.text)

            Text(viewModel.state.supportiveText)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(WatchPalette.soft)
        }
        .padding()
        .background(WatchPalette.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(WatchPalette.border, lineWidth: 1))
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var actionsPanel: some View {
        VStack(spacing: 10) {
            Button("Breathe") {
                viewModel.breathe()
            }
            .buttonStyle(.borderedProminent)
            .tint(WatchPalette.petrol)

            Button("I'm okay") {
                viewModel.dismiss()
            }
            .buttonStyle(.borderedProminent)
            .tint(WatchPalette.mauve)
            .foregroundStyle(WatchPalette.text)

            Button("Open on phone") {
                viewModel.openOnPhone()
            }
            .buttonStyle(.bordered)
            .tint(WatchPalette.mauve)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var metricsPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Live metrics")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(WatchPalette.text)

            metricRow(title: "Heart Beat ❤️", value: "\(Int(viewModel.latestSample.heartRate)) BPM")
            metricRow(title: "Stress ⚠️", value: "\(Int(viewModel.latestSample.derivedStress * 100))%")
            metricRow(title: "Temp 🌡️", value: temperatureText)

            Button("Refresh") {
                Task { await viewModel.triggerManualRefresh() }
            }
            .buttonStyle(.borderless)
            .foregroundStyle(WatchPalette.petrol)
        }
        .padding()
        .background(WatchPalette.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(WatchPalette.border, lineWidth: 1))
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var trainingPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Training")
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(WatchPalette.text)

            Text("Was this accurate?")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(WatchPalette.soft)

            HStack(spacing: 6) {
                ForEach(TrainingLabel.allCases) { label in
                    Button(label.rawValue) {
                        viewModel.labelLatestEvent(label)
                    }
                    .buttonStyle(.bordered)
                    .tint(label == .confirmed ? WatchPalette.petrol : label == .rejected ? WatchPalette.alert : WatchPalette.mauve)
                }
            }

            Text("\(viewModel.trainingStatus.daysRemaining) days left")
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundStyle(WatchPalette.mauve)
        }
        .padding()
        .background(WatchPalette.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(WatchPalette.border, lineWidth: 1))
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var privacyPanel: some View {
        Text("Wellness insights only. ECG is manual-only context. Sweat and EDA are not used.")
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(WatchPalette.soft)
            .frame(maxWidth: .infinity, alignment: .center)
    }

    private func metricRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(WatchPalette.soft)
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(WatchPalette.text)
        }
    }

    private var temperatureText: String {
        if let delta = viewModel.latestSample.wristTemperatureDelta {
            return String(format: "%+.1f°C", delta)
        }
        return "Unavailable"
    }
}

#Preview {
    ContentView()
}
