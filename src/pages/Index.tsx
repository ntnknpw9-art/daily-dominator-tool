import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import AuthPage from '@/pages/AuthPage';
import DashboardTab from '@/components/DashboardTab';
import TasksTab from '@/components/TasksTab';
import TodayTab from '@/components/TodayTab';
import WeeklyTab from '@/components/WeeklyTab';
import AdvancedTab from '@/components/AdvancedTab';
import NewTaskDialog from '@/components/NewTaskDialog';
import DailyQuote from '@/components/DailyQuote';
import HabitsTracker from '@/components/HabitsTracker';
import ReflectionJournal from '@/components/ReflectionJournal';
import Heatmap from '@/components/Heatmap';
import WeeklyReport from '@/components/WeeklyReport';
import ProductiveHours from '@/components/ProductiveHours';
import ChallengesAndPunishments from '@/components/ChallengesAndPunishments';
import NightSummary from '@/components/NightSummary';
import GamificationBar from '@/components/GamificationBar';
import PomodoroTimer from '@/components/PomodoroTimer';
import DisciplineScore from '@/components/DisciplineScore';
import AiCoach from '@/components/AiCoach';
import Leaderboard from '@/components/Leaderboard';
import CalorieTracker from '@/components/CalorieTracker';
import SmartNotifications from '@/components/SmartNotifications';
import SettingsTab from '@/components/SettingsTab';
import FriendsSystem from '@/components/FriendsSystem';
import LeaguesAndSeasons from '@/components/LeaguesAndSeasons';
import ProgressPhotos from '@/components/ProgressPhotos';

import DisciplineDNA from '@/components/DisciplineDNA';
import DuelSystem from '@/components/DuelSystem';
import ProgressMap from '@/components/ProgressMap';
import AchievementShowcase from '@/components/AchievementShowcase';
import AdvancedAnalytics from '@/components/AdvancedAnalytics';
import MotivationalSplash from '@/components/MotivationalSplash';
import { ConfettiOverlay, useConfetti } from '@/components/CinematicEffects';
import { LayoutDashboard, ListTodo, CalendarDays, Calendar, Zap, BarChart3, BookOpen, LogOut, Users, Timer, Apple, Settings, Camera, Dna } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
  { id: 'tasks', label: 'משימות', icon: ListTodo },
  { id: 'today', label: 'היום', icon: CalendarDays },
  { id: 'weekly', label: 'לו״ז שבועי', icon: Calendar },
  { id: 'analytics', label: 'ניתוח', icon: BarChart3 },
  { id: 'advanced', label: 'מצב מתקדם', icon: Zap },
  { id: 'growth', label: 'צמיחה', icon: BookOpen },
  { id: 'photos', label: 'תמונות', icon: Camera },
  { id: 'focus', label: 'פוקוס', icon: Timer },
  { id: 'nutrition', label: 'תזונה', icon: Apple },
];

const AppContent = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const { fire: fireConfetti, particles } = useConfetti();

  if (showSplash) {
    return <MotivationalSplash onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <ConfettiOverlay particles={particles} />
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-foreground whitespace-nowrap">🎯 מערכת המעקב שלך</h1>
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild title="קהילה" className="hidden sm:inline-flex">
              <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                <Users className="w-4 h-4 ml-1" />
                קהילה
              </a>
            </Button>
            <Button variant="ghost" size="icon" asChild title="קהילה" className="sm:hidden">
              <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                <Users className="w-4 h-4" />
              </a>
            </Button>
            <NewTaskDialog />
            <Button variant="ghost" size="icon" onClick={signOut} title="התנתק">
              <LogOut className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('settings')} title="הגדרות">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/50 bg-card/30 sticky top-[53px] sm:top-[65px] z-40 overflow-x-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 flex gap-0.5 sm:gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-6">
          <GamificationBar />
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <DailyQuote />
            <DisciplineScore />
            <DashboardTab />
            <ProgressMap />
            <AchievementShowcase />
            <Leaderboard />
            <LeaguesAndSeasons />
            <NightSummary />
          </div>
        )}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'today' && (
          <div className="space-y-6">
            <TodayTab />
            <HabitsTracker />
          </div>
        )}
        {activeTab === 'weekly' && <WeeklyTab />}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <AdvancedAnalytics />
            <DisciplineDNA />
            <DisciplineScore />
            <Heatmap />
            <WeeklyReport />
            <ProductiveHours />
          </div>
        )}
        {activeTab === 'advanced' && <AdvancedTab />}
        {activeTab === 'growth' && (
          <div className="space-y-6">
            <DuelSystem />
            <ChallengesAndPunishments />
            <FriendsSystem />
            <ProgressPhotos />
            <ReflectionJournal />
          </div>
        )}
        {activeTab === 'focus' && (
          <div className="space-y-6">
            <PomodoroTimer />
          </div>
        )}
        {activeTab === 'nutrition' && (
          <div className="space-y-6">
            <CalorieTracker />
          </div>
        )}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <ProgressPhotos />
          </div>
        )}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <AiCoach />
      <SmartNotifications />
    </div>
  );
};

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-pulse-glow">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <TaskProvider>
      <AppContent />
    </TaskProvider>
  );
};

export default Index;
