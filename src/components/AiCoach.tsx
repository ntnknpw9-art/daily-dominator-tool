import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, MessageCircle, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTaskContext } from '@/context/TaskContext';
import { getNowInIsrael, getTodayStr, formatDateHebrew } from '@/lib/dateUtils';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const AiCoach = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tasks, stats, getTotalCompletions, getTodayTasks, getDailyCompletionPercent, getCategoryStats, getFailureAnalysis } = useTaskContext();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    const now = getNowInIsrael();
    const todayStr = getTodayStr();
    const todayTasks = getTodayTasks();
    const completed = todayTasks.filter(t => t.completions[todayStr]);

    // Per-task completion stats over last 7 days
    const taskStats = tasks.map(t => {
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
        dates.push(ds);
      }
      const totalDays = dates.length;
      const completedDays = dates.filter(d => t.completions[d]).length;
      const missedDays = dates.filter(d => !t.completions[d]);
      return {
        name: t.name,
        category: t.category,
        time: `${t.startTime}-${t.endTime}`,
        days: t.days.join(','),
        completionRate: Math.round((completedDays / totalDays) * 100),
        recentMisses: missedDays.length,
      };
    });

    // Daily completion over last 7 days
    const dailyScores: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      const pct = getDailyCompletionPercent(d);
      const dayName = d.toLocaleDateString('he-IL', { weekday: 'short', timeZone: 'Asia/Jerusalem' });
      dailyScores.push(`${dayName} (${formatDateHebrew(ds)}): ${pct}%`);
    }

    // Time-slot analysis
    const timeSlots = { morning: { total: 0, done: 0 }, afternoon: { total: 0, done: 0 }, evening: { total: 0, done: 0 } };
    todayTasks.forEach(t => {
      const hour = parseInt(t.startTime.split(':')[0]);
      const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      timeSlots[slot].total++;
      if (t.completions[todayStr]) timeSlots[slot].done++;
    });

    const categoryStats = getCategoryStats();
    const failureAnalysis = getFailureAnalysis();

    return `📊 סטטיסטיקות מפורטות:

🔥 סטריק נוכחי: ${stats.streak} ימים
⭐ נקודות: ${stats.points}
✅ סה״כ השלמות: ${getTotalCompletions()}

📅 ציוני השלמה יומיים (7 ימים אחרונים):
${dailyScores.join('\n')}

⏰ ביצועים לפי זמן ביום (היום):
- בוקר (עד 12:00): ${timeSlots.morning.done}/${timeSlots.morning.total} הושלמו
- צהריים (12-17): ${timeSlots.afternoon.done}/${timeSlots.afternoon.total} הושלמו  
- ערב (17+): ${timeSlots.evening.done}/${timeSlots.evening.total} הושלמו

📋 פירוט משימות (אחוז השלמה ב-7 ימים):
${taskStats.map(t => `- ${t.name} [${t.category}] ${t.time} | ${t.completionRate}% | פספוסים: ${t.recentMisses}`).join('\n')}

📊 ביצועים לפי קטגוריה:
${categoryStats.map(c => `- ${c.category}: ${c.percent}%`).join('\n')}

❌ משימות עם הכי הרבה פספוסים:
${failureAnalysis.slice(0, 5).map(f => `- ${f.name}: ${f.misses} פספוסים (${f.percent}%)`).join('\n')}

🕐 משימות היום: ${todayTasks.length}, הושלמו: ${completed.length}
${todayTasks.map(t => `- ${t.completions[todayStr] ? '✅' : '⬜'} ${t.name} (${t.startTime}-${t.endTime})`).join('\n')}`;
  };

  const streamResponse = async (allMsgs: Msg[], mode?: string) => {
    setLoading(true);
    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMsgs, context: buildContext(), mode }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה');
      }
      if (!resp.body) throw new Error('No stream');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message || 'שגיאה זמנית. נסה שוב.'}` }]);
    }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    await streamResponse(allMsgs);
  };

  const analyzePerformance = async () => {
    if (loading) return;
    const userMsg: Msg = { role: 'user', content: 'נתח את הביצועים שלי ותן לי פידבק מפורט עם המלצות לשינויים' };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    await streamResponse(allMsgs, 'analyze');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-primary text-primary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[360px] h-[520px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary/10 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">מאמן AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={analyzePerformance}
            disabled={loading}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            נתח ביצועים
          </Button>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-6">
            <Bot className="w-12 h-12 mx-auto mb-3 text-primary/50" />
            <p>היי! אני המאמן האישי שלך 💪</p>
            <p className="mt-1">שאל אותי כל שאלה, או לחץ על <strong>״נתח ביצועים״</strong> לניתוח מעמיק</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
              onClick={analyzePerformance}
              disabled={loading}
            >
              <BarChart3 className="w-4 h-4" />
              נתח את הביצועים שלי
            </Button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              m.role === 'user' ? 'bg-primary/20' : 'bg-accent/20'
            }`}>
              {m.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-accent" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }`}>
              {m.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-accent" />
            </div>
            <div className="bg-muted rounded-xl px-3 py-2 text-sm text-muted-foreground animate-pulse">
              מנתח ביצועים...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="שאל את המאמן..."
          className="flex-1 text-sm"
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AiCoach;
