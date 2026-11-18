import { authRequest } from '@/lib/auth-errors';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logOutRevenueCat } from '@/lib/revenuecat';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      // A session whose account was deleted (e.g. on another device) must not
      // keep the app looking signed in. Only sign out when the server says the
      // user no longer exists — never on outages or network errors.
      if (session) {
        const { error } = await supabase.auth.getUser();
        const code = (error as { code?: string } | null)?.code;
        if (code === 'user_not_found') {
          await supabase.auth.signOut({ scope: 'local' });
        }
      }
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await authRequest(() => supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    }));
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await authRequest(() => supabase.auth.signInWithPassword({ email, password }));
    return { error };
  };

  const signOut = async () => {
    // Clear the RevenueCat identity first so entitlements never carry over
    // to the next account signing in on this device. The native bridge can
    // hang, so never let it block the actual sign-out.
    try {
      await Promise.race([
        logOutRevenueCat(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (e) {
      console.warn('RevenueCat logout failed', e);
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' });
    } catch {
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
