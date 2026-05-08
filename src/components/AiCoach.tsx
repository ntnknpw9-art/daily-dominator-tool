import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, MessageCircle, BarChart3, Trash2, AlertTriangle, Brain, Skull, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getNowInIsrael, getTodayStr, formatDateHebrew } from '@/lib/dateUtils';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const AI_MODES = [
  { id: 'analyze', label: 'נתח ביצועים', icon: BarChart3, prompt: 'נתח את הביצועים שלי ותן לי פידבק מפורט עם המלצות לשינויים' },
  { id: 'failure_analysis', label: 'למה אני נכשל?', icon: AlertTriangle, prompt: 'נתח את הכישלונות שלי — למה אני מפספס? מה הסיבות האמיתיות?' },
  { id: 'behavior_engine', label: 'AI לומד אותי', icon: Brain, prompt: 'נתח את דפוסי ההתנהגות שלי, זהה נקודות חולשה, והצע שינויי לו"ז אוטומטיים' },
  { id: 'no_mercy', label: 'אין רחמים', icon: Skull, prompt: 'תן לי את האמת. בלי פילטרים. אין תירוצים.' },
  { id: 'nutrition_link', label: 'תזונה × אימון', icon: Apple, prompt: 'נתח את הקשר בין התזונה שלי לביצועים והצע שיפורים' },
];

const AiCoach = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { tasks, stats, getTotalCompletions, getTodayTasks, getDailyCompletionPercent, getCategoryStats, getFailureAnalysis } = useTaskContext();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Load history from DB
  useEffect(() => {
    if (!user || historyLoaded) return;
    supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
        }
        setHistoryLoaded(true);
      });
  }, [user, historyLoaded]);

  const saveMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    if (!user) return;
    supabase.from('ai_chat_messages').insert({ user_id: user.id, role, content }).then();
  }, [user]);

  const clearHistory = useCallback(async () => {
    if (!user) return;
    await supabase.from('ai_chat_messages').delete().eq('user_id', user.id);
    setMessages([]);
  }, [user]);

  const buildContext = () => {
    const now = getNowInIsrael();
    const todayStr = getTodayStr();
    const todayTasks = getTodayTasks();
    const completed = todayTasks.filter(t => t.completions[todayStr]);

    const taskStats = tasks.map(t => {
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }));
      }
      const completedDays = dates.filter(d => t.completions[d]).length;
      return {
        name: t.name, category: t.category,
        time: `${t.startTime}-${t.endTime}`, days: t.days.join(','),
        completionRate: Math.round((completedDays / dates.length) * 100),
        recentMisses: dates.filter(d => !t.completions[d]).length,
      };
    });

    const dailyScores: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      const pct = getDailyCompletionPercent(d);
      const dayName = d.toLocaleDateString('he-IL', { weekday: 'short', timeZone: 'Asia/Jerusalem' });
      dailyScores.push(`${dayName} (${formatDateHebrew(ds)}): ${pct}%`);
    }

    const timeSlots = { morning: { total: 0, done: 0 }, afternoon: { total: 0, done: 0 }, evening: { total: 0, done: 0 } };
    todayTasks.forEach(t => {
      const hour = parseInt(t.startTime.split(':')[0]);
      const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      timeSlots[slot].total++;
      if (t.completions[todayStr]) timeSlots[slot].done++;
    });

    const categoryStats = getCategoryStats();
    const failureAnalysis = getFailureAnalysis();

    // Detect falling pattern
    const recentScores = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      recentScores.push(getDailyCompletionPercent(d));
    }
    const isFalling = recentScores.filter(s => s < 50).length >= 3;
    const fallWarning = isFalling ? '\n⚠️ זיהוי נפילה: 3+ ימים מתחת ל-50%!' : '';

    return `📊 סטטיסטיקות מפורטות:

🔥 סטריק נוכחי: ${stats.streak} ימים
⭐ נקודות: ${stats.points}
✅ סה״כ השלמות: ${getTotalCompletions()}
${fallWarning}

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

      if (assistantSoFar) {
        saveMessage('assistant', assistantSoFar);
      }
    } catch (e: any) {
      const errMsg = `❌ ${e.message || 'שגיאה זמנית. נסה שוב.'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    }
    setLoading(false);
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: input };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    saveMessage('user', input);
    await streamResponse(allMsgs);
  };

  const triggerMode = async (modeId: string, prompt: string) => {
    if (loading) return;
    const userMsg: Msg = { role: 'user', content: prompt };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    saveMessage('user', prompt);
    setShowModes(false);
    await streamResponse(allMsgs, modeId);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 sm:bottom-6 left-4 sm:left-6 z-50 bg-primary text-primary-foreground w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto z-50 sm:w-[380px] h-[70vh] sm:h-[560px] max-h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
            onClick={() => setShowModes(!showModes)}
            disabled={loading}
          >
            <Brain className="w-3.5 h-3.5" />
            מצבים
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={clearHistory}
              title="מחק היסטוריה"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modes panel */}
      {showModes && (
        <div className="border-b border-border p-2 grid grid-cols-2 gap-1.5 bg-muted/30">
          {AI_MODES.map(mode => {
            const MIcon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => triggerMode(mode.id, mode.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-primary/10 hover:text-primary transition-colors text-right border border-border/50"
              >
                <MIcon className="w-3.5 h-3.5 shrink-0" />
                {mode.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-4">
            <Bot className="w-12 h-12 mx-auto mb-3 text-primary/50" />
            <p>היי! אני המאמן האישי שלך 💪</p>
            <p className="mt-1 text-xs">שאל אותי כל שאלה, או בחר מצב:</p>
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              {AI_MODES.slice(0, 4).map(mode => {
                const MIcon = mode.icon;
                return (
                  <Button
                    key={mode.id}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-8"
                    onClick={() => triggerMode(mode.id, mode.prompt)}
                    disabled={loading}
                  >
                    <MIcon className="w-3 h-3" />
                    {mode.label}
                  </Button>
                );
              })}
            </div>
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
              מנתח...
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
      <div className="px-3 pb-2 text-[10px] text-muted-foreground/70 text-center leading-tight">
        תגובות AI הן הערכות בלבד ואינן מחליפות ייעוץ רפואי מקצועי.
      </div>
    </div>
  );
};

export default AiCoach;
