import { useState } from 'react';
import { useTaskContext } from '@/context/TaskContext';
import { Category, DayOfWeek, ALL_DAYS } from '@/types/task';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

const CATEGORIES: Category[] = ['כושר', 'לימודים', 'כסף', 'משמעת', 'אישי'];

const NewTaskDialog = () => {
  const { addTask } = useTaskContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [meaning, setMeaning] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState<Category>('אישי');
  const [days, setDays] = useState<DayOfWeek[]>([]);

  const toggleDay = (day: DayOfWeek) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSubmit = () => {
    if (!name || !startDate || !endDate || days.length === 0) return;
    addTask({ name, meaning, startTime, endTime, startDate, endDate, category, days });
    setName(''); setMeaning(''); setDays([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          משימה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>יצירת משימה חדשה</DialogTitle>
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
          <div>
            <Label>קטגוריה</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
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
          <Button onClick={handleSubmit} className="w-full">צור משימה</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;
