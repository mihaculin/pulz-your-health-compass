import { useEffect, useState } from "react";
import { User, Bell, Shield, SlidersHorizontal, Trash2, Download, AlertTriangle, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { LangCode } from "@/translations";

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
  const { fullName, initials, joinedWeeksAgo, personalisation, updatePersonalisation, dateOfBirth, primaryConcerns, heightCm, weightKg, conditions, intakeSurveyCompleted, appLoading } = useApp();
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [device, setDevice] = useState<{ deviceType: string; lastSync: string | null; isActive: boolean | null } | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
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
      const [profileRes, deviceRes] = await Promise.all([
        supabase.from("profiles").select("notification_preferences, theme_preference").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("device_connections")
          .select("device_type, last_sync, is_active")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
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
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  if (appLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-16">
        <div className="slide-up">
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("settings.subtitle")}</p>
        </div>
        {[120, 80, 80, 60].map((h, i) => (
          <div key={i} className="bg-muted rounded-xl animate-pulse" style={{ height: h }} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("settings.subtitle")}</p>
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
            <p className="text-sm text-muted-foreground">{t("settings.personalData.age")} {age ?? "—"}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {primaryConcerns.length > 0 ? (
                primaryConcerns.map((c) => (
                  <span key={c} className="chip-trigger px-2.5 py-1 rounded-full text-xs">{c}</span>
                ))
              ) : intakeSurveyCompleted ? (
                <span className="text-xs text-muted-foreground">{t("settings.personalData.noConcerns")}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{t("settings.personalData.completeProfile")}</span>
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
            <p className="text-xs text-muted-foreground mt-2">{t("settings.startedLabel")} {joinedWeeksAgo} {t("settings.personalData.weeksAgo")}</p>
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
            <p className="text-sm font-medium" style={{ color: "#B45309" }}>{t("settings.completeHealthProfile")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.completeHealthProfileDesc")}</p>
          </div>
        </button>
      )}

      {/* ─── DEVICE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-base">{t("settings.device")}</h3>
          <span className={`text-sm font-medium ${deviceConnected ? "text-success" : "text-muted-foreground"}`}>
            {deviceConnected ? `${deviceName} ✅` : t("settings.noDevice")}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span>{t("settings.lastSync")}: {lastSyncLabel}</span>
          <span>{t("settings.battery")}: —</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {deviceConnected ? (
            <span className="chip-biometric px-2.5 py-1 rounded-full text-xs">{t("settings.syncActive")}</span>
          ) : (
            <span className="text-xs text-muted-foreground">{t("settings.noDeviceData")}</span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            disabled={!deviceConnected}
            className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-transform"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040", opacity: deviceConnected ? 1 : 0.6 }}
          >
            {t("settings.syncNow")}
          </button>
          <button
            disabled={!deviceConnected}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            style={{ opacity: deviceConnected ? 1 : 0.6 }}
          >
            {t("settings.disconnectDevice")}
          </button>
        </div>
      </div>

      {/* ─── NOTIFICATIONS CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-1 slide-up" style={{ animationDelay: "180ms" }}>
        <h3 className="font-heading font-semibold text-base mb-4">{t("settings.notifications")}</h3>

        {/* Intervention alerts */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.interventionAlerts")}</span>
          </div>
          <Toggle on={notifs.interventions} onToggle={() => updatePrefs({ interventions: !notifs.interventions })} />
        </div>

        {/* Daily check-in */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.dailyCheckin")}</span>
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
            <span className="text-sm">{t("settings.weeklySummary")}</span>
          </div>
          <Toggle on={notifs.weeklySummary} onToggle={() => updatePrefs({ weeklySummary: !notifs.weeklySummary })} />
        </div>

        {/* Specialist messages */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <User size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.specialistMessages")}</span>
          </div>
          <Toggle on={notifs.specialistMsg} onToggle={() => updatePrefs({ specialistMsg: !notifs.specialistMsg })} />
        </div>

        {/* Sound */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.soundLabel")}</span>
          </div>
          <Toggle on={personalisation.soundEnabled} onToggle={() => updatePersonalisation({ soundEnabled: !personalisation.soundEnabled })} />
        </div>

        <div
          className="mt-2 rounded-xl px-4 py-3 text-xs"
          style={{ backgroundColor: "#EEF3FB", color: "#4A5568" }}
        >
          {t("settings.notificationsNote")}
        </div>
      </div>

      {/* ─── PRIVACY CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "240ms" }}>
        <h3 className="font-heading font-semibold text-base">{t("settings.privacy")}</h3>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}>
          <Shield size={14} />
          {t("settings.localProcessing")}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("settings.dataRetention")}</label>
          <PillRadio options={["30 days", "60 days", "90 days"]} value={retention} onChange={(v) => updatePrefs({ retention: v })} />
        </div>

        <button className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center justify-center gap-2">
          <Download size={16} />
          {t("settings.exportData")}
        </button>

        <button
          onClick={() => setDeleteModal(true)}
          className="text-sm font-medium hover:underline transition-all active:scale-95"
          style={{ color: "#F87171" }}
        >
          {t("settings.deleteData")}
        </button>
      </div>

      {/* ─── CRISIS CONTACT CARD ─── */}
      {(personalisation.crisisContactName || personalisation.crisisContactPhone) && (
        <div className="rounded-xl p-6 card-shadow slide-up" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FECACA", animationDelay: "330ms" }}>
          <h3 className="font-heading font-semibold text-base mb-3">{t("settings.crisisContact")}</h3>
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
            {t("settings.editPersonalise")}
          </button>
        </div>
      )}

      {/* ─── APPEARANCE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "360ms" }}>
        <h3 className="font-heading font-semibold text-base">{t("settings.appearance")}</h3>

        {/* Link to Personalise */}
        <button
          onClick={() => navigate("/personalise")}
          className="w-full rounded-xl p-4 text-left flex items-center gap-3 transition-colors hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
        >
          <SlidersHorizontal size={18} style={{ color: "#2D7D6F" }} />
          <span className="text-sm font-medium" style={{ color: "#2D7D6F" }}>
            {t("settings.themeSettings")}
          </span>
        </button>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("settings.theme")}</label>
          <PillRadio options={["Light", "Dark", "System"]} value={theme} onChange={(v) => updatePrefs({ theme: v })} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("settings.language")}</label>
          <select
            value={language}
            onChange={(e) => {
              updatePersonalisation({ language: e.target.value });
              setLanguage(e.target.value as LangCode);
            }}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
          >
            <option value="en">English</option>
            <option value="ro">Română</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("settings.fontSize")}</label>
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
              <h3 className="font-heading font-semibold">{t("settings.deleteModal.title")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("settings.deleteModal.body")}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                {t("settings.deleteModal.cancel")}
              </button>
              <button
                onClick={() => setDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-destructive hover:bg-destructive/90 transition-colors active:scale-95"
              >
                {t("settings.deleteModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
