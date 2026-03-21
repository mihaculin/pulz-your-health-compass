import { useState, useRef, useEffect } from "react";
import { Check, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { THEMES } from "@/lib/theme";
import { playAlert } from "@/lib/playAlert";

const themes = THEMES.map((t) => ({ ...t, from: t.aqua, to: t.lavender }));

const emojis = ["🌿", "🌊", "💜", "💚", "☁️", "🌙", "✨", "🫧", "🌸", "🍃", "🕊️", "🌷"];

const soundTypes = [
  { id: "chime", label: "Soft chime", hz: "440hz" },
  { id: "bell", label: "Gentle bell", hz: "528hz" },
  { id: "nature", label: "Nature sound", hz: "396hz" },
];

const tones = [
  { id: "warm", nameKey: "personalise.toneWarm", preview: "You're doing beautifully. This too shall pass. 💚" },
  { id: "direct", nameKey: "personalise.toneDirect", preview: "Urge detected. Time to pause and breathe." },
  { id: "curious", nameKey: "personalise.toneCurious", preview: "Interesting moment. What's happening inside? 🌿" },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function WatchPreview({ message }: { message: string }) {
  return (
    <div className="mt-2 w-48 rounded-2xl p-3 border border-border/60 card-shadow" style={{ backgroundColor: "hsl(172 55% 94%)" }}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">PULZ · now</p>
      <p className="text-xs leading-snug">{message}</p>
    </div>
  );
}

function EmojiPicker({ onSelect, open, onToggle }: { onSelect: (e: string) => void; open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <button type="button" onClick={onToggle} className="p-2 rounded-lg hover:bg-muted transition-colors text-base active:scale-95">
        🙂
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card rounded-xl border border-border/60 card-shadow p-2 grid grid-cols-6 gap-1 w-56">
          {emojis.map((em) => (
            <button key={em} type="button" onClick={() => { onSelect(em); onToggle(); }} className="text-lg p-1.5 rounded-lg hover:bg-muted transition-colors active:scale-90">
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Personalise() {
  const { toast } = useToast();
  const { personalisation, updatePersonalisation } = useApp();
  const { t } = useLanguage();

  const defaultMessages = [
    { label: t("personalise.whenGrounding"), text: "Take a slow breath. You're safe right now." },
    { label: t("personalise.urgeDetected"), text: "Let's pause together. One breath at a time." },
    { label: t("personalise.afterDifficult"), text: "You got through it. That took strength." },
  ];

  const [selectedTheme, setSelectedTheme] = useState(personalisation.theme);
  const [customAccent, setCustomAccent] = useState(personalisation.accentColor);

  const [messages, setMessages] = useState(defaultMessages.map((m) => m.text));
  const [emojiOpen, setEmojiOpen] = useState<number | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [soundOn, setSoundOn] = useState(false);
  const [soundType, setSoundType] = useState("chime");
  const [soundVolume, setSoundVolume] = useState(50);

  const [browserNotifsEnabled, setBrowserNotifsEnabled] = useState(false);
  const [notifDuration, setNotifDuration] = useState<3 | 5 | 10>(5);
  const notifPosition = "bottom-right" as const;
  const [inAppAlerts, setInAppAlerts] = useState(true);

  const [selectedTone, setSelectedTone] = useState("warm");
  const [languagePref, setLanguagePref] = useState("English");
  const [crisisName, setCrisisName] = useState("");
  const [crisisPhone, setCrisisPhone] = useState("");
  const [crisisPrompt, setCrisisPrompt] = useState(false);
  const [selfCare, setSelfCare] = useState("");

  useEffect(() => {
    setSelectedTheme(personalisation.theme);
    setCustomAccent(personalisation.accentColor);
    setMessages([personalisation.message1, personalisation.message2, personalisation.message3]);
    setSoundOn(personalisation.soundEnabled);
    setSoundType(personalisation.soundType);
    setSoundVolume(personalisation.soundVolume);
    setSelectedTone(personalisation.messageTone);
    setLanguagePref(personalisation.language);
    setCrisisName(personalisation.crisisContactName);
    setCrisisPhone(personalisation.crisisContactPhone);
    setBrowserNotifsEnabled(personalisation.browserNotificationsEnabled);
    setNotifDuration(personalisation.notificationDuration);

    setInAppAlerts(personalisation.inAppAlertsEnabled);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTheme = (th: typeof themes[0]) => {
    setSelectedTheme(th.id);
    setCustomAccent(th.aqua);
    updatePersonalisation({ theme: th.id, accentColor: th.aqua });
  };

  const handleCustomAccent = (hex: string) => {
    setCustomAccent(hex);
    setSelectedTheme("");
    updatePersonalisation({ theme: "", accentColor: hex });
  };

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


  const handleBrowserNotifToggle = async () => {
    if (!browserNotifsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setBrowserNotifsEnabled(true);
        updatePersonalisation({ browserNotificationsEnabled: true });
        toast({ description: "Browser notifications enabled ✅", className: "bg-white border-l-2 border-l-[#b3ecec]" });
      } else {
        toast({ description: "Enable notifications in your browser settings", className: "bg-white border-l-2 border-l-[#FCD34D]" });
      }
    } else {
      setBrowserNotifsEnabled(false);
      updatePersonalisation({ browserNotificationsEnabled: false });
    }
  };

  const testNotification = () => {
    if (Notification.permission === "granted") {
      if (soundOn) playAlert(soundType, soundVolume);
      new Notification("PULZ", {
        body: personalisation.message1 || "Take a slow breath. You're safe right now.",
        icon: "/favicon.ico",
      });
    }
  };

  const handleSave = async () => {
    await updatePersonalisation({
      soundEnabled: soundOn,
      soundType,
      soundVolume,
      messageTone: selectedTone,
      language: languagePref,
      crisisContactName: crisisName,
      crisisContactPhone: crisisPhone,
      browserNotificationsEnabled: browserNotifsEnabled,
      notificationDuration: notifDuration,
      notificationPosition: notifPosition,
      inAppAlertsEnabled: inAppAlerts,
    });
    toast({ description: t("personalise.savedToast"), className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition bg-white";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8 pb-16">
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("personalise.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("personalise.subtitle")}</p>
      </div>

      {/* SECTION A: APP THEME */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "60ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">{t("personalise.colorsTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("personalise.colorsDesc")}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {themes.map((th) => {
            const active = selectedTheme === th.id;
            return (
              <button key={th.id} onClick={() => selectTheme(th)} className={`rounded-xl overflow-hidden transition-all duration-200 active:scale-[0.97] ${active ? "ring-[3px] ring-primary" : "ring-1 ring-border/60 hover:ring-border"}`}>
                <div className="w-full h-20 relative" style={{ background: `linear-gradient(135deg, ${th.from}, ${th.to})` }}>
                  {active && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={12} className="text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 text-left">
                  <p className="text-sm font-medium">{th.name}</p>
                  <p className="text-xs text-muted-foreground">{th.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">{t("personalise.customAccent")}</label>
          <input type="color" value={customAccent} onChange={(e) => handleCustomAccent(e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
          <span className="font-mono text-xs text-muted-foreground">{customAccent}</span>
        </div>
      </section>

      {/* SECTION B: INTERVENTION MESSAGES */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "120ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">{t("personalise.wordsTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("personalise.wordsDesc")}</p>
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
                <EmojiPicker open={emojiOpen === idx} onToggle={() => setEmojiOpen(emojiOpen === idx ? null : idx)} onSelect={(em) => insertEmoji(idx, em)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono tabular-nums">{messages[idx].length}/100</span>
                <button type="button" onClick={() => setPreviewIdx(previewIdx === idx ? null : idx)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {previewIdx === idx ? t("personalise.hidePreview") : t("personalise.preview")}
                </button>
              </div>
              {previewIdx === idx && <WatchPreview message={messages[idx]} />}
            </div>
          ))}
        </div>
        <button type="button" onClick={resetMessages} className="text-sm text-muted-foreground hover:underline transition-all">
          {t("personalise.resetDefaults")}
        </button>
      </section>

      {/* SECTION C-1: WEB EXPERIENCE */}
      <section className="bg-card rounded-xl p-6 card-shadow border space-y-6 slide-up" style={{ borderColor: "#b3ecec", animationDelay: "180ms" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <h2 className="font-heading font-semibold text-base" style={{ color: "#2D7D6F" }}>Web experience</h2>
        </div>

        {/* 1. SOUND */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Sound</p>
              <p className="text-xs text-muted-foreground mt-0.5">Play a tone when an alert fires</p>
            </div>
            <Toggle on={soundOn} onToggle={() => setSoundOn(!soundOn)} />
          </div>
          {soundOn && (
            <div className="space-y-4 pl-1">
              <div className="grid grid-cols-3 gap-2">
                {soundTypes.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSoundType(st.id)}
                    className={`rounded-xl p-3 text-left transition-all duration-200 active:scale-[0.97] border ${soundType === st.id ? "border-primary" : "border-border/60 hover:border-border"}`}
                    style={soundType === st.id ? { backgroundColor: "#b3ecec" } : undefined}
                  >
                    <p className="text-sm font-medium">{st.label}</p>
                    <p className="text-xs text-muted-foreground">{st.hz}</p>
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Volume</label>
                  <span className="text-xs font-mono text-muted-foreground">{soundVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "#7B5E8A" }}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => playAlert(soundType, soundVolume)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors active:scale-95"
              >
                Preview sound
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border/30" />

        {/* 2. BROWSER PUSH NOTIFICATION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Pop-up notification</p>
              <p className="text-xs text-muted-foreground mt-0.5">Browser push notification</p>
            </div>
            <Toggle on={browserNotifsEnabled} onToggle={handleBrowserNotifToggle} />
          </div>
          {browserNotifsEnabled && (
            <div className="space-y-4 pl-1">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Show duration</label>
                <div className="flex gap-1.5">
                  {([3, 5, 10] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setNotifDuration(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${notifDuration === d ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={testNotification}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors active:scale-95"
              >
                Test notification
              </button>
            </div>
          )}
        </div>

      </section>

      {/* SECTION D: MESSAGE TONE */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "240ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">{t("personalise.toneTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("personalise.toneDesc")}</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {tones.map((tone) => {
            const active = selectedTone === tone.id;
            return (
              <button key={tone.id} onClick={() => setSelectedTone(tone.id)}
                className={`rounded-xl p-4 text-left transition-all duration-200 active:scale-[0.97] border ${active ? "border-primary" : "border-border/60 hover:border-border"}`}
                style={active ? { backgroundColor: "#b3ecec" } : undefined}>
                <p className="text-sm font-medium mb-2">{t(tone.nameKey)}</p>
                <p className="text-xs text-muted-foreground italic leading-relaxed">"{tone.preview}"</p>
              </button>
            );
          })}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("personalise.interventionLanguage")}</label>
          <select value={languagePref} onChange={(e) => setLanguagePref(e.target.value)} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition">
            {["Romanian", "English"].map((lang) => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </section>

      {/* SECTION E: CRISIS PREFERENCES */}
      <section className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "300ms" }}>
        <div>
          <h2 className="font-heading font-semibold text-base">{t("personalise.crisisTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("personalise.crisisDesc")}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">{t("personalise.contactName")}</label>
            <input value={crisisName} onChange={(e) => setCrisisName(e.target.value)} placeholder={t("personalise.contactNamePlaceholder")} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">{t("personalise.phoneNumber")}</label>
            <input value={crisisPhone} onChange={(e) => setCrisisPhone(e.target.value)} placeholder={t("personalise.phonePlaceholder")} type="tel" className={inputCls} />
          </div>
        </div>

        <label className="flex items-center justify-between py-1 cursor-pointer">
          <span className="text-sm">{t("personalise.crisisPromptLabel")}</span>
          <Toggle on={crisisPrompt} onToggle={() => setCrisisPrompt(!crisisPrompt)} />
        </label>

        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "hsl(276 33% 95%)", borderColor: "#D7C9DB" }}>
          <p className="text-sm text-muted-foreground">{t("personalise.crisisNote")}</p>
          <a href="#" className="text-sm font-medium mt-2 inline-flex items-center gap-1 hover:underline" style={{ color: "#2D7D6F" }}>
            {t("personalise.findSpecialist")} <ChevronRight size={14} />
          </a>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1 block">{t("personalise.selfCare")}</label>
          <textarea value={selfCare} onChange={(e) => setSelfCare(e.target.value)} placeholder={t("personalise.selfCarePlaceholder")} className="w-full px-4 py-3 rounded-xl border text-sm min-h-[100px] resize-y bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition" style={{ borderColor: "#D7C9DB" }} />
        </div>
      </section>

      <button type="button" onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm slide-up" style={{ animationDelay: "360ms" }}>
        {t("personalise.saveAll")}
      </button>
    </div>
  );
}
