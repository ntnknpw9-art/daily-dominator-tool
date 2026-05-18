import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';

const PUBLISHED_APP_ORIGIN = 'https://daily-dominator-tool.lovable.app';
const GOOGLE_IOS_CLIENT_ID = '309108409035-3sl22316bkmuom32e1c2jtjjbmgava6i.apps.googleusercontent.com';
const GOOGLE_WEB_CLIENT_ID = '309108409035-jdt751p79apqvbsqdtmkl3vud34clqhi.apps.googleusercontent.com';

const generateNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const sha256Hex = async (value: string) => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resetStep, setResetStep] = useState<'none' | 'email' | 'code'>('none');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (otpCode.length !== 6) {
      setError('הזן קוד בן 6 ספרות');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });
    setLoading(false);
    if (error) setError('קוד שגוי או שפג תוקפו. נסה שוב.');
    // success → onAuthStateChange ייכנס למשתמש אוטומטית
  };

  const handleResendOtp = async () => {
    setError(''); setSuccessMsg('');
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccessMsg('קוד חדש נשלח למייל שלך');
  };

  const sendResetCode = async () => {
    setError(''); setSuccessMsg('');
    if (!email) { setError('הזן את כתובת המייל שלך'); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetStep('code');
    setSuccessMsg('שלחנו קוד בן 6 ספרות למייל שלך');
  };

  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (resetCode.length !== 6) { setError('הזן קוד בן 6 ספרות'); return; }
    if (newPassword.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (newPassword !== confirmNewPassword) { setError('הסיסמאות אינן תואמות'); return; }
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: resetCode,
      type: 'recovery',
    });
    if (verifyError) {
      setLoading(false);
      setError('קוד שגוי או שפג תוקפו. נסה שוב.');
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccessMsg('הסיסמה עודכנה בהצלחה! מתחבר...');
    setResetStep('none');
    setResetCode(''); setNewPassword(''); setConfirmNewPassword('');
  };


  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email) {
      setError('הזן את כתובת המייל שלך');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccessMsg('נשלח מייל לאיפוס סיסמה. בדוק את תיבת הדואר שלך.');
  };

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

  const friendlyGoogleError = (msg?: string) => {
    const m = (msg || '').toLowerCase();
    if (!msg) return 'ההתחברות עם Google נכשלה. נסה שוב.';
    if (m.includes('cancel') || m.includes('12501') || m.includes('canceled')) return '';
    if (m.includes('unacceptable audience') || m.includes('audience'))
      return 'ה-Web Client ID של Google עדיין לא מאושר ב-Lovable Cloud. צריך להזין שם את ה-Web Client ID וה-Client Secret ואז להריץ שוב sync.';
    if (m.includes('invalid_client') || m.includes('client') || m.includes('audience'))
      return 'התחברות Google לא מוגדרת נכון כרגע. בדוק שה-Web Client ID וה-Client Secret שמורים בהגדרות Google ב-Lovable Cloud.';
    if (m.includes('network') || m.includes('fetch') || m.includes('timeout'))
      return 'בעיית רשת בהתחברות עם Google. בדוק את החיבור ונסה שוב.';
    return `שגיאה בהתחברות עם Google: ${msg}`;
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const rawNonce = generateNonce();
        const hashedNonce = await sha256Hex(rawNonce);
        await SocialLogin.initialize({
          google: {
            iOSClientId: GOOGLE_IOS_CLIENT_ID,
            iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
            mode: 'online',
          },
        });
        const res = await SocialLogin.login({
          provider: 'google',
          options: {
            scopes: ['email', 'profile'],
            nonce: hashedNonce,
            forcePrompt: true,
          },
        });
        const idToken = res.result.responseType === 'online' ? res.result.idToken : null;
        if (!idToken) {
          setError('לא התקבל token מ-Google. נסה שוב.');
          return;
        }
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          nonce: rawNonce,
        });
        if (error) setError(friendlyGoogleError(error.message));
        return;
      }

      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result?.error) setError(friendlyGoogleError(result.error.message));
    } catch (e: any) {
      const message = friendlyGoogleError(e?.message);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setAppleError('');
    setLoading(true);
    try {
      // באפליקציית iOS - שימוש ב-Sign in with Apple נייטיבי
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const rawNonce = generateNonce();
        const hashedNonce = await sha256Hex(rawNonce);
        const options: SignInWithAppleOptions = {
          clientId: 'com.natanknafo.dailydominator',
          redirectURI: PUBLISHED_APP_ORIGIN,
          scopes: 'email name',
          state: generateNonce(),
          nonce: hashedNonce,
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
          nonce: rawNonce,
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

    if (!isLogin && !acceptedTerms) {
      setError('יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להירשם.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error.message);
      else {
        setOtpStep(true);
        setSuccessMsg('שלחנו קוד בן 6 ספרות למייל שלך');
      }
    }
    setLoading(false);
  };

  if (resetStep === 'code') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-md animate-scale-in" dir="rtl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔑</div>
            <h1 className="text-2xl font-bold">איפוס סיסמה</h1>
            <p className="text-sm text-muted-foreground mt-2">
              שלחנו קוד בן 6 ספרות אל
              <br />
              <strong className="text-foreground" dir="ltr">{email}</strong>
            </p>
          </div>

          <form onSubmit={handleResetWithCode} className="space-y-4">
            <div>
              <Label className="text-center block mb-2">קוד אימות</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={resetCode}
                onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-3xl font-bold tracking-[0.5em] h-16"
                dir="ltr"
                autoFocus
              />
            </div>
            <div>
              <Label>סיסמה חדשה</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                minLength={6}
                required
              />
            </div>
            <div>
              <Label>אימות סיסמה</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                minLength={6}
                required
              />
            </div>

            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg p-3 text-center">{error}</div>}
            {successMsg && <div className="text-success text-sm bg-success/10 rounded-lg p-3 text-center">{successMsg}</div>}

            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading ? '...' : 'אפס סיסמה'}
            </Button>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={sendResetCode}
                disabled={loading}
                className="text-sm text-primary hover:underline"
              >
                לא קיבלת? שלח קוד חדש
              </button>
              <button
                type="button"
                onClick={() => { setResetStep('none'); setResetCode(''); setNewPassword(''); setConfirmNewPassword(''); setError(''); setSuccessMsg(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← חזור להתחברות
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (otpStep) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-md animate-scale-in" dir="rtl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📧</div>
            <h1 className="text-2xl font-bold">בדוק את המייל שלך</h1>
            <p className="text-sm text-muted-foreground mt-2">
              שלחנו קוד בן 6 ספרות אל
              <br />
              <strong className="text-foreground" dir="ltr">{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label className="text-center block mb-2">קוד אימות</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-3xl font-bold tracking-[0.5em] h-16"
                dir="ltr"
                autoFocus
              />
            </div>

            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg p-3 text-center">{error}</div>}
            {successMsg && <div className="text-success text-sm bg-success/10 rounded-lg p-3 text-center">{successMsg}</div>}

            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading || otpCode.length !== 6}>
              {loading ? '...' : 'אמת קוד'}
            </Button>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm text-primary hover:underline"
              >
                לא קיבלת? שלח קוד חדש
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); setSuccessMsg(''); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← חזור להרשמה
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
            {isLogin && (
              <button
                type="button"
                onClick={async () => {
                  if (!email) { setError('הזן את כתובת המייל שלך כדי לאפס סיסמה'); return; }
                  setResetStep('code');
                  await sendResetCode();
                }}
                className="text-xs text-primary hover:underline mt-1"
              >
                שכחת סיסמה?
              </button>
            )}
          </div>

          {!isLogin && (
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="leading-relaxed">
                אני מאשר/ת שקראתי ואני מסכים/ה ל
                <a href="/terms" target="_blank" rel="noopener" className="text-primary underline mx-1">תנאי השימוש</a>
                ול
                <a href="/privacy" target="_blank" rel="noopener" className="text-primary underline mx-1">מדיניות הפרטיות</a>
              </span>
            </label>
          )}

          {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg p-3">{error}</div>}
          {successMsg && <div className="text-success text-sm bg-success/10 rounded-lg p-3">{successMsg}</div>}

          <Button type="submit" className="w-full" disabled={loading || (!isLogin && !acceptedTerms)}>
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

        <Button
          variant="outline"
          className="w-full gap-2 mt-2"
          onClick={handleGoogleSignIn}
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

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? 'אין לך חשבון? הירשם' : 'יש לך חשבון? התחבר'}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground leading-relaxed">
          בהמשך, אתה מסכים ל
          <a href="/terms" className="text-primary underline mx-1">תנאי השימוש</a>
          ול
          <a href="/privacy" className="text-primary underline mx-1">מדיניות הפרטיות</a>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
