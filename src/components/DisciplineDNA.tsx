import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Brain } from 'lucide-react';

interface DNAProfile {
  consistency: number;
  morningPower: number;
  eveningPower: number;
  fitness: number;
  study: number;
  discipline: number;
  recovery: number;
  streakAbility: number;
}

const DisciplineDNA = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DNAProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [insights, setInsights] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) analyzeProfile();
  }, [user]);

  useEffect(() => {
    if (profile) drawRadar();
  }, [profile]);

  const analyzeProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch completion data for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const [{ data: completions }, { data: tasks }, { data: stats }] = await Promise.all([
        supabase.from('task_completions').select('*').eq('user_id', user.id).gte('completion_date', dateStr),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      const allTasks = tasks || [];
      const allCompletions = completions || [];
      const totalPossible = Math.max(1, allTasks.length * 30);
      const completedCount = allCompletions.filter(c => c.completed).length;

      // Calculate category scores
      const morningTasks = allTasks.filter(t => {
        const hour = parseInt(t.start_time?.split(':')[0] || '12');
        return hour < 12;
      });
      const eveningTasks = allTasks.filter(t => {
        const hour = parseInt(t.start_time?.split(':')[0] || '12');
        return hour >= 17;
      });
      const fitnessTasks = allTasks.filter(t => t.category === 'ספורט' || t.category === 'אימון');
      const studyTasks = allTasks.filter(t => t.category === 'לימודים');

      const getCompletionRate = (taskIds: string[]) => {
        if (taskIds.length === 0) return 50;
        const completed = allCompletions.filter(c => taskIds.includes(c.task_id) && c.completed).length;
        return Math.min(100, Math.round((completed / Math.max(1, taskIds.length * 30)) * 100));
      };

      const dna: DNAProfile = {
        consistency: Math.min(100, Math.round((completedCount / totalPossible) * 100)),
        morningPower: getCompletionRate(morningTasks.map(t => t.id)),
        eveningPower: getCompletionRate(eveningTasks.map(t => t.id)),
        fitness: getCompletionRate(fitnessTasks.map(t => t.id)),
        study: getCompletionRate(studyTasks.map(t => t.id)),
        discipline: Math.min(100, (stats?.current_streak || 0) * 10),
        recovery: Math.min(100, Math.round(Math.random() * 40 + 40)), // placeholder
        streakAbility: Math.min(100, (stats?.longest_streak || 0) * 8),
      };

      setProfile(dna);

      // Generate title
      const avg = Object.values(dna).reduce((a, b) => a + b, 0) / Object.values(dna).length;
      if (avg >= 80) setTitle('🦁 אריה המשמעת');
      else if (avg >= 60) setTitle('🐺 זאב הרגלים');
      else if (avg >= 40) setTitle('🦊 שועל ערמומי');
      else setTitle('🐣 אפרוח בהתפתחות');

      // Generate insights
      const ins: string[] = [];
      if (dna.morningPower > dna.eveningPower + 20) ins.push('💡 אתה חזק בבוקר — תרכז משימות קשות לפני הצהריים');
      if (dna.eveningPower > dna.morningPower + 20) ins.push('🌙 אתה חיית ערב — תנצל את הלילה');
      if (dna.fitness < 40) ins.push('💪 הספורט שלך צריך חיזוק — תתחיל עם 15 דקות ביום');
      if (dna.streakAbility > 70) ins.push('🔥 יש לך כישרון לסטריקים — תשמור על הרצף!');
      if (dna.consistency > 70) ins.push('⭐ העקביות שלך מדהימה — המשך ככה');
      if (dna.discipline < 30) ins.push('⚠️ צריך לבנות שגרה יומית קבועה');
      if (ins.length === 0) ins.push('📊 תמשיך להשתמש באפליקציה כדי לקבל תובנות מדויקות יותר');
      setInsights(ins);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const drawRadar = () => {
    if (!profile || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 40;
    const labels = ['עקביות', 'בוקר', 'ערב', 'ספורט', 'לימודים', 'משמעת', 'התאוששות', 'סטריק'];
    const values = [
      profile.consistency, profile.morningPower, profile.eveningPower,
      profile.fitness, profile.study, profile.discipline,
      profile.recovery, profile.streakAbility,
    ];
    const sides = labels.length;
    const angle = (2 * Math.PI) / sides;

    ctx.clearRect(0, 0, size, size);

    // Draw grid
    for (let level = 1; level <= 5; level++) {
      ctx.beginPath();
      const r = (radius * level) / 5;
      for (let i = 0; i <= sides; i++) {
        const a = i * angle - Math.PI / 2;
        const x = center + r * Math.cos(a);
        const y = center + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < sides; i++) {
      const a = i * angle - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + radius * Math.cos(a), center + radius * Math.sin(a));
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.stroke();
    }

    // Draw data
    ctx.beginPath();
    values.forEach((v, i) => {
      const a = i * angle - Math.PI / 2;
      const r = (radius * v) / 100;
      const x = center + r * Math.cos(a);
      const y = center + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'hsla(72, 88%, 46%, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'hsl(72, 88%, 46%)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw points and labels
    values.forEach((v, i) => {
      const a = i * angle - Math.PI / 2;
      const r = (radius * v) / 100;
      const x = center + r * Math.cos(a);
      const y = center + r * Math.sin(a);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'hsl(72, 88%, 46%)';
      ctx.fill();

      // Label
      const lx = center + (radius + 25) * Math.cos(a);
      const ly = center + (radius + 25) * Math.sin(a);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px Heebo, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    });
  };

  return (
    <Card className="glass-card border-border/30">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          🧬 DNA משמעת אישי
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 animate-pulse">
            <div className="text-4xl mb-2">🧬</div>
            <p className="text-muted-foreground">מנתח את הפרופיל שלך...</p>
          </div>
        ) : profile ? (
          <>
            <div className="text-center">
              <div className="text-3xl mb-1">{title}</div>
              <p className="text-sm text-muted-foreground">הפרופיל שלך מבוסס על 30 ימים אחרונים</p>
            </div>

            <div className="flex justify-center">
              <canvas ref={canvasRef} width={300} height={300} />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'עקביות', value: profile.consistency },
                { label: 'משמעת', value: profile.discipline },
                { label: 'ספורט', value: profile.fitness },
                { label: 'סטריק', value: profile.streakAbility },
              ].map(s => (
                <div key={s.label} className="text-center bg-muted/20 rounded-lg p-2">
                  <div className="text-lg font-bold text-primary">{s.value}%</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">💡 תובנות:</h4>
              {insights.map((ins, i) => (
                <div key={i} className="text-sm bg-muted/10 rounded-lg px-3 py-2 border border-border/10">
                  {ins}
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={analyzeProfile} className="w-full" size="sm">
              🔄 נתח מחדש
            </Button>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>טוען ניתוח...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DisciplineDNA;
