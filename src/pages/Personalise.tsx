import { useState, useRef, useEffect } from "react";
import { Check, Smile, Watch, Bell, Layout, Volume2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { THEMES } from "@/lib/theme";

const themes = THEMES.map((t) => ({ ...t, from: t.aqua, to: t.lavender }));

const emojis = ["🌿", "🌊", "💜", "💚", "☁️", "🌙", "✨", "🫧", "🌸", "🍃", "🕊️", "🌷"];

const defaultMessages = [
  { label: "When you need grounding", text: "Take a slow breath. You're safe right now." },
  { label: "When an urge is detected", text: "Let's pause together. One breath at a time." },
  { label: "After a difficult moment", text: "You got through it. That took strength." },
];

const vibrationPatterns = [
  { id: "gentle", name: "Gentle pulse", sub: "Two soft vibrations", dots: 2, speed: "slow" },
  { id: "steady", name: "Steady reminder", sub: "One medium vibration", dots: 1, speed: "medium" },
  { id: "urgent", name: "Urgent alert", sub: "Three quick vibrations", dots: 3, speed: "fast" },
];

const tones = [
  { id: "warm", name: "Warm & nurturing", preview: "You're doing beautifully. This too shall pass. 💚" },
  { id: "direct", name: "Clear & direct", preview: "Urge detected. Time to pause and breathe." },
  { id: "curious", name: "Curious & gentle", preview: "Interesting moment. What's happening inside? 🌿" },
];

/* ────────────── Pulsing dots ────────────── */
function PulsingDots({ count, speed }: { count: number; speed: string }) {
  const dur = speed === "slow" ? "1.8s" : speed === "medium" ? "1.2s" : "0.6s";
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="w-3 h-3 rounded-full bg-primary inline-block"
          style={{
            animation: `pulseDot ${dur} ease-in-out infinite`,
            animationDelay: `${i * 150}ms`,
          }}
        />
      ))}
    </div>
  );
}

/* ────────────── Watch preview ────────────── */
function WatchPreview({ message }: { message: string }) {
  return (
    <div className="mt-2 w-48 rounded-2xl p-3 border border-border/60 card-shadow" style={{ backgroundColor: "hsl(172 55% 94%)" }}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">PULZ · now</p>
      <p className="text-xs leading-snug">{message}</p>
    </div>
  );
}

/* ────────────── Emoji picker ────────────── */
function EmojiPicker({ onSelect, open, onToggle }: { onSelect: (e: string) => void; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="p-2 rounded-lg hover:bg-muted transition-colors text-base active:scale-95"
      >
        🙂
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl border border-border/60 card-shadow p-2 grid grid-cols-6 gap-1 w-56">
          {emojis.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => { onSelect(em); onToggle(); }}
              className="text-lg p-1.5 rounded-lg hover:bg-muted transition-colors active:scale-90"
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════ MAIN COMPONENT ════════════ */
export default function Personalise() {
  const { toast } = useToast();
  const { personalisation, updatePersonalisation } = useApp();

  /* Section A — Theme */
  const [selectedTheme, setSelectedTheme] = useState(personalisation.theme);
  const [customAccent, setCustomAccent] = useState(personalisation.accentColor);

  useEffect(() => {
    setSelectedTheme(personalisation.theme);
    setCustomAccent(personalisation.accentColor);
    setMessages([personalisation.message1, personalisation.message2, personalisation.message3]);
    setVibPattern(personalisation.vibrationPattern);
    setVibIntensity(personalisation.vibrationIntensity);
    setSoundOn(personalisation.soundEnabled);
    setSoundType(personalisation.soundType);
    setSoundVolume(personalisation.soundVolume);
    setQuietFrom(personalisation.quietHoursStart);
    setQuietTo(personalisation.quietHoursEnd);
    setSelectedTone(personalisation.messageTone);
    setLanguage(personalisation.language);
    setCrisisName(personalisation.crisisContactName);
    setCrisisPhone(personalisation.crisisContactPhone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTheme = (t: typeof themes[0]) => {
    setSelectedTheme(t.id);
    setCustomAccent(t.aqua);
    updatePersonalisation({ theme: t.id, accentColor: t.aqua });
  };

  const handleCustomAccent = (hex: string) => {
    setCustomAccent(hex);
    setSelectedTheme("");
    updatePersonalisation({ theme: "", accentColor: hex });
  };

  /* Section B — Interventions */
  const [messages, setMessages] = useState(defaultMessages.map((m) => m.text));
  const [emojiOpen, setEmojiOpen] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateMessage = (idx: number, val: string) => {
    if (val.length > 100) return;
    const next = messages.map((m, i) => (i === idx ? val : m));
    setMessages(next);
    updatePersonalisation({ message1: next[0], message2: next[1], message3: next[2] });
  };

  const insertEmoji = (idx: number, emoji: string) => {
    const current = messages[idx];
    if (current.length + emoji.length > 100) return;
    const next = messages.map((m, i) => (i === idx ? m + emoji : m));
    setMessages(next);
    updatePersonalisation({ message1: next[0], message2: next[1], message3: next[2] });
    inputRefs.current[idx]?.focus();
  };

  const resetMessages = () => {
    const defaults = defaultMessages.map((m) => m.text);
    setMessages(defaults);
    updatePersonalisation({ message1: defaults[0], message2: defaults[1], message3: defaults[2] });
  };

  /* Section C — Signal */
  const [vibPattern, setVibPattern] = useState("gentle");
  const [vibIntensity, setVibIntensity] = useState(3);
  const [soundOn, setSoundOn] = useState(false);
  const [soundType, setSoundType] = useState("Soft chime");
  const [soundVolume, setSoundVolume] = useState(50);
  const [channels, setChannels] = useState({ watch: true, phone: true, inApp: true, phoneSound: false });
  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("08:00");
  const [quietExcept, setQuietExcept] = useState(true);

  const previewSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.value = 0.1;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* silent */ }
  };

  /* Section D — Tone */
  const [selectedTone, setSelectedTone] = useState("warm");
  const [language, setLanguage] = useState("English");

  /* Section E — Crisis */
  const [crisisName, setCrisisName] = useState("");
  const [crisisPhone, setCrisisPhone] = useState("");
  const [crisisPrompt, setCrisisPrompt] = useState(false);
  const [selfCare, setSelfCare] = useState("");

  const handleSave = async () => {
    await updatePersonalisation({
      vibrationPattern: vibPattern,
      vibrationIntensity: vibIntensity,
      soundEnabled: soundOn,
      soundType,
      soundVolume,
      quietHoursStart: quietFrom,
      quietHoursEnd: quietTo,
      messageTone: selectedTone,
      language,
      crisisContactName: crisisName,
      crisisContactPhone: crisisPhone,
    });
    toast({ description: "Your PULZ is personalised 💚", className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition bg-white";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">My PULZ</h1>
        <p className="text-muted-foreground mt-1 text-sm">Make PULZ feel like yours.</p>
      </div>

      {/* ─── SECTION A: APP THEME ─── */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "60ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">Your space, your colours</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose a palette that feels calm and safe for you.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map((t) => {
            const active = selectedTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => selectTheme(t)}
                className={`rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.97] ${active ? "ring-[3px] ring-primary" : "ring-1 ring-border/60 hover:ring-border"}`}
              >
                <div
                  className="w-full h-20 relative"
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
                >
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 text-left">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">Custom accent colour</label>
          <input
            type="color"
            value={customAccent}
            onChange={(e) => handleCustomAccent(e.target.value)}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer"
          />
          <span className="font-mono text-xs text-muted-foreground">{customAccent}</span>
        </div>
      </section>

      {/* ─── SECTION B: INTERVENTION MESSAGES ─── */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "120ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">Your words, your way</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Edit the messages PULZ sends when it detects a difficult moment.</p>
        </div>
        <div className="space-y-5">
          {defaultMessages.map((slot, idx) => (
            <div key={idx} className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{slot.label}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    value={messages[idx]}
                    onChange={(e) => updateMessage(idx, e.target.value)}
                    maxLength={100}
                    className={inputCls}
                  />
                </div>
                <EmojiPicker
                  open={emojiOpen === idx}
                  onToggle={() => setEmojiOpen(emojiOpen === idx ? null : idx)}
                  onSelect={(em) => insertEmoji(idx, em)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono tabular-nums">{messages[idx].length}/100</span>
                <button
                  type="button"
                  onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {previewIdx === idx ? "Hide preview" : "Preview"}
                </button>
              </div>
              {previewIdx === idx && <WatchPreview message={messages[idx]} />}
            </div>
          ))}
        </div>
        <button type="button" onClick={resetMessages} className="text-sm text-muted-foreground hover:underline transition-all">
          Reset to defaults
        </button>
      </section>

      {/* ─── SECTION C: SIGNAL SETTINGS ─── */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-6 slide-up" style={{ animationDelay: "180ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">How PULZ reaches you</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Control exactly how interventions arrive on your watch and phone.</p>
        </div>

        {/* Vibration pattern */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vibration pattern</label>
          <div className="grid grid-cols-3 gap-3">
            {vibrationPatterns.map((vp) => {
              const active = vibPattern === vp.id;
              return (
                <button
                  key={vp.id}
                  onClick={() => setVibPattern(vp.id)}
                  className={`rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.97] border ${
                    active ? "border-primary" : "border-border/60 hover:border-border"
                  }`}
                  style={active ? { backgroundColor: "#b3ecec" } : undefined}
                >
                  <p className="text-sm font-medium">{vp.name}</p>
                  <p className="text-xs text-muted-foreground">{vp.sub}</p>
                  <PulsingDots count={vp.dots} speed={vp.speed} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Vibration intensity */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vibration intensity</label>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">1 — barely there</span>
            <input
              type="range" min={1} max={5} value={vibIntensity}
              onChange={(e) => setVibIntensity(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "#2D7D6F" }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">5 — strong</span>
          </div>
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary font-mono tabular-nums">{vibIntensity}</span>
          </div>
        </div>

        {/* Sound toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Sound</label>
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${soundOn ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${soundOn ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {soundOn && (
            <div className="space-y-4 pl-1">
              <div className="flex flex-wrap gap-2">
                {["Soft chime", "Gentle bell", "Nature sounds"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSoundType(st)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all active:scale-95 ${
                      soundType === st ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Volume</label>
                <input
                  type="range" min={0} max={100} value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "#7B5E8A" }}
                />
              </div>
              <button
                type="button"
                onClick={previewSound}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              >
                ▶ Preview sound
              </button>
            </div>
          )}
        </div>

        {/* Notification channels */}
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notification channels</label>
          {[
            { key: "watch" as const, icon: Watch, label: "Smartwatch vibration" },
            { key: "phone" as const, icon: Bell, label: "Phone notification banner" },
            { key: "inApp" as const, icon: Layout, label: "In-app alert card" },
            { key: "phoneSound" as const, icon: Volume2, label: "Sound on phone" },
          ].map((ch) => (
            <div key={ch.key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <ch.icon size={18} className="text-muted-foreground" />
                <span className="text-sm">{ch.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setChannels((prev) => ({ ...prev, [ch.key]: !prev[ch.key] }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${channels[ch.key] ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${channels[ch.key] ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Quiet hours */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quiet hours</label>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">No alerts between</span>
            <input type="time" value={quietFrom} onChange={(e) => setQuietFrom(e.target.value)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition" />
            <span className="text-sm text-muted-foreground">and</span>
            <input type="time" value={quietTo} onChange={(e) => setQuietTo(e.target.value)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={quietExcept} onChange={(e) => setQuietExcept(e.target.checked)} className="rounded border-border accent-primary w-4 h-4" />
            Except for TRIGGER RISK level alerts
          </label>
        </div>
      </section>

      {/* ─── SECTION D: MESSAGE TONE ─── */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "240ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">The tone that feels right</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose how PULZ speaks to you.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {tones.map((t) => {
            const active = selectedTone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTone(t.id)}
                className={`rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.97] border ${
                  active ? "border-primary" : "border-border/60 hover:border-border"
                }`}
                style={active ? { backgroundColor: "#b3ecec" } : undefined}
              >
                <p className="text-sm font-medium mb-2">{t.name}</p>
                <p className="text-xs text-muted-foreground italic leading-relaxed">"{t.preview}"</p>
              </button>
            );
          })}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intervention language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
          >
            {["Romanian", "English", "Spanish", "French"].map((lang) => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </section>

      {/* ─── SECTION E: CRISIS PREFERENCES ─── */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "300ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">If things feel really hard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set up who or what helps you most in intense moments.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">Contact name</label>
            <input value={crisisName} onChange={(e) => setCrisisName(e.target.value)} placeholder="e.g., Mom, Dr. Ionescu" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">Phone number</label>
            <input value={crisisPhone} onChange={(e) => setCrisisPhone(e.target.value)} placeholder="+40 7xx xxx xxx" type="tel" className={inputCls} />
          </div>
        </div>

        <label className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm">Send me a prompt to text them when TRIGGER RISK is detected</span>
          <button
            type="button"
            onClick={() => setCrisisPrompt(!crisisPrompt)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${crisisPrompt ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${crisisPrompt ? "translate-x-5" : ""}`} />
          </button>
        </label>

        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "hsl(276 33% 95%)", borderColor: "#D7C9DB" }}>
          <p className="text-sm text-muted-foreground">If you're in crisis, reaching out to a professional is always okay.</p>
          <a href="#" className="text-sm font-medium mt-2 inline-flex items-center gap-1 hover:underline" style={{ color: "#2D7D6F" }}>
            Find a specialist <ChevronRight size={14} />
          </a>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">Self-care notes</label>
          <textarea
            value={selfCare}
            onChange={(e) => setSelfCare(e.target.value)}
            placeholder="Things that help me most when I'm struggling…"
            className="w-full px-4 py-3 rounded-xl border text-sm min-h-[100px] resize-y bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
            style={{ borderColor: "#D7C9DB" }}
          />
        </div>
      </section>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm slide-up"
        style={{ animationDelay: "360ms" }}
      >
        Save all settings
      </button>
    </div>
  );
}
