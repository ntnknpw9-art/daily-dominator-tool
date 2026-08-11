import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Bug, CheckCircle2, RefreshCw, Trash2, ChevronDown, ChevronUp,
  AlertCircle, Info, Zap, Eye, EyeOff,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Summary = {
  total: number;
  unresolved: number;
  last_24h: number;
  last_7d: number;
  critical_open: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
  top_messages: { message: string; count: number; severity: string; last_seen: string }[];
  errors_by_day: { day: string; count: number }[];
};

type ErrorRow = {
  id: string;
  user_id: string | null;
  severity: string;
  source: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_agent: string | null;
  context: any;
  resolved: boolean;
  created_at: string;
};

const SEVERITY_META: Record<string, { label: string; color: string; icon: any }> = {
  debug: { label: "Debug", color: "bg-slate-500/15 text-slate-300 border-slate-500/30", icon: Bug },
  info: { label: "Info", color: "bg-blue-500/15 text-blue-300 border-blue-500/30", icon: Info },
  warn: { label: "אזהרה", color: "bg-primary/15 text-primary border-primary/30", icon: AlertTriangle },
  error: { label: "שגיאה", color: "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30", icon: AlertCircle },
  critical: { label: "קריטי", color: "bg-muted-foreground/25 text-foreground border-muted-foreground/40", icon: Zap },
};

const SEVERITY_ORDER = ["critical", "error", "warn", "info", "debug"] as const;

export default function ErrorsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState<string | null>(null);
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        supabase.rpc("admin_get_errors_summary" as any),
        supabase.rpc("admin_list_errors" as any, {
          _limit: 100,
          _severity: filterSev,
          _only_unresolved: onlyUnresolved,
        }),
      ]);
      if (s.error) throw s.error;
      if (l.error) throw l.error;
      setSummary(s.data as unknown as Summary);
      setErrors((l.data as unknown as ErrorRow[]) || []);
    } catch (e) {
      console.error("[ErrorsPanel]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterSev, onlyUnresolved]);

  const markResolved = async (id: string, resolved: boolean) => {
    await supabase.from("app_errors" as any).update({ resolved }).eq("id", id);
    setErrors((prev) => prev.map((e) => (e.id === id ? { ...e, resolved } : e)));
  };

  const deleteRow = async (id: string) => {
    if (!confirm("למחוק את התקלה?")) return;
    await supabase.from("app_errors" as any).delete().eq("id", id);
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  const clearResolved = async () => {
    if (!confirm("למחוק את כל התקלות שטופלו?")) return;
    await supabase.from("app_errors" as any).delete().eq("resolved", true);
    load();
  };

  const trendData = (summary?.errors_by_day || []).map((r) => ({
    day: new Date(r.day).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
    count: Number(r.count),
  }));

  return (
    <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">תקלות באפליקציה</h2>
          {summary?.critical_open ? (
            <Badge className="bg-muted-foreground/20 text-muted-foreground border-muted-foreground/40">
              {summary.critical_open} קריטיות פתוחות
            </Badge>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} /> רענן
          </Button>
          <Button size="sm" variant="ghost" onClick={clearResolved}>
            <Trash2 className="h-4 w-4 ml-1" /> נקה שטופלו
          </Button>
        </div>
      </div>

      {/* KPI summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="p-3 rounded-lg bg-background/40 border border-border/40">
            <div className="text-xs text-muted-foreground">סה״כ</div>
            <div className="text-xl font-bold">{summary.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/40 border border-border/40">
            <div className="text-xs text-muted-foreground">פתוחות</div>
            <div className="text-xl font-bold text-primary">{summary.unresolved}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/40 border border-border/40">
            <div className="text-xs text-muted-foreground">24 שעות</div>
            <div className="text-xl font-bold">{summary.last_24h}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/40 border border-border/40">
            <div className="text-xs text-muted-foreground">7 ימים</div>
            <div className="text-xl font-bold">{summary.last_7d}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/40 border border-border/40">
            <div className="text-xs text-muted-foreground">קריטי פתוח</div>
            <div className="text-xl font-bold text-muted-foreground">{summary.critical_open}</div>
          </div>
        </div>
      )}

      {/* Trend */}
      {trendData.length > 0 && (
        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--destructive))" fill="url(#errGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Button size="sm" variant={filterSev === null ? "default" : "outline"} onClick={() => setFilterSev(null)}>
          הכל
        </Button>
        {SEVERITY_ORDER.map((s) => {
          const meta = SEVERITY_META[s];
          const count = summary?.by_severity?.[s] ?? 0;
          return (
            <Button
              key={s}
              size="sm"
              variant={filterSev === s ? "default" : "outline"}
              onClick={() => setFilterSev(filterSev === s ? null : s)}
            >
              <meta.icon className="h-3 w-3 ml-1" />
              {meta.label} ({count})
            </Button>
          );
        })}
        <Button size="sm" variant={onlyUnresolved ? "default" : "outline"} onClick={() => setOnlyUnresolved((v) => !v)}>
          {onlyUnresolved ? <EyeOff className="h-3 w-3 ml-1" /> : <Eye className="h-3 w-3 ml-1" />}
          {onlyUnresolved ? "רק פתוחות" : "כולל שטופלו"}
        </Button>
      </div>

      {/* Top messages */}
      {summary?.top_messages?.length ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">תקלות נפוצות (30י׳)</h3>
          <div className="space-y-1">
            {summary.top_messages.slice(0, 5).map((m, i) => {
              const meta = SEVERITY_META[m.severity] || SEVERITY_META.error;
              return (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-background/40 border border-border/30">
                  <Badge className={`${meta.color} border text-[10px] shrink-0`}>{meta.label}</Badge>
                  <span className="flex-1 truncate font-mono" dir="ltr" title={m.message}>{m.message}</span>
                  <span className="text-muted-foreground shrink-0">×{m.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {loading && errors.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">טוען…</div>
        ) : errors.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            אין תקלות פתוחות 🎉
          </div>
        ) : (
          errors.map((e) => {
            const meta = SEVERITY_META[e.severity] || SEVERITY_META.error;
            const isOpen = expanded === e.id;
            return (
              <div
                key={e.id}
                className={`rounded-lg border ${e.resolved ? "border-border/30 opacity-60" : "border-border/60"} bg-background/40`}
              >
                <button
                  className="w-full text-right p-3 flex items-start gap-2"
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                >
                  <Badge className={`${meta.color} border shrink-0 mt-0.5`}>
                    <meta.icon className="h-3 w-3 ml-1" />
                    {meta.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate font-mono" dir="ltr">{e.message}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5" dir="ltr">
                      <span>{new Date(e.created_at).toLocaleString("he-IL")}</span>
                      <span>· {e.source}</span>
                      {e.url && <span>· {new URL(e.url).pathname}</span>}
                      {e.user_id && <span>· user:{e.user_id.slice(0, 8)}</span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
                    {e.stack && (
                      <pre className="text-[11px] bg-background/60 p-2 rounded overflow-auto max-h-48 font-mono" dir="ltr">
                        {e.stack}
                      </pre>
                    )}
                    {e.context && (
                      <pre className="text-[11px] bg-background/60 p-2 rounded overflow-auto max-h-32 font-mono" dir="ltr">
                        {JSON.stringify(e.context, null, 2)}
                      </pre>
                    )}
                    {e.user_agent && (
                      <div className="text-[10px] text-muted-foreground" dir="ltr">UA: {e.user_agent}</div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant={e.resolved ? "outline" : "default"} onClick={() => markResolved(e.id, !e.resolved)}>
                        <CheckCircle2 className="h-3 w-3 ml-1" />
                        {e.resolved ? "סמן כפתוח" : "סמן כטופל"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteRow(e.id)}>
                        <Trash2 className="h-3 w-3 ml-1" /> מחק
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
