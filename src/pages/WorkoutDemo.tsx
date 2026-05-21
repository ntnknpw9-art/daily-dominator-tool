import { useState } from 'react';
import { Check, Dumbbell, Weight, Flame, ChevronLeft, Plus, Minus, Timer, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SetLog = { reps: string; weight: string; done: boolean };

interface Exercise {
  name: string;
  sets: number;
  repsRange: string;
  rir: number;
  weighted: boolean;
  lastTime?: { reps: number; weight?: number }[];
}

const WEIGHTED_EXERCISES: Exercise[] = [
  { name: 'סקוואט ברבל', sets: 4, repsRange: '6-8', rir: 2, weighted: true, lastTime: [{reps:8,weight:60},{reps:8,weight:60},{reps:7,weight:60},{reps:6,weight:60}] },
  { name: 'לחיצת חזה דמבל', sets: 4, repsRange: '8-12', rir: 2, weighted: true, lastTime: [{reps:12,weight:20},{reps:10,weight:22.5},{reps:8,weight:22.5},{reps:8,weight:22.5}] },
  { name: 'חתירה בכבל', sets: 3, repsRange: '10-12', rir: 2, weighted: true, lastTime: [{reps:12,weight:40},{reps:11,weight:40},{reps:10,weight:40}] },
  { name: 'לחיצת כתפיים דמבל', sets: 3, repsRange: '8-10', rir: 2, weighted: true },
];

const BODYWEIGHT_EXERCISES: Exercise[] = [
  { name: 'שכיבות סמיכה', sets: 4, repsRange: '12-20', rir: 1, weighted: false, lastTime: [{reps:18},{reps:15},{reps:13},{reps:12}] },
  { name: 'מתח (Pull-ups)', sets: 4, repsRange: '5-8', rir: 1, weighted: false, lastTime: [{reps:7},{reps:6},{reps:5},{reps:4}] },
  { name: 'סקוואט גוף', sets: 3, repsRange: '15-25', rir: 2, weighted: false, lastTime: [{reps:25},{reps:22},{reps:20}] },
  { name: 'פלאנק (שניות)', sets: 3, repsRange: '45-60', rir: 0, weighted: false, lastTime: [{reps:60},{reps:55},{reps:45}] },
  { name: 'בטן (Crunches)', sets: 3, repsRange: '15-20', rir: 1, weighted: false },
];

const ExerciseCard = ({ ex, idx }: { ex: Exercise; idx: number }) => {
  const [logs, setLogs] = useState<SetLog[]>(
    Array.from({ length: ex.sets }, () => ({ reps: '', weight: '', done: false }))
  );

  const update = (i: number, field: 'reps' | 'weight', val: string) => {
    setLogs(prev => prev.map((l, ix) => ix === i ? { ...l, [field]: val } : l));
  };
  const toggleDone = (i: number) => {
    setLogs(prev => prev.map((l, ix) => ix === i ? { ...l, done: !l.done } : l));
  };
  const bump = (i: number, field: 'reps' | 'weight', delta: number) => {
    const cur = parseFloat(logs[i][field]) || 0;
    const next = Math.max(0, cur + delta);
    update(i, field, next.toString());
  };

  const doneCount = logs.filter(l => l.done).length;
  const allDone = doneCount === ex.sets;

  return (
    <div className={`glass-card p-4 space-y-3 transition-all ${allDone ? 'border-green-500/50 shadow-[0_0_24px_-8px_hsl(142_71%_45%/0.5)]' : 'border-border/40'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center">{idx + 1}</span>
            <h3 className="font-black text-base">{ex.name}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-secondary/70 text-muted-foreground font-medium">
              {ex.sets} סטים × {ex.repsRange}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
              RIR {ex.rir}
            </span>
            {ex.weighted ? (
              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold flex items-center gap-1">
                <Weight className="w-3 h-3" /> משקל
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-bold">
                משקל גוף
              </span>
            )}
          </div>
        </div>
        <div className="text-left">
          <div className="text-2xl font-black text-foreground">{doneCount}<span className="text-sm text-muted-foreground">/{ex.sets}</span></div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">סטים</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary/60 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-primary to-accent rounded-full transition-all duration-500"
          style={{ width: `${(doneCount / ex.sets) * 100}%` }}
        />
      </div>

      {/* Sets header row */}
      <div className={`grid ${ex.weighted ? 'grid-cols-[36px_1fr_1fr_40px]' : 'grid-cols-[36px_1fr_40px]'} gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-1`}>
        <div className="text-center">סט</div>
        {ex.weighted && <div className="text-center">ק"ג</div>}
        <div className="text-center">חזרות</div>
        <div></div>
      </div>

      {/* Sets rows */}
      <div className="space-y-1.5">
        {logs.map((log, i) => {
          const prev = ex.lastTime?.[i];
          return (
            <div
              key={i}
              className={`grid ${ex.weighted ? 'grid-cols-[36px_1fr_1fr_40px]' : 'grid-cols-[36px_1fr_40px]'} gap-2 items-center p-1.5 rounded-lg transition-all ${
                log.done ? 'bg-green-500/10 border border-green-500/30' : 'bg-secondary/40 border border-transparent'
              }`}
            >
              <div className="text-center font-black text-sm text-muted-foreground">{i + 1}</div>

              {ex.weighted && (
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={log.weight}
                    onChange={e => update(i, 'weight', e.target.value)}
                    placeholder={prev?.weight ? `${prev.weight}` : '0'}
                    className="w-full h-10 bg-background/60 border border-border/50 rounded-lg text-center font-black text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                  />
                  <div className="absolute inset-y-0 left-1 flex flex-col gap-px justify-center">
                    <button onClick={() => bump(i, 'weight', 2.5)} className="w-5 h-4 rounded bg-primary/15 text-primary text-[10px] flex items-center justify-center active:scale-90"><Plus className="w-2.5 h-2.5" /></button>
                    <button onClick={() => bump(i, 'weight', -2.5)} className="w-5 h-4 rounded bg-primary/15 text-primary text-[10px] flex items-center justify-center active:scale-90"><Minus className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={log.reps}
                  onChange={e => update(i, 'reps', e.target.value)}
                  placeholder={prev?.reps ? `${prev.reps}` : '0'}
                  className="w-full h-10 bg-background/60 border border-border/50 rounded-lg text-center font-black text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted-foreground/40"
                />
                <div className="absolute inset-y-0 left-1 flex flex-col gap-px justify-center">
                  <button onClick={() => bump(i, 'reps', 1)} className="w-5 h-4 rounded bg-accent/15 text-accent text-[10px] flex items-center justify-center active:scale-90"><Plus className="w-2.5 h-2.5" /></button>
                  <button onClick={() => bump(i, 'reps', -1)} className="w-5 h-4 rounded bg-accent/15 text-accent text-[10px] flex items-center justify-center active:scale-90"><Minus className="w-2.5 h-2.5" /></button>
                </div>
              </div>

              <button
                onClick={() => toggleDone(i)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                  log.done
                    ? 'bg-green-500 text-white shadow-[0_0_12px_hsl(142_71%_45%/0.6)]'
                    : 'bg-secondary border border-border/50 text-muted-foreground hover:border-primary'
                }`}
              >
                <Check className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Last time hint */}
      {ex.lastTime && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/30 rounded-lg px-2 py-1.5">
          <TrendingUp className="w-3 h-3 text-accent" />
          <span className="font-bold text-accent">פעם קודמת:</span>
          <span>
            {ex.lastTime.map((s, i) => (
              <span key={i}>
                {ex.weighted ? `${s.weight}ק"ג×${s.reps}` : `${s.reps}`}
                {i < ex.lastTime!.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}
    </div>
  );
};

const WorkoutDemo = () => {
  const [mode, setMode] = useState<'weighted' | 'bodyweight'>('weighted');
  const exercises = mode === 'weighted' ? WEIGHTED_EXERCISES : BODYWEIGHT_EXERCISES;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 bg-background/85 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1 text-muted-foreground">
              <ChevronLeft className="w-4 h-4" /> חזור
            </Button>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">תצוגה מקדימה</div>
              <h1 className="text-lg font-black bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">אימון פעיל</h1>
            </div>
            <div className="w-16" />
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-secondary/50 rounded-xl">
            <button
              onClick={() => setMode('weighted')}
              className={`py-2.5 rounded-lg font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                mode === 'weighted' ? 'bg-primary text-primary-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.7)]' : 'text-muted-foreground'
              }`}
            >
              <Dumbbell className="w-4 h-4" /> עם משקולות
            </button>
            <button
              onClick={() => setMode('bodyweight')}
              className={`py-2.5 rounded-lg font-black text-sm flex items-center justify-center gap-1.5 transition-all ${
                mode === 'bodyweight' ? 'bg-accent text-accent-foreground shadow-[0_0_16px_-4px_hsl(var(--accent)/0.7)]' : 'text-muted-foreground'
              }`}
            >
              <Flame className="w-4 h-4" /> משקל גוף
            </button>
          </div>
        </div>
      </div>

      {/* Workout meta */}
      <div className="relative z-10 max-w-md mx-auto px-4 pt-4">
        <div className="glass-card p-4 mb-4 bg-gradient-to-l from-primary/10 via-card to-card border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">יום אימון - שני</div>
              <h2 className="text-xl font-black">
                {mode === 'weighted' ? 'Upper Body — חזה/גב/כתפיים' : 'Full Body — קליסטניקס'}
              </h2>
            </div>
            <div className="flex items-center gap-1 text-accent">
              <Timer className="w-4 h-4" />
              <span className="font-black text-lg">00:00</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> <span className="text-muted-foreground">{exercises.length} תרגילים</span></div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent" /> <span className="text-muted-foreground">{exercises.reduce((a, e) => a + e.sets, 0)} סטים</span></div>
          </div>
        </div>

        {/* Exercises */}
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <ExerciseCard key={`${mode}-${i}`} ex={ex} idx={i} />
          ))}
        </div>

        {/* Finish button */}
        <Button className="w-full mt-5 h-14 text-base font-black bg-gradient-to-l from-primary to-primary/80 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
          🔥 סיים אימון ושמור
        </Button>
      </div>
    </div>
  );
};

export default WorkoutDemo;
