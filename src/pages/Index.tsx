import { useState, useEffect, useRef } from 'react';
import { SeoHead } from '@/components/SeoHead';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import OnboardingFlow from '@/components/OnboardingFlow';
import WorkoutsTab from '@/components/WorkoutsTab';
import { ConfettiOverlay, useConfetti } from '@/components/CinematicEffects';
import { LayoutDashboard, CheckSquare, TrendingUp, BarChart3, Settings, LogOut, Users, Menu, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/AppSidebar';
import { QuickActionFAB } from '@/components/QuickActionFAB';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

const mobileBottomTabs = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
  { id: 'action', label: 'פעולות', icon: CheckSquare },
  { id: 'workouts', label: 'אימונים', icon: Dumbbell },
  { id: 'growth', label: 'צמיחה', icon: TrendingUp },
  { id: 'analytics', label: 'נתונים', icon: BarChart3 },
];

const AppContent = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    // Resume an in-progress workout after the app was backgrounded/reloaded
    try {
      const raw = localStorage.getItem('dd_active_workout');
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.key && Date.now() - (p.startedAt ?? 0) < 8 * 60 * 60 * 1000) return 'workouts';
      }
    } catch { /* noop */ }
    return 'dashboard';
  });

  const [showSplash, setShowSplash] = useState(true);
  const { fire: fireConfetti, particles } = useConfetti();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  if (showSplash) {
    return <MotivationalSplash onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <SidebarProvider>
      <div className="h-[100dvh] overflow-hidden bg-background flex w-full">
        <ConfettiOverlay particles={particles} />
        
        {/* Desktop Sidebar */}
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {/* Header */}
          <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40 safe-top">
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="hidden md:flex ml-2" />
                <h1 className="text-xl sm:text-2xl font-black text-foreground whitespace-nowrap tracking-tight">המעקב שלך 🎯</h1>
              </div>
              <div className="flex gap-1 sm:gap-2 shrink-0 items-center">
                <Button variant="ghost" size="sm" asChild title="קהילה" className="gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-medium">
                  <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                    <Users className="w-4 h-4" />
                    <span>קהילה</span>
                  </a>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setActiveTab('settings')} title="הגדרות" className="h-8 w-8 sm:h-9 sm:w-9">
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={signOut} title="התנתק" className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-destructive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-6">
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
                  <NightSummary />
                </div>
              )}
              {activeTab === 'action' && (
                <div className="space-y-4 sm:space-y-6 card-stagger">
                  <TodayTab />
                  <HabitsTracker />
                  <TasksTab />
                </div>
              )}
              {activeTab === 'analytics' && (
                <div className="space-y-4 sm:space-y-6 card-stagger">
                  <WeeklyReport />
                  <WeeklyTab />
                  <Heatmap />
                  <ProductiveHours />
                  <AdvancedAnalytics />
                  <DisciplineDNA />
                </div>
              )}
              {activeTab === 'workouts' && (
                <div className="space-y-4 sm:space-y-6 card-stagger">
                  <WorkoutsTab />
                </div>
              )}
              {activeTab === 'growth' && (
                <div className="space-y-4 sm:space-y-6 card-stagger">
                  <Leaderboard />
                  <LeaguesAndSeasons />
                  <DuelSystem />
                  <ChallengesAndPunishments />
                  <FriendsSystem />
                  <ReflectionJournal />
                </div>
              )}
              
              {/* Extra Tools from Sidebar/FAB */}
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
        </div>

        {activeTab !== 'workouts' && <QuickActionFAB setActiveTab={setActiveTab} />}

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/50 safe-bottom">
          <div className="flex justify-around items-center px-1 py-1.5">
            {mobileBottomTabs.map(tab => {
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
      </div>
      <AiCoach />
      <SmartNotifications />
    </SidebarProvider>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setCheckingAdmin(true);
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        window.location.replace('/admin');
        return;
      }
      setCheckingAdmin(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || checkingAdmin) {
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
    <>
      <SeoHead
        title="Daily Dominator — מעקב משמעת עצמית ופרודוקטיביות"
        description="עקבו אחרי משימות, הרגלים, אימונים ותזונה בעברית. דוחות שבועיים, הישגים ויעדים יומיים לבניית משמעת עצמית."
        path="/"
      />
      <TaskProvider>
        <OnboardingGate />
      </TaskProvider>
    </>
  );
};

const OnboardingGate = () => {
  const { user } = useAuth();
  const onboardingKey = user ? `onboarding_done_${user.id}` : null;
  const [done, setDone] = useState(() => (onboardingKey ? localStorage.getItem(onboardingKey) === '1' : false));

  useEffect(() => {
    setDone(onboardingKey ? localStorage.getItem(onboardingKey) === '1' : false);
  }, [onboardingKey]);

  if (!user) return <AuthPage />;
  if (!done) return <OnboardingFlow onComplete={() => setDone(true)} />;
  return <AppContent />;
};

export default Index;
