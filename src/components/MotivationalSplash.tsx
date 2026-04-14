import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useTaskContext } from '@/context/TaskContext';
import { ChevronLeft } from 'lucide-react';

const QUOTES = [
  'המשמעת היא הגשר בין מטרות להישגים.',
  'כל יום הוא הזדמנות חדשה להיות גרסה טובה יותר.',
  'הכאב הוא זמני. ההישג הוא לנצח.',
  'אל תספור את הימים. תגרום לימים לספור.',
  'ההבדל בין רגיל למיוחד הוא קצת יותר מאמץ.',
  'אתה לא צריך להיות מושלם. אתה צריך להיות עקבי.',
  'הגדולה לא מגיעה מנוחה. היא מגיעה ממאמץ.',
  'תתחיל איפה שאתה. תשתמש במה שיש לך. תעשה את מה שאתה יכול.',
];

const MotivationalSplash = ({ onDismiss }: { onDismiss: () => void }) => {
  const { user } = useAuth();
  const { tasks } = useTaskContext();
  const [stats, setStats] = useState({ streak: 0, xp: 0, level: 1, todayTasks: 0, completedToday: 0 });
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date().getDay()];

    const [{ data: userStats }, { data: completions }] = await Promise.all([
      supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('task_completions').select('*').eq('user_id', user.id).eq('completion_date', today),
    ]);

    const todayTasks = tasks.filter(t => {
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      const now = new Date(today);
      return now >= start && now <= end && t.days.includes(dayName);
    });

    setStats({
      streak: userStats?.current_streak || 0,
      xp: userStats?.xp || 0,
      level: userStats?.level || 1,
      todayTasks: todayTasks.length,
      completedToday: completions?.filter(c => c.completed).length || 0,
    });
  };

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : hour < 21 ? 'ערב טוב' : 'לילה טוב';
  const emoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : hour < 21 ? '🌆' : '🌙';

  const nextTask = tasks.find(t => {
    const dayName = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][new Date().getDay()];
    return t.days.includes(dayName);
  });

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center px-6 max-w-md space-y-8 animate-scale-in">
        {/* Greeting */}
        <div>
          <div className="text-5xl mb-3">{emoji}</div>
          <h1 className="text-3xl font-bold">{greeting}</h1>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.streak}</div>
            <div className="text-[10px] text-muted-foreground">🔥 סטריק</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.level}</div>
            <div className="text-[10px] text-muted-foreground">⭐ רמה</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.xp}</div>
            <div className="text-[10px] text-muted-foreground">⚡ XP</div>
          </div>
        </div>

        {/* Today's progress */}
        <div className="bg-card/50 rounded-2xl p-4 border border-border/20 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">משימות היום</span>
            <span className="text-sm font-bold">
              {stats.completedToday}/{stats.todayTasks}
            </span>
          </div>
          <div className="w-full bg-muted/30 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${stats.todayTasks > 0 ? (stats.completedToday / stats.todayTasks) * 100 : 0}%`,
              }}
            />
          </div>
          {nextTask && (
            <div className="mt-3 text-xs text-muted-foreground">
              📋 הבא: <span className="text-foreground font-medium">{nextTask.name}</span> ב-{nextTask.startTime}
            </div>
          )}
        </div>

        {/* Quote */}
        <div className="px-4">
          <p className="text-sm text-muted-foreground italic leading-relaxed">"{quote}"</p>
        </div>

        {/* CTA */}
        <Button onClick={dismiss} size="lg" className="w-full max-w-[250px] text-lg">
          💪 בוא נתחיל
        </Button>
      </div>
    </div>
  );
};

export default MotivationalSplash;
