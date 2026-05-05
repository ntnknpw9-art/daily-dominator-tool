import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { useEffect } from 'react';

// אתחול Google Auth באפליקציה הנייטיבית
if (Capacitor.isNativePlatform()) {
  try {
    GoogleAuth.initialize({
      clientId: '', // ה-iOS Client ID נטען מה-Info.plist
      scopes: ['profile', 'email'],
      grantOfflineAccess: false,
    });
  } catch (e) {
    console.warn('GoogleAuth init failed', e);
  }
}

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [appleError, setAppleError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const friendlyAppleError = (msg?: string) => {
    const m = (msg || '').toLowerCase();
    if (!msg) return 'ההתחברות עם Apple נכשלה. נסה שוב.';
    if (m.includes('cancel') || m.includes('closed') || m.includes('popup') || m.includes('denied') || m.includes('access_denied'))
      return 'ביטלת את ההתחברות עם Apple. אפשר לנסות שוב.';
    if (m.includes('network') || m.includes('fetch') || m.includes('timeout'))
      return 'בעיית רשת בהתחברות עם Apple. בדוק את החיבור ונסה שוב.';
    if (m.includes('not enabled') || m.includes('provider') || m.includes('disabled'))
      return 'התחברות עם Apple אינה מוגדרת כרגע. פנה לתמיכה.';
    if (m.includes('email') && m.includes('exist'))
      return 'כבר קיים חשבון עם המייל הזה. התחבר עם המייל/Google ושייך את Apple מההגדרות.';
    return `שגיאה בהתחברות עם Apple: ${msg}`;
  };

  const handleAppleSignIn = async () => {
    setError('');
    setAppleError('');
    setLoading(true);
    try {
      // באפליקציית iOS - שימוש ב-Sign in with Apple נייטיבי
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const options: SignInWithAppleOptions = {
          clientId: 'com.natanknafo.dailydominator',
          redirectURI: 'https://daily-dominator-tool.lovable.app',
          scopes: 'email name',
          state: Math.random().toString(36).substring(7),
          nonce: Math.random().toString(36).substring(7),
        };
        const res = await SignInWithApple.authorize(options);
        const idToken = res.response?.identityToken;
        if (!idToken) {
          setAppleError('לא התקבל token מאפל. נסה שוב.');
          return;
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
          nonce: options.nonce,
        });
        if (error) {
          setAppleError(friendlyAppleError(error.message));
        }
        return;
      }
      // בדפדפן - OAuth רגיל
      const result = await lovable.auth.signInWithOAuth('apple', {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        setAppleError(friendlyAppleError(result.error.message));
      }
    } catch (e: any) {
      setAppleError(friendlyAppleError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error.message);
      else setSuccessMsg('נרשמת בהצלחה! בדוק את המייל לאימות.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-foreground">מערכת המעקב שלך</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? 'התחבר כדי להמשיך' : 'צור חשבון חדש'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label>שם תצוגה</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="השם שלך"
              />
            </div>
          )}
          <div>
            <Label>אימייל</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@mail.com"
              required
              dir="ltr"
            />
          </div>
          <div>
            <Label>סיסמה</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              dir="ltr"
              minLength={6}
            />
          </div>

          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg p-3">{error}</div>}
          {successMsg && <div className="text-success text-sm bg-success/10 rounded-lg p-3">{successMsg}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : isLogin ? 'התחבר' : 'הירשם'}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">או</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={async () => {
            setError('');
            setLoading(true);
            try {
              if (Capacitor.isNativePlatform()) {
                // Google Sign-In נייטיבי באפליקציה
                const googleUser = await GoogleAuth.signIn();
                const idToken = googleUser?.authentication?.idToken;
                if (!idToken) {
                  setError('לא התקבל token מ-Google. נסה שוב.');
                  setLoading(false);
                  return;
                }
                const { error } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: idToken,
                });
                if (error) setError(error.message || 'שגיאה בהתחברות עם Google');
              } else {
                // OAuth דפדפן רגיל
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) {
                  setError(result.error.message || 'שגיאה בהתחברות עם Google');
                }
              }
            } catch (e: any) {
              const msg = (e?.message || '').toLowerCase();
              if (msg.includes('cancel') || msg.includes('12501')) {
                // המשתמש ביטל - אין צורך להציג שגיאה
              } else {
                setError(e?.message || 'שגיאה בהתחברות עם Google');
              }
            }
            setLoading(false);
          }}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          התחבר עם Google
        </Button>

        <Button
          variant="outline"
          className="w-full gap-2 mt-2"
          onClick={handleAppleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          התחבר עם Apple
        </Button>

        {appleError && (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2">
            <p className="text-destructive text-sm font-medium">{appleError}</p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={handleAppleSignIn}
              disabled={loading}
            >
              {loading ? 'מנסה שוב...' : 'נסה שוב'}
            </Button>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? 'אין לך חשבון? הירשם' : 'יש לך חשבון? התחבר'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
