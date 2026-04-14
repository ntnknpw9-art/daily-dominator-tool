import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Phase = 'work' | 'break' | 'longBreak';

const DURATIONS: Record<Phase, number> = {
  work: 25 * 60,
  break: 5 * 60,
  longBreak: 15 * 60,
};

const LABELS: Record<Phase, string> = {
  work: '💪 עבודה',
  break: '☕ הפסקה',
  longBreak: '🏖️ הפסקה ארוכה',
};

const PomodoroTimer = () => {
  const [phase, setPhase] = useState<Phase>('work');
  const [seconds, setSeconds] = useState(DURATIONS.work);
  const [running, setRunning] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [totalWorkMinutes, setTotalWorkMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    if (!running) { clearTimer(); return; }

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          // Phase complete
          if (phase === 'work') {
            const newRounds = rounds + 1;
            setRounds(newRounds);
            setTotalWorkMinutes(prev => prev + 25);
            const nextPhase = newRounds % 4 === 0 ? 'longBreak' : 'break';
            setPhase(nextPhase);
            return DURATIONS[nextPhase];
          } else {
            setPhase('work');
            return DURATIONS.work;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [running, phase, rounds, clearTimer]);

  const reset = () => {
    clearTimer();
    setRunning(false);
    setPhase('work');
    setSeconds(DURATIONS.work);
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = ((DURATIONS[phase] - seconds) / DURATIONS[phase]) * 100;

  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          ⏱️ טיימר פומודורו
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular timer */}
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="100" cy="100" r="80" fill="none"
                stroke={phase === 'work' ? 'hsl(var(--primary))' : 'hsl(var(--success))'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-foreground font-mono">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </span>
              <span className="text-sm text-muted-foreground mt-1">{LABELS[phase]}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mb-4">
            <Button
              onClick={() => setRunning(!running)}
              variant={running ? 'destructive' : 'default'}
              size="lg"
              className="gap-2"
            >
              {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {running ? 'עצור' : 'התחל'}
            </Button>
            <Button onClick={reset} variant="outline" size="lg">
              <RotateCcw className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm text-muted-foreground">
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{rounds}</div>
              <div>סבבים</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{totalWorkMinutes}</div>
              <div>דקות עבודה</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;
