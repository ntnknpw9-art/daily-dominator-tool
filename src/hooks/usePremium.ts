import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { refreshPremiumStatus, isIOSNative } from '@/lib/revenuecat';

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const reload = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // Read from DB first for instant UI
    const { data } = await supabase
      .from('user_subscriptions')
      .select('is_premium, product_id, expires_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setIsPremium(!!data.is_premium);
      setProductId(data.product_id);
      setExpiresAt(data.expires_at);
    }
    // Then refresh from RevenueCat on iOS
    if (isIOSNative()) {
      const fresh = await refreshPremiumStatus();
      if (fresh) {
        setIsPremium(fresh.isPremium);
        setProductId(fresh.productId);
        setExpiresAt(fresh.expiresAt);
      }
    }
    setLoading(false);
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [user?.id]);

  return { isPremium, loading, productId, expiresAt, reload };
}
