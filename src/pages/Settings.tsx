import { useEffect, useState } from "react";
import { User, Bell, Shield, SlidersHorizontal, Trash2, Download, AlertTriangle, ClipboardList, RefreshCw, Unplug, FlaskConical, CreditCard, Lock, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { LangCode } from "@/translations";
import { seedTestData } from "@/utils/seedTestData";
import { useSubscription } from "@/hooks/useSubscription";

const DEFAULT_PREFS = {
  interventions: true,
  dailyCheckin: true,
  weeklySummary: true,
  specialistMsg: true,
  checkinTime: "09:00",
  retention: "90 days",
  sharing: { episodes: true, journal: true, biometrics: true },
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { fullName, initials, joinedWeeksAgo, personalisation, updatePersonalisation, dateOfBirth, primaryConcerns, heightCm, weightKg, conditions, intakeSurveyCompleted, appLoading, subscriptionTier, subscriptionStatus, subscriptionEndDate, refreshProfile } = useApp();
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [device, setDevice] = useState<{ id: string; deviceType: string; lastSync: string | null; isActive: boolean | null } | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selfReportCount, setSelfReportCount] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [demoActivating, setDemoActivating] = useState(false);

  const notifs = {
    interventions: prefs.interventions,
    dailyCheckin: prefs.dailyCheckin,
    weeklySummary: prefs.weeklySummary,
    specialistMsg: prefs.specialistMsg,
  };
  const checkinTime = prefs.checkinTime;
  const retention = prefs.retention;

  const updatePrefs = async (patch: Partial<typeof DEFAULT_PREFS>) => {
    const next = {
      ...prefs,
      ...patch,
      sharing: { ...prefs.sharing, ...(patch.sharing ?? {}) },
    };
    setPrefs(next);
    if (!user) return;
    await supabase.from("profiles").update({ notification_preferences: next }).eq("user_id", user.id);
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
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${value === opt ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"}`}
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
      const [profileRes, deviceRes, countRes] = await Promise.all([
        supabase.from("profiles").select("notification_preferences").eq("user_id", user.id).maybeSingle(),
        supabase.from("device_connections").select("id, device_type, last_sync, is_active").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("self_reports").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const rawPrefs = (profileRes.data?.notification_preferences as Partial<typeof DEFAULT_PREFS>) ?? {};
      setPrefs({ ...DEFAULT_PREFS, ...rawPrefs, sharing: { ...DEFAULT_PREFS.sharing, ...(rawPrefs.sharing ?? {}) } });

      if (deviceRes.data) {
        setDevice({ id: deviceRes.data.id, deviceType: deviceRes.data.device_type, lastSync: deviceRes.data.last_sync, isActive: deviceRes.data.is_active });
      } else {
        setDevice(null);
      }

      setSelfReportCount(countRes.count ?? 0);
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  const deviceConnected = device?.isActive ?? false;
  const deviceName = device?.deviceType ?? "No device connected";
  const lastSyncLabel = device?.lastSync ? new Date(device.lastSync).toLocaleString() : "—";

  const handleSyncNow = async () => {
    if (!user || !device) return;
    setSyncing(true);
    await supabase.from("device_connections").update({ last_sync: new Date().toISOString() }).eq("id", device.id);
    setDevice((d) => d ? { ...d, lastSync: new Date().toISOString() } : d);
    toast({ description: "Synced!", className: "bg-white border-l-2 border-l-[#b3ecec]" });
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    if (!user || !device) return;
    await supabase.from("device_connections").update({ is_active: false }).eq("id", device.id);
    setDevice(null);
    toast({ description: "Device disconnected", className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const handleExport = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("self_reports")
      .select("timestamp, urge_level, triggers, emotional_state, notes")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false });

    const csv = [
      "Date,Urge Level,Triggers,Emotions,Notes",
      ...(data ?? []).map((r) =>
        `${r.timestamp},${r.urge_level ?? ""},"${(r.triggers ?? []).join(";")}","${(r.emotional_state ?? []).join(";")}","${(r.notes ?? "").replace(/"/g, "'")}"`
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulz-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Export downloaded", className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    setDeleting(true);
    await Promise.all([
      supabase.from("self_reports").delete().eq("user_id", user.id),
      supabase.from("risk_windows").delete().eq("user_id", user.id),
      supabase.from("intervention_events").delete().eq("user_id", user.id),
      supabase.from("sensor_samples").delete().eq("user_id", user.id),
      supabase.from("personalisation_settings").delete().eq("user_id", user.id),
    ]);
    setDeleting(false);
    setDeleteModal(false);
    await signOut();
    navigate("/");
  };

  const handleOpenPortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", { body: { userId: user.id } });
      if (error || !data?.url) throw new Error(error?.message ?? "No portal URL");
      window.location.href = data.url;
    } catch {
      toast({ description: "Could not open billing portal.", className: "bg-white border-l-2 border-l-red-300" });
      setPortalLoading(false);
    }
  };

  const handleActivatePremiumDemo = async () => {
    if (!user) return;
    setDemoActivating(true);
    await supabase.from("client_profiles").update({
      subscription_tier: "premium",
      subscription_status: "active",
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).eq("id", user.id);
    refreshProfile();
    toast({ description: "Premium demo activat ✅", className: "bg-white border-l-2 border-l-[#b3ecec]" });
    setDemoActivating(false);
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeeding(true);
    await seedTestData(user.id);
    setSelfReportCount(999);
    toast({ description: "14 days of test data loaded ✅", className: "bg-white border-l-2 border-l-[#b3ecec]" });
    setSeeding(false);
  };

  const age = (() => {
    if (!dateOfBirth) return null;
    const raw = dateOfBirth.trim();
    if (!raw) return null;
    let dob: Date | null = null;
    const match = /^(\d{2,4})[\/.-](\d{2})[\/.-](\d{2,4})$/.exec(raw);
    if (match) {
      const a = Number(match[1]), b = Number(match[2]), c = Number(match[3]);
      if (match[1].length === 4) dob = new Date(Date.UTC(a, b - 1, c));
      else if (match[3].length === 4) dob = new Date(Date.UTC(c, b - 1, a));
    }
    if (!dob) { const p = new Date(raw); if (!Number.isNaN(p.getTime())) dob = p; }
    if (!dob) return null;
    const today = new Date();
    let years = today.getFullYear() - dob.getUTCFullYear();
    if (today.getMonth() - dob.getUTCMonth() < 0 || (today.getMonth() === dob.getUTCMonth() && today.getDate() < dob.getUTCDate())) years -= 1;
    return years;
  })();

  if (appLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-16">
        <div className="slide-up">
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("settings.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("settings.subtitle")}</p>
        </div>
        {[120, 80, 80, 60].map((h, i) => <div key={i} className="bg-muted rounded-xl animate-pulse" style={{ height: h }} />)}
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
      <div className="rounded-xl p-6 card-shadow slide-up" style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec", animationDelay: "60ms" }}>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center font-heading font-bold text-2xl shrink-0" style={{ backgroundColor: "#D7C9DB", color: "#3A2845" }}>
            {initials || "U"}
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-lg">{fullName || "—"}</h2>
            <p className="text-sm text-muted-foreground">{t("settings.personalData.age")} {age ?? "—"}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {primaryConcerns.length > 0 ? (
                primaryConcerns.map((c) => <span key={c} className="chip-trigger px-2.5 py-1 rounded-full text-xs">{c}</span>)
              ) : intakeSurveyCompleted ? (
                <span className="text-xs text-muted-foreground">{t("settings.personalData.noConcerns")}</span>
              ) : (
                <span className="text-xs text-muted-foreground">{t("settings.personalData.completeProfile")}</span>
              )}
            </div>
            {(heightCm || weightKg) && (
              <p className="text-xs text-muted-foreground mt-1">
                {heightCm ? `${heightCm} cm` : ""}{heightCm && weightKg ? " · " : ""}{weightKg ? `${weightKg} kg` : ""}
              </p>
            )}
            {conditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {conditions.map((c) => <span key={c} className="chip-biometric px-2.5 py-1 rounded-full text-xs">{c}</span>)}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
            {isPremium ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                Plan: Premium ✓
              </span>
            ) : (
              <>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                  Plan: Free
                </span>
                <button onClick={() => navigate("/pricing")} className="text-xs font-semibold" style={{ color: "#2D7D6F" }}>
                  Vezi planurile →
                </button>
              </>
            )}
          </div>
          {isPremium && subscriptionEndDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Activ până la: {new Date(subscriptionEndDate).toLocaleDateString("ro-RO")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{t("settings.startedLabel")} {joinedWeeksAgo} {t("settings.personalData.weeksAgo")}</p>
          </div>
        </div>
      </div>

      {/* ─── BILLING CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-4 slide-up" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-muted-foreground" />
          <h3 className="font-heading font-semibold text-base">Abonament</h3>
        </div>

        {isPremium ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  Plan curent: <span style={{ color: "#4CAF7D" }}>{subscriptionTier === "clinic" ? "Clinic ✓" : "Premium ✓"}</span>
                </p>
                {subscriptionEndDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Activ până la: {new Date(subscriptionEndDate).toLocaleDateString("ro-RO")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {subscriptionTier === "clinic" ? "€24.99/lună" : "€9.99/lună"}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}>
                {subscriptionStatus === "active" ? "Activ" : subscriptionStatus}
              </span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors active:scale-95"
              >
                <ExternalLink size={14} />
                {portalLoading ? "Se încarcă…" : "Gestionează abonamentul"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Plan curent: <span className="text-muted-foreground">Free</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade la Premium pentru funcții complete</p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors active:scale-95"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              <ExternalLink size={14} />
              Vezi planurile →
            </button>
            {import.meta.env.DEV && (
              <button
                onClick={handleActivatePremiumDemo}
                disabled={demoActivating}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-dashed border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors active:scale-95"
              >
                🧪 {demoActivating ? "Se activează…" : "Activează Premium Demo"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── INCOMPLETE PROFILE BANNER ─── */}
      {!intakeSurveyCompleted && (
        <button onClick={() => navigate("/onboarding")} className="w-full rounded-xl p-4 flex items-center gap-3 text-left transition-colors hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: "#FFF9E6", border: "1px solid #FCD34D" }}>
          <ClipboardList size={18} style={{ color: "#B45309" }} />
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: "#B45309" }}>{t("settings.completeHealthProfile")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.completeHealthProfileDesc")}</p>
          </div>
        </button>
      )}

      {/* ─── DEVICE CARD ─── */}
      <div className="relative bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
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
          {deviceConnected
            ? <span className="chip-biometric px-2.5 py-1 rounded-full text-xs">{t("settings.syncActive")}</span>
            : <span className="text-xs text-muted-foreground">{t("settings.noDeviceData")}</span>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncNow}
            disabled={!deviceConnected || syncing}
            className="px-4 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all flex items-center gap-2"
            style={{ backgroundColor: "#b3ecec", color: "#1A4040", opacity: deviceConnected ? 1 : 0.5 }}
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : t("settings.syncNow")}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={!deviceConnected}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center gap-2"
            style={{ opacity: deviceConnected ? 1 : 0.5 }}
          >
            <Unplug size={14} />
            {t("settings.disconnectDevice")}
          </button>
        </div>
        {!isPremium && (
          <div className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]" style={{ backgroundColor: "rgba(255,255,255,0.82)" }}>
            <div className="p-3 rounded-full" style={{ backgroundColor: "#E8F8F7" }}>
              <Lock size={20} style={{ color: "#2D7D6F" }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "#1A4040" }}>Disponibil în Premium</p>
              <p className="text-xs text-muted-foreground mt-0.5">Conectare iPhone + Apple Watch</p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white active:scale-95"
              style={{ backgroundColor: "#2D7D6F" }}
            >
              Upgrade
            </button>
          </div>
        )}
      </div>

      {/* ─── NOTIFICATIONS CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-1 slide-up" style={{ animationDelay: "180ms" }}>
        <h3 className="font-heading font-semibold text-base mb-4">{t("settings.notifications")}</h3>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.interventionAlerts")}</span>
          </div>
          <Toggle on={notifs.interventions} onToggle={() => updatePrefs({ interventions: !notifs.interventions })} />
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.dailyCheckin")}</span>
          </div>
          <div className="flex items-center gap-2">
            {notifs.dailyCheckin && (
              <input type="time" value={checkinTime} onChange={(e) => updatePrefs({ checkinTime: e.target.value })} className="rounded-lg border border-border px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#b3ecec] transition" />
            )}
            <Toggle on={notifs.dailyCheckin} onToggle={() => updatePrefs({ dailyCheckin: !notifs.dailyCheckin })} />
          </div>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Download size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.weeklySummary")}</span>
          </div>
          <Toggle on={notifs.weeklySummary} onToggle={() => updatePrefs({ weeklySummary: !notifs.weeklySummary })} />
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <User size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.specialistMessages")}</span>
          </div>
          <Toggle on={notifs.specialistMsg} onToggle={() => updatePrefs({ specialistMsg: !notifs.specialistMsg })} />
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-muted-foreground" />
            <span className="text-sm">{t("settings.soundLabel")}</span>
          </div>
          <Toggle on={personalisation.soundEnabled} onToggle={() => updatePersonalisation({ soundEnabled: !personalisation.soundEnabled })} />
        </div>

        <div className="mt-2 rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: "#EEF3FB", color: "#4A5568" }}>
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

        {isPremium ? (
          <button
            onClick={handleExport}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            {t("settings.exportData")}
          </button>
        ) : (
          <button
            onClick={() => navigate("/pricing")}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-border flex items-center justify-center gap-2 cursor-pointer"
            style={{ color: "#9CA3AF" }}
            title="Disponibil în Premium"
          >
            <Lock size={16} />
            {t("settings.exportData")} — Premium
          </button>
        )}

        {selfReportCount === 0 && (
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-dashed border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95 flex items-center justify-center gap-2"
          >
            <FlaskConical size={16} />
            {seeding ? "Loading test data…" : "Load test data (14 days)"}
          </button>
        )}

        <button
          onClick={() => setDeleteModal(true)}
          className="text-sm font-medium hover:underline transition-all active:scale-95"
          style={{ color: "#F87171" }}
        >
          {t("settings.deleteData")}
        </button>

        {isPremium && (
          <button
            onClick={async () => {
              if (!user) return;
              await supabase.from("client_profiles").update({
                subscription_tier: "free",
                subscription_status: "inactive",
                subscription_end_date: null,
              }).eq("id", user.id);
              refreshProfile();
              toast({ description: "Resetat la Free ✓", className: "bg-white border-l-2 border-l-[#b3ecec]" });
            }}
            className="text-xs text-muted-foreground hover:underline transition-all"
          >
            Resetează la Free (demo)
          </button>
        )}
      </div>

      {/* ─── CRISIS CONTACT CARD ─── */}
      {(personalisation.crisisContactName || personalisation.crisisContactPhone) && (
        <div className="rounded-xl p-6 card-shadow slide-up" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FECACA", animationDelay: "330ms" }}>
          <h3 className="font-heading font-semibold text-base mb-3">{t("settings.crisisContact")}</h3>
          <div className="space-y-1">
            {personalisation.crisisContactName && <p className="text-sm font-medium">{personalisation.crisisContactName}</p>}
            {personalisation.crisisContactPhone && <p className="text-sm text-muted-foreground">{personalisation.crisisContactPhone}</p>}
          </div>
          <button onClick={() => navigate("/personalise")} className="mt-3 text-xs text-muted-foreground hover:underline">
            {t("settings.editPersonalise")}
          </button>
        </div>
      )}

      {/* ─── APPEARANCE CARD ─── */}
      <div className="bg-card rounded-xl p-6 card-shadow border border-border/50 space-y-5 slide-up" style={{ animationDelay: "360ms" }}>
        <h3 className="font-heading font-semibold text-base">{t("settings.appearance")}</h3>

        <button
          onClick={() => navigate("/personalise")}
          className="w-full rounded-xl p-4 text-left flex items-center gap-3 transition-colors hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
        >
          <SlidersHorizontal size={18} style={{ color: "#2D7D6F" }} />
          <span className="text-sm font-medium" style={{ color: "#2D7D6F" }}>{t("settings.themeSettings")}</span>
        </button>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("settings.language")}</label>
          <select
            value={language}
            onChange={(e) => { updatePersonalisation({ language: e.target.value }); setLanguage(e.target.value as LangCode); }}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
          >
            <option value="en">English</option>
            <option value="ro">Română</option>
          </select>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDeleteModal(false)} />
          <div className="relative bg-card rounded-2xl p-6 max-w-sm mx-4 card-shadow space-y-4" style={{ animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><Trash2 size={18} className="text-destructive" /></div>
              <h3 className="font-heading font-semibold">{t("settings.deleteModal.title")}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently delete all your journal entries, progress data, and settings. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                {t("settings.deleteModal.cancel")}
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-destructive hover:bg-destructive/90 transition-colors active:scale-95"
              >
                {deleting ? "Deleting…" : t("settings.deleteModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
