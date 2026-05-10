import { useState, useEffect } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { Task, Category, DayOfWeek, ALL_DAYS, WorkoutDetail } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORIES: Category[] = ['כושר', 'לימודים', 'כסף', 'משמעת', 'אישי'];

interface NewTaskDialogProps {
  editTask?: Task | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const NewTaskDialog = ({ editTask, open: controlledOpen, onOpenChange, hideTrigger }: NewTaskDialogProps) => {
  const { addTask, updateTask } = useTaskContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const isEdit = !!editTask;

  const [name, setName] = useState('');
  const [meaning, setMeaning] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [isForever, setIsForever] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<Category>('אישי');
  const [days, setDays] = useState<DayOfWeek[]>([]);
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [dailyDetails, setDailyDetails] = useState<Record<DayOfWeek, string>>({} as any);

  useEffect(() => {
    if (open && editTask) {
      setName(editTask.name);
      setMeaning(editTask.meaning || '');
      setStartTime(editTask.startTime);
      setEndTime(editTask.endTime);
      const forever = editTask.startDate === '2020-01-01' && editTask.endDate === '2099-12-31';
      setIsForever(forever);
      setStartDate(forever ? '' : editTask.startDate);
      setEndDate(forever ? '' : editTask.endDate);
      setCategory(editTask.category);
      setDays(editTask.days);
      const details: Record<string, string> = {};
      editTask.workoutDetails?.forEach(wd => { details[wd.day] = wd.description; });
      setDailyDetails(details as any);
      setShowDailyDetails((editTask.workoutDetails?.length || 0) > 0);
    } else if (open && !editTask) {
      setName(''); setMeaning(''); setStartTime('08:00'); setEndTime('09:00');
      setIsForever(false); setStartDate(''); setEndDate('');
      setCategory('אישי'); setDays([]); setDailyDetails({} as any); setShowDailyDetails(false);
    }
  }, [open, editTask]);

  const toggleDay = (day: DayOfWeek) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = () => {
    if (!name || days.length === 0) return;
    if (!isForever && (!startDate || !endDate)) return;
    const finalStart = isForever ? '2020-01-01' : startDate;
    const finalEnd = isForever ? '2099-12-31' : endDate;

    const workoutDetails: WorkoutDetail[] = days
      .filter(d => dailyDetails[d]?.trim())
      .map(d => ({ day: d, description: dailyDetails[d].trim() }));

    const payload = {
      name, meaning, startTime, endTime,
      startDate: finalStart, endDate: finalEnd,
      category, days,
      workoutDetails: workoutDetails.length > 0 ? workoutDetails : undefined,
    };

    if (isEdit && editTask) {
      updateTask(editTask.id, payload);
    } else {
      addTask(payload);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            משימה חדשה
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'עריכת משימה' : 'יצירת משימה חדשה'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>שם משימה</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>משמעות</Label>
            <Input value={meaning} onChange={e => setMeaning(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>שעת התחלה</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>שעת סיום</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-2 block">תקופת משימה</Label>
            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={() => setIsForever(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${!isForever ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                תאריך התחלה וסיום
              </button>
              <button
                type="button"
                onClick={() => setIsForever(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${isForever ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
              >
                תמיד ♾️
              </button>
            </div>
            {!isForever && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>תאריך התחלה</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>תאריך סיום</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
          <div>
            <Label className="mb-2 block">קטגוריה</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${category === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>ימים בשבוע</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ALL_DAYS.map(day => (
                <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={days.includes(day)} onCheckedChange={() => toggleDay(day)} />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {days.length > 0 && (
            <div className="border border-border/40 rounded-lg p-3 bg-secondary/20">
              <button
                type="button"
                onClick={() => setShowDailyDetails(!showDailyDetails)}
                className="w-full flex items-center justify-between text-sm font-semibold"
              >
                <span>📋 פירוט יומי לכל יום (אופציונלי)</span>
                {showDailyDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showDailyDetails && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs text-muted-foreground">לדוגמה: ראשון - חזה, שני - גב. או בלימודים: ראשון - חידוד, שני - גזירות.</p>
                  {days.map(d => (
                    <div key={d} className="flex items-center gap-2">
                      <span className="text-xs font-bold w-12 text-accent">{d}</span>
                      <Input
                        value={dailyDetails[d] || ''}
                        onChange={e => setDailyDetails(prev => ({ ...prev, [d]: e.target.value }))}
                        placeholder={`מה לעשות ב${d}...`}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {isEdit ? 'שמור שינויים' : 'צור משימה'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;
