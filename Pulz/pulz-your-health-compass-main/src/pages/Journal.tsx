import { useState } from "react";
import { ChevronDown } from "lucide-react";

const emotions = ["Anxious", "Lonely", "Bored", "Stressed", "Tired", "Angry", "Empty", "Numb", "Overwhelmed"];
const sensations = ["Heart racing", "Tension", "Nausea", "Emptiness", "Restlessness", "Headache"];
const needs = ["Connection", "Rest", "Distraction", "Support", "Movement", "Food", "Nothing"];
const urgeOptions = ["Yes", "Partially", "No"];

const pastEntries = [
  { date: "Yesterday, 21:30", emotions: ["Lonely", "Tired"], intensity: 6, acted: "No", reflection: "Took a bath and felt better." },
  { date: "Yesterday, 14:15", emotions: ["Stressed", "Overwhelmed"], intensity: 8, acted: "Partially", reflection: "Ate more than planned but stopped myself." },
  { date: "2 days ago, 19:00", emotions: ["Bored"], intensity: 4, acted: "No", reflection: "Went for a walk instead." },
];

const isBiometricChip = (label: string) => {
  const biometric = ["Heart racing", "Tension", "Nausea", "Restlessness", "Headache"];
  return biometric.includes(label);
};

function ChipSelect({ options, selected, onToggle, type = "emotional" }: { options: string[]; selected: string[]; onToggle: (v: string) => void; type?: "emotional" | "biometric" | "auto" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        const chipType = type === "auto" ? (isBiometricChip(opt) ? "biometric" : "emotional") : type;
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 active:scale-95
              ${isSelected
                ? chipType === "biometric" ? "chip-biometric shadow-sm" : "chip-trigger shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function Journal() {
  const [beforeEmotions, setBeforeEmotions] = useState<string[]>([]);
  const [bodySensations, setBodySensations] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [afterEmotions, setAfterEmotions] = useState<string[]>([]);
  const [acted, setActed] = useState("");
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);

  const toggle = (arr: string[], setter: React.Dispatch<React.SetStateAction<string[]>>, val: string) => {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  const inputFocusClass = "focus:outline-none focus:ring-2 focus:ring-[hsl(180,52%,81%)] focus:border-[hsl(180,52%,81%)] transition";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">Journal</h1>
        <p className="text-muted-foreground mt-1 text-sm">Record what you're experiencing right now.</p>
      </div>

      <div className="rounded-xl p-6 card-emotional space-y-8 slide-up" style={{ backgroundColor: "hsl(276 33% 95%)", animationDelay: "60ms" }}>
        {/* Before */}
        <section className="space-y-4">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wide" style={{ color: "hsl(280 20% 45%)" }}>Before the moment</h3>
          <div>
            <label className="text-sm font-medium mb-2 block">What were you doing?</label>
            <input className={`w-full px-4 py-2.5 rounded-lg bg-white/70 border border-border/50 text-sm ${inputFocusClass}`} placeholder="e.g., Working at my desk, watching TV..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Emotional state</label>
            <ChipSelect options={emotions} selected={beforeEmotions} onToggle={(v) => toggle(beforeEmotions, setBeforeEmotions, v)} type="emotional" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Body sensations</label>
            <ChipSelect options={sensations} selected={bodySensations} onToggle={(v) => toggle(bodySensations, setBodySensations, v)} type="auto" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Intensity</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min={1} max={10} value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="flex-1"
                style={{ accentColor: "#2D7D6F" }}
              />
              <span className="font-mono text-sm tabular-nums w-8 text-center">{intensity}/10</span>
            </div>
          </div>
        </section>

        <hr className="border-border/50" />

        {/* During/After */}
        <section className="space-y-4">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wide" style={{ color: "hsl(280 20% 45%)" }}>During / After</h3>
          <div>
            <label className="text-sm font-medium mb-2 block">What happened?</label>
            <textarea
              className={`w-full px-4 py-2.5 rounded-lg bg-white/70 border border-border/50 text-sm ${inputFocusClass} min-h-[100px] resize-y`}
              placeholder="Describe what happened. It's okay to write freely — there's no wrong answer."
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Did you act on the urge?</label>
            <div className="flex gap-2">
              {urgeOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setActed(opt)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95
                    ${acted === opt ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">How do you feel now?</label>
            <ChipSelect options={emotions} selected={afterEmotions} onToggle={(v) => toggle(afterEmotions, setAfterEmotions, v)} type="emotional" />
          </div>
        </section>

        <hr className="border-border/50" />

        {/* Reflection */}
        <section className="space-y-4">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wide" style={{ color: "hsl(280 20% 45%)" }}>Reflection</h3>
          <div>
            <label className="text-sm font-medium mb-2 block">What do you need right now?</label>
            <ChipSelect options={needs} selected={selectedNeeds} onToggle={(v) => toggle(selectedNeeds, setSelectedNeeds, v)} type="emotional" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Gratitude note <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className={`w-full px-4 py-2.5 rounded-lg bg-white/70 border border-border/50 text-sm ${inputFocusClass}`} placeholder="One small thing that was okay today…" />
          </div>
        </section>

        <button className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm">
          Save this moment
        </button>
      </div>

      {/* Past Entries */}
      <div className="space-y-3 slide-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-lg font-heading font-semibold">Recent Entries</h2>
        {pastEntries.map((entry, i) => (
          <div key={i} className="rounded-xl card-emotional overflow-hidden" style={{ backgroundColor: "hsl(276 33% 95%)" }}>
            <button
              onClick={() => setExpandedEntry(expandedEntry === i ? null : i)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">{entry.date}</span>
                <div className="flex gap-1.5">
                  {entry.emotions.map((e) => (
                    <span key={e} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{e}</span>
                  ))}
                </div>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedEntry === i ? "rotate-180" : ""}`} />
            </button>
            {expandedEntry === i && (
              <div className="px-4 pb-4 pt-0 text-sm space-y-2 border-t border-border/50">
                <p><span className="text-muted-foreground">Intensity:</span> <span className="font-mono tabular-nums">{entry.intensity}/10</span></p>
                <p><span className="text-muted-foreground">Acted on urge:</span> {entry.acted}</p>
                <p className="italic text-muted-foreground">"{entry.reflection}"</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
