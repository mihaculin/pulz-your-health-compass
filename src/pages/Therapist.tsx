import { useState } from "react";
import { useApp } from "@/contexts/AppContext";

const weekData = [
  { label: "Week 1", range: "Mar 1–7", episodes: 18, avg: 7.2, bars: [3, 2, 4, 2, 3, 2, 2], note: "High frequency, establishing baseline" },
  { label: "Week 2", range: "Mar 8–14", episodes: 14, avg: 6.4, bars: [2, 2, 3, 1, 3, 2, 1], note: "Slight reduction in evening episodes" },
  { label: "Week 3", range: "Mar 15–21", episodes: 11, avg: 5.8, bars: [2, 1, 2, 1, 2, 2, 1], note: "First proactive use of breathing tool" },
  { label: "Week 4", range: "Mar 22–28", episodes: 9, avg: 4.9, bars: [1, 1, 2, 1, 2, 1, 1], note: "Notable progress — impulses decreasing" },
];

const triggerRows = [
  { trigger: "Work stress", episodes: 16, avg: 6.8, peak: "14:00–16:00", trend: "↓ improving", trendColor: "#4CAF7D" },
  { trigger: "Loneliness", episodes: 11, avg: 7.2, peak: "21:00–23:00", trend: "→ stable", trendColor: "#F59E0B" },
  { trigger: "Fatigue", episodes: 8, avg: 5.1, peak: "17:00–19:00", trend: "↓ improving", trendColor: "#4CAF7D" },
  { trigger: "Boredom", episodes: 7, avg: 4.3, peak: "15:00–17:00", trend: "↑ increasing", trendColor: "#F87171" },
];

const journalEntries = [
  { date: "Mar 26, 21:30", emotions: ["Lonely", "Tired"], sensations: ["Emptiness", "Tension"], reflection: "Took a bath and felt better. Journaling helped me see I wasn't actually hungry.", comment: "" },
  { date: "Mar 25, 14:15", emotions: ["Stressed", "Overwhelmed"], sensations: ["Heart racing", "Nausea"], reflection: "Ate more than planned but stopped myself halfway. Progress.", comment: "" },
  { date: "Mar 24, 19:00", emotions: ["Bored"], sensations: ["Restlessness"], reflection: "Went for a walk instead of eating. Felt proud afterwards.", comment: "" },
  { date: "Mar 23, 13:40", emotions: ["Anxious", "Empty"], sensations: ["Heart racing", "Tension"], reflection: "Work deadline triggered a binge urge. Used breathing tool for the first time.", comment: "" },
  { date: "Mar 22, 22:10", emotions: ["Numb"], sensations: ["Emptiness"], reflection: "Couldn't pinpoint a trigger. Just felt hollow. Wrote it out.", comment: "" },
];

const days = ["M", "T", "W", "T", "F", "S", "S"];

function MiniSparkline({ bars }: { bars: number[] }) {
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-1 h-8 mt-2">
      {bars.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            className="w-5 rounded-sm transition-all"
            style={{
              height: `${(v / max) * 28}px`,
              backgroundColor: "#b3ecec",
              minHeight: "4px",
            }}
          />
          <span className="text-[9px] text-muted-foreground font-mono">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

export default function Therapist() {
  const { fullName, primaryConcerns } = useApp();
  const [weekNotes, setWeekNotes] = useState<Record<number, string>>({});
  const [journalComments, setJournalComments] = useState<Record<number, string>>({});
  const [specialistNotes, setSpecialistNotes] = useState("");
  const [sharingActive, setSharingActive] = useState(true);

  return (
    <div className="space-y-0">
      {/* Page header */}
      <div
        className="p-6 lg:p-8 slide-up"
        style={{ backgroundColor: "#E8F8F7", borderBottom: "4px solid #b3ecec" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading font-medium text-[22px]">Specialist View — {fullName || "—"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {primaryConcerns.length > 0 ? primaryConcerns.join(" · ") : "No concerns set"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-success/10 text-success">
              Sharing Active 🟢
            </span>
            <button
              onClick={() => setSharingActive(!sharingActive)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95"
            >
              {sharingActive ? "Pause sharing" : "Resume sharing"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 slide-up" style={{ animationDelay: "60ms" }}>
          {[
            { value: "42", label: "episodes this month", border: "#b3ecec" },
            { value: "5.8", label: "avg intensity / 10", border: "#D7C9DB" },
            { value: "14:00–17:00", label: "peak window", border: "#b3ecec" },
            { value: "Work stress", label: "primary trigger", border: "#D7C9DB" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl p-5 card-shadow"
              style={{ borderLeft: `2px solid ${stat.border}` }}
            >
              <p className="text-xl font-mono font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Behavioral Evolution Timeline */}
        <section className="space-y-4 slide-up" style={{ animationDelay: "120ms" }}>
          <h2 className="font-heading font-semibold text-lg">Behavioral Evolution</h2>
          {weekData.map((week, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 card-shadow space-y-3"
              style={{ borderLeft: "2px solid #b3ecec" }}
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-heading font-semibold text-sm">{week.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">{week.range}</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {week.episodes} ep · avg {week.avg}
                </span>
              </div>
              <MiniSparkline bars={week.bars} />
              <p className="text-sm italic text-muted-foreground">"{week.note}"</p>
              <div className="flex gap-2">
                <input
                  value={weekNotes[idx] || ""}
                  onChange={(e) => setWeekNotes((p) => ({ ...p, [idx]: e.target.value }))}
                  placeholder="Add a note for this week..."
                  className="flex-1 px-3 py-2 rounded-[10px] text-sm border bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
                  style={{ borderColor: "#D7C9DB" }}
                />
                <button
                  className="px-3 py-2 rounded-[10px] text-xs font-medium text-white active:scale-95 transition-transform"
                  style={{ backgroundColor: "#2D7D6F" }}
                >
                  Save note
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Trigger Analysis Table */}
        <section className="space-y-4 slide-up" style={{ animationDelay: "180ms" }}>
          <h2 className="font-heading font-semibold text-lg">Trigger Analysis</h2>
          <div className="rounded-xl overflow-hidden card-shadow border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "#F7F8FA" }}>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Trigger</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Episodes</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Avg Intensity</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Peak Time</th>
                  <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Trend</th>
                </tr>
              </thead>
              <tbody>
                {triggerRows.map((row, i) => (
                  <tr key={row.trigger} style={{ backgroundColor: i % 2 === 0 ? "white" : "#F7F8FA" }}>
                    <td className="px-4 py-3 font-medium">{row.trigger}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.episodes}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{row.avg}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-xs">{row.peak}</td>
                    <td className="px-4 py-3 font-medium text-xs" style={{ color: row.trendColor }}>{row.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Journal Entries (read-only) */}
        <section className="space-y-4 slide-up" style={{ animationDelay: "240ms" }}>
          <h2 className="font-heading font-semibold text-lg">Client Journal Entries</h2>
          {journalEntries.map((entry, idx) => (
            <div
              key={idx}
              className="rounded-xl p-5 space-y-3"
              style={{ backgroundColor: "#F4EEF7", borderLeft: "2px solid #D7C9DB" }}
            >
              <p className="text-xs text-muted-foreground font-mono">{entry.date}</p>
              <div className="flex flex-wrap gap-1.5">
                {entry.emotions.map((e) => (
                  <span key={e} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{e}</span>
                ))}
                {entry.sensations.map((s) => (
                  <span key={s} className="chip-biometric px-2 py-0.5 rounded-full text-xs">{s}</span>
                ))}
              </div>
              <p className="text-sm italic text-muted-foreground">"{entry.reflection}"</p>
              <div className="flex gap-2">
                <input
                  value={journalComments[idx] || ""}
                  onChange={(e) => setJournalComments((p) => ({ ...p, [idx]: e.target.value }))}
                  placeholder="Add therapist comment..."
                  className="flex-1 px-3 py-2 rounded-[10px] text-sm border bg-white focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
                  style={{ borderColor: "#D7C9DB" }}
                />
                <button
                  className="px-3 py-2 rounded-[10px] text-xs font-medium text-white active:scale-95 transition-transform"
                  style={{ backgroundColor: "#2D7D6F" }}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Specialist Notes */}
        <section className="slide-up" style={{ animationDelay: "300ms" }}>
          <div
            className="px-5 py-4"
            style={{
              backgroundColor: "#1A1F2E",
              borderLeft: "4px solid #b3ecec",
              borderRadius: "12px 12px 0 0",
            }}
          >
            <h2 className="font-heading font-semibold text-base text-white">Specialist Notes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Private notes — not shared with client</p>
          </div>
          <div className="bg-white rounded-b-xl border border-t-0 border-border/50 p-5 space-y-4">
            <textarea
              value={specialistNotes}
              onChange={(e) => setSpecialistNotes(e.target.value)}
              placeholder="Write session notes, treatment observations, follow-up items..."
              className="w-full px-4 py-3 rounded-xl text-sm min-h-[120px] resize-y border focus:outline-none focus:border-[#b3ecec] focus:ring-2 focus:ring-[#b3ecec]/30 transition"
              style={{ backgroundColor: "#F7F8FA", borderColor: "#E5E7EB" }}
            />
            <div className="flex gap-3">
              <button
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95 transition-transform"
                style={{ backgroundColor: "#2D7D6F" }}
              >
                Save notes
              </button>
              <button className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors active:scale-95">
                Send message to client
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
