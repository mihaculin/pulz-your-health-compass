import { useEffect, useState } from "react";
import { User, Bell, Shield, SlidersHorizontal, Copy, Trash2, Download, AlertTriangle, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_PREFS = {
  interventions: true,
  dailyCheckin: true,
  weeklySummary: true,
  specialistMsg: true,
  checkinTime: "09:00",
  retention: "90 days",
  sharing: { episodes: true, journal: true, biometrics: true },
  theme: "Light",
  fontSize: "Default",
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { fullName, initials, joinedWeeksAgo, personalisation, updatePersonalisation, dateOfBirth, primaryConcerns, heightCm, weightKg, conditions, intakeSurveyCompleted } = useApp();
  const { user, role } = useAuth();

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [device, setDevice] = useState<{ deviceType: string; lastSync: string | null; isActive: boolean | null } | null>(null);
  const [specialistName, setSpecialistName] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const language = personalisation.language;
  const notifs = {
    interventions: prefs.interventions,
    dailyCheckin: prefs.dailyCheckin,
    weeklySummary: prefs.weeklySummary,
    specialistMsg: prefs.specialistMsg,
  };
  const checkinTime = prefs.checkinTime;
  const retention = prefs.retention;
  const sharing = prefs.sharing;
  const theme = prefs.theme;
  const fontSize = prefs.fontSize;

  const updatePrefs = async (patch: Partial<typeof DEFAULT_PREFS>) => {
    const next = {
      ...prefs,
      ...patch,
      sharing: {
        ...prefs.sharing,
        ...(patch.sharing ?? {}),
      },
    };
    setPrefs(next);
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        notification_preferences: next,
        theme_preference: next.theme,
      })
      .eq("user_id", user.id);
  };

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      const [profileRes, deviceRes, cpRes] = await Promise.all([
        supabase.from("profiles").select("notification_preferences, theme_preference").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("device_connections")
          .select("device_type, last_sync, is_active")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        role === "client"
          ? supabase.from("client_profiles").select("assigned_specialist_id").eq("id", user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (cancelled) return;

      const rawPrefs = (profileRes.data?.notification_preferences as Partial<typeof DEFAULT_PREFS>) ?? {};
      const nextPrefs = {
        ...DEFAULT_PREFS,
        ...rawPrefs,
        sharing: {
          ...DEFAULT_PREFS.sharing,
          ...(rawPrefs.sharing ?? {}),
        },
      };
      if (profileRes.data?.theme_preference) {
        nextPrefs.theme = profileRes.data.theme_preference;
      }
      setPrefs(nextPrefs);

      if (deviceRes.data) {
        setDevice({
          deviceType: deviceRes.data.device_type,
          lastSync: deviceRes.data.last_sync,
          isActive: deviceRes.data.is_active,
        });
      } else {
        setDevice(null);
      }

      if (role === "client" && cpRes.data?.assigned_specialist_id) {
        const { data: specialistProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", cpRes.data.assigned_specialist_id)
          .maybeSingle();
        if (!cancelled) {
          setSpecialistName(specialistProfile?.full_name ?? null);
        }
      } else {
        setSpecialistName(null);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  const age = (() => {
    if (!dateOfBirth) return null;
    const raw = dateOfBirth.trim();
    if (!raw) return null;

    let dob: Date | null = null;
    const match = /^(\d{2,4})[\/.-](\d{2})[\/.-](\d{2,4})$/.exec(raw);
    if (match) {
      const a = Number(match[1]);
      const b = Number(match[2]);
      const c = Number(match[3]);
      if (match[1].length === 4) {
        const y = a;
        const m = b;
        const d = c;
        dob = new Date(Date.UTC(y, m - 1, d));
      } else if (match[3].length === 4) {
        const d = a;
        const m = b;
        const y = c;
        dob = new Date(Date.UTC(y, m - 1, d));
      }
    }

    if (!dob) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.getTime())) dob = parsed;
    }

    if (!dob) return null;

    const today = new Date();
    const yearDiff = today.getFullYear() - dob.getUTCFullYear();
    const monthDiff = today.getMonth() - dob.getUTCMonth();
    const dayDiff = today.getDate() - dob.getUTCDate();
    let years = yearDiff;
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
    return years;
  })();
  const deviceConnected = device?.isActive ?? false;
  const deviceName = device?.deviceType ?? "No device connected";
  const lastSyncLabel = device?.lastSync ? new Date(device.lastSync).toLocaleString() : "—";
  const hasSpecialist = Boolean(specialistName);

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
            {initials || "U"}
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-lg">{fullName || "—"}</h2>
            <p className="text-sm text-muted-foreground">Age {age ?? "—"}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {primaryConcerns.length ? (
                primaryConcerns.map((c) => (
                  <span key={c} className="chip-trigger px-2.5 py-1 rounded-full text-xs">{c}</span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No concerns set yet</span>
              )}
            </div>
            {(heightCm || weightKg) && (
              <p className="text-xs text-muted-foreground mt-1">
                {heightCm ? `${heightCm} cm` : ""}
                {heightCm && weightKg ? " · " : ""}
                {weightKg ? `${weightKg} kg` : ""}
              </p>
            )}
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {conditions.map((c) => (
                  <span key={c} className="chip-biometric px-2.5 py-1 rounded-full text-xs">{c}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Started {joinedWeeksAgo} weeks ago</p>
          </div>
        </div>
      </div>

      {/* ─── INCOMPLETE PROFILE BANNER ─── */}
      {!intakeSurveyCompleted && (
        <button
          onClick={() => navigate("/onboarding")}
          className="w-full rounded-xl p-4 flex items-center gap-3 text-left transition-colors hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#FFF9E6", border: "1px solid #FCD34D" }}
        >
          <ClipboardList size={18} style={{ color: "#B45309" }} />
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: "#B45309" }}>Complete your health profile</p>
            <p className="text-xs text-muted-foreground">Finish the setup survey so PULZ can personalise your experience.</p>
          </div>
        </button>
      )}

      {/* ─── DEVICE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-base">Connected Device</h3>
          <span className={`text-sm font-medium ${deviceConnected ? "text-success" : "text-muted-foreground"}`}>
            {deviceConnected ? `${deviceName} ✅` : deviceName}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span>Last sync: {lastSyncLabel}</span>
          <span>Battery: —</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {deviceConnected ? (
            <span className="chip-biometric px-2.5 py-1 rounded-full text-xs">Sync active</span>
          ) : (
            <span className="text-xs text-muted-foreground">No device data yet</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            disabled={!deviceConnected}
            className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040", opacity: deviceConnected ? 1 : 0.6 }}
          >
            Sync now
          </button>
          <button
            disabled={!deviceConnected}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            style={{ opacity: deviceConnected ? 1 : 0.6 }}
          >
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
          <Toggle on={notifs.interventions} onToggle={() => updatePrefs({ interventions: !notifs.interventions })} />
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
                onChange={(e) => updatePrefs({ checkinTime: e.target.value })}
                className="rounded-lg border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#b3ecec] transition"
              />
            )}
            <Toggle on={notifs.dailyCheckin} onToggle={() => updatePrefs({ dailyCheckin: !notifs.dailyCheckin })} />
          </div>
        </div>

        {/* Weekly summary */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Download size={18} className="text-muted-foreground" />
            <span className="text-sm">Weekly summary</span>
          </div>
          <Toggle on={notifs.weeklySummary} onToggle={() => updatePrefs({ weeklySummary: !notifs.weeklySummary })} />
        </div>

        {/* Specialist messages */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <User size={18} className="text-muted-foreground" />
            <span className="text-sm">Specialist messages</span>
          </div>
          <Toggle on={notifs.specialistMsg} onToggle={() => updatePrefs({ specialistMsg: !notifs.specialistMsg })} />
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">Sound</span>
          </div>
          <Toggle on={personalisation.soundEnabled} onToggle={() => updatePersonalisation({ soundEnabled: !personalisation.soundEnabled })} />
        </div>

        <div
          className="mt-2 rounded-xl px-4 py-3 text-xs"
          style={{ backgroundColor: "#EEF3FB", color: "#4A5568" }}
        >
          PULZ notifications are always on to keep you safe. For concerns about notification frequency, speak with your specialist.
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
          <PillRadio options={["30 days", "60 days", "90 days"]} value={retention} onChange={(v) => updatePrefs({ retention: v })} />
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
        <p className="text-sm text-muted-foreground">
          {hasSpecialist ? specialistName : "No specialist assigned"}
        </p>

        <div className="space-y-1">
          {(["episodes", "journal", "biometrics"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between py-2">
              <span className="text-sm capitalize">{key}</span>
              <Toggle
                on={sharing[key]}
                onToggle={() => hasSpecialist && updatePrefs({ sharing: { ...sharing, [key]: !sharing[key] } })}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            disabled={!hasSpecialist}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            style={{ opacity: hasSpecialist ? 1 : 0.6 }}
          >
            Disconnect specialist
          </button>
          <button className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center gap-1.5">
            <Copy size={14} />
            Invite new specialist
          </button>
        </div>
      </div>

      {/* ─── CRISIS CONTACT CARD ─── */}
      {(personalisation.crisisContactName || personalisation.crisisContactPhone) && (
        <div className="rounded-xl p-6 card-shadow slide-up" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FECACA", animationDelay: "330ms" }}>
          <h3 className="font-heading font-semibold text-base mb-3">Crisis Contact</h3>
          <div className="space-y-1">
            {personalisation.crisisContactName && (
              <p className="text-sm font-medium">{personalisation.crisisContactName}</p>
            )}
            {personalisation.crisisContactPhone && (
              <p className="text-sm text-muted-foreground">{personalisation.crisisContactPhone}</p>
            )}
          </div>
          <button
            onClick={() => navigate("/personalise")}
            className="mt-3 text-xs text-muted-foreground hover:underline"
          >
            Edit in Personalise →
          </button>
        </div>
      )}

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
          <PillRadio options={["Light", "Dark", "System"]} value={theme} onChange={(v) => updatePrefs({ theme: v })} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Language</label>
          <select
            value={language}
            onChange={(e) => updatePersonalisation({ language: e.target.value })}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
          >
            {["Romanian", "English"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Font size</label>
          <PillRadio options={["Default", "Large"]} value={fontSize} onChange={(v) => updatePrefs({ fontSize: v })} />
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
