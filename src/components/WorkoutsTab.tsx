import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Weight, Flame, ChevronRight, Plus, Minus, Check, Timer, TrendingUp, History, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ParsedDay, ParsedExercise, parseAllDays } from '@/lib/workoutParser';
import { Task } from '@/types/task';
import { getTodayStr, getHebrewDayFromDate, getNowInIsrael } from '@/lib/dateUtils';
import { toast } from 'sonner';

type SetLog = { reps: string; weight: string; done: boolean };

interface PreviousSet { reps: number | null; weight: number | null }

const ExerciseCard = ({
  ex, idx, previous, logs, onChange,
}: {
  ex: ParsedExercise;
  idx: number;
  previous?: PreviousSet[];
  logs: SetLog[];
  onChange: (logs: SetLog[]) => void;
}) => {
  const update = (i: number, field: 'reps' | 'weight', val: string) =>
    onChange(logs.map((l, ix) => ix === i ? { ...l, [field]: val } : l));
  const toggleDone = (i: number) =>
    onChange(logs.map((l, ix) => ix === i ? { ...l, done: !l.done } : l));
  const bump = (i: number, field: 'reps' | 'weight', delta: number) => {
    const cur = parseFloat(logs[i][field]) || 0;
    update(i, field, Math.max(0, cur + delta).toString());
  };
  const doneCount = logs.filter(l => l.done).length;
  const allDone = doneCount === ex.sets;
  const repsLabel = ex.repsMin === ex.repsMax ? `${ex.repsMin}` : `${ex.repsMin}-${ex.repsMax}`;

  return (
    <div className={`glass-card p-4 space-y-3 transition-all ${allDone ? 'border-success/50 shadow-[0_0_24px_-8px_hsl(var(--success)/0.5)]' : 'border-border/40'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center">{idx + 1}</span>
            <h3 className="font-black text-base">{ex.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground font-medium">{ex.sets} סטים × {repsLabel}</span>
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">RIR {ex.rir}</span>
            {ex.weighted
              ? <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold flex items-center gap-1"><Weight className="w-3 h-3" /> משקל</span>
              : <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">משקל גוף</span>}
          </div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-black">{doneCount}<span className="text-sm text-muted-foreground">/{ex.sets}</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">סטים</div>
        </div>
      </div>

      <div className="h-1 bg-secondary/60 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-l from-primary to-accent rounded-full transition-all duration-500" style={{ width: `${(doneCount / ex.sets) * 100}%` }} />
      </div>

      <div className={`grid ${ex.weighted ? 'grid-cols-[36px_1fr_1fr_40px]' : 'grid-cols-[36px_1fr_40px]'} gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1`}>
        <div className="text-center">סט</div>
        {ex.weighted && <div className="text-center">ק"ג</div>}
        <div className="text-center">חזרות</div>
        <div />
      </div>

      <div className="space-y-1.5">
        {logs.map((log, i) => {
          const prev = previous?.[i];
          return (
            <div key={i} className={`grid ${ex.weighted ? 'grid-cols-[36px_1fr_1fr_40px]' : 'grid-cols-[36px_1fr_40px]'} gap-2 items-center p-1.5 rounded-lg transition-all ${log.done ? 'bg-success/10 border border-success/30' : 'bg-secondary/40 border border-transparent'}`}>
              <div className="text-center font-black text-sm text-muted-foreground">{i + 1}</div>
              {ex.weighted && (
                <div className="relative">
                  <input type="number" inputMode="decimal" value={log.weight} onChange={e => update(i, 'weight', e.target.value)}
                    placeholder={prev?.weight != null ? `${prev.weight}` : '0'}
                    className="w-full h-10 bg-background/60 border border-border/50 rounded-lg text-center font-black text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/70" />
                  <div className="absolute inset-y-0 left-1 flex flex-col gap-px justify-center">
                    <button onClick={() => bump(i, 'weight', 2.5)} className="w-5 h-4 rounded bg-primary/15 text-primary text-[10px] flex items-center justify-center active:scale-90"><Plus className="w-2.5 h-2.5" /></button>
                    <button onClick={() => bump(i, 'weight', -2.5)} className="w-5 h-4 rounded bg-primary/15 text-primary text-[10px] flex items-center justify-center active:scale-90"><Minus className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
              )}
              <div className="relative">
                <input type="number" inputMode="numeric" value={log.reps} onChange={e => update(i, 'reps', e.target.value)}
                  placeholder={prev?.reps != null ? `${prev.reps}` : `${ex.repsMin}`}
                  className="w-full h-10 bg-background/60 border border-border/50 rounded-lg text-center font-black text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted-foreground/70" />
                <div className="absolute inset-y-0 left-1 flex flex-col gap-px justify-center">
                  <button onClick={() => bump(i, 'reps', 1)} className="w-5 h-4 rounded bg-accent/15 text-accent text-[10px] flex items-center justify-center active:scale-90"><Plus className="w-2.5 h-2.5" /></button>
                  <button onClick={() => bump(i, 'reps', -1)} className="w-5 h-4 rounded bg-accent/15 text-accent text-[10px] flex items-center justify-center active:scale-90"><Minus className="w-2.5 h-2.5" /></button>
                </div>
              </div>
              <button onClick={() => toggleDone(i)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${log.done ? 'bg-success text-success-foreground shadow-[0_0_12px_hsl(var(--success)/0.6)]' : 'bg-secondary border border-border/50 text-muted-foreground hover:border-primary'}`}>
                <Check className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      {previous && previous.some(p => p.reps != null) && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-2 py-1.5">
          <TrendingUp className="w-3 h-3 text-accent" />
          <span className="font-bold text-accent">פעם קודמת:</span>
          <span>
            {previous.map((s, i) => (
              <span key={i}>
                {s.reps == null ? '—' : ex.weighted ? `${s.weight ?? '?'}ק"ג×${s.reps}` : `${s.reps}`}
                {i < previous.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

const SESSION_KEY = 'dd_active_workout';

type PersistedSession = {
  key: string;
  startedAt: number;
  logsByEx: SetLog[][];
};

const readPersisted = (): PersistedSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedSession;
    if (!p?.key || !Array.isArray(p.logsByEx)) return null;
    // Expire after 8 hours
    if (Date.now() - p.startedAt > 8 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return p;
  } catch { return null; }
};

const clearPersisted = () => { try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ } };

const ActiveSession = ({
  task, day, sessionKey, onExit,
}: { task: Task; day: ParsedDay; sessionKey: string; onExit: () => void }) => {
  const { user } = useAuth();
  const [logsByEx, setLogsByEx] = useState<SetLog[][]>(() => {
    const fresh = day.exercises.map(ex => Array.from({ length: ex.sets }, () => ({ reps: '', weight: '', done: false })));
    const p = readPersisted();
    if (p && p.key === sessionKey && p.logsByEx.length === fresh.length) {
      return fresh.map((sets, i) => sets.map((s, j) => p.logsByEx[i]?.[j] ?? s));
    }
    return fresh;
  });
  const [prevByEx, setPrevByEx] = useState<Record<string, PreviousSet[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const startRef = useState(() => {
    const p = readPersisted();
    return p && p.key === sessionKey ? p.startedAt : Date.now();
  })[0];

  // Persist session state (survives app backgrounding / reload)
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ key: sessionKey, startedAt: startRef, logsByEx }));
    } catch { /* noop */ }
  }, [sessionKey, startRef, logsByEx]);

  useEffect(() => {
    const tick = () => setElapsed(Math.floor((Date.now() - startRef) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [startRef]);


  // Load previous set data
  useEffect(() => {
    if (!user) return;
    (async () => {
      const names = day.exercises.map(e => e.name);
      const { data } = await supabase
        .from('workout_sets')
        .select('exercise_name, set_number, reps, weight, created_at, session_id')
        .eq('user_id', user.id)
        .in('exercise_name', names)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!data) return;
      const map: Record<string, PreviousSet[]> = {};
      // For each exercise pick the latest session_id sets
      for (const name of names) {
        const exRows = data.filter(r => r.exercise_name === name);
        if (!exRows.length) continue;
        const latestSessionId = exRows[0].session_id;
        const sets = exRows
          .filter(r => r.session_id === latestSessionId)
          .sort((a, b) => a.set_number - b.set_number)
          .map(r => ({ reps: r.reps, weight: r.weight != null ? Number(r.weight) : null }));
        map[name] = sets;
      }
      setPrevByEx(map);
    })();
  }, [user, day]);

  const totalSets = day.exercises.reduce((a, e) => a + e.sets, 0);
  const doneSets = logsByEx.reduce((a, l) => a + l.filter(s => s.done).length, 0);
  const progress = totalSets ? Math.round((doneSets / totalSets) * 100) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  const save = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const todayStr = getTodayStr();
      let totalVolume = 0;
      let totalDone = 0;
      const rows: any[] = [];
      day.exercises.forEach((ex, exIdx) => {
        logsByEx[exIdx].forEach((s, i) => {
          if (!s.done && !s.reps && !s.weight) return;
          const reps = parseInt(s.reps) || 0;
          const weight = parseFloat(s.weight) || 0;
          if (s.done) totalDone++;
          if (ex.weighted) totalVolume += reps * weight;
          rows.push({
            user_id: user.id,
            exercise_name: ex.name,
            exercise_order: exIdx,
            set_number: i + 1,
            reps: reps || null,
            weight: ex.weighted ? (weight || null) : null,
            rir: ex.rir,
            weighted: ex.weighted,
            reps_target_min: ex.repsMin,
            reps_target_max: ex.repsMax,
          });
        });
      });

      const { data: sess, error: sessErr } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          task_id: task.id,
          day_name: day.day,
          focus: day.focus || null,
          session_date: todayStr,
          ended_at: new Date().toISOString(),
          duration_seconds: elapsed,
          total_volume: totalVolume,
          total_sets: totalDone,
        })
        .select('id')
        .single();
      if (sessErr) throw sessErr;

      if (rows.length) {
        const withSession = rows.map(r => ({ ...r, session_id: sess.id }));
        const { error: setsErr } = await supabase.from('workout_sets').insert(withSession);
        if (setsErr) throw setsErr;
      }

      toast.success('האימון נשמר! 💪');
      clearPersisted();
      onExit();

    } catch (e: any) {
      toast.error(e.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="glass-card p-4 bg-gradient-to-l from-primary/10 via-card to-card border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">{task.name} · {day.day}</div>
            <h2 className="text-xl font-black">{day.focus || 'אימון פעיל'}</h2>
          </div>
          <div className="flex items-center gap-1 text-accent">
            <Timer className="w-4 h-4" />
            <span className="font-black text-lg tabular-nums">{mm}:{ss}</span>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">{day.exercises.length} תרגילים · {doneSets}/{totalSets} סטים</span>
            <span className="font-black text-primary">{progress}%</span>
          </div>
          <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-l from-primary to-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {day.exercises.map((ex, i) => (
          <ExerciseCard
            key={i}
            ex={ex}
            idx={i}
            previous={prevByEx[ex.name]}
            logs={logsByEx[i]}
            onChange={(logs) => setLogsByEx(prev => prev.map((l, ix) => ix === i ? logs : l))}
          />
        ))}
      </div>

      <div className="flex gap-2 sticky bottom-24 sm:bottom-4 z-30">
        <Button variant="outline" className="flex-1" onClick={onExit}>בטל</Button>
        <Button onClick={save} disabled={saving} className="flex-[2] h-12 font-black bg-gradient-to-l from-primary to-primary/80 hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)]">
          {saving ? 'שומר...' : '🔥 סיים ושמור'}
        </Button>
      </div>
    </div>
  );
};

interface HistoryRow {
  id: string;
  session_date: string;
  focus: string | null;
  day_name: string | null;
  total_sets: number;
  total_volume: number;
  duration_seconds: number;
}

const WorkoutsTab = () => {
  const { tasks } = useTaskContext();
  const { user } = useAuth();
  const [activeKey, setActiveKey] = useState<string | null>(() => readPersisted()?.key ?? null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const workoutTasks = useMemo(() => tasks.filter(t => parseAllDays(t.workoutDetails).length > 0), [tasks]);
  const today = getHebrewDayFromDate(getNowInIsrael());

  useEffect(() => {
    if (!user) return;
    supabase.from('workout_sessions')
      .select('id, session_date, focus, day_name, total_sets, total_volume, duration_seconds')
      .eq('user_id', user.id)
      .order('session_date', { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory((data as any) || []));
  }, [user, activeKey]);

  const exitSession = () => { clearPersisted(); setActiveKey(null); };

  if (activeKey) {
    const [taskId, dayName] = activeKey.split('|');
    const task = tasks.find(t => t.id === taskId);
    const days = task ? parseAllDays(task.workoutDetails) : [];
    const day = days.find(d => d.day === dayName);
    if (!task || !day) {
      // Tasks may still be loading — don't drop a restored session prematurely
      if (tasks.length === 0) return null;
      clearPersisted();
      setActiveKey(null);
      return null;
    }
    return <ActiveSession key={activeKey} task={task} day={day} sessionKey={activeKey} onExit={exitSession} />;
  }


  return (
    <div className="space-y-4" dir="rtl">
      <div className="glass-card p-4 bg-gradient-to-l from-primary/10 to-card border-primary/30">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-black">אימונים</h2>
        </div>
        <p className="text-xs text-muted-foreground">בחר אימון, עקוב אחרי סטים וחזרות. ה-AI לומד ומתאים בהתאם.</p>
      </div>

      {workoutTasks.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3">
          <Flame className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">אין עדיין תוכנית אימונים. בקש מה-AI ליצור מסלול אימונים מלא בצ׳אט.</p>
        </div>
      )}

      {workoutTasks.map(task => {
        const days = parseAllDays(task.workoutDetails);
        return (
          <div key={task.id} className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base">{task.name}</h3>
              <span className="text-[10px] text-muted-foreground">{days.length} ימי אימון</span>
            </div>
            <div className="space-y-2">
              {days.map(d => {
                const isToday = d.day === today;
                return (
                  <button
                    key={d.day}
                    onClick={() => setActiveKey(`${task.id}|${d.day}`)}
                    className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isToday
                        ? 'bg-gradient-to-l from-primary/15 to-card border-primary/40 hover:border-primary'
                        : 'bg-secondary/30 border-border/40 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{d.day}</span>
                        {isToday && <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full">היום</span>}
                        {d.focus && <span className="text-[10px] font-bold text-accent">{d.focus}</span>}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {d.exercises.length} תרגילים · {d.exercises.reduce((a, e) => a + e.sets, 0)} סטים
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {history.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <h3 className="font-black text-sm">היסטוריית אימונים</h3>
          </div>
          <div className="space-y-1.5">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs">
                <div>
                  <div className="font-bold">{h.focus || h.day_name || 'אימון'}</div>
                  <div className="text-[10px] text-muted-foreground">{h.session_date}</div>
                </div>
                <div className="text-left">
                  <div className="font-black text-accent">{h.total_sets} סטים</div>
                  {h.total_volume > 0 && <div className="text-[10px] text-muted-foreground">{Math.round(h.total_volume)} ק"ג נפח</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutsTab;
