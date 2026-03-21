import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, Thermometer, Activity, Flame, BarChart3, Clock, AlertTriangle, Watch, X, BookOpen, PenLine } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { SmartWatchPanel } from "@/components/dashboard/SmartWatchPanel";
import { InterventionCard } from "@/components/dashboard/InterventionCard";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const MOCK_TIMELINE = [
  { time: "06:00", hr: 68, stress: 20 },
  { time: "08:00", hr: 72, stress: 25 },
  { time: "09:14", hr: 91, stress: 62, impulse: 7 },
  { time: "11:00", hr: 75, stress: 30 },
  { time: "13:40", hr: 102, stress: 78, impulse: 9, intervention: true },
  { time: "15:00", hr: 80, stress: 40 },
  { time: "17:55", hr: 88, stress: 55, impulse: 5 },
  { time: "19:00", hr: 76, stress: 35, intervention: true },
  { time: "21:10", hr: 82, stress: 48, impulse: 6 },
  { time: "23:00", hr: 65, stress: 18 },
];

const MOCK_EPISODES = [
  { time: "09:14", type: "Urge to restrict", intensity: 7, trigger: "Work stress", intervention: "Try grounding 5-4-3-2-1", status: "Resolved" },
  { time: "13:40", type: "Binge episode", intensity: 9, trigger: "Loneliness", intervention: "Let's pause. Breathe with me.", status: "Resolved" },
  { time: "17:55", type: "Overeating urge", intensity: 5, trigger: "Fatigue", intervention: "A short walk can help reset.", status: "Ongoing" },
  { time: "21:10", type: "Emotional eating", intensity: 6, trigger: "Boredom", intervention: "Journal how you're feeling now.", status: "Dismissed" },
];

const intensityColor = (n: number) => n >= 8 ? "bg-destructive" : n >= 5 ? "bg-warning" : "bg-success";
const statusColor = (s: string) => s === "Resolved" ? "bg-success/10 text-success" : s === "Ongoing" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground";

interface BiometricState {
  hr: number | null;
  stress: number | null;
  temp: number | null;
  activity: string | null;
}

type RiskRow = Tables<"risk_windows">;

export default function Dashboard() {
  const { user } = useAuth();
  const { fullName, riskLevel, setRiskLevel, hasDevice } = useApp();
  const navigate = useNavigate();
  const [watchOpen, setWatchOpen] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);
  const [biometrics, setBiometrics] = useState<BiometricState>({ hr: null, stress: null, temp: null, activity: null });
  const [episodes, setEpisodes] = useState<RiskRow[] | null>(null);

  const displayName = fullName ? fullName.split(" ")[0] : "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
        setBiometrics({
          hr: data.heart_rate,
          stress: data.stress_score,
          temp: data.skin_temperature_delta,
          activity: data.activity_state,
        });
        const score = data.stress_score ?? 0;
        setRiskLevel(score >= 70 ? "Trigger Risk" : score >= 40 ? "Elevated" : "Calm");
      }
    };

    const loadEpisodes = async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("risk_windows")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false });
      if (data) setEpisodes(data);
    };

    loadBiometrics();
    loadEpisodes();
  }, [user, setRiskLevel]);

  const hr = biometrics.hr ?? 84;
  const stress = biometrics.stress != null ? `${biometrics.stress}%` : "32%";
  const temp = biometrics.temp != null ? `${(36.5 + biometrics.temp).toFixed(1)}°C` : "36.8°C";
  const activityLabel = biometrics.activity ?? "Low";

  const statusStyles = {
    Calm: { badge: "bg-success/10 text-success", gradient: "from-success/5 to-transparent", message: "You're doing great. Stay present." },
    Elevated: { badge: "bg-warning/10 text-warning", gradient: "from-warning/5 to-transparent", message: "Something's shifting. Take a slow breath." },
    "Trigger Risk": { badge: "bg-destructive/10 text-destructive", gradient: "from-destructive/5 to-transparent", message: "A moment of care for yourself, right now." },
  };
  const style = statusStyles[riskLevel];

  const episodeRows = episodes && episodes.length > 0
    ? episodes.map((ep) => ({
        time: new Date(ep.started_at ?? ep.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        type: ep.dominant_drivers?.[0] ?? "Episode",
        intensity: Math.round(Math.max(ep.binge_risk_score ?? 0, ep.urge_risk_score ?? 0, ep.purge_risk_score ?? 0) * 10),
        trigger: ep.dominant_drivers?.[1] ?? "Unknown",
        intervention: ep.recommended_action ?? "Take a moment to breathe.",
        status: ep.confirmed_by_user ? "Resolved" : "Ongoing",
      }))
    : MOCK_EPISODES;

  return (
    <>
      <div className="flex min-h-full">
        <div className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between slide-up">
            <div>
              <h1 className="text-2xl lg:text-3xl font-heading font-semibold leading-tight">
                {greeting}, {displayName}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${style.badge}`}>{riskLevel}</span>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors"><Bell size={19} className="text-muted-foreground" /></button>
              <button onClick={() => setWatchOpen(!watchOpen)} className={`p-2 rounded-lg transition-colors ${watchOpen ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}><Watch size={19} /></button>
            </div>
          </div>

          {hasDevice ? (
            <div className={`bg-gradient-to-br ${style.gradient} bg-card rounded-xl p-6 card-physiological slide-up`} style={{ animationDelay: "60ms" }}>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-destructive/10"><Heart size={19} className="text-destructive" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Heart Rate</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-mono font-medium tabular-nums">{hr}</span>
                      <span className="chip-biometric px-1.5 py-0.5 rounded text-[10px] font-medium">BPM</span>
                      <span className="w-2 h-2 rounded-full bg-destructive pulse-dot" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-warning/10"><AlertTriangle size={19} className="text-warning" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Stress</p>
                    <span className="text-xl font-mono font-medium tabular-nums">{stress}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: "hsla(180, 52%, 81%, 0.15)" }}><Thermometer size={19} style={{ color: "#1A4040" }} /></div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Temperature</p>
                    <span className="text-xl font-mono font-medium tabular-nums">{temp}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10"><Activity size={19} className="text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Movement</p>
                    <span className="text-xl font-mono font-medium tabular-nums capitalize">{activityLabel}</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-sm text-muted-foreground italic">{style.message}</p>
            </div>
          ) : (
            <div className="space-y-3 slide-up" style={{ animationDelay: "60ms" }}>
              <div className="rounded-xl p-5 flex items-center justify-between gap-4" style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-lg" style={{ backgroundColor: "rgba(45,125,111,0.1)" }}>
                    <BookOpen size={20} style={{ color: "#2D7D6F" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1A4040" }}>Manual Tracking Mode</p>
                    <p className="text-xs mt-0.5" style={{ color: "#2D7D6F" }}>You're tracking manually. Log episodes anytime using the Journal.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/journal")}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#2D7D6F", color: "#fff" }}
                >
                  Log episode
                </button>
              </div>

              <div
                className="rounded-xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec" }}
                onClick={() => navigate("/journal")}
              >
                <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(45,125,111,0.1)" }}>
                  <PenLine size={22} style={{ color: "#2D7D6F" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#1A4040" }}>Log a moment</p>
                  <p className="text-xs mt-0.5 text-muted-foreground">Record what's happening right now — emotions, triggers, intensity.</p>
                </div>
                <span className="text-xs font-medium px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: "#2D7D6F", color: "#fff" }}>Open Journal</span>
              </div>
            </div>
          )}

          <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
            <h2 className="text-lg font-heading font-semibold mb-4">Daily Timeline</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_TIMELINE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                  <YAxis tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontFamily: "Inter", fontSize: "13px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "Inter" }} />
                  <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#b3ecec" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="stress" name="Stress" stroke="hsl(38 92% 50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="impulse" name="Impulse" stroke="hsl(0 86% 71%)" strokeWidth={0} dot={{ r: 6, fill: "hsl(0 86% 71%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="slide-up" style={{ animationDelay: "180ms" }}>
            <h2 className="text-lg font-heading font-semibold mb-4">Today's Episodes</h2>
            <div className="grid gap-3">
              {episodeRows.map((ep, i) => (
                <div key={i} className="bg-card rounded-xl p-5 card-emotional hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">{ep.time}</span>
                      <span className="font-medium text-sm">{ep.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip-trigger px-2 py-0.5 rounded-full text-xs">{ep.trigger}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(ep.status)}`}>{ep.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${intensityColor(ep.intensity)} transition-all`} style={{ width: `${ep.intensity * 10}%` }} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">{ep.intensity}/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground italic">"{ep.intervention}"</p>
                    <button onClick={() => setInterventionOpen(true)} className="text-xs font-medium px-3 py-1 rounded-full active:scale-95 transition-all shrink-0 ml-3" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F", border: "1px solid #b3ecec" }}>
                      Respond
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 slide-up" style={{ animationDelay: "240ms" }}>
            {[
              { icon: Clock, color: "text-secondary", label: "Pattern", text: "Most impulses occur between 13:00–22:00" },
              { icon: BarChart3, color: "text-warning", label: "Correlation", text: "Stress peaks after inactivity > 2h" },
              { icon: Flame, color: "text-warning", label: "Streak", text: "7 consecutive calm mornings", extra: <p className="text-2xl font-mono font-semibold text-primary mt-1 tabular-nums">7 🔥</p> },
            ].map(({ icon: Icon, color, label, text, extra }) => (
              <div key={label} className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
                <div className="flex items-center gap-2 mb-2"><Icon size={16} className={color} /><span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span></div>
                <p className="text-sm font-medium">{text}</p>
                {extra}
              </div>
            ))}
          </div>
        </div>

        {watchOpen && (
          <div className="hidden lg:block w-[260px] shrink-0 border-l border-border/50 bg-card overflow-y-auto" style={{ animation: "slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch Sim</span>
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
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch Simulation</span>
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
