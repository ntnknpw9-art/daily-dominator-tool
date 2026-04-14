import { useState } from 'react';
import { Trophy, Star, Flame, Dumbbell, BookOpen, DollarSign, Shield, Sparkles, Crown, Gem, Medal, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export type AchievementCategory = 'streak' | 'tasks' | 'fitness' | 'study' | 'money' | 'discipline' | 'special';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  check: (s: AchievementStats) => boolean;
  progress?: (s: AchievementStats) => { current: number; target: number };
  tag?: string;
}

export interface AchievementStats {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  total: number;
  fitnessCount: number;
  studyCount: number;
  moneyCount: number;
  disciplineCount: number;
  perfectDays: number;
  categoriesCompleted: number;
}

const RARITY_CONFIG: Record<AchievementRarity, { label: string; color: string; bg: string; border: string }> = {
  common: { label: 'רגיל', color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/30' },
  uncommon: { label: 'לא שכיח', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  rare: { label: 'נדיר', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  epic: { label: 'אפי', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  legendary: { label: 'אגדי', color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' },
};

const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; icon: typeof Trophy }> = {
  streak: { label: 'רצף', icon: Flame },
  tasks: { label: 'משימות', icon: Target },
  fitness: { label: 'כושר', icon: Dumbbell },
  study: { label: 'לימודים', icon: BookOpen },
  money: { label: 'כסף', icon: DollarSign },
  discipline: { label: 'משמעת', icon: Shield },
  special: { label: 'מיוחד', icon: Sparkles },
};

export const ADVANCED_ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  { id: 'streak_3', name: '🔥 התחלה חמה', description: 'רצף של 3 ימים', icon: '🔥', category: 'streak', rarity: 'common',
    check: s => s.streak >= 3, progress: s => ({ current: Math.min(s.streak, 3), target: 3 }) },
  { id: 'streak_7', name: '🔥 שבוע מושלם', description: 'רצף של 7 ימים', icon: '🔥', category: 'streak', rarity: 'uncommon',
    check: s => s.streak >= 7, progress: s => ({ current: Math.min(s.streak, 7), target: 7 }) },
  { id: 'streak_14', name: '💪 שבועיים רצוף', description: 'רצף של 14 ימים', icon: '💪', category: 'streak', rarity: 'rare',
    check: s => s.streak >= 14, progress: s => ({ current: Math.min(s.streak, 14), target: 14 }) },
  { id: 'streak_30', name: '💎 חודש רצוף', description: 'רצף של 30 ימים', icon: '💎', category: 'streak', rarity: 'epic',
    check: s => s.streak >= 30, progress: s => ({ current: Math.min(s.streak, 30), target: 30 }) },
  { id: 'streak_100', name: '👑 100 ימים רצוף', description: 'רצף של 100 ימים!', icon: '👑', category: 'streak', rarity: 'legendary',
    check: s => s.streak >= 100, progress: s => ({ current: Math.min(s.streak, 100), target: 100 }), tag: 'מכונת משמעת' },

  // Task count achievements
  { id: 'tasks_1', name: '🎯 צעד ראשון', description: 'השלם משימה אחת', icon: '🎯', category: 'tasks', rarity: 'common',
    check: s => s.total >= 1, progress: s => ({ current: Math.min(s.total, 1), target: 1 }) },
  { id: 'tasks_10', name: '⭐ 10 משימות', description: 'השלם 10 משימות', icon: '⭐', category: 'tasks', rarity: 'common',
    check: s => s.total >= 10, progress: s => ({ current: Math.min(s.total, 10), target: 10 }) },
  { id: 'tasks_50', name: '🌟 50 משימות', description: 'השלם 50 משימות', icon: '🌟', category: 'tasks', rarity: 'uncommon',
    check: s => s.total >= 50, progress: s => ({ current: Math.min(s.total, 50), target: 50 }) },
  { id: 'tasks_100', name: '🏆 100 משימות', description: 'השלם 100 משימות', icon: '🏆', category: 'tasks', rarity: 'rare',
    check: s => s.total >= 100, progress: s => ({ current: Math.min(s.total, 100), target: 100 }), tag: 'עובד קשה' },
  { id: 'tasks_500', name: '💫 500 משימות', description: 'השלם 500 משימות', icon: '💫', category: 'tasks', rarity: 'epic',
    check: s => s.total >= 500, progress: s => ({ current: Math.min(s.total, 500), target: 500 }) },
  { id: 'tasks_1000', name: '🌠 1000 משימות', description: 'השלם 1000 משימות!', icon: '🌠', category: 'tasks', rarity: 'legendary',
    check: s => s.total >= 1000, progress: s => ({ current: Math.min(s.total, 1000), target: 1000 }), tag: 'אלוף' },

  // Fitness achievements
  { id: 'fit_5', name: '🏋️ ספורטאי מתחיל', description: '5 משימות כושר', icon: '🏋️', category: 'fitness', rarity: 'common',
    check: s => s.fitnessCount >= 5, progress: s => ({ current: Math.min(s.fitnessCount, 5), target: 5 }) },
  { id: 'fit_20', name: '💪 ספורטאי', description: '20 משימות כושר', icon: '💪', category: 'fitness', rarity: 'uncommon',
    check: s => s.fitnessCount >= 20, progress: s => ({ current: Math.min(s.fitnessCount, 20), target: 20 }) },
  { id: 'fit_50', name: '🥇 אלוף כושר', description: '50 משימות כושר', icon: '🥇', category: 'fitness', rarity: 'rare',
    check: s => s.fitnessCount >= 50, progress: s => ({ current: Math.min(s.fitnessCount, 50), target: 50 }), tag: 'חיה בכושר' },
  { id: 'fit_100', name: '🦾 מכונה', description: '100 משימות כושר!', icon: '🦾', category: 'fitness', rarity: 'epic',
    check: s => s.fitnessCount >= 100, progress: s => ({ current: Math.min(s.fitnessCount, 100), target: 100 }), tag: 'מכונת כושר' },

  // Study achievements
  { id: 'study_5', name: '📖 תלמיד', description: '5 משימות לימוד', icon: '📖', category: 'study', rarity: 'common',
    check: s => s.studyCount >= 5, progress: s => ({ current: Math.min(s.studyCount, 5), target: 5 }) },
  { id: 'study_20', name: '📚 חרוץ', description: '20 משימות לימוד', icon: '📚', category: 'study', rarity: 'uncommon',
    check: s => s.studyCount >= 20, progress: s => ({ current: Math.min(s.studyCount, 20), target: 20 }) },
  { id: 'study_50', name: '🎓 מלומד', description: '50 משימות לימוד', icon: '🎓', category: 'study', rarity: 'rare',
    check: s => s.studyCount >= 50, progress: s => ({ current: Math.min(s.studyCount, 50), target: 50 }), tag: 'חכם' },

  // Money achievements
  { id: 'money_10', name: '💰 יזם מתחיל', description: '10 משימות כסף', icon: '💰', category: 'money', rarity: 'common',
    check: s => s.moneyCount >= 10, progress: s => ({ current: Math.min(s.moneyCount, 10), target: 10 }) },
  { id: 'money_30', name: '💵 יזם', description: '30 משימות כסף', icon: '💵', category: 'money', rarity: 'uncommon',
    check: s => s.moneyCount >= 30, progress: s => ({ current: Math.min(s.moneyCount, 30), target: 30 }), tag: 'מגלגל כסף' },

  // Discipline achievements
  { id: 'disc_perfect3', name: '✨ 3 ימים מושלמים', description: '3 ימים עם 100% השלמה', icon: '✨', category: 'discipline', rarity: 'uncommon',
    check: s => s.perfectDays >= 3, progress: s => ({ current: Math.min(s.perfectDays, 3), target: 3 }) },
  { id: 'disc_perfect7', name: '🌟 שבוע מושלם', description: '7 ימים מושלמים', icon: '🌟', category: 'discipline', rarity: 'rare',
    check: s => s.perfectDays >= 7, progress: s => ({ current: Math.min(s.perfectDays, 7), target: 7 }), tag: 'פרפקציוניסט' },
  { id: 'disc_perfect30', name: '💎 חודש מושלם', description: '30 ימים מושלמים!', icon: '💎', category: 'discipline', rarity: 'legendary',
    check: s => s.perfectDays >= 30, progress: s => ({ current: Math.min(s.perfectDays, 30), target: 30 }), tag: 'מכונת השמדה' },

  // Special achievements
  { id: 'sp_level5', name: '⚡ רמה 5', description: 'הגע לרמה 5', icon: '⚡', category: 'special', rarity: 'uncommon',
    check: s => s.level >= 5 },
  { id: 'sp_level10', name: '👑 רמה 10', description: 'הגע לרמה 10', icon: '👑', category: 'special', rarity: 'epic',
    check: s => s.level >= 10, tag: 'מלך' },
  { id: 'sp_allcats', name: '🌈 מגוון', description: 'השלם משימות מכל קטגוריה', icon: '🌈', category: 'special', rarity: 'rare',
    check: s => s.categoriesCompleted >= 5, tag: 'רב-תחומי' },
  { id: 'sp_xp5000', name: '💥 5000 XP', description: 'צבור 5000 נקודות ניסיון', icon: '💥', category: 'special', rarity: 'epic',
    check: s => s.xp >= 5000, progress: s => ({ current: Math.min(s.xp, 5000), target: 5000 }) },
];

interface AchievementsPanelProps {
  unlockedIds: string[];
  stats: AchievementStats;
}

const AchievementsPanel = ({ unlockedIds, stats }: AchievementsPanelProps) => {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'all'>('all');

  const filtered = ADVANCED_ACHIEVEMENTS.filter(a => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (selectedRarity !== 'all' && a.rarity !== selectedRarity) return false;
    return true;
  });

  const unlockedCount = ADVANCED_ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id)).length;
  const unlockedTags = ADVANCED_ACHIEVEMENTS.filter(a => a.tag && unlockedIds.includes(a.id));

  return (
    <div className="mt-4 space-y-3">
      {/* Tags row */}
      {unlockedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unlockedTags.map(a => {
            const rConf = RARITY_CONFIG[a.rarity];
            return (
              <Badge key={a.id} variant="outline" className={`${rConf.border} ${rConf.bg} ${rConf.color} text-xs gap-1`}>
                {a.icon} {a.tag}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{unlockedCount}/{ADVANCED_ACHIEVEMENTS.length} הישגים</span>
        <div className="flex gap-1">
          {(['legendary', 'epic', 'rare'] as AchievementRarity[]).map(r => {
            const count = ADVANCED_ACHIEVEMENTS.filter(a => a.rarity === r && unlockedIds.includes(a.id)).length;
            const total = ADVANCED_ACHIEVEMENTS.filter(a => a.rarity === r).length;
            return (
              <span key={r} className={`${RARITY_CONFIG[r].color}`}>
                {count}/{total} {RARITY_CONFIG[r].label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          הכל
        </button>
        {(Object.keys(CATEGORY_CONFIG) as AchievementCategory[]).map(cat => {
          const conf = CATEGORY_CONFIG[cat];
          const CatIcon = conf.icon;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded text-xs flex items-center gap-1 transition-colors ${
                selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              <CatIcon className="w-3 h-3" />
              {conf.label}
            </button>
          );
        })}
      </div>

      {/* Rarity filter */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setSelectedRarity('all')}
          className={`px-2 py-0.5 rounded text-xs transition-colors ${
            selectedRarity === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          הכל
        </button>
        {(Object.keys(RARITY_CONFIG) as AchievementRarity[]).map(r => {
          const conf = RARITY_CONFIG[r];
          return (
            <button
              key={r}
              onClick={() => setSelectedRarity(r)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${conf.color} ${
                selectedRarity === r ? `${conf.bg} ${conf.border} border` : 'hover:opacity-80'
              }`}
            >
              {conf.label}
            </button>
          );
        })}
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
        {filtered.map(a => {
          const unlocked = unlockedIds.includes(a.id);
          const rConf = RARITY_CONFIG[a.rarity];
          const prog = a.progress?.(stats);

          return (
            <div
              key={a.id}
              className={`p-2.5 rounded-lg border transition-all ${
                unlocked
                  ? `${rConf.bg} ${rConf.border} border`
                  : 'border-border/20 bg-muted/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{a.icon}</span>
                  <span className={`text-xs font-medium ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {a.name.replace(/^[^\s]+\s/, '')}
                  </span>
                </div>
                {a.tag && unlocked && (
                  <Badge variant="outline" className={`${rConf.color} ${rConf.border} text-[9px] px-1 py-0 shrink-0`}>
                    {a.tag}
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{a.description}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[9px] ${rConf.color}`}>{rConf.label}</span>
                {unlocked && <span className="text-[9px] text-green-400">✓ הושלם</span>}
              </div>
              {prog && !unlocked && (
                <div className="mt-1.5">
                  <Progress value={Math.round((prog.current / prog.target) * 100)} className="h-1.5" />
                  <span className="text-[9px] text-muted-foreground">{prog.current}/{prog.target}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsPanel;
