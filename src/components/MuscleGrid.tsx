import { Check } from 'lucide-react';
import chest from '@/assets/muscle-chest.png';
import shoulders from '@/assets/muscle-shoulders.png';
import biceps from '@/assets/muscle-biceps.png';
import triceps from '@/assets/muscle-triceps.png';
import backUpper from '@/assets/muscle-back-upper.png';
import backLower from '@/assets/muscle-back-lower.png';
import lats from '@/assets/muscle-lats.png';
import abs from '@/assets/muscle-abs.png';
import core from '@/assets/muscle-core.png';
import quads from '@/assets/muscle-quads.png';
import hamstrings from '@/assets/muscle-hamstrings.png';
import glutes from '@/assets/muscle-glutes.png';
import calves from '@/assets/muscle-calves.png';
import fullbody from '@/assets/muscle-fullbody.png';

export const MUSCLES = [
  { id: 'chest', name: 'חזה', img: chest },
  { id: 'shoulders', name: 'כתפיים', img: shoulders },
  { id: 'biceps', name: 'יד קדמית', img: biceps },
  { id: 'triceps', name: 'יד אחורית', img: triceps },
  { id: 'back-upper', name: 'גב עליון', img: backUpper },
  { id: 'lats', name: 'רחב גבי', img: lats },
  { id: 'back-lower', name: 'גב תחתון', img: backLower },
  { id: 'abs', name: 'בטן', img: abs },
  { id: 'core', name: 'ליבה', img: core },
  { id: 'quads', name: 'רגליים קדמיות', img: quads },
  { id: 'hamstrings', name: 'רגליים אחוריות', img: hamstrings },
  { id: 'glutes', name: 'ישבן', img: glutes },
  { id: 'calves', name: 'תאומים', img: calves },
];

interface Props {
  selected: string[];
  fullBody: boolean;
  onToggle: (id: string) => void;
  onToggleFullBody: () => void;
}

const MuscleGrid = ({ selected, fullBody, onToggle, onToggleFullBody }: Props) => (
  <div className="space-y-4">
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/30 bg-accent/5">
        <span className="text-[11px] font-bold text-accent">♂ ♀ פונה לשני המינים</span>
      </div>
    </div>

    {/* כל הגוף - למעלה */}
    <button
      type="button"
      onClick={onToggleFullBody}
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
            <span className="text-lg font-black bg-gradient-to-l from-accent to-primary bg-clip-text text-transparent">כל הגוף</span>
            <span className="text-xl">💪</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">תוכנית מלאה לכל קבוצות השרירים</div>
        </div>
      </div>
    </button>

    {/* מפריד "או" */}
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border to-transparent" />
      <span className="text-xs font-black tracking-[0.3em] text-muted-foreground uppercase px-2">או</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>

    <p className="text-center text-xs text-muted-foreground -mt-1">בחר שרירים ספציפיים להתמקדות</p>

    <div className="grid grid-cols-2 gap-3">
      {MUSCLES.map(m => {
        const active = selected.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onToggle(m.id)}
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
              <img src={m.img} alt={m.name} loading="lazy" width={512} height={512} className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2 text-center">
              <div className={`font-bold text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{m.name}</div>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export default MuscleGrid;
