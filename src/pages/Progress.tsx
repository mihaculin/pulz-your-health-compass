import { useState } from "react";
import { ArrowUpRight, Lightbulb } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Area, AreaChart,
} from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

const weeklyEpisodes = [
  { day: "Mon", count: 2 }, { day: "Tue", count: 4 }, { day: "Wed", count: 1 },
  { day: "Thu", count: 5 }, { day: "Fri", count: 3 }, { day: "Sat", count: 2 }, { day: "Sun", count: 1 },
];

const calmTrend = [
  { day: "Mon", score: 45 }, { day: "Tue", score: 52 }, { day: "Wed", score: 60 },
  { day: "Thu", score: 48 }, { day: "Fri", score: 71 }, { day: "Sat", score: 68 }, { day: "Sun", score: 75 },
];

const triggers = [
  { name: "Work stress", count: 8 }, { name: "Loneliness", count: 6 }, { name: "Fatigue", count: 5 },
  { name: "Boredom", count: 4 }, { name: "Conflict", count: 3 },
];

const maxTrigger = Math.max(...triggers.map((t) => t.count));

const highestDay = weeklyEpisodes.reduce((a, b) => (b.count > a.count ? b : a)).day;

export default function Progress() {
  const { t } = useLanguage();
  const ranges = [t("progress.thisWeek"), t("progress.thisMonth"), t("progress.last3Months")];
  const [range, setRange] = useState(ranges[0]);

  const insights = [
    t("progress.insight1"),
    t("progress.insight2"),
    t("progress.insight3"),
  ];

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
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95
                ${range === r ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
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
                <YAxis tick={{ fontSize: 12, fontFamily: "DM Mono" }} stroke="hsl(220 9% 46%)" />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontSize: "13px", boxShadow: "0 2px 12px rgba(179,236,236,0.15), 0 1px 3px rgba(0,0,0,0.04)" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(220 13% 91%)", fontSize: "13px", boxShadow: "0 2px 12px rgba(179,236,236,0.15), 0 1px 3px rgba(0,0,0,0.04)" }} />
                <Area type="monotone" dataKey="score" stroke="#A889B8" strokeWidth={2.5} fill="url(#calmFill)" dot={{ r: 4 }} />
                <Line type="monotone" dataKey={() => 50} stroke="hsl(220 9% 46%)" strokeWidth={1} strokeDasharray="6 3" dot={false} name="Baseline" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 card-emotional slide-up" style={{ animationDelay: "180ms" }}>
        <h3 className="font-heading font-semibold text-sm mb-4">{t("progress.triggerFrequency")}</h3>
        <div className="space-y-3">
          {triggers.map((tr) => (
            <div key={tr.name} className="flex items-center gap-4">
              <span className="text-sm w-28 text-right text-muted-foreground">{tr.name}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(tr.count / maxTrigger) * 100}%`,
                    background: `linear-gradient(90deg, #D7C9DB, #7B5E8A)`,
                  }}
                />
              </div>
              <span className="font-mono text-sm tabular-nums w-6">{tr.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 slide-up" style={{ animationDelay: "240ms" }}>
        {[
          { label: t("progress.totalEpisodes"), value: "18", sub: t("progress.thisWeekSub") },
          { label: t("progress.commonTrigger"), value: "Work stress", sub: t("progress.mostFrequent") },
          { label: t("progress.avgIntensity"), value: "5.4", sub: t("progress.perDay") },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl p-5 card-shadow border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-mono font-semibold mt-1 tabular-nums">{s.value}</p>
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
    </div>
  );
}
