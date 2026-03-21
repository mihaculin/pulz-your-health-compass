import { useEffect, useState } from "react";
import { ClipboardList, ChevronDown, PenLine, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClientEntry {
  clientId: string;
  clientName: string;
  reports: SelfReport[];
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

function parseContext(ctx: string | null): { episode_type?: string; occurred?: string } {
  if (!ctx) return {};
  try { return JSON.parse(ctx); } catch { return {}; }
}

function episodeLabel(r: SelfReport): string {
  const ctx = parseContext(r.location_context);
  if (ctx.episode_type) return ctx.episode_type;
  if (r.binge_occurred) return "Binge";
  if (r.purge_occurred) return "Purge";
  if (r.overeating_occurred) return "Overeating";
  if (r.meal_skipped) return "Restriction";
  return "Moment";
}

export default function SpecialistDashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);

      const { data: clientProfiles } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("assigned_specialist_id", user.id);

      if (!clientProfiles || clientProfiles.length === 0) {
        setLoading(false);
        return;
      }

      const clientIds = clientProfiles.map((c) => c.id);

      const [profilesRes, reportsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", clientIds),
        supabase
          .from("self_reports")
          .select("id, timestamp, urge_level, emotional_state, triggers, notes, location_context, binge_occurred, purge_occurred, overeating_occurred, meal_skipped, user_id")
          .in("user_id", clientIds)
          .order("timestamp", { ascending: false }),
      ]);

      const nameMap: Record<string, string> = {};
      (profilesRes.data ?? []).forEach((p) => {
        nameMap[p.user_id] = p.full_name ?? "Unknown client";
      });

      const grouped: ClientEntry[] = clientIds.map((id) => ({
        clientId: id,
        clientName: nameMap[id] ?? "Unknown client",
        reports: ((reportsRes.data ?? []) as (SelfReport & { user_id: string })[])
          .filter((r) => r.user_id === id),
      }));

      setClients(grouped);
      setLoading(false);
    };

    load();
  }, [user]);

  return (
    <div className="min-h-screen p-6 lg:p-10" style={{ background: "hsl(var(--background))" }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="slide-up">
          <h1 className="text-2xl lg:text-3xl font-heading font-semibold" style={{ color: "hsl(var(--primary))" }}>
            Specialist Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Monitor your clients' manually logged episodes.</p>
        </div>

        {loading && (
          <div className="text-sm text-muted-foreground">Loading client data…</div>
        )}

        {!loading && clients.length === 0 && (
          <div className="rounded-xl p-8 text-center card-shadow bg-card border border-border/50">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No clients assigned yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Clients will appear here once they link your specialist code.</p>
          </div>
        )}

        {!loading && clients.map((client) => (
          <div key={client.clientId} className="bg-card rounded-xl border border-border/50 card-shadow overflow-hidden">
            <button
              onClick={() => setExpandedClient(expandedClient === client.clientId ? null : client.clientId)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {client.clientName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{client.clientName}</p>
                  <p className="text-xs text-muted-foreground">{client.reports.length} manually logged episode{client.reports.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expandedClient === client.clientId ? "rotate-180" : ""}`} />
            </button>

            {expandedClient === client.clientId && (
              <div className="border-t border-border/50 divide-y divide-border/30">
                {client.reports.length === 0 && (
                  <p className="text-sm text-muted-foreground p-5">No episodes logged yet.</p>
                )}
                {client.reports.map((r) => {
                  const ts = new Date(r.timestamp);
                  const ctx = parseContext(r.location_context);
                  const label = episodeLabel(r);

                  return (
                    <div key={r.id}>
                      <button
                        onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: "#E8F8F7" }}>
                            <PenLine size={13} style={{ color: "#2D7D6F" }} />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground shrink-0">
                            {ts.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {ts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="chip-trigger px-2 py-0.5 rounded-full text-xs shrink-0">{label}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ backgroundColor: "#E8F8F7", color: "#2D7D6F" }}>
                            Manually logged
                          </span>
                          <span className="text-xs text-muted-foreground truncate hidden sm:block">{ctx.occurred ?? ""}</span>
                        </div>
                        <ChevronDown size={14} className={`text-muted-foreground shrink-0 transition-transform ${expandedReport === r.id ? "rotate-180" : ""}`} />
                      </button>

                      {expandedReport === r.id && (
                        <div className="px-5 pb-4 pt-1 space-y-2.5 bg-muted/10">
                          {r.urge_level != null && (
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-20 shrink-0">Intensity</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${r.urge_level * 10}%` }} />
                              </div>
                              <span className="text-xs font-mono tabular-nums">{r.urge_level}/10</span>
                            </div>
                          )}
                          {r.triggers && r.triggers.length > 0 && (
                            <div className="flex flex-wrap items-start gap-1.5">
                              <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Triggers</span>
                              {r.triggers.map((t) => <span key={t} className="chip-trigger px-2 py-0.5 rounded-full text-xs">{t}</span>)}
                            </div>
                          )}
                          {r.emotional_state && r.emotional_state.length > 0 && (
                            <div className="flex flex-wrap items-start gap-1.5">
                              <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Feeling</span>
                              {r.emotional_state.map((e) => <span key={e} className="chip-biometric px-2 py-0.5 rounded-full text-xs">{e}</span>)}
                            </div>
                          )}
                          {r.notes && <p className="text-sm text-muted-foreground italic ml-20">"{r.notes}"</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
