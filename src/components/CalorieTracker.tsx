import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Apple, Plus, Trash2, Calculator, Loader2, UtensilsCrossed, Target } from 'lucide-react';
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

const STORAGE_KEY = 'calorie_tracker_data';
const PROFILE_KEY = 'calorie_tracker_profile';

const CalorieTracker = () => {
  const [step, setStep] = useState<'questionnaire' | 'tracker'>('questionnaire');
  const [profile, setProfile] = useState<UserProfile>({
    age: '', gender: '', height: '', weight: '', activityLevel: '', goal: '',
  });
  const [dailyNeeds, setDailyNeeds] = useState<DailyNeeds | null>(null);
  const [foods, setFoods] = useState<FoodEntry[]>([]);
  const [foodInput, setFoodInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzingFood, setAnalyzingFood] = useState(false);

  // Load saved data
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(PROFILE_KEY);
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed.profile);
        if (parsed.dailyNeeds) {
          setDailyNeeds(parsed.dailyNeeds);
          setStep('tracker');
        }
      }
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const today = new Date().toISOString().split('T')[0];
        if (parsed.date === today) {
          setFoods(parsed.foods);
        }
      }
    } catch {}
  }, []);

  // Save foods
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, foods }));
  }, [foods]);

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
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ profile, dailyNeeds: data }));
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
      setFoods(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
      setFoodInput('');
      toast.success(`${data.name} נוסף!`);
    } catch (e: any) {
      toast.error(e.message || 'שגיאה בניתוח מאכל');
    } finally {
      setAnalyzingFood(false);
    }
  };

  const removeFood = (id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id));
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
              <Input
                type="number"
                placeholder="25"
                value={profile.age}
                onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
              />
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
              <Input
                type="number"
                placeholder="175"
                value={profile.height}
                onChange={e => setProfile(p => ({ ...p, height: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>משקל (ק"ג)</Label>
              <Input
                type="number"
                placeholder="70"
                value={profile.weight}
                onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))}
              />
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
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                מחשב...
              </>
            ) : (
              <>
                <Target className="w-4 h-4 ml-2" />
                חשב יעדים יומיים
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Daily targets summary */}
      {dailyNeeds && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                היעדים היומיים שלך
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('questionnaire')}
                className="text-xs"
              >
                עדכן פרופיל
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calories */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">קלוריות</span>
                <span className="font-bold">
                  {totals.calories} / {dailyNeeds.calories}
                </span>
              </div>
              <Progress
                value={getProgress(totals.calories, dailyNeeds.calories)}
                className="h-3"
              />
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">חלבון</p>
                <p className="font-bold text-sm text-blue-400">
                  {totals.protein}g
                </p>
                <p className="text-xs text-muted-foreground">
                  / {dailyNeeds.protein}g
                </p>
                <Progress
                  value={getProgress(totals.protein, dailyNeeds.protein)}
                  className="h-1.5 mt-2"
                />
              </div>
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">שומן</p>
                <p className="font-bold text-sm text-yellow-400">
                  {totals.fat}g
                </p>
                <p className="text-xs text-muted-foreground">
                  / {dailyNeeds.fat}g
                </p>
                <Progress
                  value={getProgress(totals.fat, dailyNeeds.fat)}
                  className="h-1.5 mt-2"
                />
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">פחמימות</p>
                <p className="font-bold text-sm text-green-400">
                  {totals.carbs}g
                </p>
                <p className="text-xs text-muted-foreground">
                  / {dailyNeeds.carbs}g
                </p>
                <Progress
                  value={getProgress(totals.carbs, dailyNeeds.carbs)}
                  className="h-1.5 mt-2"
                />
              </div>
            </div>

            {dailyNeeds.explanation && (
              <p className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {dailyNeeds.explanation}
              </p>
            )}
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
              {foods.map((food, i) => (
                <div
                  key={food.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all animate-fade-in"
                >
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFood(food.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total bar */}
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
