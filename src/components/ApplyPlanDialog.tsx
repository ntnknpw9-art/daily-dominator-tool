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
  analysisText: string;
}

const ApplyPlanDialog = ({ open, onOpenChange, analysisText }: Props) => {
  const { user } = useAuth();
  const { addTask } = useTaskContext();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState<ExtractedPlan | null>(null);

  // Toggles
  const [applyTargets, setApplyTargets] = useState(true);
  const [applyNutrition, setApplyNutrition] = useState(true);
  const [applyTraining, setApplyTraining] = useState(true);
  const [trainingTime, setTrainingTime] = useState('17:00');
  const [trainingEnd, setTrainingEnd] = useState('18:30');

  useEffect(() => {
    if (!open || !analysisText) return;
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
        const days = plan.training.schedule.map(s => s.day).filter(Boolean) as DayOfWeek[];
        const workoutDetails = plan.training.schedule.map(s => ({
          day: s.day,
          description: s.focus ? `${s.focus} — ${s.description}` : s.description,
        }));
        const today = new Date().toISOString().split('T')[0];
        addTask({
          name: 'אימון',
          meaning: plan.training.split_type ? `תוכנית ${plan.training.split_type}` : 'אימון מותאם AI',
          startTime: trainingTime,
          endTime: trainingEnd,
          startDate: today,
          endDate: '2099-12-31',
          category: 'כושר',
          days,
          workoutDetails,
        });
      }

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
                  <div className="grid grid-cols-2 gap-2 pr-6">
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
                <div className="space-y-1 pr-6 max-h-48 overflow-y-auto">
                  {plan.training.schedule.map((s, i) => (
                    <div key={i} className="text-xs bg-background/50 rounded p-2">
                      <div className="font-bold text-accent">{s.day} — {s.focus}</div>
                      <div className="text-muted-foreground mt-0.5">{s.description}</div>
                    </div>
                  ))}
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
