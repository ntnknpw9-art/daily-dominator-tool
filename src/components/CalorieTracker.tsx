import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Apple, Plus, Trash2, Calculator, Loader2, UtensilsCrossed, Target, TrendingUp, Calendar, Camera, X, ScanLine, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

interface DailyNeeds {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  bmr: number;
  explanation: string;
}

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  portion: string;
}

interface UserProfile {
  age: string;
  gender: string;
  height: string;
  weight: string;
  activityLevel: string;
  goal: string;
}

interface DayHistory {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

const getTodayDate = () => {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
};

const CalorieTracker = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<'questionnaire' | 'tracker'>('questionnaire');
  const [profile, setProfile] = useState<UserProfile>({
    age: '', gender: '', height: '', weight: '', activityLevel: '', goal: '',
  });
  const [dailyNeeds, setDailyNeeds] = useState<DailyNeeds | null>(null);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const today = getTodayDate();

  // Load profile from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: profileData } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          age: String(profileData.age),
          gender: profileData.gender,
          height: String(profileData.height),
          weight: String(profileData.weight),
          activityLevel: profileData.activity_level,
          goal: profileData.goal,
        });
        if (profileData.daily_calories) {
          setDailyNeeds({
            calories: profileData.daily_calories,
            protein: profileData.daily_protein || 0,
            fat: profileData.daily_fat || 0,
            carbs: profileData.daily_carbs || 0,
            bmr: 0,
            explanation: '',
          });
          setStep('tracker');
        }
      }

      // Load today's food logs
      const { data: logs } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .order('created_at', { ascending: true });

      if (logs && logs.length > 0) {
        setFoods(logs.map(l => ({
          id: l.id,
          name: l.food_name,
          calories: l.calories,
          protein: Number(l.protein),
          fat: Number(l.fat),
          carbs: Number(l.carbs),
          portion: l.portion || '',
        })));
      }

      // Load history (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

      const { data: historyLogs } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('log_date', weekAgoStr)
        .lt('log_date', today)
        .order('log_date', { ascending: true });

      if (historyLogs && historyLogs.length > 0) {
        const grouped: Record<string, DayHistory> = {};
        historyLogs.forEach(l => {
          if (!grouped[l.log_date]) {
            grouped[l.log_date] = { date: l.log_date, calories: 0, protein: 0, fat: 0, carbs: 0 };
          }
          grouped[l.log_date].calories += l.calories;
          grouped[l.log_date].protein += Number(l.protein);
          grouped[l.log_date].fat += Number(l.fat);
          grouped[l.log_date].carbs += Number(l.carbs);
        });
        setHistory(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
      }
    };
    load();
  }, [user, today]);

  const calculateNeeds = async () => {
    if (!profile.age || !profile.gender || !profile.height || !profile.weight || !profile.activityLevel || !profile.goal) {
      toast.error('אנא מלא את כל השדות');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calorie-tracker', {
        body: { type: 'calculate_needs', data: profile },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setDailyNeeds(data);

      // Save profile to DB
      if (user) {
        await supabase.from('nutrition_profiles').upsert({
          user_id: user.id,
          age: parseInt(profile.age),
          gender: profile.gender,
          height: parseFloat(profile.height),
          weight: parseFloat(profile.weight),
          activity_level: profile.activityLevel,
          goal: profile.goal,
          daily_calories: data.calories,
          daily_protein: data.protein,
          daily_fat: data.fat,
          daily_carbs: data.carbs,
        }, { onConflict: 'user_id' });
      }

      setStep('tracker');
      toast.success('היעדים היומיים חושבו בהצלחה!');
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בחישוב');
    } finally {
      setLoading(false);
    }
  };

  const analyzeFood = async () => {
    if (!foodInput.trim()) return;
    setAnalyzingFood(true);
    try {
      const { data, error } = await supabase.functions.invoke('calorie-tracker', {
        body: { type: 'analyze_food', data: { foodDescription: foodInput } },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Save to DB
      if (user) {
        const { data: inserted, error: insertErr } = await supabase.from('nutrition_logs').insert({
          user_id: user.id,
          log_date: today,
          food_name: data.name || foodInput,
          calories: data.calories || 0,
          protein: data.protein || 0,
          fat: data.fat || 0,
          carbs: data.carbs || 0,
          portion: data.portion || '',
        }).select().single();

        if (insertErr) throw insertErr;

        setFoods(prev => [...prev, {
          id: inserted.id,
          name: inserted.food_name,
          calories: inserted.calories,
          protein: Number(inserted.protein),
          fat: Number(inserted.fat),
          carbs: Number(inserted.carbs),
          portion: inserted.portion || '',
        }]);
      } else {
        setFoods(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
      }

      setFoodInput('');
      toast.success(`${data.name} נוסף!`);
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בניתוח מאכל');
    } finally {
      setAnalyzingFood(false);
    }
  };

  const removeFood = async (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
    if (user) {
      await supabase.from('nutrition_logs').delete().eq('id', id).eq('user_id', user.id);
    }
  };

  const totals = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories,
      protein: acc.protein + f.protein,
      fat: acc.fat + f.fat,
      carbs: acc.carbs + f.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const getProgress = (current: number, target: number) =>
    Math.min(100, Math.round((current / target) * 100));

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (step === 'questionnaire') {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            שאלון פרופיל תזונתי
          </CardTitle>
          <p className="text-sm text-muted-foreground">מלא את הפרטים כדי לחשב את הצריכה היומית המומלצת</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>גיל</Label>
              <Input type="number" placeholder="25" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>מין</Label>
              <Select value={profile.gender} onValueChange={v => setProfile(p => ({ ...p, gender: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">זכר</SelectItem>
                  <SelectItem value="female">נקבה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>גובה (ס"מ)</Label>
              <Input type="number" placeholder="175" value={profile.height} onChange={e => setProfile(p => ({ ...p, height: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>משקל (ק"ג)</Label>
              <Input type="number" placeholder="70" value={profile.weight} onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>רמת פעילות</Label>
            <Select value={profile.activityLevel} onValueChange={v => setProfile(p => ({ ...p, activityLevel: v }))}>
              <SelectTrigger><SelectValue placeholder="בחר רמת פעילות" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">יושבני (ללא פעילות)</SelectItem>
                <SelectItem value="light">קל (1-3 פעמים בשבוע)</SelectItem>
                <SelectItem value="moderate">בינוני (3-5 פעמים בשבוע)</SelectItem>
                <SelectItem value="active">פעיל (6-7 פעמים בשבוע)</SelectItem>
                <SelectItem value="very_active">מאוד פעיל (אימונים כפולים)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>מטרה</Label>
            <Select value={profile.goal} onValueChange={v => setProfile(p => ({ ...p, goal: v }))}>
              <SelectTrigger><SelectValue placeholder="בחר מטרה" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">הרזיה</SelectItem>
                <SelectItem value="maintain">שמירה על משקל</SelectItem>
                <SelectItem value="gain">עלייה במשקל / בניית שריר</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={calculateNeeds} disabled={loading} className="w-full">
            {loading ? (<><Loader2 className="w-4 h-4 ml-2 animate-spin" />מחשב...</>) : (<><Target className="w-4 h-4 ml-2" />חשב יעדים יומיים</>)}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {dailyNeeds && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                היעדים היומיים שלך
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="text-xs">
                  <TrendingUp className="w-3 h-3 ml-1" />
                  היסטוריה
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep('questionnaire')} className="text-xs">
                  עדכן פרופיל
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">קלוריות</span>
                <span className="font-bold">{totals.calories} / {dailyNeeds.calories}</span>
              </div>
              <Progress value={getProgress(totals.calories, dailyNeeds.calories)} className="h-3" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">חלבון</p>
                <p className="font-bold text-sm text-blue-400">{totals.protein}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.protein}g</p>
                <Progress value={getProgress(totals.protein, dailyNeeds.protein)} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">שומן</p>
                <p className="font-bold text-sm text-yellow-400">{totals.fat}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.fat}g</p>
                <Progress value={getProgress(totals.fat, dailyNeeds.fat)} className="h-1.5 mt-2" />
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">פחמימות</p>
                <p className="font-bold text-sm text-green-400">{totals.carbs}g</p>
                <p className="text-xs text-muted-foreground">/ {dailyNeeds.carbs}g</p>
                <Progress value={getProgress(totals.carbs, dailyNeeds.carbs)} className="h-1.5 mt-2" />
              </div>
            </div>
            {dailyNeeds.explanation && (
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">{dailyNeeds.explanation}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              היסטוריה - 7 ימים אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map(day => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm font-medium">{formatDate(day.date)}</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-primary font-medium">{day.calories} קל׳</span>
                    <span className="text-blue-400">{Math.round(day.protein)}g ח׳</span>
                    <span className="text-yellow-400">{Math.round(day.fat)}g ש׳</span>
                    <span className="text-green-400">{Math.round(day.carbs)}g פ׳</span>
                  </div>
                  {dailyNeeds && (
                    <div className="w-16">
                      <Progress value={getProgress(day.calories, dailyNeeds.calories)} className="h-1.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showHistory && history.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            אין היסטוריה עדיין. התחל לתעד את האוכל שלך!
          </CardContent>
        </Card>
      )}

      {/* Add food */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            הוסף מאכל
          </CardTitle>
          <p className="text-xs text-muted-foreground">תאר את מה שאכלת וה-AI ינתח את הערכים התזונתיים</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder='לדוגמא: "חזה עוף 200 גרם עם אורז"'
              value={foodInput}
              onChange={e => setFoodInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeFood()}
              disabled={analyzingFood}
            />
            <Button onClick={analyzeFood} disabled={analyzingFood || !foodInput.trim()} size="icon" className="shrink-0">
              {analyzingFood ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Food log */}
      {foods.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="w-5 h-5 text-green-400" />
              מה אכלת היום ({foods.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {foods.map(food => (
                <div key={food.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all animate-fade-in">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{food.portion}</p>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="text-primary font-medium">{food.calories} קל׳</span>
                    <span className="text-blue-400">{food.protein}g ח׳</span>
                    <span className="text-yellow-400">{food.fat}g ש׳</span>
                    <span className="text-green-400">{food.carbs}g פ׳</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFood(food.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex justify-between text-sm font-medium">
              <span>סה"כ</span>
              <div className="flex gap-3">
                <span className="text-primary">{totals.calories} קל׳</span>
                <span className="text-blue-400">{totals.protein}g ח׳</span>
                <span className="text-yellow-400">{totals.fat}g ש׳</span>
                <span className="text-green-400">{totals.carbs}g פ׳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalorieTracker;
