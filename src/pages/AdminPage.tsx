import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Users, TrendingUp, Activity, CreditCard, CheckCircle2, Dumbbell, BookOpen, Image, MessageSquare } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

type Stats = {
  total_users: number;
  users_last_24h: number;
  users_last_7d: number;
  users_last_30d: number;
  active_subscriptions: number;
  total_subscriptions: number;
  total_tasks: number;
  total_completions: number;
  completions_last_7d: number;
  total_workouts: number;
  workouts_last_7d: number;
  total_journal_entries: number;
  total_progress_photos: number;
  total_ai_messages: number;
  active_users_7d: number;
  active_users_30d: number;
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
        // verify admin
        const { data: roleRows, error: rErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (rErr) throw rErr;
        if (!roleRows) {
          setAuthorized(false);
          return;
        }
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

  const subRate = stats.total_users
    ? ((stats.active_subscriptions / stats.total_users) * 100).toFixed(1)
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
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Users} label="סה״כ משתמשים" value={stats.total_users} hint={`+${stats.users_last_24h} ב-24ש׳`} />
          <StatCard icon={TrendingUp} label="הרשמות 7 ימים" value={stats.users_last_7d} hint={`30 יום: ${stats.users_last_30d}`} accent="text-emerald-500" />
          <StatCard icon={Activity} label="פעילים 7 ימים" value={stats.active_users_7d} hint={`30 יום: ${stats.active_users_30d}`} accent="text-blue-500" />
          <StatCard icon={CreditCard} label="מנויים פעילים" value={stats.active_subscriptions} hint={`${subRate}% מהמשתמשים`} accent="text-amber-500" />
        </div>

        {/* Signups chart */}
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

        {/* Activity chart */}
        <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
          <h2 className="font-semibold mb-3">פעילות יומית — השלמות ומשתמשים פעילים</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} reversed />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="completions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="השלמות" />
                <Bar dataKey="active_users" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="משתמשים פעילים" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Engagement breakdown */}
        <div>
          <h2 className="font-semibold mb-3">פעילות באפליקציה</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon={CheckCircle2} label="סה״כ השלמות משימות" value={stats.total_completions} hint={`7 ימים: ${stats.completions_last_7d}`} />
            <StatCard icon={Dumbbell} label="סה״כ אימונים" value={stats.total_workouts} hint={`7 ימים: ${stats.workouts_last_7d}`} />
            <StatCard icon={MessageSquare} label="הודעות AI" value={stats.total_ai_messages} />
            <StatCard icon={BookOpen} label="רשומות יומן" value={stats.total_journal_entries} />
            <StatCard icon={Image} label="תמונות התקדמות" value={stats.total_progress_photos} />
            <StatCard icon={CreditCard} label="סה״כ מנויים (כולל ישנים)" value={stats.total_subscriptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
