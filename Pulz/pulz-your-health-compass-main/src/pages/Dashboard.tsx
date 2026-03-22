import { useState } from "react";
import { Bell, Heart, Thermometer, Activity, Flame, BarChart3, Clock, AlertTriangle, Watch, X } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import { SmartWatchPanel } from "@/components/dashboard/SmartWatchPanel";
import { InterventionCard } from "@/components/dashboard/InterventionCard";

const timelineData = [
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

const episodes = [
  { time: "09:14", type: "Urge to restrict", intensity: 7, trigger: "Work stress", intervention: "Try grounding 5-4-3-2-1", status: "Resolved" },
  { time: "13:40", type: "Binge episode", intensity: 9, trigger: "Loneliness", intervention: "Let's pause. Breathe with me.", status: "Resolved" },
  { time: "17:55", type: "Overeating urge", intensity: 5, trigger: "Fatigue", intervention: "A short walk can help reset.", status: "Ongoing" },
  { time: "21:10", type: "Emotional eating", intensity: 6, trigger: "Boredom", intervention: "Journal how you're feeling now.", status: "Dismissed" },
];

const intensityBarColor = (intensity: number) => {
  if (intensity >= 8) return "bg-destructive";
  if (intensity >= 5) return "bg-warning";
  return "bg-success";
};

const badgeStatusColor = (status: string) => {
  if (status === "Resolved") return "bg-success/10 text-success";
  if (status === "Ongoing") return "bg-warning/10 text-warning";
  return "bg-muted text-muted-foreground";
};

export default function Dashboard() {
  const [watchOpen, setWatchOpen] = useState(false);
  const [interventionOpen, setInterventionOpen] = useState(false);

  const currentStatus = "Calm" as "Calm" | "Elevated" | "Trigger Risk";
  const statusStyles = {
    "Calm": { badge: "bg-success/10 text-success", gradient: "from-success/5 to-transparent", message: "You're doing great. Stay present." },
    "Elevated": { badge: "bg-warning/10 text-warning", gradient: "from-warning/5 to-transparent", message: "Something's shifting. Take a slow breath." },
    "Trigger Risk": { badge: "bg-destructive/10 text-destructive", gradient: "from-destructive/5 to-transparent", message: "A moment of care for yourself, right now." },
  };

  const style = statusStyles[currentStatus];

  return (
    <>
      <div className="flex min-h-full">
        {/* Main content */}
        <div className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between slide-up">
            <div>
              <h1 className="text-2xl lg:text-3xl font-heading font-semibold leading-tight">
                Good morning, Andrada
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${style.badge}`}>
                {currentStatus}
              </span>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell size={19} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => setWatchOpen(!watchOpen)}
                className={`p-2 rounded-lg transition-colors ${watchOpen ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"}`}
              >
                <Watch size={19} />
              </button>
            </div>
          </div>

          {/* Real-Time Status — physiological card */}
          <div className={`bg-gradient-to-br ${style.gradient} bg-card rounded-xl p-6 card-physiological slide-up`} style={{ animationDelay: "60ms" }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-destructive/10">
                  <Heart size={19} className="text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Heart Rate</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-mono font-medium tabular-nums">84</span>
                    <span className="chip-biometric px-1.5 py-0.5 rounded text-[10px] font-medium">BPM</span>
                    <span className="w-2 h-2 rounded-full bg-destructive pulse-dot" />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-warning/10">
                  <AlertTriangle size={19} className="text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Stress</p>
                  <span className="text-xl font-mono font-medium tabular-nums">32%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: "hsla(180, 52%, 81%, 0.15)" }}>
                  <Thermometer size={19} style={{ color: "#1A4040" }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Temperature</p>
                  <span className="text-xl font-mono font-medium tabular-nums">36.8°C</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Activity size={19} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Movement</p>
                  <span className="text-xl font-mono font-medium tabular-nums">Low</span>
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground italic">{style.message}</p>
          </div>

          {/* Timeline — physiological card */}
          <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "120ms" }}>
            <h2 className="text-lg font-heading font-semibold mb-4">Daily Timeline</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                  <XAxis dataKey="time" tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                  <YAxis tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(220 13% 91%)",
                      boxShadow: "0 2px 12px rgba(179,236,236,0.15), 0 1px 3px rgba(0,0,0,0.04)",
                      fontFamily: "Inter",
                      fontSize: "13px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", fontFamily: "Inter" }} />
                  <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#b3ecec" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="stress" name="Stress" stroke="hsl(38 92% 50%)" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="impulse" name="Impulse" stroke="hsl(0 86% 71%)" strokeWidth={0} dot={{ r: 6, fill: "hsl(0 86% 71%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Episodes — emotional cards */}
          <div className="slide-up" style={{ animationDelay: "180ms" }}>
            <h2 className="text-lg font-heading font-semibold mb-4">Today's Episodes</h2>
            <div className="grid gap-3">
              {episodes.map((ep, i) => (
                <div key={i} className="bg-card rounded-xl p-5 card-emotional hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground tabular-nums">{ep.time}</span>
                      <span className="font-medium text-sm">{ep.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="chip-trigger px-2 py-0.5 rounded-full text-xs">
                        {ep.trigger}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${badgeStatusColor(ep.status)}`}>
                        {ep.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${intensityBarColor(ep.intensity)} transition-all`}
                        style={{ width: `${ep.intensity * 10}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">{ep.intensity}/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground italic">"{ep.intervention}"</p>
                    <button
                      onClick={() => setInterventionOpen(true)}
                      className="text-xs font-medium px-3 py-1 rounded-full active:scale-95 transition-all shrink-0 ml-3"
                      style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F", border: "1px solid #b3ecec" }}
                    >
                      Respond
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights — lavender-mist bg with lavender left border */}
          <div className="grid md:grid-cols-3 gap-4 slide-up" style={{ animationDelay: "240ms" }}>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-secondary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Pattern</span>
              </div>
              <p className="text-sm font-medium">Most impulses occur between 13:00–22:00</p>
            </div>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-warning" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Correlation</span>
              </div>
              <p className="text-sm font-medium">Stress peaks after inactivity &gt; 2h</p>
            </div>
            <div className="rounded-xl p-5 card-shadow" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-warning" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Streak</span>
              </div>
              <p className="text-sm font-medium">7 consecutive calm mornings</p>
              <p className="text-2xl font-mono font-semibold text-primary mt-1 tabular-nums">7 🔥</p>
            </div>
          </div>
        </div>

        {/* Desktop watch panel — slide-in right */}
        {watchOpen && (
          <div
            className="hidden lg:block w-[260px] shrink-0 border-l border-border/50 bg-card overflow-y-auto"
            style={{ animation: "slideInFromRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch Sim</span>
              <button onClick={() => setWatchOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>
            <SmartWatchPanel onClose={() => setWatchOpen(false)} />
          </div>
        )}
      </div>

      {/* Mobile watch bottom sheet */}
      {watchOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setWatchOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[85vh] overflow-y-auto"
            style={{ animation: "slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch Simulation</span>
              <button onClick={() => setWatchOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <SmartWatchPanel onClose={() => setWatchOpen(false)} />
          </div>
        </div>
      )}

      {/* Intervention overlay */}
      {interventionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setInterventionOpen(false)} />
          {/* Mobile: bottom sheet / Desktop: centered panel */}
          <div
            className="relative z-10 w-full max-w-md mx-4 lg:mx-0"
            style={{ animation: "slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <InterventionCard onClose={() => setInterventionOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
