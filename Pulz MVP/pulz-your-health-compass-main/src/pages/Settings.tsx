import { useState } from "react";
import { User, Watch, Bell, Shield, Palette, SlidersHorizontal, Copy, Trash2, Download, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const navigate = useNavigate();

  /* Notifications */
  const [notifs, setNotifs] = useState({
    interventions: true,
    dailyCheckin: true,
    weeklySummary: true,
    specialistMsg: true,
    sound: false,
  });
  const [checkinTime, setCheckinTime] = useState("09:00");
  const [quietFrom, setQuietFrom] = useState("22:00");
  const [quietTo, setQuietTo] = useState("08:00");

  /* Privacy */
  const [retention, setRetention] = useState("90 days");
  const [deleteModal, setDeleteModal] = useState(false);

  /* Specialist */
  const [sharing, setSharing] = useState({ episodes: true, journal: true, biometrics: true });

  /* Appearance */
  const [theme, setTheme] = useState("Light");
  const [language, setLanguage] = useState("English");
  const [fontSize, setFontSize] = useState("Default");

  const toggleNotif = (key: keyof typeof notifs) => setNotifs((p) => ({ ...p, [key]: !p[key] }));
  const toggleSharing = (key: keyof typeof sharing) => setSharing((p) => ({ ...p, [key]: !p[key] }));

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-5" : ""}`} />
    </button>
  );

  const PillRadio = ({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
            value === opt ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Profile & preferences</p>
      </div>

      {/* ─── PROFILE CARD ─── */}
      <div
        className="rounded-xl p-6 card-shadow slide-up"
        style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec", animationDelay: "60ms" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-heading font-bold text-2xl shrink-0"
            style={{ backgroundColor: "#D7C9DB", color: "#3A2845" }}
          >
            AM
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-lg">Andrada M.</h2>
            <p className="text-sm text-muted-foreground">Age 27 · Cluj, Romania</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="chip-trigger px-2.5 py-1 rounded-full text-xs">Binge eating</span>
              <span className="chip-trigger px-2.5 py-1 rounded-full text-xs">Emotional eating</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Started 6 weeks ago</p>
          </div>
        </div>
      </div>

      {/* ─── DEVICE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-base">Connected Device</h3>
          <span className="text-sm font-medium text-success">Apple Watch Series 9 ✅</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span>Last sync: 2 minutes ago</span>
          <span>Battery: 74%</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {["Heart rate ✅", "Temperature ✅", "Movement ✅"].map((b) => (
            <span key={b} className="chip-biometric px-2.5 py-1 rounded-full text-xs">{b}</span>
          ))}
          {["ECG — coming soon", "EDA — coming soon"].map((b) => (
            <span key={b} className="px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>{b}</span>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040" }}
          >
            Sync now
          </button>
          <button className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95">
            Disconnect device
          </button>
        </div>
      </div>

      {/* ─── NOTIFICATIONS CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-1 slide-up" style={{ animationDelay: "180ms" }}>
        <h3 className="font-heading font-semibold text-base mb-4">Notifications</h3>

        {/* Intervention alerts */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-muted-foreground" />
            <span className="text-sm">Intervention alerts</span>
          </div>
          <Toggle on={notifs.interventions} onToggle={() => toggleNotif("interventions")} />
        </div>

        {/* Daily check-in */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">Daily check-in reminder</span>
          </div>
          <div className="flex items-center gap-2">
            {notifs.dailyCheckin && (
              <input
                type="time"
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
                className="rounded-lg border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#b3ecec] transition"
              />
            )}
            <Toggle on={notifs.dailyCheckin} onToggle={() => toggleNotif("dailyCheckin")} />
          </div>
        </div>

        {/* Weekly summary */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Download size={18} className="text-muted-foreground" />
            <span className="text-sm">Weekly summary</span>
          </div>
          <Toggle on={notifs.weeklySummary} onToggle={() => toggleNotif("weeklySummary")} />
        </div>

        {/* Specialist messages */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <User size={18} className="text-muted-foreground" />
            <span className="text-sm">Specialist messages</span>
          </div>
          <Toggle on={notifs.specialistMsg} onToggle={() => toggleNotif("specialistMsg")} />
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">Sound</span>
          </div>
          <Toggle on={notifs.sound} onToggle={() => toggleNotif("sound")} />
        </div>

        {/* Quiet hours */}
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-muted-foreground">Quiet hours</span>
          <div className="flex items-center gap-2">
            <input type="time" value={quietFrom} onChange={(e) => setQuietFrom(e.target.value)} className="rounded-lg border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#b3ecec] transition" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="time" value={quietTo} onChange={(e) => setQuietTo(e.target.value)} className="rounded-lg border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#b3ecec] transition" />
          </div>
        </div>
      </div>

      {/* ─── PRIVACY CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "240ms" }}>
        <h3 className="font-heading font-semibold text-base">Privacy & Data</h3>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}>
          <Shield size={14} />
          Local processing only ✅
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Data retention</label>
          <PillRadio options={["30 days", "60 days", "90 days"]} value={retention} onChange={setRetention} />
        </div>

        <button className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center justify-center gap-2">
          <Download size={16} />
          Export my data as CSV
        </button>

        <button
          onClick={() => setDeleteModal(true)}
          className="text-sm font-medium hover:underline transition-all active:scale-95"
          style={{ color: "#F87171" }}
        >
          Delete all data
        </button>
      </div>

      {/* ─── SPECIALIST CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-emotional space-y-5 slide-up" style={{ animationDelay: "300ms" }}>
        <h3 className="font-heading font-semibold text-base">Specialist</h3>
        <p className="text-sm text-muted-foreground">Dr. Mihai Ionescu — Psychotherapist</p>

        <div className="space-y-1">
          {(["episodes", "journal", "biometrics"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-sm capitalize">{key}</span>
              <Toggle on={sharing[key]} onToggle={() => toggleSharing(key)} />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95">
            Disconnect specialist
          </button>
          <button className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center gap-1.5">
            <Copy size={14} />
            Invite new specialist
          </button>
        </div>
      </div>

      {/* ─── APPEARANCE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "360ms" }}>
        <h3 className="font-heading font-semibold text-base">Appearance</h3>

        {/* Link to Personalise */}
        <button
          onClick={() => navigate("/personalise")}
          className="w-full rounded-xl p-4 text-left flex items-center gap-3 transition-colors hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
        >
          <SlidersHorizontal size={18} style={{ color: "#2D7D6F" }} />
          <span className="text-sm font-medium" style={{ color: "#2D7D6F" }}>
            Full theme & colour settings →
          </span>
        </button>

        <div className="space-y-2">
          <label className="text-sm font-medium">Theme</label>
          <PillRadio options={["Light", "Dark", "System"]} value={theme} onChange={setTheme} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
          >
            {["Romanian", "English"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Font size</label>
          <PillRadio options={["Default", "Large"]} value={fontSize} onChange={setFontSize} />
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDeleteModal(false)} />
          <div
            className="relative bg-card rounded-2xl p-6 max-w-sm mx-4 card-shadow space-y-4"
            style={{ animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 size={18} className="text-destructive" />
              </div>
              <h3 className="font-heading font-semibold">Delete all data?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your episodes, journal entries, and progress data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-destructive hover:bg-destructive/90 transition-colors active:scale-95"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
