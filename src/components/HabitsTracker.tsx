import { useState, useEffect } from 'react';
import { getTodayStr } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Droplets, Moon, Brain, BookOpen, Dumbbell } from 'lucide-react';

const HABITS = [
  { id: 'water', name: 'שתייה (2 ליטר)', icon: Droplets },
  { id: 'sleep', name: 'שינה (7+ שעות)', icon: Moon },
  { id: 'meditation', name: 'מדיטציה', icon: Brain },
  { id: 'reading', name: 'קריאה', icon: BookOpen },
  { id: 'stretching', name: 'מתיחות', icon: Dumbbell },
];

const HabitsTracker = () => {
  const { user } = useAuth();
  const todayStr = getTodayStr();
  const [todayHabits, setTodayHabits] = useState<Record<string, boolean>>({});
  const [waterTarget, setWaterTarget] = useState(2);
  const [sleepTarget, setSleepTarget] = useState(7);

  const HABITS = [
    { id: 'water', name: `שתייה (${waterTarget} ליטר)`, icon: Droplets },
    { id: 'sleep', name: `שינה (${sleepTarget}+ שעות)`, icon: Moon },
    { id: 'meditation', name: 'מדיטציה', icon: Brain },
    { id: 'reading', name: 'קריאה', icon: BookOpen },
    { id: 'stretching', name: 'מתיחות', icon: Dumbbell },
  ];

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [{ data: habitsData }, { data: targets }] = await Promise.all([
        supabase.from('habits').select('habit_id, completed').eq('user_id', user.id).eq('habit_date', todayStr),
        supabase.from('user_targets').select('water_liters, sleep_hours').eq('user_id', user.id).maybeSingle(),
      ]);
      if (habitsData) {
        const map: Record<string, boolean> = {};
        habitsData.forEach(h => { map[h.habit_id] = h.completed; });
        setTodayHabits(map);
      }
      if (targets) {
        setWaterTarget(Number(targets.water_liters) || 2);
        setSleepTarget(Number(targets.sleep_hours) || 7);
      }
    };
    fetch();
  }, [user, todayStr]);

  const toggleHabit = async (habitId: string) => {
    if (!user) return;
    const newVal = !todayHabits[habitId];
    setTodayHabits(prev => ({ ...prev, [habitId]: newVal }));

    await supabase.from('habits').upsert({
      user_id: user.id,
      habit_date: todayStr,
      habit_id: habitId,
      completed: newVal,
    }, { onConflict: 'user_id,habit_date,habit_id' });
  };

  const completedCount = HABITS.filter(h => todayHabits[h.id]).length;

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">🧘 הרגלים יומיים</h3>
        <span className="text-sm text-muted-foreground">{completedCount}/{HABITS.length}</span>
      </div>
      <div className="space-y-2">
        {HABITS.map(habit => {
          const Icon = habit.icon;
          const done = todayHabits[habit.id];
          return (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                done ? 'bg-success/15 border border-success/30' : 'bg-secondary/30 border border-transparent hover:border-border'
              }`}
            >
              <Icon className={`w-5 h-5 ${done ? 'text-success' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium flex-1 text-right ${done ? 'text-success line-through' : 'text-foreground'}`}>
                {habit.name}
              </span>
              <span className="text-lg">{done ? '✅' : '⬜'}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 progress-bar">
        <div className="progress-fill bg-success" style={{ width: `${(completedCount / HABITS.length) * 100}%` }} />
      </div>
    </div>
  );
};

export default HabitsTracker;
