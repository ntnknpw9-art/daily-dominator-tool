import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { Loader2, Sparkles, Droplets, Moon, Apple, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { DayOfWeek, ALL_DAYS, WorkoutDetail } from '@/types/task';

interface PlanScheduleItem {
  day: DayOfWeek;
  focus: string;
  description: string;
}

interface ExtractedPlan {
  water_liters?: number;
  sleep_hours?: number;
  nutrition?: { calories?: number; protein?: number; carbs?: number; fat?: number };
  training?: {
    days_per_week?: number;
    split_type?: string;
    schedule?: PlanScheduleItem[];
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  analysisText?: string;
  initialPlan?: ExtractedPlan;
}

const ApplyPlanDialog = ({ open, onOpenChange, analysisText, initialPlan }: Props) => {
  const { user } = useAuth();
  const { addTask, deleteTask, tasks } = useTaskContext();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState<ExtractedPlan | null>(null);

  // Toggles
  const [applyTargets, setApplyTargets] = useState(true);
  const [applyNutrition, setApplyNutrition] = useState(true);
  const [applyTraining, setApplyTraining] = useState(true);
  const [trainingTime, setTrainingTime] = useState('17:00');
  const [trainingEnd, setTrainingEnd] = useState('18:30');

  // Existing training tasks + mode (new / replace / merge)
  const existingTraining = tasks.filter(t => t.category === 'כושר');
  const [trainingMode, setTrainingMode] = useState<'new' | 'replace' | 'merge'>('new');
  const [targetTaskId, setTargetTaskId] = useState<string>('');
  const [dayRemap, setDayRemap] = useState<Record<number, DayOfWeek>>({});

  // Reset remap when plan changes
  useEffect(() => { setDayRemap({}); }, [plan]);

  useEffect(() => {
    if (existingTraining.length > 0 && !targetTaskId) {
      setTargetTaskId(existingTraining[0].id);
      setTrainingMode('merge');
    }
  }, [existingTraining.length]);

  useEffect(() => {
    if (!open) return;
    if (initialPlan) {
      setPlan(initialPlan);
      setLoading(false);
      return;
    }
    if (!analysisText) return;
    setPlan(null);
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ai-plan-extract', {
          body: { analysisText },
        });
        if (error) throw error;
        setPlan(data?.plan || {});
      } catch (e) {
        console.error(e);
        toast.error('שגיאה בחילוץ התוכנית');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, analysisText]);

  const apply = async () => {
    if (!user || !plan) return;
    setApplying(true);
    try {
      // 1. Targets
      if (applyTargets && (plan.water_liters || plan.sleep_hours)) {
        await supabase.from('user_targets').upsert({
          user_id: user.id,
          water_liters: plan.water_liters ?? 2,
          sleep_hours: plan.sleep_hours ?? 7,
          training_days_per_week: plan.training?.days_per_week ?? 3,
        }, { onConflict: 'user_id' });
      }

      // 2. Nutrition profile
      if (applyNutrition && plan.nutrition?.calories) {
        const { data: existing } = await supabase
          .from('nutrition_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const payload: any = {
          user_id: user.id,
          daily_calories: plan.nutrition.calories,
          daily_protein: plan.nutrition.protein ?? 0,
          daily_carbs: plan.nutrition.carbs ?? 0,
          daily_fat: plan.nutrition.fat ?? 0,
        };

        if (existing) {
          await supabase.from('nutrition_profiles').update(payload).eq('user_id', user.id);
        } else {
          await supabase.from('nutrition_profiles').insert({
            ...payload,
            age: 25, gender: 'male', height: 175, weight: 75,
            activity_level: 'moderate', goal: 'maintain',
          });
        }
      }

      // 3. Training task with workout details per day
      if (applyTraining && plan.training?.schedule?.length) {
        const effectiveSchedule = plan.training.schedule.map((s, i) => ({
          ...s,
          day: (dayRemap[i] ?? s.day) as DayOfWeek,
        }));
        const newDays = effectiveSchedule.map(s => s.day).filter(Boolean) as DayOfWeek[];
        const newDetails: WorkoutDetail[] = effectiveSchedule.map(s => ({
          day: s.day,
          description: s.focus ? `${s.focus} — ${s.description}` : s.description,
        }));
        const today = new Date().toISOString().split('T')[0];
        const existing = existingTraining.find(t => t.id === targetTaskId);

        if (trainingMode === 'replace' && existing) {
          await deleteTask(existing.id);
          await addTask({
            name: existing.name,
            meaning: plan.training.split_type ? `תוכנית ${plan.training.split_type}` : 'אימון מותאם AI',
            startTime: trainingTime,
            endTime: trainingEnd,
            startDate: today,
            endDate: '2099-12-31',
            category: 'כושר',
            days: newDays,
            workoutDetails: newDetails,
          });
        } else if (trainingMode === 'merge' && existing) {
          // Merge: combine days, override descriptions for new days
          const mergedDays = Array.from(new Set([...existing.days, ...newDays])) as DayOfWeek[];
          const detailMap = new Map<DayOfWeek, string>();
          (existing.workoutDetails || []).forEach(d => detailMap.set(d.day, d.description));
          newDetails.forEach(d => detailMap.set(d.day, d.description));
          const mergedDetails: WorkoutDetail[] = Array.from(detailMap.entries()).map(([day, description]) => ({ day, description }));
          await deleteTask(existing.id);
          await addTask({
            name: existing.name,
            meaning: existing.meaning || (plan.training.split_type ? `תוכנית ${plan.training.split_type}` : 'אימון מותאם AI'),
            startTime: existing.startTime,
            endTime: existing.endTime,
            startDate: existing.startDate,
            endDate: existing.endDate,
            category: 'כושר',
            days: mergedDays,
            workoutDetails: mergedDetails,
          });
        } else {
          await addTask({
            name: 'אימון',
            meaning: plan.training.split_type ? `תוכנית ${plan.training.split_type}` : 'אימון מותאם AI',
            startTime: trainingTime,
            endTime: trainingEnd,
            startDate: today,
            endDate: '2099-12-31',
            category: 'כושר',
            days: newDays,
            workoutDetails: newDetails,
          });
        }
      }

      // Save to history
      try {
        const summary: string[] = [];
        if (applyTargets && (plan.water_liters || plan.sleep_hours)) summary.push(`💧${plan.water_liters || '-'}L · 😴${plan.sleep_hours || '-'}h`);
        if (applyNutrition && plan.nutrition?.calories) summary.push(`🍎${plan.nutrition.calories}kcal`);
        if (applyTraining && plan.training?.schedule?.length) summary.push(`💪${plan.training.schedule.length} ימי אימון`);
        await supabase.from('applied_plans').insert({
          user_id: user.id,
          plan: plan as any,
          summary: summary.join(' · '),
          applied_targets: applyTargets,
          applied_nutrition: applyNutrition,
          applied_training: applyTraining,
        });
      } catch (e) { console.error('history save failed', e); }

      toast.success('🔥 התוכנית הוחלה בהצלחה!');
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('שגיאה בהחלת התוכנית');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            החלת התוכנית באפליקציה
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin ml-2" />
            מחלץ את התוכנית...
          </div>
        )}

        {!loading && plan && (
          <div className="space-y-4">
            {/* Targets */}
            {(plan.water_liters || plan.sleep_hours) && (
              <div className="bg-muted/30 border border-border/30 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={applyTargets} onCheckedChange={v => setApplyTargets(!!v)} />
                  <span className="font-semibold">יעדים יומיים</span>
                </label>
                <div className="text-sm text-muted-foreground space-y-1 pr-6">
                  {plan.water_liters && (
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      מים: <strong className="text-foreground">{plan.water_liters} ליטר</strong> ביום
                    </div>
                  )}
                  {plan.sleep_hours && (
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      שינה: <strong className="text-foreground">{plan.sleep_hours} שעות</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Nutrition */}
            {plan.nutrition?.calories ? (
              <div className="bg-muted/30 border border-border/30 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={applyNutrition} onCheckedChange={v => setApplyNutrition(!!v)} />
                  <Apple className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">פרופיל תזונה</span>
                </label>
                <div className="text-sm text-muted-foreground pr-6 grid grid-cols-2 gap-1">
                  <div>קלוריות: <strong className="text-foreground">{plan.nutrition.calories}</strong></div>
                  <div>חלבון: <strong className="text-foreground">{plan.nutrition.protein}g</strong></div>
                  <div>פחמימות: <strong className="text-foreground">{plan.nutrition.carbs}g</strong></div>
                  <div>שומן: <strong className="text-foreground">{plan.nutrition.fat}g</strong></div>
                </div>
              </div>
            ) : null}

            {/* Training */}
            {plan.training?.schedule?.length ? (
              <div className="bg-muted/30 border border-border/30 rounded-lg p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={applyTraining} onCheckedChange={v => setApplyTraining(!!v)} />
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="font-semibold">משימת אימון ({plan.training.schedule.length} ימים)</span>
                </label>
                {applyTraining && (
                  <div className="space-y-3 pr-6">
                    {existingTraining.length > 0 && (
                      <div className="space-y-2 bg-background/40 rounded p-2 border border-border/30">
                        <Label className="text-xs font-semibold">נמצאו {existingTraining.length} משימות אימון קיימות</Label>
                        <RadioGroup value={trainingMode} onValueChange={(v) => setTrainingMode(v as any)} className="gap-1.5">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <RadioGroupItem value="merge" id="tm-merge" />
                            <span>מיזוג — שמור ימים קיימים, הוסף/עדכן מהתוכנית</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <RadioGroupItem value="replace" id="tm-replace" />
                            <span>החלפה — מחק את האימון הקיים והחלף בחדש</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <RadioGroupItem value="new" id="tm-new" />
                            <span>צור משימה חדשה נפרדת</span>
                          </label>
                        </RadioGroup>
                        {(trainingMode === 'merge' || trainingMode === 'replace') && existingTraining.length > 1 && (
                          <Select value={targetTaskId} onValueChange={setTargetTaskId}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {existingTraining.map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                    {(trainingMode === 'new' || existingTraining.length === 0) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">שעת התחלה</Label>
                          <Input type="time" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">שעת סיום</Label>
                          <Input type="time" value={trainingEnd} onChange={e => setTrainingEnd(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2 pr-6 max-h-80 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-accent">פירוט אימון לפי יום</span>
                    <span className="text-[10px] text-muted-foreground">ניתן לשנות יום</span>
                  </div>
                  {plan.training.schedule.map((s, i) => {
                    const currentDay = dayRemap[i] ?? s.day;
                    const exercises = (s.description || '').split(/\s*,\s*/).filter(Boolean);
                    return (
                      <div key={i} className="rounded-lg border border-border/40 bg-background/50 p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <Select
                              value={currentDay}
                              onValueChange={(v) => setDayRemap(prev => ({ ...prev, [i]: v as DayOfWeek }))}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs font-black"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {ALL_DAYS.map(d => (
                                  <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {s.focus && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                              {s.focus}
                            </span>
                          )}
                        </div>
                        <ul className="space-y-1">
                          {exercises.map((ex, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                              <span className="mt-1.5 h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={applying}>
                ביטול
              </Button>
              <Button onClick={apply} disabled={applying} className="flex-1">
                {applying ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> מחיל...</> : '🔥 החל הכל'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ApplyPlanDialog;
