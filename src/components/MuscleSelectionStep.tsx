import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

import chest from '@/assets/muscle-chest.png';
import shoulders from '@/assets/muscle-shoulders.png';
import biceps from '@/assets/muscle-biceps.png';
import triceps from '@/assets/muscle-triceps.png';
import backUpper from '@/assets/muscle-back-upper.png';
import backLower from '@/assets/muscle-back-lower.png';
import abs from '@/assets/muscle-abs.png';
import core from '@/assets/muscle-core.png';
import quads from '@/assets/muscle-quads.png';
import hamstrings from '@/assets/muscle-hamstrings.png';
import glutes from '@/assets/muscle-glutes.png';
import calves from '@/assets/muscle-calves.png';
import fullbody from '@/assets/muscle-fullbody.png';

const MUSCLES = [
  { id: 'chest', name: 'חזה', img: chest },
  { id: 'shoulders', name: 'כתפיים', img: shoulders },
  { id: 'biceps', name: 'יד קדמית', img: biceps },
  { id: 'triceps', name: 'יד אחורית', img: triceps },
  { id: 'back-upper', name: 'גב עליון', img: backUpper },
  { id: 'back-lower', name: 'גב תחתון', img: backLower },
  { id: 'abs', name: 'בטן', img: abs },
  { id: 'core', name: 'ליבה', img: core },
  { id: 'quads', name: 'רגליים קדמיות', img: quads },
  { id: 'hamstrings', name: 'רגליים אחוריות', img: hamstrings },
  { id: 'glutes', name: 'ישבן', img: glutes },
  { id: 'calves', name: 'תאומים', img: calves },
];

const MuscleSelectionStep = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [fullBody, setFullBody] = useState(false);

  const toggle = (id: string) => {
    setFullBody(false);
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleFullBody = () => {
    setFullBody(true);
    setSelected([]);
  };

  const hasSelection = fullBody || selected.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" dir="rtl">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-96 w-96 rounded-full bg-accent/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Progress */}
      <div className="relative z-10 shrink-0 bg-background/70 backdrop-blur-xl border-b border-border/30 px-4 pt-6 pb-4 safe-top">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              שלב <span className="text-foreground">תצוגה</span>
            </span>
            <span className="text-xs font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              שרירים יעד
            </span>
          </div>
          <div className="relative h-1 bg-secondary/60 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 right-0 bg-gradient-to-l from-primary via-primary to-accent rounded-full shadow-[0_0_12px_hsl(var(--primary)/0.8)]" style={{ width: '70%' }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-md mx-auto px-5 pt-6 pb-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
              <Sparkles className="w-3 h-3 text-accent" />
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent">בחירת שרירים</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              על איזה שרירים תרצה לעבוד?
            </h2>
            <p className="text-sm text-muted-foreground/90">בחר אחד או יותר, או "כל הגוף" לתוכנית מלאה</p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3">
            {MUSCLES.map(m => {
              const active = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`group relative rounded-2xl border-2 overflow-hidden transition-all duration-300 active:scale-[0.97] ${
                    active
                      ? 'border-primary bg-gradient-to-b from-primary/15 via-card to-card shadow-[0_0_24px_-4px_hsl(var(--primary)/0.7),inset_0_1px_0_hsl(var(--primary)/0.4)] scale-[1.02]'
                      : 'border-border/60 bg-card hover:border-primary/50 hover:-translate-y-0.5'
                  }`}
                >
                  {active && (
                    <>
                      <span className="absolute top-2 left-2 z-20 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary))]">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                      </span>
                      <span className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                    </>
                  )}
                  <div className={`aspect-square w-full overflow-hidden bg-black ${active ? '' : 'opacity-85 group-hover:opacity-100'} transition-opacity`}>
                    <img
                      src={m.img}
                      alt={m.name}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="px-3 py-2.5 text-center">
                    <div className={`font-bold text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{m.name}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Full body card */}
          <button
            onClick={toggleFullBody}
            className={`group relative w-full rounded-2xl border-2 overflow-hidden transition-all duration-300 active:scale-[0.98] ${
              fullBody
                ? 'border-accent bg-gradient-to-b from-accent/20 via-card to-card shadow-[0_0_30px_-4px_hsl(var(--accent)/0.7)] scale-[1.01]'
                : 'border-accent/40 bg-card hover:border-accent hover:-translate-y-0.5'
            }`}
          >
            {fullBody && (
              <span className="absolute top-3 left-3 z-20 w-7 h-7 rounded-full bg-accent flex items-center justify-center shadow-[0_0_12px_hsl(var(--accent))]">
                <Check className="w-4 h-4 text-accent-foreground" strokeWidth={3} />
              </span>
            )}
            <div className="flex items-center gap-3 p-3">
              <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-black">
                <img src={fullbody} alt="כל הגוף" loading="lazy" width={512} height={512} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-right">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-lg font-black bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">
                    כל הגוף
                  </span>
                  <span className="text-xl">💪</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">תוכנית מלאה לכל קבוצות השרירים</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-20 shrink-0 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4 safe-bottom">
        <div className="max-w-md mx-auto flex gap-2">
          <Button variant="outline" className="gap-1 h-12 border-border/50 bg-card/50">
            <ChevronRight className="w-4 h-4" />
            חזור
          </Button>
          <Button
            disabled={!hasSelection}
            className="flex-1 gap-1.5 h-12 text-base font-black tracking-wide bg-gradient-to-l from-primary via-primary to-primary/90 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] disabled:opacity-40"
          >
            הבא <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MuscleSelectionStep;
