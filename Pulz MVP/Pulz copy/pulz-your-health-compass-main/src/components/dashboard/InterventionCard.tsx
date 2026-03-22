import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

type Phase = "inhale" | "hold" | "exhale";
type View = "menu" | "breathe" | "complete";

const CYCLE_COUNT = 3;

export function InterventionCard({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("menu");
  const [phase, setPhase] = useState<Phase>("inhale");
  const [cyclesDone, setCyclesDone] = useState(0);

  const startBreathing = useCallback(() => {
    setView("breathe");
    setPhase("inhale");
    setCyclesDone(0);
  }, []);

  useEffect(() => {
    if (view !== "breathe") return;

    const durations: Record<Phase, number> = { inhale: 4000, hold: 7000, exhale: 8000 };
    const next: Record<Phase, Phase> = { inhale: "hold", hold: "exhale", exhale: "inhale" };

    const timer = setTimeout(() => {
      const nextPhase = next[phase];
      if (phase === "exhale") {
        const newCount = cyclesDone + 1;
        if (newCount >= CYCLE_COUNT) {
          setView("complete");
          return;
        }
        setCyclesDone(newCount);
      }
      setPhase(nextPhase);
    }, durations[phase]);

    return () => clearTimeout(timer);
  }, [view, phase, cyclesDone]);

  const phaseLabel = { inhale: "Breathe in...", hold: "Hold...", exhale: "Breathe out..." };
  const circleSize = phase === "inhale" || phase === "hold" ? 120 : 60;
  const circleBg = phase === "inhale" || phase === "hold" ? "#b3ecec" : "#E8F8F7";

  return (
    <div
      className="rounded-3xl p-7 relative"
      style={{
        background: "linear-gradient(135deg, #E8F8F7, #F4EEF7)",
        border: "2px solid #b3ecec",
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-black/5 transition-colors active:scale-95"
      >
        <X size={18} className="text-muted-foreground" />
      </button>

      {view === "menu" && (
        <div className="space-y-5">
          <div>
            <h3 className="font-heading font-medium text-xl" style={{ color: "#2D7D6F" }}>
              A moment for you 💚
            </h3>
            <p className="text-sm italic mt-2" style={{ color: "#6B7280" }}>
              Let's pause together. One breath at a time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={startBreathing}
              className="rounded-2xl p-4 text-center text-sm font-medium active:scale-[0.97] transition-transform"
              style={{ backgroundColor: "#b3ecec", color: "#1A4040" }}
            >
              🌬️ Breathe
            </button>
            <button
              className="rounded-2xl p-4 text-center text-sm font-medium active:scale-[0.97] transition-transform"
              style={{ backgroundColor: "#D7C9DB", color: "#3A2845" }}
            >
              🌿 Ground
            </button>
          </div>
          <button
            className="w-full rounded-2xl p-4 text-center text-sm font-medium active:scale-[0.97] transition-transform"
            style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F", border: "1px solid #b3ecec" }}
          >
            📝 Journal
          </button>
          <p
            className="text-center text-[13px] cursor-pointer hover:underline mt-1"
            style={{ color: "#6B7280" }}
            onClick={onClose}
          >
            I'm okay for now
          </p>
        </div>
      )}

      {view === "breathe" && (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: circleSize,
              height: circleSize,
              backgroundColor: circleBg,
              transition: "all 3s cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 40px rgba(179, 236, 236, 0.3)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "#2D7D6F" }}>
              {phaseLabel[phase]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            Cycle {cyclesDone + 1} of {CYCLE_COUNT}
          </p>
        </div>
      )}

      {view === "complete" && (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          {/* Expanding rings */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid #b3ecec",
                  animation: `completionRing 2s ease-out infinite`,
                  animationDelay: `${i * 0.6}s`,
                }}
              />
            ))}
            <span className="text-2xl relative z-10">💚</span>
          </div>
          <p className="font-heading font-medium text-center" style={{ color: "#2D7D6F" }}>
            Beautiful. That took courage. 💚
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-medium text-white active:scale-95 transition-transform"
              style={{ backgroundColor: "#4CAF7D" }}
            >
              Better 💚
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform"
              style={{ backgroundColor: "#D7C9DB", color: "#3A2845" }}
            >
              Still struggling 💜
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
