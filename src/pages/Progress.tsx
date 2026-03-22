import { useState, useEffect } from "react";
import { ArrowUpRight, Lightbulb } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Area, AreaChart,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

interface SelfReport {
  timestamp: string;
  urge_level: number | null;
  triggers: string[] | null;
  emotional_state: string[] | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getLast7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

export default function Progress() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium } = useSubscription();
  const ranges = [t("progress.thisWeek"), t("progress.thisMonth"), t("progress.last3Months")];
  const [range, setRange] = useState(ranges[0]);
  const [reports, setReports] = useState<SelfReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 14);
    since.setHours(0, 0, 0, 0);
    supabase
      .from("self_reports")
      .select("timestamp, urge_level, triggers, emotional_state")
      .eq("user_id", user.id)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: true })
      .then(({ data }) => {
        setReports((data ?? []) as SelfReport[]);
        setLoading(false);
      });
  }, [user]);

  const last7 = getLast7Days();

  const weeklyEpisodes = last7.map((d) => ({
    day: DAY_LABELS[d.getDay()],
    count: reports.filter((r) => new Date(r.timestamp).toDateString() === d.toDateString()).length,
  }));

  const calmTrend = last7.map((d) => {
    const dayReports = reports.filter((r) => new Date(r.timestamp).toDateString() === d.toDateString());
    const avg = dayReports.length > 0
      ? dayReports.reduce((sum, r) => sum + (r.urge_level ?? 5), 0) / dayReports.length
      : null;
    return { day: DAY_LABELS[d.getDay()], score: avg !== null ? Math.round((1 - avg / 10) * 100) : null };
  });

  const triggerCounts: Record<string, number> = {};
  reports.forEach((r) => (r.triggers ?? []).forEach((tr) => { triggerCounts[tr] = (triggerCounts[tr] ?? 0) + 1; }));
  const topTriggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));
  const maxTrigger = Math.max(...topTriggers.map((t) => t.count), 1);

  const allUrge = reports.filter((r) => r.urge_level != null).map((r) => r.urge_level!);
  const avgIntensity = allUrge.length > 0 ? (allUrge.reduce((a, b) => a + b, 0) / allUrge.length).toFixed(1) : "—";
  const mostCommonTrigger = topTriggers[0]?.name ?? "—";
  const highestDay = weeklyEpisodes.reduce((a, b) => (b.count > a.count ? b : a), { day: "", count: 0 }).day;

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
        {[220, 220, 150, 80].map((h, i) => (
          <div key={i} className="bg-muted rounded-xl animate-pulse" style={{ height: h }} />
        ))}
      </div>
    );
  }

  if (reports.length < 3) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        <div className="slide-up">
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("progress.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("progress.subtitle")}</p>
        </div>
        <div
          className="flex flex-col items-center justify-center text-center py-14 px-8 rounded-2xl slide-up"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec", animationDelay: "60ms" }}
        >
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" fill="#b3ecec" fillOpacity="0.35" />
              <circle cx="24" cy="24" r="13" fill="#b3ecec" />
            </svg>
          </div>
          <p className="text-base font-semibold mb-2" style={{ color: "#1A4040" }}>Your progress story is just beginning</p>
          <p className="text-sm mb-6 max-w-xs" style={{ color: "#6B7280" }}>Log a few moments in your Journal to see patterns emerge</p>
          <button
            onClick={() => navigate("/journal")}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95 transition-all"
            style={{ backgroundColor: "#2D7D6F" }}
          >
            Go to Journal →
          </button>
        </div>
      </div>
    );
  }

  const insights = [t("progress.insight1"), t("progress.insight2"), t("progress.insight3")];

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between slide-up">
        <div>
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("progress.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("progress.subtitle")}</p>
        </div>
        <div className="flex gap-1.5 bg-muted rounded-lg p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${range === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-6 card-physiological slide-up" style={{ animationDelay: "60ms" }}>
          <h3 className="font-heading font-semibold text-sm mb-4">{t("progress.episodeFrequency")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyEpisodes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontSize: "13px" }} />
                <Bar dataKey="count" name="Entries" radius={[6, 6, 0, 0]}>
                  {weeklyEpisodes.map((entry) => (
                    <Cell key={entry.day} fill={entry.day === highestDay ? "#2D7D6F" : "#b3ecec"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 card-emotional slide-up" style={{ animationDelay: "120ms" }}>
          <h3 className="font-heading font-semibold text-sm mb-4">{t("progress.calmScore")}</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calmTrend}>
                <defs>
                  <linearGradient id="calmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F4EEF7" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F4EEF7" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontSize: "13px" }} />
                <Area type="monotone" dataKey="score" name="Calm score" stroke="#A889B8" strokeWidth={2.5} fill="url(#calmFill)" dot={{ r: 4 }} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {topTriggers.length > 0 && (
        <div className="bg-card rounded-xl p-6 card-emotional slide-up" style={{ animationDelay: "180ms" }}>
          <h3 className="font-heading font-semibold text-sm mb-4">{t("progress.triggerFrequency")}</h3>
          <div className="space-y-3">
            {topTriggers.map((tr) => (
              <div key={tr.name} className="flex items-center gap-4">
                <span className="text-sm w-28 text-right text-muted-foreground shrink-0">{tr.name}</span>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(tr.count / maxTrigger) * 100}%`, background: "linear-gradient(90deg, #D7C9DB, #7B5E8A)" }}
                  />
                </div>
                <span className="font-mono text-sm tabular-nums w-6">{tr.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 slide-up" style={{ animationDelay: "240ms" }}>
        {[
          { label: t("progress.totalEpisodes"), value: String(reports.length), sub: t("progress.thisWeekSub") },
          { label: t("progress.commonTrigger"), value: mostCommonTrigger, sub: t("progress.mostFrequent") },
          { label: t("progress.avgIntensity"), value: avgIntensity, sub: t("progress.perDay") },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-mono font-semibold mt-1 tabular-nums truncate">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
        <div className="bg-card rounded-xl p-5 card-shadow border border-border/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("progress.improvement")}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xl font-mono font-semibold text-success tabular-nums">+12%</span>
            <ArrowUpRight size={18} className="text-success" />
          </div>
          <p className="text-xs text-muted-foreground">{t("progress.vsLastWeek")}</p>
        </div>
      </div>

      <div className="space-y-3 slide-up" style={{ animationDelay: "300ms" }}>
        <h2 className="text-lg font-heading font-semibold">{t("progress.patternInsights")}</h2>
        {insights.map((insight, i) => (
          <div key={i} className="rounded-xl p-5 card-shadow flex items-start gap-3" style={{ backgroundColor: "hsl(276 33% 95%)", borderLeft: "2px solid hsl(284 16% 82%)" }}>
            <Lightbulb size={18} className="text-warning shrink-0 mt-0.5" />
            <p className="text-sm">{insight}</p>
          </div>
        ))}
      </div>

      {!isPremium && (
        <div
          className="rounded-2xl p-7 text-center slide-up flex flex-col items-center gap-3"
          style={{ backgroundColor: "#E8F8F7", border: "1px solid #b3ecec", animationDelay: "360ms" }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" fill="#b3ecec" fillOpacity="0.4" />
            <circle cx="20" cy="20" r="10" fill="#b3ecec" />
          </svg>
          <div>
            <p className="font-semibold text-sm mb-1" style={{ color: "#1A4040" }}>Deblochează istoricul complet</p>
            <p className="text-xs max-w-xs mx-auto" style={{ color: "#6B7280" }}>
              Premium include progress nelimitat, pattern detection avansat și insights personalizate.
            </p>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95 transition-all mt-1"
            style={{ backgroundColor: "#2D7D6F" }}
          >
            Upgrade la Premium →
          </button>
        </div>
      )}
    </div>
  );
}
