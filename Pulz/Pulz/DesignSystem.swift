import SwiftUI

enum PulzPalette {
    static let aqua = Color(red: 0.70, green: 0.93, blue: 0.93)
    static let aquaMist = Color(red: 0.91, green: 0.97, blue: 0.97)
    static let lavender = Color(red: 0.84, green: 0.79, blue: 0.86)
    static let lavenderMist = Color(red: 0.96, green: 0.94, blue: 0.97)
    static let petrol = Color(red: 0.18, green: 0.49, blue: 0.44)
    static let turq = Color(red: 0.24, green: 0.81, blue: 0.79)
    static let mauve = Color(red: 0.48, green: 0.37, blue: 0.54)
    static let mauveMid = Color(red: 0.66, green: 0.54, blue: 0.72)
    static let bg = Color(red: 0.96, green: 0.96, blue: 0.97)
    static let card = Color.white
    static let text = Color(red: 0.10, green: 0.12, blue: 0.18)
    static let soft = Color(red: 0.42, green: 0.45, blue: 0.50)
    static let border = Color(red: 0.91, green: 0.92, blue: 0.93)
    static let success = Color(red: 0.30, green: 0.69, blue: 0.49)
    static let warn = Color(red: 0.96, green: 0.62, blue: 0.04)
    static let alert = Color(red: 0.97, green: 0.44, blue: 0.44)

    static func color(for state: EmotionalState) -> Color {
        switch state {
        case .calm:
            return petrol
        case .elevated:
            return warn
        case .highRisk:
            return alert
        }
    }

    static func tintBackground(for state: EmotionalState) -> Color {
        switch state {
        case .calm:
            return aquaMist
        case .elevated:
            return Color(red: 0.99, green: 0.95, blue: 0.84)
        case .highRisk:
            return Color(red: 0.99, green: 0.90, blue: 0.90)
        }
    }
}

enum PulzType {
    static func title(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom("Georgia", size: size).weight(weight)
    }

    static func body(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }

    static func mono(_ size: CGFloat, weight: Font.Weight = .medium) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}

struct PulzBackground: View {
    var body: some View {
        LinearGradient(
            colors: [PulzPalette.bg, PulzPalette.lavenderMist, PulzPalette.aquaMist],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
}

struct GlassCardModifier: ViewModifier {
    let accent: Color?

    func body(content: Content) -> some View {
        content
            .padding(20)
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(PulzPalette.card)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(PulzPalette.border, lineWidth: 1)
                    )
                    .shadow(color: PulzPalette.aqua.opacity(0.32), radius: 12, y: 4)
                    .overlay(alignment: .leading) {
                        if let accent {
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .fill(accent)
                                .frame(width: 4)
                        }
                    }
            )
    }
}

extension View {
    func glassCard(accent: Color? = nil) -> some View {
        modifier(GlassCardModifier(accent: accent))
    }

    func screenCard() -> some View {
        padding(22)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(PulzPalette.border, lineWidth: 1)
            )
            .shadow(color: PulzPalette.aqua.opacity(0.18), radius: 10, y: 3)
    }
}
