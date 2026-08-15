import { useCallback, useEffect, useState } from 'react';
import {
  loadSubscriptionState,
  purchasePlan,
  restorePurchases as restoreStorePurchases,
  type SubscriptionState,
} from '@/lib/subscription';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionStatus = 'loading' | 'ready' | 'error';

const EMPTY: SubscriptionState = {
  plans: [],
  isSubscribed: false,
  renewsAt: null,
  storeUnavailable: false,
};

const syncToBackend = async () => {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.functions.invoke('sync-subscription');
  } catch {
    /* non-blocking */
  }
};

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>('loading');
  const [snapshot, setSnapshot] = useState<SubscriptionState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setSnapshot(await loadSubscriptionState());
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינת המנויים נכשלה');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (packageIdentifier: string) => {
      setIsWorking(true);
      try {
        const active = await purchasePlan(packageIdentifier);
        if (active) {
          void syncToBackend();
          await refresh();
        }
        return active;
      } finally {
        setIsWorking(false);
      }
    },
    [refresh],
  );

  const restore = useCallback(async () => {
    setIsWorking(true);
    try {
      const active = await restoreStorePurchases();
      if (active) {
        void syncToBackend();
        await refresh();
      }
      return active;
    } finally {
      setIsWorking(false);
    }
  }, [refresh]);

  return { status, error, isWorking, refresh, purchase, restore, ...snapshot };
}
