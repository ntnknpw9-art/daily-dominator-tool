import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Capacitor } from '@capacitor/core';
import { CapacitorHealthkit, SampleNames, OtherData, SleepData } from '@perfood/capacitor-healthkit';
import { toast } from 'sonner';

export const useHealthSync = () => {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncHealthData = useCallback(async () => {
    if (!user) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
      toast.info('סנכרון שעונים זמין רק במכשירי iOS עם אפליקציה מותקנת.');
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Request Authorization
      await CapacitorHealthkit.requestAuthorization({
        all: [''],
        read: [SampleNames.STEP_COUNT, SampleNames.SLEEP_ANALYSIS, SampleNames.ACTIVE_ENERGY_BURNED, SampleNames.APPLE_EXERCISE_TIME],
        write: [''],
      });

      // 2. Fetch last 7 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      // Steps
      const stepsRes = await CapacitorHealthkit.queryHKitSampleType<OtherData>({
        sampleName: SampleNames.STEP_COUNT,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      // Sleep
      const sleepRes = await CapacitorHealthkit.queryHKitSampleType<SleepData>({
        sampleName: SampleNames.SLEEP_ANALYSIS,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      // Active Calories
      const activeCalsRes = await CapacitorHealthkit.queryHKitSampleType<OtherData>({
        sampleName: SampleNames.ACTIVE_ENERGY_BURNED,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      // Exercise Time
      const exerciseRes = await CapacitorHealthkit.queryHKitSampleType<OtherData>({
        sampleName: SampleNames.APPLE_EXERCISE_TIME,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      // Aggregate data by date
      const aggregatedData: Record<string, { steps: number; sleepSeconds: number; activeCalories: number; exerciseMinutes: number }> = {};
      
      const getLocalDateStr = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      };

      const initDate = (date: string) => {
        if (!aggregatedData[date]) {
          aggregatedData[date] = { steps: 0, sleepSeconds: 0, activeCalories: 0, exerciseMinutes: 0 };
        }
      };

      // Aggregate Steps
      if (stepsRes && stepsRes.resultData) {
        stepsRes.resultData.forEach((s) => {
          const date = getLocalDateStr(s.startDate);
          initDate(date);
          aggregatedData[date].steps += s.value;
        });
      }

      // Aggregate Sleep (Only count actual sleep: Asleep/InBed)
      if (sleepRes && sleepRes.resultData) {
        sleepRes.resultData.forEach((s) => {
          if (s.sleepState === 'asleep' || s.sleepState === 'inBed' || s.sleepState?.toLowerCase().includes('asleep')) {
             const date = getLocalDateStr(s.endDate); // Use end date for sleep (waking up day)
             initDate(date);
             const start = new Date(s.startDate).getTime();
             const end = new Date(s.endDate).getTime();
             const durationSecs = (end - start) / 1000;
             if (durationSecs > 0) {
               aggregatedData[date].sleepSeconds += durationSecs;
             }
          }
        });
      }

      // Aggregate Active Calories
      if (activeCalsRes && activeCalsRes.resultData) {
        activeCalsRes.resultData.forEach((s) => {
          const date = getLocalDateStr(s.startDate);
          initDate(date);
          aggregatedData[date].activeCalories += s.value;
        });
      }

      // Aggregate Exercise Time
      if (exerciseRes && exerciseRes.resultData) {
        exerciseRes.resultData.forEach((s) => {
          const date = getLocalDateStr(s.startDate);
          initDate(date);
          aggregatedData[date].exerciseMinutes += s.value;
        });
      }

      // 3. Save to Supabase
      const healthLogsToUpsert = [];
      const habitsToUpsert = [];

      // Fetch user's sleep target
      const { data: targets } = await supabase.from('user_targets').select('sleep_hours').eq('user_id', user.id).maybeSingle();
      const targetSleepHours = Number(targets?.sleep_hours) || 7;

      for (const [date, data] of Object.entries(aggregatedData)) {
        if (data.steps > 0 || data.activeCalories > 0 || data.exerciseMinutes > 0) {
          healthLogsToUpsert.push({
            user_id: user.id,
            log_date: date,
            steps: Math.round(data.steps),
            active_calories: Math.round(data.activeCalories),
            exercise_minutes: Math.round(data.exerciseMinutes),
          });
        }
        
        if (data.sleepSeconds > 0) {
          const sleepHours = data.sleepSeconds / 3600;
          if (sleepHours >= targetSleepHours) {
            habitsToUpsert.push({
              user_id: user.id,
              habit_date: date,
              habit_id: 'sleep',
              completed: true,
            });
          }
        }
      }

      // Upsert health logs
      for (const log of healthLogsToUpsert) {
         await supabase.from('daily_health_logs').upsert({
           user_id: log.user_id,
           log_date: log.log_date,
           steps: log.steps,
           active_calories: log.active_calories,
           exercise_minutes: log.exercise_minutes
         }, { onConflict: 'user_id,log_date' });
      }

      // Upsert sleep habits
      for (const habit of habitsToUpsert) {
         await supabase.from('habits').upsert({
           user_id: habit.user_id,
           habit_date: habit.habit_date,
           habit_id: habit.habit_id,
           completed: habit.completed
         }, { onConflict: 'user_id,habit_id,habit_date' });
      }

      toast.success('נתוני בריאות (צעדים ושינה) סונכרנו בהצלחה!');
    } catch (e: any) {
      console.error('Sync error:', e);
      toast.error('שגיאה בסנכרון נתוני בריאות: ' + (e.message || ''));
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return { syncHealthData, isSyncing };
};
