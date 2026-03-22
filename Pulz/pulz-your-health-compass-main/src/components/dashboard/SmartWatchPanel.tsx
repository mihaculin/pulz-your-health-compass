import { Heart, Footprints, Thermometer, Clock, AlertCircle } from "lucide-react";

export function SmartWatchPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4 p-4">
      {/* Watch face */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-[32px]"
            style={{
              border: "2px solid #b3ecec",
              animation: "watchPulseRing 2s ease-out infinite",
            }}
          />
          {/* Watch body */}
          <div
            className="relative w-[190px] h-[210px] rounded-[32px] flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: "#1A1F2E" }}
          >
            <span
              className="font-mono text-[10px] tracking-[0.15em]"
              style={{ color: "#9CA3AF" }}
            >
              PULZ
            </span>
            <span className="font-mono text-[13px]" style={{ color: "#9CA3AF" }}>
              14:37
            </span>
            <span className="font-mono text-5xl font-medium text-white leading-none mt-1">
              112
            </span>
            <span className="text-xs font-medium mt-1" style={{ color: "#F59E0B" }}>
              Elevated
            </span>
            <div className="flex gap-2 mt-3">
              <button
                className="px-4 py-1.5 rounded-2xl text-xs font-medium text-white active:scale-95 transition-transform"
                style={{ backgroundColor: "#2D7D6F" }}
              >
                Breathe
              </button>
              <button
                className="px-4 py-1.5 rounded-2xl text-xs font-medium text-white border border-white/60 active:scale-95 transition-transform"
                style={{ background: "transparent" }}
              >
                I'm okay
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alert notification card */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ backgroundColor: "#1F2937", border: "1px solid #b3ecec" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle size={16} style={{ color: "#F87171" }} />
            <span className="text-xs font-medium" style={{ color: "#F87171" }}>
              Impulse detected
            </span>
          </div>
          <span className="text-xs" style={{ color: "#6B7280" }}>
            14:36
          </span>
        </div>
        <p className="text-[13px] text-white leading-relaxed">
          Your heart rate increased. Want to pause for a moment?
        </p>
        <div className="flex gap-2">
          <button
            className="px-3 py-1.5 rounded-full text-xs font-medium text-white active:scale-95 transition-transform"
            style={{ backgroundColor: "#2D7D6F" }}
          >
            Breathe
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-medium active:scale-95 transition-transform"
            style={{ color: "#9CA3AF", border: "1px solid #9CA3AF", background: "transparent" }}
          >
            Dismiss
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040" }}
          >
            Open PULZ
          </button>
        </div>
      </div>

      {/* Detection info card */}
      <div
        className="rounded-xl p-4 space-y-2.5"
        style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
      >
        <p className="text-xs font-medium" style={{ color: "#2D7D6F" }}>
          Why this alert?
        </p>
        {[
          { icon: Heart, text: "BPM rose 24% above baseline" },
          { icon: Footprints, text: "Movement: low for 45 min" },
          { icon: Thermometer, text: "Temperature +0.3°C" },
          { icon: Clock, text: "Matches past impulse window" },
        ].map((row) => (
          <div key={row.text} className="flex items-center gap-2">
            <row.icon size={14} style={{ color: "#2D7D6F" }} className="shrink-0" />
            <span className="text-xs" style={{ color: "#2D7D6F" }}>
              {row.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
