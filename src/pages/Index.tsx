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
  { id: 'weekly', label: 'שבועי', icon: Calendar },
  { id: 'analytics', label: 'ניתוח', icon: BarChart3 },
  { id: 'advanced', label: 'מתקדם', icon: Zap },
  { id: 'growth', label: 'צמיחה', icon: BookOpen },
  { id: 'photos', label: 'תמונות', icon: Camera },
  { id: 'focus', label: 'פוקוס', icon: Timer },
  { id: 'nutrition', label: 'תזונה', icon: Apple },
];

// Bottom nav shows fewer tabs on mobile
const mobileBottomTabs = ['dashboard', 'tasks', 'today', 'analytics', 'growth'];

const AppContent = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSplash, setShowSplash] = useState(true);
  const { fire: fireConfetti, particles } = useConfetti();

  if (showSplash) {
    return <MotivationalSplash onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <ConfettiOverlay particles={particles} />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50 safe-top">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 sm:py-4 flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl font-bold text-foreground whitespace-nowrap">🎯 מערכת המעקב שלך</h1>
          <div className="flex gap-0.5 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild title="קהילה" className="hidden sm:inline-flex">
              <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                <Users className="w-4 h-4 ml-1" />
                קהילה
              </a>
            </Button>
            <Button variant="ghost" size="icon" asChild title="קהילה" className="sm:hidden touch-target">
              <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                <Users className="w-5 h-5" />
              </a>
            </Button>
            <NewTaskDialog />
            <Button variant="ghost" size="icon" onClick={signOut} title="התנתק" className="touch-target">
              <LogOut className="w-4 h-4 sm:w-4 sm:h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setActiveTab('settings')} title="הגדרות" className="touch-target">
              <Settings className="w-4 h-4 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop top nav */}
      <nav className="hidden sm:block border-b border-border/50 bg-card/30 sticky top-[65px] z-40 overflow-x-auto scrollbar-hide">
        <div className="max-w-4xl mx-auto px-4 flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile horizontal scroll nav (all tabs) */}
      <nav className="sm:hidden border-b border-border/50 bg-card/30 sticky top-[49px] z-40 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1.5 px-2 py-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 rounded-t-md ${
                  activeTab === tab.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground active:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <GamificationBar />
        </div>

        <div key={activeTab} className="page-enter">
          {activeTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6 card-stagger">
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
            <div className="space-y-4 sm:space-y-6 card-stagger">
              <TodayTab />
              <HabitsTracker />
            </div>
          )}
          {activeTab === 'weekly' && <WeeklyTab />}
          {activeTab === 'analytics' && (
            <div className="space-y-4 sm:space-y-6 card-stagger">
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
            <div className="space-y-4 sm:space-y-6 card-stagger">
              <DuelSystem />
              <ChallengesAndPunishments />
              <FriendsSystem />
              <ProgressPhotos />
              <ReflectionJournal />
            </div>
          )}
          {activeTab === 'focus' && (
            <div className="space-y-4 sm:space-y-6">
              <PomodoroTimer />
            </div>
          )}
          {activeTab === 'nutrition' && (
            <div className="space-y-4 sm:space-y-6">
              <CalorieTracker />
            </div>
          )}
          {activeTab === 'photos' && (
            <div className="space-y-4 sm:space-y-6">
              <ProgressPhotos />
            </div>
          )}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border/50 safe-bottom">
        <div className="flex justify-around items-center px-1 py-1.5">
          {tabs.filter(t => mobileBottomTabs.includes(t.id)).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
                <span className="text-[11px] font-semibold">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute -top-1 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

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
