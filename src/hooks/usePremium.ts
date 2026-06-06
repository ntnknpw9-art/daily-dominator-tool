import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { refreshPremiumStatus, isIOSNative } from '@/lib/revenuecat';

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    console.log('[SUBSCRIPTION DEBUG][usePremium] reload start', { at: new Date().toISOString(), userId: user?.id ?? null, iOSNative: isIOSNative() });
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // Read from DB first for instant UI
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('is_premium, product_id, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    console.log('[SUBSCRIPTION DEBUG][usePremium] database result', { data, error });
    if (data) {
      setIsPremium(!!data.is_premium);
      setProductId(data.product_id);
      setExpiresAt(data.expires_at);
    }
    // Then refresh from RevenueCat on iOS
    if (isIOSNative()) {
      const fresh = await refreshPremiumStatus();
      console.log('[SUBSCRIPTION DEBUG][usePremium] native refresh result', fresh);
      if (fresh) {
        setIsPremium(fresh.isPremium);
        setProductId(fresh.productId);
        setExpiresAt(fresh.expiresAt);
      }
    }
    console.log('[SUBSCRIPTION DEBUG][usePremium] reload done');
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { isPremium, loading, productId, expiresAt, reload };
}
