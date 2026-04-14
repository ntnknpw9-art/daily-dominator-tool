import { useState } from 'react';
import { TaskProvider } from '@/context/TaskContext';
import DashboardTab from '@/components/DashboardTab';
import TasksTab from '@/components/TasksTab';
import TodayTab from '@/components/TodayTab';
import WeeklyTab from '@/components/WeeklyTab';
import AdvancedTab from '@/components/AdvancedTab';
import NewTaskDialog from '@/components/NewTaskDialog';
import { LayoutDashboard, ListTodo, CalendarDays, Calendar, Zap } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'ראשי', icon: LayoutDashboard },
  { id: 'tasks', label: 'משימות', icon: ListTodo },
  { id: 'today', label: 'היום', icon: CalendarDays },
  { id: 'weekly', label: 'לו״ז שבועי', icon: Calendar },
  { id: 'advanced', label: 'מצב מתקדם', icon: Zap },
];

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">🎯 מערכת המעקב שלך</h1>
          <NewTaskDialog />
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
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
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
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'today' && <TodayTab />}
        {activeTab === 'weekly' && <WeeklyTab />}
        {activeTab === 'advanced' && <AdvancedTab />}
      </main>
    </div>
  );
};

const Index = () => (
  <TaskProvider>
    <AppContent />
  </TaskProvider>
);

export default Index;
