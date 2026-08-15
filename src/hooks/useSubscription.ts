import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadSubscriptionState,
  purchasePlan,
  restorePurchases as restoreStorePurchases,
  isStoreAvailable,
  PREVIEW_PLANS,
  MissingApiKeyError,
  StoreUnavailableError,
  type PlanOption,
} from '@/lib/subscription';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionStatus = 'loading' | 'ready' | 'error';

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
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [storeUnavailable, setStoreUnavailable] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      if (!(await isStoreAvailable())) {
        if (!mounted.current) return;
        setPlans(PREVIEW_PLANS);
        setStoreUnavailable(true);
        setStatus('ready');
        return;
      }
      const state = await loadSubscriptionState();
      if (!mounted.current) return;
      setPlans(state.plans);
      setIsSubscribed(state.isSubscribed);
      setRenewsAt(state.renewsAt);
      setStoreUnavailable(state.plans.length === 0);
      setStatus('ready');
    } catch (e) {
      if (!mounted.current) return;
      if (e instanceof StoreUnavailableError) {
        setPlans(PREVIEW_PLANS);
        setStoreUnavailable(true);
        setStatus('ready');
        return;
      }
      setError(
        e instanceof MissingApiKeyError
          ? e.message
          : (e as Error)?.message || 'שגיאה בטעינת המנויים מ-App Store'
      );
      setStatus('error');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const purchase = useCallback(async (packageIdentifier: string) => {
    setIsWorking(true);
    try {
      const ok = await purchasePlan(packageIdentifier);
      if (ok) {
        await syncToBackend();
        await refresh();
      }
      return ok;
    } finally {
      if (mounted.current) setIsWorking(false);
    }
  }, [refresh]);

  const restore = useCallback(async () => {
    setIsWorking(true);
    try {
      const ok = await restoreStorePurchases();
      if (ok) {
        await syncToBackend();
        await refresh();
      }
      return ok;
    } finally {
      if (mounted.current) setIsWorking(false);
    }
  }, [refresh]);

  return {
    status,
    error,
    isWorking,
    plans,
    isSubscribed,
    renewsAt,
    storeUnavailable,
    refresh,
    purchase,
    restore,
  };
}
