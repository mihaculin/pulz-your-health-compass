import { useEffect, useState } from "react";
import { ChevronDown, PenLine, Share2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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

function parseContext(ctx: string | null): { episode_type?: string; episode_types?: string[]; occurred?: string; other_trigger?: string } {
  if (!ctx) return {};
  try { return JSON.parse(ctx); } catch { return {}; }
}

export default function Journal() {
  const { user } = useAuth();
  const { surveyTriggers } = useApp();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [occurred, setOccurred] = useState("");
  const [episodeTypes, setEpisodeTypes] = useState<string[]>([]);
  const [otherType, setOtherType] = useState("");
  const [whenDate, setWhenDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [whenTime, setWhenTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [intensity, setIntensity] = useState(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [triggersSeeded, setTriggersSeeded] = useState(false);
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
    if (!triggersSeeded && surveyTriggers.length > 0) {
      setTriggers(surveyTriggers.filter((tr) => TRIGGER_OPTIONS.includes(tr)));
      setTriggersSeeded(true);
    }
  }, [surveyTriggers, triggersSeeded]);

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
    const selectedEpisodeTypes = episodeTypes
      .map((t) => (t === "Other" ? (otherType || "Other") : t))
      .filter((t) => t.trim().length > 0);

    await supabase.from("self_reports").insert({
      user_id: user.id,
      timestamp: ts.toISOString(),
      urge_level: intensity,
      binge_occurred: occurred === "Yes" && episodeTypes.includes("Binge"),
      purge_occurred: occurred === "Yes" && episodeTypes.includes("Purge"),
      overeating_occurred: occurred === "Yes" && episodeTypes.includes("Overeating"),
      meal_skipped: occurred === "Yes" && episodeTypes.includes("Restriction"),
      triggers: triggers.includes("Other") && otherTrigger
        ? [...triggers.filter((tr) => tr !== "Other"), otherTrigger]
        : triggers,
      emotional_state: afterEmotions,
      notes: notes || null,
      location_context: JSON.stringify({
        episode_types: selectedEpisodeTypes,
        episode_type: selectedEpisodeTypes[0] ?? null,
        occurred,
        other_trigger: otherTrigger || null,
      }),
    });

    toast({ description: t("journal.saved"), className: "bg-white border-l-2 border-l-[#b3ecec]" });

    const { data: fresh } = await supabase
      .from("self_reports")
      .select("id, timestamp, urge_level, emotional_state, triggers, notes, location_context, binge_occurred, purge_occurred, overeating_occurred, meal_skipped")
      .eq("user_id", user.id)
      .order("timestamp", { ascending: false })
      .limit(20);
    if (fresh) setPastEntries(fresh as SelfReport[]);

    setOccurred(""); setEpisodeTypes([]); setOtherType(""); setIntensity(5);
    setTriggers([]); setOtherTrigger(""); setAfterEmotions([]); setNotes("");
    setSaving(false);
  };

  const toggleShare = async (id: string, current: boolean) => {
    const next = !current;
    setSharedMap((prev) => ({ ...prev, [id]: next }));
    await supabase.from("self_reports").update({ notes: pastEntries.find(e => e.id === id)?.notes ?? null } as never).eq("id", id);
    toast({ description: next ? t("journal.shared") : t("journal.unshared"), className: "bg-white border-l-2 border-l-[#b3ecec]" });
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-border/50 text-sm bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#b3ecec]/50 focus:border-[#b3ecec] transition";

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
      <div className="slide-up">
        <h1 className="text-2xl lg:text-3xl font-heading font-semibold">{t("journal.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("journal.subtitle")}</p>
      </div>

      <div className="rounded-xl p-6 card-emotional space-y-6 slide-up" style={{ backgroundColor: "hsl(276 33% 95%)", animationDelay: "60ms" }}>
        <div className="flex items-center gap-2">
          <PenLine size={18} style={{ color: "hsl(280 20% 45%)" }} />
          <h2 className="font-heading font-semibold text-base" style={{ color: "hsl(280 20% 45%)" }}>{t("journal.logMoment")}</h2>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">{t("journal.episodeOccurred")}</label>
          <Toggle value={occurred} options={[t("journal.yes"), t("journal.unsure")]} onChange={setOccurred} />
        </div>

        {occurred === t("journal.yes") && (
          <div className="space-y-2">
            <label className="text-sm font-medium block">{t("journal.episodeType")}</label>
            <div className="flex flex-wrap gap-2">
              {EPISODE_TYPES.map((ep) => (
                <Chip key={ep} label={ep} selected={episodeTypes.includes(ep)} onToggle={() => toggleArr(episodeTypes, setEpisodeTypes, ep)} />
              ))}
            </div>
            {episodeTypes.includes("Other") && (
              <input value={otherType} onChange={(e) => setOtherType(e.target.value)} placeholder={t("journal.describeEpisode")} className={inputCls} />
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium block">{t("journal.whenHappened")}</label>
          <div className="flex gap-3">
            <input type="date" value={whenDate} onChange={(e) => setWhenDate(e.target.value)} className={`${inputCls} flex-1`} />
            <input type="time" value={whenTime} onChange={(e) => setWhenTime(e.target.value)} className={`${inputCls} w-32 font-mono`} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">{t("journal.howIntense")}</label>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">{intensity}/10</span>
          </div>
          <input type="range" min={0} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full" style={{ accentColor: "#2D7D6F" }} />
          <div className="flex justify-between text-[10px] text-muted-foreground"><span>{t("journal.notAtAll")}</span><span>{t("journal.overwhelming")}</span></div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">{t("journal.whatTriggered")}</label>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map((tr) => (
              <Chip key={tr} label={tr} selected={triggers.includes(tr)} onToggle={() => toggleArr(triggers, setTriggers, tr)} />
            ))}
          </div>
          {triggers.includes("Other") && (
            <input value={otherTrigger} onChange={(e) => setOtherTrigger(e.target.value)} placeholder={t("journal.describeTrigger")} className={inputCls} />
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium block">{t("journal.howFeel")}</label>
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

        <div className="space-y-2">
          <label className="text-sm font-medium block">{t("journal.notes")} <span className="text-muted-foreground font-normal">{t("journal.optional")}</span></label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder={t("journal.anythingElse")}
            className={`${inputCls} min-h-[80px] resize-y`} />
        </div>

        <button onClick={handleSave} disabled={!occurred || saving}
          className="w-full py-3 rounded-xl font-medium text-sm text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: "#2D7D6F" }}>
          {saving ? t("journal.saving") : t("journal.saveButton")}
        </button>
      </div>

      {pastEntries.length > 0 && (
        <div className="space-y-3 slide-up" style={{ animationDelay: "120ms" }}>
          <h2 className="text-lg font-heading font-semibold">{t("journal.recentEntries")}</h2>
          {pastEntries.map((entry) => {
            const ctx = parseContext(entry.location_context);
            const isShared = sharedMap[entry.id] ?? false;
            const ts = new Date(entry.timestamp);
            const label = (ctx.episode_types && ctx.episode_types.length > 0)
              ? ctx.episode_types.join(", ")
              : ctx.episode_type ?? (entry.binge_occurred ? "Binge" : entry.purge_occurred ? "Purge" : entry.overeating_occurred ? "Overeating" : entry.meal_skipped ? "Restriction" : "Moment");
            const occ = ctx.occurred ?? "—";

            return (
              <div key={entry.id} className="rounded-xl overflow-hidden card-emotional" style={{ backgroundColor: "hsl(276 33% 95%)" }}>
                <button onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {ts.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="chip-trigger px-2 py-0.5 rounded-full text-xs shrink-0">{label}</span>
                    <span className="text-xs text-muted-foreground truncate">{occ}</span>
                  </div>
                  <ChevronDown size={16} className={`text-muted-foreground shrink-0 transition-transform ${expandedEntry === entry.id ? "rotate-180" : ""}`} />
                </button>

                {expandedEntry === entry.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/50 space-y-3">
                    {entry.urge_level != null && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-20 shrink-0">{t("journal.intensity")}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${entry.urge_level * 10}%` }} />
                        </div>
                        <span className="text-xs font-mono tabular-nums">{entry.urge_level}/10</span>
                      </div>
                    )}
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{t("journal.triggers")}</span>
                        {entry.triggers.map((tr) => <span key={tr} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{tr}</span>)}
                      </div>
                    )}
                    {entry.emotional_state && entry.emotional_state.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{t("journal.feeling")}</span>
                        {entry.emotional_state.map((em) => <span key={em} className="chip-biometric px-2 py-0.5 rounded-full text-xs">{em}</span>)}
                      </div>
                    )}
                    {entry.notes && <p className="text-sm text-muted-foreground italic">"{entry.notes}"</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        {isShared ? <UserCheck size={14} style={{ color: "#2D7D6F" }} /> : <Share2 size={14} className="text-muted-foreground" />}
                        <span className="text-xs font-medium text-muted-foreground">{t("journal.shareSpecialist")}</span>
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
