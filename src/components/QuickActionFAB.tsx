import { useState } from 'react';
import { Plus, ListTodo, Apple, Camera, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewTaskDialog from './NewTaskDialog';
import { cn } from '@/lib/utils';

export function QuickActionFAB({ setActiveTab }: { setActiveTab: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const handleAction = (tab: string) => {
    setActiveTab(tab);
    setOpen(false);
  };

  return (
    <>
      <NewTaskDialog 
        open={taskDialogOpen} 
        onOpenChange={setTaskDialogOpen} 
        hideTrigger 
      />

      <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col gap-3 items-end animate-in slide-in-from-bottom-5 fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">פוקוס</span>
              <Button 
                size="icon" 
                className="rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleAction('focus')}
              >
                <Timer className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">תמונת מצב</span>
              <Button 
                size="icon" 
                className="rounded-full w-12 h-12 shadow-lg bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => handleAction('photos')}
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">תיעוד תזונה</span>
              <Button 
                size="icon" 
                className="rounded-full w-12 h-12 shadow-lg bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleAction('nutrition')}
              >
                <Apple className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium border border-border/50 shadow-sm">משימה חדשה</span>
              <Button 
                size="icon" 
                className="rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  setTaskDialogOpen(true);
                  setOpen(false);
                }}
              >
                <ListTodo className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        <Button
          size="icon"
          onClick={() => setOpen(!open)}
          className={cn(
            "rounded-full w-14 h-14 shadow-xl transition-all duration-300",
            open ? "bg-muted text-foreground rotate-45" : "bg-primary text-primary-foreground hover:scale-105"
          )}
        >
          {open ? <Plus className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </Button>
      </div>
      
      {open && (
        <div 
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40" 
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}