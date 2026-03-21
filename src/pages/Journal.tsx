import { useEffect, useState } from "react";
import { ChevronDown, PenLine, Share2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EPISODE_TYPES = ["Binge", "Restriction", "Overeating", "Emotional eating", "Purge", "Other"];
const TRIGGER_OPTIONS = ["Work stress", "Loneliness", "Fatigue", "Boredom", "Conflict", "Body image", "Social event", "Other"];
const EMOTIONS = ["Anxious", "Lonely", "Bored", "Stressed", "Tired", "Angry", "Empty", "Numb", "Overwhelmed", "Ashamed", "Sad", "Calm"];

function Chip({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="px-3 py-1.5 rounded-full text-sm transition-all duration-200 active:scale-95"
      style={selected
        ? { backgroundColor: "#b3ecec", color: "#1A4040" }
        : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
      {label}
    </button>
  );
}

function Toggle({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
          style={value === opt
            ? { backgroundColor: "#2D7D6F", color: "#fff" }
            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

interface SelfReport {
  id: string;
  timestamp: string;
  urge_level: number | null;
  emotional_state: string[] | null;
  triggers: string[] | null;
  notes: string | null;
  location_context: string | null;
  binge_occurred: boolean | null;
  purge_occurred: boolean | null;
  overeating_occurred: boolean | null;
  meal_skipped: boolean | null;
}

function parseContext(ctx: string | null): { episode_type?: string; occurred?: string; other_trigger?: string } {
  if (!ctx) return {};
  try { return JSON.parse(ctx); } catch { return {}; }
}

export default function Journal() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [occurred, setOccurred] = useState("");
  const [episodeType, setEpisodeType] = useState("");
  const [otherType, setOtherType] = useState("");
  const [whenDate, setWhenDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [whenTime, setWhenTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [intensity, setIntensity] = useState(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [otherTrigger, setOtherTrigger] = useState("");
  const [afterEmotions, setAfterEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [pastEntries, setPastEntries] = useState<SelfReport[]>([]);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [sharedMap, setSharedMap] = useState<Record<string, boolean>>({});

  const toggleArr = (arr: string[], setArr: React.Dispatch<React.SetStateAction<string[]>>, val: string) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("self_reports")
      .select("id, timestamp, urge_level, emotional_state, triggers, notes, location_context, binge_occurred, purge_occurred, overeating_occurred, meal_skipped")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setPastEntries(data as SelfReport[]); });
  }, [user]);

  const handleSave = async () => {
    if (!user || !occurred) return;
    setSaving(true);

    const ts = new Date(`${whenDate}T${whenTime}`);
    const effectiveType = episodeType === "Other" ? otherType : episodeType;

    await supabase.from("self_reports").insert({
      user_id: user.id,
      timestamp: ts.toISOString(),
      urge_level: intensity,
      binge_occurred: episodeType === "Binge" && occurred === "Yes",
      purge_occurred: episodeType === "Purge" && occurred === "Yes",
      overeating_occurred: episodeType === "Overeating" && occurred === "Yes",
      meal_skipped: episodeType === "Restriction" && occurred === "Yes",
      triggers: triggers.includes("Other") && otherTrigger
        ? [...triggers.filter((t) => t !== "Other"), otherTrigger]
        : triggers,
      emotional_state: afterEmotions,
      notes: notes || null,
      location_context: JSON.stringify({
        episode_type: effectiveType,
        occurred,
        other_trigger: otherTrigger || null,
      }),
    });

    toast({ description: "Moment saved 💚", className: "bg-white border-l-2 border-l-[#b3ecec]" });

    const { data: fresh } = await supabase
      .from("self_reports")
      .select("id, timestamp, urge_level, emotional_state, triggers, notes, location_context, binge_occurred, purge_occurred, overeating_occurred, meal_skipped")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(20);
    if (fresh) setPastEntries(fresh as SelfReport[]);

    setOccurred(""); setEpisodeType(""); setOtherType(""); setIntensity(5);
    setTriggers([]); setOtherTrigger(""); setAfterEmotions(""); setNotes("");
    setSaving(false);
  };

  const toggleShare = async (id: string, current: boolean) => {
    const next = !current;
    setSharedMap((prev) => ({ ...prev, [id]: next }));
    await supabase.from("self_reports").update({ notes: pastEntries.find(e => e.id === id)?.notes ?? null } as never).eq("id", id);
    toast({ description: next ? "Episode shared with your specialist." : "Episode unshared.", className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border/50 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#b3ecec]/50 focus:border-[#b3ecec] transition";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">Journal</h1>
        <p className="text-muted-foreground mt-1 text-sm">Record what's happening. Every log helps PULZ understand you better.</p>
      </div>

      {/* ── Episode logging form ── */}
      <div className="rounded-xl p-6 card-emotional space-y-6 slide-up" style={{ backgroundColor: "hsl(276 33% 95%)", animationDelay: "60ms" }}>
        <div className="flex items-center gap-2">
          <PenLine size={18} style={{ color: "hsl(280 20% 45%)" }} />
          <h2 className="font-heading font-semibold text-base" style={{ color: "hsl(280 20% 45%)" }}>Log a moment</h2>
        </div>

        {/* Did an episode occur? */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Did an episode occur?</label>
          <Toggle value={occurred} options={["Yes", "No", "Unsure"]} onChange={setOccurred} />
        </div>

        {/* Episode type — only if occurred */}
        {occurred === "Yes" && (
          <div className="space-y-2">
            <label className="text-sm font-medium block">Episode type</label>
            <div className="flex flex-wrap gap-2">
              {EPISODE_TYPES.map((t) => (
                <Chip key={t} label={t} selected={episodeType === t} onToggle={() => setEpisodeType(episodeType === t ? "" : t)} />
              ))}
            </div>
            {episodeType === "Other" && (
              <input value={otherType} onChange={(e) => setOtherType(e.target.value)} placeholder="Describe the episode…" className={inputCls} />
            )}
          </div>
        )}

        {/* When did it happen? */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">When did it happen?</label>
          <div className="flex gap-3">
            <input type="date" value={whenDate} onChange={(e) => setWhenDate(e.target.value)} className={`${inputCls} flex-1`} />
            <input type="time" value={whenTime} onChange={(e) => setWhenTime(e.target.value)} className={`${inputCls} w-32 font-mono`} />
          </div>
        </div>

        {/* Intensity */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">How intense was it?</label>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">{intensity}/10</span>
          </div>
          <input type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full" style={{ accentColor: "#2D7D6F" }} />
          <div className="flex justify-between text-[10px] text-muted-foreground"><span>Not at all</span><span>Overwhelming</span></div>
        </div>

        {/* Triggers */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">What triggered it?</label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((t) => (
              <Chip key={t} label={t} selected={triggers.includes(t)} onToggle={() => toggleArr(triggers, setTriggers, t)} />
            ))}
          </div>
          {triggers.includes("Other") && (
            <input value={otherTrigger} onChange={(e) => setOtherTrigger(e.target.value)} placeholder="Describe the trigger…" className={inputCls} />
          )}
        </div>

        {/* How do you feel now? */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">How do you feel now?</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {EMOTIONS.map((e) => (
              <button key={e} type="button" onClick={() => toggleArr(afterEmotions, setAfterEmotions, e)}
                className="px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95 text-center"
                style={afterEmotions.includes(e)
                  ? { backgroundColor: "#b3ecec", color: "#1A4040" }
                  : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium block">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you want to capture…"
            className={`${inputCls} min-h-[80px] resize-y`} />
        </div>

        <button onClick={handleSave} disabled={!occurred || saving}
          className="w-full py-3 rounded-xl font-medium text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: "#2D7D6F" }}>
          {saving ? "Saving…" : "Save this moment"}
        </button>
      </div>

      {/* ── Past entries ── */}
      {pastEntries.length > 0 && (
        <div className="space-y-3 slide-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-lg font-heading font-semibold">Recent entries</h2>
          {pastEntries.map((entry) => {
            const ctx = parseContext(entry.location_context);
            const isShared = sharedMap[entry.id] ?? false;
            const ts = new Date(entry.timestamp);
            const label = ctx.episode_type ?? (entry.binge_occurred ? "Binge" : entry.purge_occurred ? "Purge" : entry.overeating_occurred ? "Overeating" : entry.meal_skipped ? "Restriction" : "Moment");
            const occurred = ctx.occurred ?? "—";

            return (
              <div key={entry.id} className="rounded-xl overflow-hidden card-emotional" style={{ backgroundColor: "hsl(276 33% 95%)" }}>
                <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {ts.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="chip-trigger px-2 py-0.5 rounded-full text-xs shrink-0">{label}</span>
                    <span className="text-xs text-muted-foreground truncate">{occurred}</span>
                  </div>
                  <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${expandedEntry === entry.id ? "rotate-180" : ""}`} />
                </button>

                {expandedEntry === entry.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3">
                    {entry.urge_level != null && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">Intensity</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${entry.urge_level * 10}%` }} />
                        </div>
                        <span className="text-xs font-mono tabular-nums">{entry.urge_level}/10</span>
                      </div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Triggers</span>
                        {entry.triggers.map((t) => <span key={t} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{t}</span>)}
                      </div>
                    )}
                    {entry.emotional_state && entry.emotional_state.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Feeling</span>
                        {entry.emotional_state.map((e) => <span key={e} className="chip-biometric px-2 py-0.5 rounded-full text-xs">{e}</span>)}
                      </div>
                    )}
                    {entry.notes && <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>}

                    {/* Share with specialist toggle */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        {isShared ? <UserCheck size={14} style={{ color: "#2D7D6F" }} /> : <Share2 size={14} className="text-muted-foreground" />}
                        <span className="text-xs font-medium text-muted-foreground">Share with my specialist</span>
                      </div>
                      <button type="button" onClick={() => toggleShare(entry.id, isShared)}
                        className="relative w-10 h-5 rounded-full transition-colors duration-200"
                        style={{ backgroundColor: isShared ? "#2D7D6F" : "hsl(var(--muted))" }}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${isShared ? "translate-x-5" : ""}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
