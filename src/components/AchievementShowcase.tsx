import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ADVANCED_ACHIEVEMENTS, type AchievementRarity } from '@/components/AchievementsPanel';
import { Trophy, Sparkles, RotateCcw } from 'lucide-react';

const RARITY_GRADIENT: Record<AchievementRarity, string> = {
  common: 'from-gray-500/20 to-gray-600/10',
  uncommon: 'from-green-500/20 to-green-600/10',
  rare: 'from-blue-500/20 to-blue-600/10',
  epic: 'from-purple-500/25 to-purple-600/10',
  legendary: 'from-yellow-500/30 to-amber-600/10',
};

const RARITY_GLOW: Record<AchievementRarity, string> = {
  common: 'shadow-gray-500/10',
  uncommon: 'shadow-green-500/20',
  rare: 'shadow-blue-500/30',
  epic: 'shadow-purple-500/40',
  legendary: 'shadow-yellow-500/50',
};

const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: 'border-gray-500/30',
  uncommon: 'border-green-500/40',
  rare: 'border-blue-500/40',
  epic: 'border-purple-500/50',
  legendary: 'border-yellow-500/60',
};

const RARITY_LABEL: Record<AchievementRarity, string> = {
  common: 'רגיל',
  uncommon: 'לא שכיח',
  rare: 'נדיר',
  epic: 'אפי',
  legendary: 'אגדי',
};

const AchievementShowcase = () => {
  const { user } = useAuth();
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rotations, setRotations] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!user) return;
    supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id).then(({ data }) => {
      if (data) setUnlockedIds(data.map(a => a.achievement_id));
    });
  }, [user]);

  const unlockedAchievements = useMemo(() =>
    ADVANCED_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id))
      .sort((a, b) => {
        const order: AchievementRarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
        return order.indexOf(a.rarity) - order.indexOf(b.rarity);
      }),
    [unlockedIds]
  );

  const handleMouseMove = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
    setRotations(prev => ({ ...prev, [id]: { x, y } }));
  };

  const handleMouseLeave = (id: string) => {
    setRotations(prev => ({ ...prev, [id]: { x: 0, y: 0 } }));
  };

  const selected = selectedId ? ADVANCED_ACHIEVEMENTS.find(a => a.id === selectedId) : null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-accent" />
        <h3 className="font-bold text-foreground">🏆 וויטרינת הישגים</h3>
        <span className="text-xs text-muted-foreground mr-auto">
          {unlockedAchievements.length} הישגים נפתחו
        </span>
      </div>

      {unlockedAchievements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">עדיין אין הישגים — התחל לבצע משימות!</p>
        </div>
      ) : (
        <>
          {/* 3D Trophy Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4" style={{ perspective: '800px' }}>
            {unlockedAchievements.map(achievement => {
              const rot = rotations[achievement.id] || { x: 0, y: 0 };
              const isSelected = selectedId === achievement.id;

              return (
                <div
                  key={achievement.id}
                  className={`relative cursor-pointer group`}
                  onClick={() => setSelectedId(isSelected ? null : achievement.id)}
                  onMouseMove={(e) => handleMouseMove(achievement.id, e)}
                  onMouseLeave={() => handleMouseLeave(achievement.id)}
                >
                  <div
                    className={`
                      relative p-3 rounded-xl border transition-all duration-300
                      bg-gradient-to-br ${RARITY_GRADIENT[achievement.rarity]}
                      ${RARITY_BORDER[achievement.rarity]}
                      ${isSelected ? `ring-2 ring-primary/50 shadow-lg ${RARITY_GLOW[achievement.rarity]}` : ''}
                      hover:shadow-lg hover:${RARITY_GLOW[achievement.rarity]}
                      group-hover:scale-105
                    `}
                    style={{
                      transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.1s ease-out, scale 0.3s ease',
                    }}
                  >
                    {/* Shine effect */}
                    <div
                      className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none"
                      style={{
                        background: `linear-gradient(${135 + rot.y * 2}deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)`,
                      }}
                    />

                    {/* Rarity sparkle for legendary/epic */}
                    {(achievement.rarity === 'legendary' || achievement.rarity === 'epic') && (
                      <Sparkles className="absolute top-1 left-1 w-3 h-3 text-accent/60 animate-pulse" />
                    )}

                    <div className="text-center" style={{ transform: 'translateZ(20px)' }}>
                      <span className="text-2xl block mb-1">{achievement.icon}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight block">
                        {achievement.name.replace(/^[^\s]+\s/, '')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected achievement detail */}
          {selected && (
            <div className={`p-4 rounded-xl border bg-gradient-to-br ${RARITY_GRADIENT[selected.rarity]} ${RARITY_BORDER[selected.rarity]} animate-scale-in`}>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selected.icon}</span>
                <div>
                  <h4 className="font-bold text-foreground">{selected.name}</h4>
                  <p className="text-sm text-muted-foreground">{selected.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${RARITY_BORDER[selected.rarity]} bg-background/50`}>
                      {RARITY_LABEL[selected.rarity]}
                    </span>
                    {selected.tag && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">
                        {selected.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AchievementShowcase;
