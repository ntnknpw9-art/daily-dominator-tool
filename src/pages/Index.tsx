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
import { LayoutDashboard, ListTodo, CalendarDays, Calendar, Zap, BarChart3, BookOpen, LogOut, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
  { id: 'tasks', label: 'משימות', icon: ListTodo },
  { id: 'today', label: 'היום', icon: CalendarDays },
  { id: 'weekly', label: 'לו״ז שבועי', icon: Calendar },
  { id: 'analytics', label: 'ניתוח', icon: BarChart3 },
  { id: 'advanced', label: 'מצב מתקדם', icon: Zap },
  { id: 'growth', label: 'צמיחה', icon: BookOpen },
];

const AppContent = () => {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🎯 מערכת המעקב שלך</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild title="קהילה">
              <a href="https://chat.whatsapp.com/EJcWCuUd50U4t4KSu7pmrf" target="_blank" rel="noopener noreferrer">
                <Users className="w-4 h-4 ml-1" />
                קהילה
              </a>
            </Button>
            <NewTaskDialog />
            <Button variant="ghost" size="icon" onClick={signOut} title="התנתק">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border/50 bg-card/30 sticky top-[65px] z-40 overflow-x-auto">
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <DailyQuote />
            <DashboardTab />
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
            <Heatmap />
            <WeeklyReport />
            <ProductiveHours />
          </div>
        )}
        {activeTab === 'advanced' && <AdvancedTab />}
        {activeTab === 'growth' && (
          <div className="space-y-6">
            <ChallengesAndPunishments />
            <ReflectionJournal />
          </div>
        )}
      </main>
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
