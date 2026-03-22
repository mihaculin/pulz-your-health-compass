import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Thermometer, Activity, Flame, BarChart3, Clock, AlertTriangle, Watch, X, PenLine, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { SmartWatchPanel } from "@/components/dashboard/SmartWatchPanel";
import { InterventionCard } from "@/components/dashboard/InterventionCard";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const MOCK_TIMELINE = [
  { time: "06:00", hr: 68, stress: 20 },
  { time: "08:00", hr: 72, stress: 25 },
  { time: "09:14", hr: 91, stress: 62, impulse: 7 },
  { time: "11:00", hr: 75, stress: 30 },
  { time: "13:40", hr: 102, stress: 78, impulse: 9 },
  { time: "15:00", hr: 80, stress: 40 },
  { time: "17:55", hr: 88, stress: 55, impulse: 5 },
  { time: "19:00", hr: 76, stress: 35 },
  { time: "21:10", hr: 82, stress: 48, impulse: 6 },
  { time: "23:00", hr: 65, stress: 18 },
];

interface BiometricState {
  hr: number | null;
  stress: number | null;
  temp: number | null;
  activity: string | null;
}

interface TodayReport {
  id: string;
  timestamp: string;
  urge_level: number | null;
  emotional_state: string[] | null;
  triggers: string[] | null;
  notes: string | null;
  binge_occurred: boolean | null;
  purge_occurred: boolean | null;
  overeating_occurred: boolean | null;
  meal_skipped: boolean | null;
}

interface Insights {
  mostCommonTrigger: string | null;
  mostVulnerableHour: number | null;
  consecutiveCalmDays: number;
}

const intensityColor = (n: number) => n >= 8 ? "bg-destructive" : n >= 5 ? "bg-warning" : "bg-success";

function EmptyCard({ icon, title, sub, action }: { icon: ReactNode; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6 rounded-2xl" style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}>
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-semibold" style={{ color: "#1A4040" }}>{title}</p>
      <p className="text-xs mt-1.5 max-w-xs" style={{ color: "#6B7280" }}>{sub}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function SoftCircleIcon({ pulse }: { pulse?: boolean }) {
  return (
    <div className={pulse ? "animate-pulse" : undefined}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="20" fill="#b3ecec" fillOpacity="0.35" />
        <circle cx="22" cy="22" r="12" fill="#b3ecec" />
      </svg>
    </div>
  );
}

function episodeLabel(r: TodayReport): string {
  if (r.binge_occurred) return "Binge";
  if (r.purge_occurred) return "Purge";
  if (r.overeating_occurred) return "Overeating";
  if (r.meal_skipped) return "Restriction";
  return "Moment";
}

export default function Dashboard() {
  const { user } = useAuth();
  const { fullName, riskLevel, setRiskLevel, hasDevice, primaryConcerns } = useApp();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [watchOpen, setWatchOpen] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [biometrics, setBiometrics] = useState<BiometricState>({ hr: null, stress: null, temp: null, activity: null });
  const [biometricsLoaded, setBiometricsLoaded] = useState(false);
  const [todayReports, setTodayReports] = useState<TodayReport[] | null>(null);
  const [insights, setInsights] = useState<Insights>({ mostCommonTrigger: null, mostVulnerableHour: null, consecutiveCalmDays: 0 });

  const displayName = fullName ? fullName.split(" ")[0] : "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.morning") : hour < 17 ? t("dashboard.afternoon") : t("dashboard.evening");
  const dateLocale = language === "ro" ? "ro-RO" : "en-US";

  useEffect(() => {
    if (!user) return;

    const loadBiometrics = async () => {
      const { data } = await supabase
        .from("sensor_samples")
        .select("heart_rate, stress_score, skin_temperature_delta, activity_state")
        .eq("user_id", user.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setBiometrics({ hr: data.heart_rate, stress: data.stress_score, temp: data.skin_temperature_delta, activity: data.activity_state });
        const score = data.stress_score ?? 0;
        setRiskLevel(score >= 70 ? "Trigger Risk" : score >= 40 ? "Elevated" : "Calm");
      }
      setBiometricsLoaded(true);
    };

    const loadTodayReports = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("self_reports")
        .select("id, timestamp, urge_level, emotional_state, triggers, notes, binge_occurred, purge_occurred, overeating_occurred, meal_skipped")
        .eq("user_id", user.id)
        .gte("timestamp", start.toISOString())
        .order("timestamp", { ascending: false });
      const rows = (data ?? []) as TodayReport[];
      setTodayReports(rows);

      if (rows.length > 0 && biometrics.stress == null) {
        const avgUrge = rows.reduce((sum, r) => sum + (r.urge_level ?? 0), 0) / rows.length;
        setRiskLevel(avgUrge >= 7 ? "Trigger Risk" : avgUrge >= 4 ? "Elevated" : "Calm");
      }
    };

    const loadInsights = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      since.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("self_reports")
        .select("timestamp, urge_level, triggers")
        .eq("user_id", user.id)
        .gte("timestamp", since.toISOString())
        .order("timestamp", { ascending: true });

      if (!data || data.length === 0) return;

      const triggerCounts: Record<string, number> = {};
      data.forEach((r) => (r.triggers ?? []).forEach((tr: string) => { triggerCounts[tr] = (triggerCounts[tr] ?? 0) + 1; }));
      const mostCommonTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const hourCounts: Record<number, number> = {};
      data.forEach((r) => { const h = new Date(r.timestamp).getHours(); hourCounts[h] = (hourCounts[h] ?? 0) + 1; });
      const mostVulnerableHour = Object.entries(hourCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0];

      let consecutiveCalmDays = 0;
      const today = new Date(); today.setHours(23, 59, 59, 999);
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
        const dayRows = data.filter((r) => { const ts = new Date(r.timestamp); return ts >= d && ts <= dEnd; });
        const maxUrge = dayRows.length > 0 ? Math.max(...dayRows.map((r) => r.urge_level ?? 0)) : 0;
        if (maxUrge < 4) consecutiveCalmDays++;
        else break;
      }

      setInsights({ mostCommonTrigger, mostVulnerableHour: mostVulnerableHour != null ? Number(mostVulnerableHour) : null, consecutiveCalmDays });
    };

    loadBiometrics();
    loadTodayReports();
    loadInsights();
  }, [user, setRiskLevel]);

  const statusStyles = {
    Calm: { badge: "bg-success/10 text-success", gradient: "from-success/5 to-transparent", message: t("dashboard.calmMessage") },
    Elevated: { badge: "bg-warning/10 text-warning", gradient: "from-warning/5 to-transparent", message: t("dashboard.elevatedMessage") },
    "Trigger Risk": { badge: "bg-destructive/10 text-destructive", gradient: "from-destructive/5 to-transparent", message: t("dashboard.triggerMessage") },
  };
  const style = statusStyles[riskLevel];
  const riskLabel = riskLevel === "Calm" ? t("dashboard.calm") : riskLevel === "Elevated" ? t("dashboard.elevated") : t("dashboard.triggerRisk");

  const hrDisplay = biometrics.hr != null ? String(biometrics.hr) : "—";
  const stressDisplay = biometrics.stress != null ? `${biometrics.stress}%` : "—";
  const tempDisplay = biometrics.temp != null ? `${(36.5 + biometrics.temp).toFixed(1)}°C` : "—";
  const activityDisplay = biometrics.activity ?? "—";

  const hasBiometricData = biometrics.hr != null || biometrics.stress != null;

  const formatHour = (h: number | null) => {
    if (h == null) return "—";
    const suffix = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${suffix}`;
  };

  return (
    <>
      <div className="flex min-h-full">
        <div className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <div className="flex items-center justify-between slide-up">
            <div>
              <h1 className="text-2xl lg:text-3xl font-heading font-semibold leading-tight">
                {greeting}, {displayName}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {new Date().toLocaleDateString(dateLocale, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              {primaryConcerns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {primaryConcerns.map((c) => (
                    <span key={c} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{c}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${style.badge}`}>{riskLabel}</span>
              <button onClick={() => setWatchOpen(!watchOpen)} className={`p-2 rounded-lg transition-colors ${watchOpen ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}><Watch size={19} /></button>
            </div>
          </div>

          {/* Biometrics */}
          {hasDevice ? (
            <div className={`bg-gradient-to-br ${style.gradient} bg-card rounded-xl p-6 card-physiological slide-up`} style={{ animationDelay: "60ms" }}>
              {hasBiometricData ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-destructive/10"><Heart size={19} className="text-destructive" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.heartRate")}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-mono font-medium tabular-nums">{hrDisplay}</span>
                        {biometrics.hr != null && <span className="chip-biometric px-1.5 py-0.5 rounded text-[10px] font-medium">BPM</span>}
                        {biometrics.hr != null && <span className="w-2 h-2 rounded-full bg-destructive pulse-dot" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-warning/10"><AlertTriangle size={19} className="text-warning" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.stress")}</p>
                      <span className="text-xl font-mono font-medium tabular-nums">{stressDisplay}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: "hsla(180, 52%, 81%, 0.15)" }}><Thermometer size={19} style={{ color: "#1A4040" }} /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.temperature")}</p>
                      <span className="text-xl font-mono font-medium tabular-nums">{tempDisplay}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10"><Activity size={19} className="text-primary" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.movement")}</p>
                      <span className="text-xl font-mono font-medium tabular-nums capitalize">{activityDisplay}</span>
                    </div>
                  </div>
                </div>
              ) : biometricsLoaded ? (
                <EmptyCard
                  icon={<SoftCircleIcon pulse />}
                  title="Waiting for device data"
                  sub="Connect your iPhone in Settings to see live biometrics"
                />
              ) : (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                  <p className="text-sm">Loading…</p>
                </div>
              )}
              <p className="mt-5 text-sm text-muted-foreground italic">{style.message}</p>
            </div>
          ) : (
            <div
              className="rounded-xl p-5 flex items-center gap-4 slide-up"
              style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec", animationDelay: "60ms" }}
            >
              <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(45,125,111,0.1)" }}>
                <PenLine size={22} style={{ color: "#2D7D6F" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#1A4040" }}>No device connected</p>
                <p className="text-xs mt-0.5 text-muted-foreground">Connect a device for automated biometric monitoring and risk detection</p>
              </div>
              <button
                onClick={() => navigate("/settings")}
                className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
                style={{ backgroundColor: "#2D7D6F", color: "#fff" }}
              >
                Connect in Settings
              </button>
            </div>
          )}

          {/* Timeline chart */}
          {hasDevice && (
            <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-lg font-heading font-semibold mb-4">{t("dashboard.dailyTimeline")}</h2>
              {hasBiometricData ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={MOCK_TIMELINE}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                      <XAxis dataKey="time" tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                      <YAxis tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontFamily: "Inter", fontSize: "13px" }} />
                      <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "Inter" }} />
                      <Line type="monotone" dataKey="hr" name={t("dashboard.heartRate")} stroke="#b3ecec" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="stress" name={t("dashboard.stress")} stroke="hsl(38 92% 50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="impulse" name="Impulse" stroke="hsl(0 86% 71%)" strokeWidth={0} dot={{ r: 6, fill: "hsl(0 86% 71%)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyCard
                  icon={<SoftCircleIcon />}
                  title="Your daily patterns will appear here"
                  sub="Data syncs automatically from your Apple Watch via iPhone"
                />
              )}
            </div>
          )}

          {/* Risk assessment — shown when no sensor data */}
          {biometricsLoaded && !hasBiometricData && (
            <div className="slide-up" style={{ animationDelay: "160ms" }}>
              <EmptyCard
                icon={<SoftCircleIcon />}
                title="No automated detection yet"
                sub="Manual logging is active. Connect iPhone for real-time monitoring."
              />
            </div>
          )}

          {/* Today's moments — real self_reports */}
          <div className="slide-up" style={{ animationDelay: "180ms" }}>
            <h2 className="text-lg font-heading font-semibold mb-4">{t("dashboard.todaysEpisodes")}</h2>

            {todayReports === null ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <div key={i} className="bg-muted rounded-xl h-24 animate-pulse" />)}
              </div>
            ) : todayReports.length === 0 ? (
              <div className="bg-card rounded-xl p-8 text-center border border-border/50">
                <p className="text-sm text-muted-foreground mb-4">No moments logged today. How are you feeling?</p>
                <button
                  onClick={() => navigate("/journal")}
                  className="px-5 py-2 rounded-xl text-sm font-medium active:scale-95 transition-all"
                  style={{ backgroundColor: "#2D7D6F", color: "#fff" }}
                >
                  Log a moment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayReports.map((r) => {
                  const ts = new Date(r.timestamp);
                  const label = episodeLabel(r);
                  const urge = r.urge_level ?? 0;
                  return (
                    <div key={r.id} className="bg-card rounded-xl overflow-hidden card-emotional">
                      <button
                        onClick={() => setExpandedEntry(expandedEntry === r.id ? null : r.id)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-white/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground tabular-nums">
                            {ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="font-medium text-sm">{label}</span>
                          {r.triggers && r.triggers.length > 0 && (
                            <span className="chip-trigger px-2 py-0.5 rounded-full text-xs">{r.triggers[0]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${intensityColor(urge)}`} style={{ width: `${urge * 10}%` }} />
                            </div>
                            <span className="text-xs font-mono tabular-nums">{urge}/10</span>
                          </div>
                          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedEntry === r.id ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      {expandedEntry === r.id && (
                        <div className="px-5 pb-4 border-t border-border/40 space-y-2 pt-3">
                          {r.emotional_state && r.emotional_state.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {r.emotional_state.map((em) => <span key={em} className="chip-biometric px-2 py-0.5 rounded-full text-xs">{em}</span>)}
                            </div>
                          )}
                          {r.notes && <p className="text-sm text-muted-foreground italic">"{r.notes}"</p>}
                          <button
                            onClick={() => setInterventionOpen(true)}
                            className="text-xs font-medium px-3 py-1 rounded-full active:scale-95 transition-all mt-1"
                            style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F", border: "1px solid #b3ecec" }}
                          >
                            {t("dashboard.respond")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Insights cards — calculated from real data */}
          <div className="grid md:grid-cols-3 gap-4 slide-up" style={{ animationDelay: "240ms" }}>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2"><Clock size={16} className="text-secondary" /><span className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.pattern")}</span></div>
              <p className="text-sm font-medium">
                {insights.mostVulnerableHour != null
                  ? `Most vulnerable around ${formatHour(insights.mostVulnerableHour)}`
                  : t("dashboard.patternText")}
              </p>
            </div>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2"><BarChart3 size={16} className="text-warning" /><span className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.correlation")}</span></div>
              <p className="text-sm font-medium">
                {insights.mostCommonTrigger
                  ? `Top trigger: ${insights.mostCommonTrigger}`
                  : t("dashboard.correlationText")}
              </p>
            </div>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2"><Flame size={16} className="text-warning" /><span className="text-xs text-muted-foreground uppercase tracking-wide">{t("dashboard.streak")}</span></div>
              <p className="text-sm font-medium">{t("dashboard.streakText")}</p>
              <p className="text-2xl font-mono font-semibold text-primary mt-1 tabular-nums">{insights.consecutiveCalmDays} 🔥</p>
            </div>
          </div>
        </div>

        {watchOpen && (
          <div className="hidden lg:block w-[260px] shrink-0 border-l border-border/50 bg-card overflow-y-auto" style={{ animation: "slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dashboard.watchSim")}</span>
              <button onClick={() => setWatchOpen(false)} className="p-1 rounded hover:bg-muted transition-colors"><X size={14} className="text-muted-foreground" /></button>
            </div>
            <SmartWatchPanel onClose={() => setWatchOpen(false)} />
          </div>
        )}
      </div>

      {watchOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setWatchOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto" style={{ animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("dashboard.watchSimMobile")}</span>
              <button onClick={() => setWatchOpen(false)} className="p-1 rounded hover:bg-muted transition-colors"><X size={16} className="text-muted-foreground" /></button>
            </div>
            <SmartWatchPanel onClose={() => setWatchOpen(false)} />
          </div>
        </div>
      )}

      {interventionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setInterventionOpen(false)} />
          <div className="relative z-10 w-full max-w-md mx-4 lg:mx-0" style={{ animation: "slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <InterventionCard onClose={() => setInterventionOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
