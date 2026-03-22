import SwiftUI

enum WatchPalette {
    static let bg = Color(red: 0.96, green: 0.96, blue: 0.97)
    static let card = Color.white
    static let border = Color(red: 0.91, green: 0.92, blue: 0.93)
    static let text = Color(red: 0.10, green: 0.12, blue: 0.18)
    static let soft = Color(red: 0.42, green: 0.45, blue: 0.50)
    static let aqua = Color(red: 0.70, green: 0.93, blue: 0.93)
    static let aquaMist = Color(red: 0.91, green: 0.97, blue: 0.97)
    static let petrol = Color(red: 0.18, green: 0.49, blue: 0.44)
    static let mauve = Color(red: 0.66, green: 0.54, blue: 0.72)
    static let alert = Color(red: 0.97, green: 0.44, blue: 0.44)
    static let warn = Color(red: 0.96, green: 0.62, blue: 0.04)

    static func color(for state: EmotionalState) -> Color {
        switch state {
        case .calm:
            return aqua
        case .elevated:
            return warn
        case .highRisk:
            return alert
        }
    }
}
