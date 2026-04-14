import { useState, useEffect } from 'react';
import { getTodayStr, formatFullHebrew, getNowInIsrael } from '@/lib/dateUtils';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface JournalEntry {
  learned: string;
  hard: string;
  improve: string;
  grateful: string;
  score: number;
}

const ReflectionJournal = () => {
  const todayStr = getTodayStr();

  const [entries, setEntries] = useState<Record<string, JournalEntry>>(() => {
    const saved = localStorage.getItem('tracker-journal');
    return saved ? JSON.parse(saved) : {};
  });

  const [current, setCurrent] = useState<JournalEntry>(
    entries[todayStr] || { learned: '', hard: '', improve: '', grateful: '', score: 5 }
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('tracker-journal', JSON.stringify(entries));
  }, [entries]);

  const handleSave = () => {
    setEntries(prev => ({ ...prev, [todayStr]: current }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fields = [
    { key: 'learned' as const, label: '📚 מה למדתי היום?', placeholder: 'למדתי ש...' },
    { key: 'hard' as const, label: '💪 מה היה הכי קשה?', placeholder: 'הדבר הכי קשה היה...' },
    { key: 'improve' as const, label: '🎯 מה אשפר מחר?', placeholder: 'מחר אני אשתפר ב...' },
    { key: 'grateful' as const, label: '🙏 על מה אני אסיר תודה?', placeholder: 'אני אסיר תודה על...' },
  ];

  return (
    <div className="glass-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">📝 יומן רפלקציה</h3>
        <span className="text-xs text-muted-foreground">{formatFullHebrew(getNowInIsrael())}</span>
      </div>

      <div className="space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-sm font-semibold text-foreground mb-1 block">{f.label}</label>
            <Textarea
              value={current[f.key]}
              onChange={e => setCurrent(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="bg-secondary/30 border-border/50 resize-none"
              rows={2}
            />
          </div>
        ))}

        <div>
          <label className="text-sm font-semibold text-foreground mb-2 block">⭐ ציון יומי (1-10)</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                onClick={() => setCurrent(prev => ({ ...prev, score: n }))}
                className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                  n <= current.score
                    ? n >= 8 ? 'bg-success text-success-foreground' : n >= 5 ? 'bg-accent text-accent-foreground' : 'bg-destructive text-destructive-foreground'
                    : 'bg-secondary/50 text-muted-foreground'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} className={`w-full gap-2 ${saved ? 'bg-success hover:bg-success/90' : ''}`}>
          <Save className="w-4 h-4" />
          {saved ? 'נשמר! ✓' : 'שמור רפלקציה'}
        </Button>
      </div>

      {/* Previous entries */}
      {Object.keys(entries).filter(d => d !== todayStr).length > 0 && (
        <div className="mt-6 border-t border-border/30 pt-4">
          <h4 className="text-sm font-bold text-muted-foreground mb-3">רפלקציות קודמות</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {Object.entries(entries)
              .filter(([d]) => d !== todayStr)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 5)
              .map(([date, entry]) => (
                <div key={date} className="bg-secondary/20 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-muted-foreground">{date}</span>
                    <span className="text-accent font-bold">⭐ {entry.score}/10</span>
                  </div>
                  {entry.learned && <p className="text-muted-foreground text-xs">📚 {entry.learned}</p>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReflectionJournal;
