import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, LogOut, Users, TrendingUp, Activity, CreditCard, CheckCircle2,
  Dumbbell, BookOpen, Image as ImageIcon, MessageSquare, Flame, Trophy,
  Heart, MessageCircle, Swords, UserPlus, Apple, Target, Zap, Award,
  BarChart3, Clock, Calendar, Percent, Download, FileJson, FileSpreadsheet,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

type Stats = {
  total_users: number; users_last_24h: number; users_last_7d: number; users_last_30d: number;
  verified_users: number;
  active_subscriptions: number; total_subscriptions: number; conversion_rate: number;
  dau: number; wau: number; mau: number; stickiness: number; retention_d7_pct: number;
  total_tasks: number; total_completions: number;
  completions_last_24h: number; completions_last_7d: number; completions_last_30d: number;
  avg_completions_per_user: number;
  total_workouts: number; workouts_last_7d: number; total_workout_sets: number;
  total_journal_entries: number; journal_last_7d: number;
  total_progress_photos: number; photos_last_7d: number;
  total_photo_likes: number; total_photo_comments: number;
  total_ai_messages: number; ai_messages_last_7d: number;
  total_habits: number; total_duels: number; active_duels: number;
  total_friendships: number; pending_friendships: number;
  total_nutrition_logs: number; total_health_logs: number; total_challenges: number;
  avg_xp: number; max_xp: number; avg_level: number; max_level: number;
  avg_streak: number; max_streak: number;
  active_users_7d: number; active_users_30d: number;
  leagues: Record<string, number>;
  categories: Record<string, number>;
  completions_by_hour: { hour: number; count: number }[];
  completions_by_dow: { dow: number; count: number }[];
};

type SignupRow = { day: string; signups: number };
type ActivityRow = { day: string; completions: number; active_users: number };

const StatCard = ({ icon: Icon, label, value, hint, accent }: {
  icon: any; label: string; value: string | number; hint?: string; accent?: string;
}) => (
  <Card className="p-4 bg-card/60 backdrop-blur border-border/50 hover:border-primary/40 transition-colors">
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={`h-4 w-4 ${accent || "text-primary"}`} />
    </div>
    <div className="text-2xl font-bold">{value}</div>
    {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
  </Card>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3 mt-2">{children}</h2>
);

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316"];

const DOW_LABELS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const CATEGORY_LABELS: Record<string, string> = {
  fitness: "כושר", study: "לימודים", money: "כסף", discipline: "משמעת",
  health: "בריאות", spirituality: "רוחניות", career: "קריירה", social: "חברתי",
};

const LEAGUE_LABELS: Record<string, string> = {
  bronze: "ברונזה", silver: "כסף", gold: "זהב", platinum: "פלטינום", diamond: "יהלום",
};

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/admin/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data: roleRows, error: rErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (rErr) throw rErr;
        if (!roleRows) { setAuthorized(false); return; }
        setAuthorized(true);

        const [s, su, ac] = await Promise.all([
          supabase.rpc("admin_get_stats"),
          supabase.rpc("admin_get_signups_daily"),
          supabase.rpc("admin_get_activity_daily"),
        ]);
        if (s.error) throw s.error;
        if (su.error) throw su.error;
        if (ac.error) throw ac.error;
        setStats(s.data as unknown as Stats);
        setSignups(((su.data as any[]) || []).map((r) => ({
          day: new Date(r.day).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
          signups: Number(r.signups),
        })));
        setActivity(((ac.data as any[]) || []).map((r) => ({
          day: new Date(r.day).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" }),
          completions: Number(r.completions),
          active_users: Number(r.active_users),
        })));
      } catch (e: any) {
        setErr(e.message || "שגיאה");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-2xl font-bold">אין הרשאה</h1>
        <p className="text-muted-foreground">החשבון הזה אינו מנהל.</p>
        <Button onClick={() => navigate("/")} variant="outline">חזרה</Button>
        <Button onClick={signOut} variant="ghost">התנתקות</Button>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-destructive">שגיאה: {err}</div>
      </div>
    );
  }

  if (!stats) return null;

  const categoriesData = Object.entries(stats.categories || {})
    .map(([k, v]) => ({ name: CATEGORY_LABELS[k] || k, value: Number(v) }))
    .sort((a, b) => b.value - a.value);

  const leaguesData = Object.entries(stats.leagues || {})
    .map(([k, v]) => ({ name: LEAGUE_LABELS[k] || k, value: Number(v) }));

  const hourData = Array.from({ length: 24 }, (_, h) => {
    const found = (stats.completions_by_hour || []).find((x) => x.hour === h);
    return { hour: `${h}:00`, count: found ? Number(found.count) : 0 };
  });

  const dowData = Array.from({ length: 7 }, (_, d) => {
    const found = (stats.completions_by_dow || []).find((x) => x.dow === d);
    return { day: DOW_LABELS[d], count: found ? Number(found.count) : 0 };
  });

  const verifiedRate = stats.total_users
    ? ((stats.verified_users / stats.total_users) * 100).toFixed(0)
    : "0";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/40 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">לוח בקרה — מנהל</h1>
            <p className="text-xs text-muted-foreground">סטטיסטיקות מצטברות בלבד</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 ml-1" /> התנתק
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* === USERS === */}
        <SectionTitle>👥 משתמשים</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="סה״כ משתמשים" value={stats.total_users} hint={`+${stats.users_last_24h} ב-24ש׳`} />
          <StatCard icon={TrendingUp} label="הרשמות 7 ימים" value={stats.users_last_7d} hint={`30 יום: ${stats.users_last_30d}`} accent="text-emerald-500" />
          <StatCard icon={CheckCircle2} label="מאומתי אימייל" value={stats.verified_users} hint={`${verifiedRate}% מהמשתמשים`} accent="text-emerald-500" />
          <StatCard icon={Percent} label="שימור D7" value={`${stats.retention_d7_pct}%`} hint="מהנרשמים 7-30 יום" accent="text-blue-500" />
        </div>

        {/* === ENGAGEMENT === */}
        <SectionTitle>📊 מעורבות (Active Users)</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Activity} label="DAU — יומי" value={stats.dau} accent="text-emerald-500" />
          <StatCard icon={Activity} label="WAU — שבועי" value={stats.wau} accent="text-blue-500" />
          <StatCard icon={Activity} label="MAU — חודשי" value={stats.mau} accent="text-purple-500" />
          <StatCard icon={Zap} label="סטיקיות" value={`${stats.stickiness}%`} hint="DAU/MAU" accent="text-amber-500" />
        </div>

        {/* === REVENUE === */}
        <SectionTitle>💰 מנויים והכנסות</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={CreditCard} label="מנויים פעילים" value={stats.active_subscriptions} accent="text-amber-500" />
          <StatCard icon={Percent} label="המרה" value={`${stats.conversion_rate}%`} hint="פרימיום מהמשתמשים" accent="text-amber-500" />
          <StatCard icon={CreditCard} label="סה״כ מנויים אי-פעם" value={stats.total_subscriptions} />
          <StatCard icon={Trophy} label="פוטנציאל הכנסה ($)" value={(stats.active_subscriptions * 9.99).toFixed(2)} hint="הערכה ב-9.99$" accent="text-emerald-500" />
        </div>

        {/* === SIGNUPS CHART === */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <h2 className="font-semibold mb-3">הרשמות חדשות — 30 ימים אחרונים</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signups}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="signups" stroke="hsl(var(--primary))" fill="url(#grad1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* === ACTIVITY CHART === */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <h2 className="font-semibold mb-3">פעילות יומית — השלמות ומשתמשים פעילים</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="completions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="השלמות" />
                <Bar dataKey="active_users" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="פעילים" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* === TASKS & GAMIFICATION === */}
        <SectionTitle>✅ משימות וגיימיפיקציה</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Target} label="סה״כ משימות" value={stats.total_tasks} />
          <StatCard icon={CheckCircle2} label="סה״כ השלמות" value={stats.total_completions} hint={`24ש׳: ${stats.completions_last_24h} · 7י׳: ${stats.completions_last_7d}`} />
          <StatCard icon={BarChart3} label="ממוצע השלמות / משתמש" value={stats.avg_completions_per_user} />
          <StatCard icon={Flame} label="שיא רצף" value={stats.max_streak} hint={`ממוצע: ${stats.avg_streak}`} accent="text-orange-500" />
          <StatCard icon={Award} label="ממוצע XP" value={stats.avg_xp} hint={`שיא: ${stats.max_xp}`} accent="text-amber-500" />
          <StatCard icon={Trophy} label="ממוצע רמה" value={stats.avg_level} hint={`שיא: ${stats.max_level}`} accent="text-amber-500" />
          <StatCard icon={Target} label="הרגלים פעילים" value={stats.total_habits} />
          <StatCard icon={Trophy} label="אתגרים" value={stats.total_challenges} />
        </div>

        {/* === CATEGORIES + LEAGUES === */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
            <h2 className="font-semibold mb-3">פילוח משימות לפי קטגוריה</h2>
            <div className="h-64">
              {categoriesData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">אין נתונים</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoriesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {categoriesData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
            <h2 className="font-semibold mb-3">התפלגות ליגות (עונה נוכחית)</h2>
            <div className="h-64">
              {leaguesData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">אין נתונים</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaguesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="משתמשים" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* === HOURS + DOW === */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4" /> שעות שיא — 14 ימים</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={2} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> פעילות לפי יום בשבוע — 30 ימים</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* === FEATURE USAGE === */}
        <SectionTitle>🏋️ שימוש בפיצ׳רים</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Dumbbell} label="אימונים" value={stats.total_workouts} hint={`7י׳: ${stats.workouts_last_7d}`} />
          <StatCard icon={Dumbbell} label="סטים שבוצעו" value={stats.total_workout_sets} accent="text-blue-500" />
          <StatCard icon={Apple} label="רישומי תזונה" value={stats.total_nutrition_logs} accent="text-emerald-500" />
          <StatCard icon={Heart} label="לוגי בריאות יומיים" value={stats.total_health_logs} accent="text-rose-500" />
          <StatCard icon={BookOpen} label="רשומות יומן" value={stats.total_journal_entries} hint={`7י׳: ${stats.journal_last_7d}`} />
          <StatCard icon={ImageIcon} label="תמונות התקדמות" value={stats.total_progress_photos} hint={`7י׳: ${stats.photos_last_7d}`} />
          <StatCard icon={MessageSquare} label="הודעות AI" value={stats.total_ai_messages} hint={`7י׳: ${stats.ai_messages_last_7d}`} accent="text-purple-500" />
          <StatCard icon={Heart} label="לייקים על תמונות" value={stats.total_photo_likes} accent="text-rose-500" />
        </div>

        {/* === SOCIAL === */}
        <SectionTitle>🤝 חברתי</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={UserPlus} label="חברויות פעילות" value={stats.total_friendships} hint={`ממתינות: ${stats.pending_friendships}`} />
          <StatCard icon={Swords} label="דואלים פעילים" value={stats.active_duels} hint={`סה״כ: ${stats.total_duels}`} accent="text-rose-500" />
          <StatCard icon={MessageCircle} label="תגובות על תמונות" value={stats.total_photo_comments} accent="text-blue-500" />
          <StatCard icon={Trophy} label="אתגרים" value={stats.total_challenges} accent="text-amber-500" />
        </div>

        {/* === EXPORT === */}
        <SectionTitle>📥 ייצוא נתונים</SectionTitle>
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <p className="text-sm text-muted-foreground mb-3">
            הורד את כל הנתונים המצטברים מהדשבורד בלחיצה אחת. אין נתונים אישיים של משתמשים — רק אגרגציות.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={() => {
                const payload = {
                  exported_at: new Date().toISOString(),
                  stats,
                  signups_30d: signups,
                  activity_30d: activity,
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `admin-stats-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileJson className="h-4 w-4 ml-1" /> ייצוא JSON מלא
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                const rows: string[] = ["metric,value"];
                Object.entries(stats).forEach(([k, v]) => {
                  if (v === null || v === undefined) return;
                  if (typeof v === "object") {
                    rows.push(`${k},"${JSON.stringify(v).replace(/"/g, '""')}"`);
                  } else {
                    rows.push(`${k},${v}`);
                  }
                });
                rows.push("");
                rows.push("signups_day,signups");
                signups.forEach((r) => rows.push(`${r.day},${r.signups}`));
                rows.push("");
                rows.push("activity_day,completions,active_users");
                activity.forEach((r) => rows.push(`${r.day},${r.completions},${r.active_users}`));
                const csv = "\uFEFF" + rows.join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `admin-stats-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <FileSpreadsheet className="h-4 w-4 ml-1" /> ייצוא CSV
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ signups_30d: signups, activity_30d: activity }, null, 2)],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `admin-timeseries-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 ml-1" /> סדרות זמן בלבד
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
