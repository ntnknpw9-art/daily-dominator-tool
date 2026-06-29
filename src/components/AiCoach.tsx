import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, MessageCircle, BarChart3, Trash2, AlertTriangle, Brain, Skull, Apple, Volume2, VolumeX, Paperclip, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTaskContext } from '@/context/TaskContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getNowInIsrael, getTodayStr, formatDateHebrew } from '@/lib/dateUtils';
import ReactMarkdown from 'react-markdown';
import ApplyPlanDialog from './ApplyPlanDialog';
import { extractActionsBlock, summarizeAction, type AiAction } from '@/lib/aiActions';
import { toast } from 'sonner';
import { ALL_DAYS } from '@/types/task';

type Msg = { role: 'user' | 'assistant'; content: string; images?: string[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

const AI_MODES = [
  { id: 'analyze', label: 'נתח ביצועים', icon: BarChart3, prompt: 'נתח את הביצועים שלי ותן לי פידבק מפורט עם המלצות לשינויים' },
  { id: 'future_self', label: 'האני העתידי', icon: User, prompt: 'דבר אליי כאילו אתה האני העתידי שלי בעוד חצי שנה שמסתכל אחורה על מה שאני עושה היום. הראה לי לאן אני יכול להגיע אם אמשיך ככה.' },
  { id: 'no_mercy', label: 'אין רחמים', icon: Skull, prompt: 'תן לי את האמת. בלי פילטרים. אין תירוצים. תהיה קשוח.' },
  { id: 'failure_analysis', label: 'למה אני נכשל?', icon: AlertTriangle, prompt: 'נתח את הכישלונות שלי — למה אני מפספס? מה הסיבות האמיתיות?' },
  { id: 'behavior_engine', label: 'AI לומד אותי', icon: Brain, prompt: 'נתח את דפוסי ההתנהגות שלי, זהה נקודות חולשה, והצע שינויי לו"ז אוטומטיים' },
  { id: 'nutrition_link', label: 'תזונה × אימון', icon: Apple, prompt: 'נתח את הקשר בין התזונה שלי לביצועים והצע שיפורים' },
  { id: 'recovery_system', label: 'התאוששות', icon: Brain, prompt: 'נתח את המצב הפיזי שלי (שינה, תזונה, עומס אימונים) ותן לי פרוטוקול התאוששות חכם. האם עלי לנוח היום?' },
  { id: 'gym_buddy', label: 'AI חדר כושר', icon: MessageCircle, prompt: 'מעכשיו אתה חבר האימון שלי לחדר כושר. תעזור לי לבחור משקלים, לספור סטים, ותן לי מוטיבציה בזמן אמת!' },
  { id: 'build_plan', label: 'מסלול AI מלא', icon: Brain, prompt: 'אני רוצה שתיצור לי מסלול אימונים ותזונה מלא (לדוגמה: ירידה במשקל, מסה, איש ברזל, קליסטניקס). תשאל אותי שאלות אם צריך, ואז בסוף התשובה שלך תוסיף בדיוק את המילה [CREATE_PLAN] כדי שאוכל להחיל את התוכנית.' },
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
  const { tasks, stats, getTotalCompletions, getTodayTasks, getDailyCompletionPercent, getCategoryStats, getFailureAnalysis, addTask, updateTask, deleteTask } = useTaskContext();
  const [voiceMode, setVoiceMode] = useState(false);
  const [nutrition, setNutrition] = useState({ calories: 0, target: 0, protein: 0 });
  const [sleep, setSleep] = useState({ done: false, target: 7 });
  const [workouts, setWorkouts] = useState<string>('');
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planText, setPlanText] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [appliedMsgIds, setAppliedMsgIds] = useState<Set<number>>(new Set());
  const [applyingMsgId, setApplyingMsgId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchExtraContext = async () => {
      const todayStr = getTodayStr();
      const [logsRes, profileRes, habitRes, targetsRes, sessionsRes] = await Promise.all([
        supabase.from('nutrition_logs').select('calories, protein').eq('user_id', user.id).eq('log_date', todayStr),
        supabase.from('nutrition_profiles').select('daily_calories').eq('user_id', user.id).maybeSingle(),
        supabase.from('habits').select('completed').eq('user_id', user.id).eq('habit_date', todayStr).eq('habit_id', 'sleep').maybeSingle(),
        supabase.from('user_targets').select('sleep_hours').eq('user_id', user.id).maybeSingle(),
        supabase.from('workout_sessions').select('id, session_date, focus, day_name, total_sets, total_volume, duration_seconds').eq('user_id', user.id).order('session_date', { ascending: false }).limit(8),
      ]);

      const cals = logsRes.data?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0;
      const prot = logsRes.data?.reduce((sum, log) => sum + Number(log.protein || 0), 0) || 0;
      setNutrition({ calories: cals, target: profileRes.data?.daily_calories || 0, protein: prot });
      setSleep({ done: habitRes.data?.completed || false, target: Number(targetsRes.data?.sleep_hours) || 7 });

      const sessions = sessionsRes.data || [];
      if (sessions.length === 0) {
        setWorkouts('אין אימונים שנרשמו עדיין.');
      } else {
        const ids = sessions.map(s => s.id);
        const { data: sets } = await supabase
          .from('workout_sets')
          .select('session_id, exercise_name, set_number, reps, weight, weighted, rir')
          .in('session_id', ids)
          .order('exercise_order', { ascending: true })
          .order('set_number', { ascending: true });
        const lines = sessions.map(s => {
          const setRows = (sets || []).filter(x => x.session_id === s.id);
          const byEx: Record<string, typeof setRows> = {};
          setRows.forEach(r => { (byEx[r.exercise_name] ||= []).push(r); });
          const exSummary = Object.entries(byEx).map(([name, rs]) => {
            const parts = rs.map(r => r.weighted ? `${r.weight ?? '?'}ק"ג×${r.reps ?? '?'}` : `${r.reps ?? '?'}`).join('/');
            return `${name}: ${parts}`;
          }).join(' | ');
          return `- ${s.session_date} ${s.focus || s.day_name || ''} (${s.total_sets} סטים, ${Math.round(s.total_volume || 0)}ק"ג נפח): ${exSummary}`;
        });
        setWorkouts(lines.join('\n'));
      }
    };
    fetchExtraContext();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Scroll to bottom when chat opens (show latest messages)
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' });
      });
    }
  }, [open, historyLoaded]);

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
    const taskListForAi = tasks.map(t => {
      const workout = t.workoutDetails?.length
        ? ` | workoutDetails=${t.workoutDetails.map(wd => `${wd.day}: ${wd.description}`).join(' || ')}`
        : '';
      return `- id=${t.id} | ${t.name} [${t.category}] ${t.startTime}-${t.endTime} ימים=${t.days.join(',')}${workout}`;
    }).join('\n');

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

📋 כל המשימות (כולל ID — השתמש בו לעדכון/מחיקה):
${taskListForAi}

📈 סטטיסטיקת ביצוע (7 ימים):
${taskStats.map(t => `- ${t.name} | ${t.completionRate}% | פספוסים: ${t.recentMisses}`).join('\n')}

📊 ביצועים לפי קטגוריה:
${categoryStats.map(c => `- ${c.category}: ${c.percent}%`).join('\n')}

❌ משימות עם הכי הרבה פספוסים:
${failureAnalysis.slice(0, 5).map(f => `- ${f.name}: ${f.misses} פספוסים (${f.percent}%)`).join('\n')}

🕐 משימות היום: ${todayTasks.length}, הושלמו: ${completed.length}
${todayTasks.map(t => `- ${t.completions[todayStr] ? '✅' : '⬜'} ${t.name} (${t.startTime}-${t.endTime})`).join('\n')}

🍎 תזונה היום: ${nutrition.calories} קלוריות מתוך יעד של ${nutrition.target}. חלבון: ${nutrition.protein}g.
💤 שינה הלילה: ${sleep.done ? 'הושלם (טוב)' : 'לא הושלם או לא נרשם'} מתוך יעד של ${sleep.target} שעות.

🏋️ אימונים אחרונים (סטים, משקלים, חזרות):
${workouts}
`;
  };

  const streamResponse = async (allMsgs: Msg[], mode?: string) => {
    setLoading(true);
    let assistantSoFar = '';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('יש להתחבר מחדש');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: allMsgs.map(m => {
            if (m.role === 'user' && m.images && m.images.length > 0) {
              return {
                role: 'user',
                content: [
                  { type: 'text', text: m.content || 'בבקשה תנתח את התמונה.' },
                  ...m.images.map(url => ({ type: 'image_url', image_url: { url } })),
                ],
              };
            }
            return { role: m.role, content: m.content };
          }),
          context: buildContext(),
          mode,
        }),
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
        if (voiceMode && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(assistantSoFar);
          utterance.lang = 'he-IL';
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (e: any) {
      const errMsg = `❌ ${e.message || 'שגיאה זמנית. נסה שוב.'}`;
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
    }
    setLoading(false);
  };

  const send = async () => {
    if ((!input.trim() && attachedImages.length === 0) || loading) return;
    const imgs = attachedImages;
    const userMsg: Msg = { role: 'user', content: input, images: imgs.length ? imgs : undefined };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setAttachedImages([]);
    const dbContent = imgs.length ? `${input}\n[צורפו ${imgs.length} תמונות]` : input;
    saveMessage('user', dbContent);
    await streamResponse(allMsgs);
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, 4)) {
      if (!f.type.startsWith('image/')) continue;
      if (f.size > 6 * 1024 * 1024) {
        toast.error(`התמונה ${f.name} גדולה מדי (מקס׳ 6MB)`);
        continue;
      }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      out.push(dataUrl);
    }
    setAttachedImages(prev => [...prev, ...out].slice(0, 4));
  };

  const applyActions = async (msgIdx: number, actions: AiAction[]) => {
    setApplyingMsgId(msgIdx);
    try {
      const todayStr = getTodayStr();
      let okCount = 0;
      for (const a of actions) {
        try {
          if (a.type === 'create_task') {
            await addTask({
              name: a.name,
              meaning: a.meaning || '',
              startTime: a.startTime,
              endTime: a.endTime,
              startDate: a.startDate || todayStr,
              endDate: a.endDate || '2030-12-31',
              category: a.category,
              days: a.days,
              workoutDetails: a.workoutDetails,
            });
            okCount++;
          } else if (a.type === 'update_task') {
            const t = tasks.find(x => x.id === a.id);
            const c: any = a.changes;
            if (!t) {
              // Stale ID (e.g. user deleted the task). Fall back to creating a new task from the changes.
              const days = Array.isArray(c.days) ? c.days.filter((d: any) => ALL_DAYS.includes(d)) : [];
              if (!c.name || !c.category || days.length === 0) {
                console.warn('update_task with stale id and insufficient data to create', a);
                continue;
              }
              await addTask({
                name: c.name,
                meaning: c.meaning || '',
                startTime: c.startTime || '08:00',
                endTime: c.endTime || '09:00',
                startDate: c.startDate || todayStr,
                endDate: c.endDate || '2030-12-31',
                category: c.category,
                days,
                workoutDetails: c.workoutDetails,
              });
              okCount++;
              continue;
            }
            await updateTask(a.id, {
              name: c.name ?? t.name,
              meaning: c.meaning ?? t.meaning,
              startTime: c.startTime ?? t.startTime,
              endTime: c.endTime ?? t.endTime,
              startDate: c.startDate ?? t.startDate,
              endDate: c.endDate ?? t.endDate,
              category: c.category ?? t.category,
              days: Array.isArray(c.days) ? c.days.filter((d: any) => ALL_DAYS.includes(d)) : t.days,
              workoutDetails: c.workoutDetails ?? t.workoutDetails,
            });
            okCount++;
          } else if (a.type === 'delete_task') {
            await deleteTask(a.id);
            okCount++;
          }

        } catch (e) {
          console.error('action failed', a, e);
        }
      }
      toast.success(`✅ הוחלו ${okCount}/${actions.length} פעולות`);
      setAppliedMsgIds(prev => new Set(prev).add(msgIdx));
    } finally {
      setApplyingMsgId(null);
    }
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
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={() => {
              if (!voiceMode && 'speechSynthesis' in window) {
                // Initialize voices
                window.speechSynthesis.getVoices();
              } else if (voiceMode) {
                window.speechSynthesis.cancel();
              }
              setVoiceMode(!voiceMode);
            }}
            title={voiceMode ? 'השתק קול' : 'הפעל קול'}
          >
            {voiceMode ? <Volume2 className="w-4 h-4 text-primary animate-pulse" /> : <VolumeX className="w-4 h-4" />}
          </Button>
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
        {messages.map((m, i) => {
          const actionsExtract = m.role === 'assistant' ? extractActionsBlock(m.content) : null;
          const visibleText = (actionsExtract ? actionsExtract.cleanText : m.content).replace('[CREATE_PLAN]', '');
          const applied = appliedMsgIds.has(i);
          return (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                m.role === 'user' ? 'bg-primary/20' : 'bg-accent/20'
              }`}>
                {m.role === 'user' ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-accent" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm space-y-2 ${
                m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}>
                {m.images && m.images.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.images.map((src, ix) => (
                      <img key={ix} src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-border/50" />
                    ))}
                  </div>
                )}
                {m.role === 'assistant' ? (
                  <>
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{visibleText}</ReactMarkdown>
                    </div>
                    {m.content.includes('[CREATE_PLAN]') && (
                      <Button size="sm" className="w-full gap-2"
                        onClick={() => { setPlanText(m.content); setShowPlanDialog(true); }}>
                        <Brain className="w-4 h-4" /> צור תוכנית באפליקציה
                      </Button>
                    )}
                    {actionsExtract && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-1.5">
                        <div className="text-xs font-bold text-primary flex items-center gap-1">
                          <Brain className="w-3.5 h-3.5" /> {actionsExtract.actions.length} שינויים מוצעים:
                        </div>
                        <ul className="text-xs space-y-0.5 text-foreground/80">
                          {actionsExtract.actions.map((a, ix) => (
                            <li key={ix}>{summarizeAction(a, tasks)}</li>
                          ))}
                        </ul>
                        <Button size="sm" className="w-full gap-2" disabled={applied || applyingMsgId === i}
                          onClick={() => applyActions(i, actionsExtract.actions)}>
                          {applied ? <><Check className="w-4 h-4" /> הוחל</> :
                           applyingMsgId === i ? <><Loader2 className="w-4 h-4 animate-spin" /> מחיל...</> :
                           <><Check className="w-4 h-4" /> אשר והחל את השינויים</>}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  visibleText && <div>{visibleText}</div>
                )}
              </div>
            </div>
          );
        })}
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

      {/* Attached images preview */}
      {attachedImages.length > 0 && (
        <div className="border-t border-border px-3 pt-2 flex gap-1.5 flex-wrap">
          {attachedImages.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="w-14 h-14 object-cover rounded-lg border border-border/50" />
              <button
                onClick={() => setAttachedImages(prev => prev.filter((_, ix) => ix !== i))}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                aria-label="הסר תמונה"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { onPickFiles(e.target.files); e.target.value = ''; }}
        />
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-primary"
          disabled={loading || attachedImages.length >= 4}
          onClick={() => fileInputRef.current?.click()}
          title="צרף תמונה"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={attachedImages.length ? 'הוסף הערה (לא חובה)...' : 'שאל את המאמן...'}
          className="flex-1 text-base md:text-sm"
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={loading || (!input.trim() && attachedImages.length === 0)}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
      <div className="px-3 pb-2 text-[10px] text-muted-foreground/70 text-center leading-tight">
        תגובות AI הן הערכות בלבד ואינן מחליפות ייעוץ רפואי מקצועי.
      </div>

      <ApplyPlanDialog open={showPlanDialog} onOpenChange={setShowPlanDialog} analysisText={planText} />
    </div>
  );
};

export default AiCoach;
