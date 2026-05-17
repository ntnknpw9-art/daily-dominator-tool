import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ApplyPlanDialog from '@/components/ApplyPlanDialog';
import {
  ChevronRight, ChevronLeft, Loader2, Sparkles,
  User, Cake, Ruler, Target, Dumbbell, Calendar,
  MapPin, Clock, Activity, Apple, Flame,
} from 'lucide-react';

interface Props {
  onComplete: () => void;
}

type Answers = {
  gender: 'זכר' | 'נקבה' | '';
  age: number;
  height: number;
  weight: number;
  goal: 'חיטוב' | 'מסה' | 'recomp' | 'כללי' | '';
  experience: 'מתחיל' | 'בינוני' | 'מתקדם' | '';
  daysPerWeek: number;
  location: 'חדר כושר' | 'בית עם משקולות' | 'בית בלי ציוד' | 'קליסטניקס' | '';
  trainingTime: 'בוקר' | 'צהריים' | 'ערב' | '';
  activity: 'יושבני' | 'בינוני' | 'פעיל' | '';
  diet: 'הכל' | 'צמחוני' | 'טבעוני' | 'ללא גלוטן' | '';
};

const initial: Answers = {
  gender: '', age: 25, height: 175, weight: 75,
  goal: '', experience: '', daysPerWeek: 4,
  location: '', trainingTime: '', activity: '', diet: '',
};

const goalLabels: Record<string, string> = {
  'חיטוב': 'חיטוב — ירידה במשקל ושומן',
  'מסה': 'מסה — עלייה במשקל ושריר',
  'recomp': 'עלייה בשריר + ירידה ב