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
import { Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';

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

const BrandMark = () => (
  <div className="relative w-16 h-16 mx-auto mb-4">
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(0,85%,55%)] blur-xl opacity-40" />
    <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(0,85%,55%)] flex items-center justify-center shadow-lg border border-white/10">
      <Shield className="w-8 h-8 text-white" strokeWidth={1.5} />
    </div>
  </div>
);

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
    if (otpCode.length !== 8) {
      setError('הזן קוד בן 8 ספרות');
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
    setSuccessMsg('שלחנו קוד בן 8 ספרות למייל שלך');
  };

  const handleResetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (resetCode.length !== 8) { setError('הזן קוד בן 8 ספרות'); return; }
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
      let { error } = await signIn(email, password);
      if (error) {
        const msg = (error.message || '').toLowerCase();
        const isUnconfirmed =
          msg.includes('not confirmed') ||
          msg.includes('email_not_confirmed');
        if (isUnconfirmed) {
          try {
            const { data: rescue, error: rescueError } = await supabase.functions.invoke(
              'auth-rescue',
              { body: { email, password } },
            );
            if (!rescueError && rescue && !(rescue as { error?: string }).error) {
              const retry = await signIn(email, password);
              error = retry.error;
            }
          } catch {
            // ignore — fall through to original error
          }
        }
        if (error) setError(error.message);
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) setError(error.message);
      else {
        setOtpStep(true);
        setSuccessMsg('שלחנו קוד בן 8 ספרות למייל שלך');
      }
    }
    setLoading(false);
  };

  const SocialButton = ({
    onClick,
    icon,
    label,
    disabled,
  }: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full group relative flex items-center justify-center gap-2.5 h-12 px-4 rounded-xl bg-[hsl(0,0%,9%)] border border-white/[0.06] text-sm font-medium text-white/90 hover:bg-[hsl(0,0%,11%)] hover:border-white/[0.1] active:scale-[0.985] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const AuthBackground = () => (
    <>
      <div className="fixed inset-0 bg-[hsl(0,0%,4%)] -z-20" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(0,85%,55%)] opacity-[0.12] blur-[120px] -translate-y-1/3 translate-x-1/4 -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-[hsl(14,100%,57%)] opacity-[0.06] blur-[100px] translate-y-1/3 -translate-x-1/4 -z-10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.03),transparent_50%)] -z-10 pointer-events-none" />
    </>
  );

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`glass-card-strong w-full max-w-[420px] p-7 sm:p-9 animate-rise-in ${className}`} dir="rtl">
      {children}
    </div>
  );

  const InputField = ({
    label,
    icon,
    children,
    error: fieldError,
  }: {
    label: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    error?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/60 mr-1 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[hsl(14,100%,57%)] transition-colors duration-200 pointer-events-none">
          {icon}
        </div>
        {children}
      </div>
      {fieldError && <p className="text-xs text-[hsl(0,84%,60%)] mr-1">{fieldError}</p>}
    </div>
  );

  const ErrorBanner = ({ message }: { message: string }) => (
    <div className="rounded-xl bg-[hsl(0,84%,60%)]/10 border border-[hsl(0,84%,60%)]/20 p-3.5 text-sm text-[hsl(0,84%,60%)] text-center animate-rise-in">
      {message}
    </div>
  );

  const SuccessBanner = ({ message }: { message: string }) => (
    <div className="rounded-xl bg-[hsl(142,71%,45%)]/10 border border-[hsl(142,71%,45%)]/20 p-3.5 text-sm text-[hsl(142,71%,45%)] text-center animate-rise-in">
      {message}
    </div>
  );

  if (resetStep === 'code') {
    return (
      <main className="min-h-screen flex items-center justify-center p-5 relative">
        <AuthBackground />
        <Card>
          <div className="text-center mb-8">
            <BrandMark />
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">איפוס סיסמה</h1>
            <p className="text-sm text-white/50">
              שלחנו קוד בן 8 ספרות אל{' '}
              <span className="text-white/80 font-medium" dir="ltr">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetWithCode} className="space-y-4">
            <div>
              <Label className="text-center block mb-2 text-xs font-semibold text-white/60 uppercase tracking-wider">קוד אימות</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={resetCode}
                onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                placeholder="00000000"
                className="premium-input text-center text-3xl font-bold tracking-[0.35em] h-16"
                dir="ltr"
                autoFocus
              />
            </div>

            <InputField label="סיסמה חדשה" icon={<Lock className="w-5 h-5" />}>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input pr-11"
                dir="ltr"
                minLength={6}
                required
              />
            </InputField>

            <InputField label="אימות סיסמה" icon={<Lock className="w-5 h-5" />}>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={e => setConfirmNewPassword(e.target.value)}
                placeholder="••••••••"
                className="premium-input pr-11"
                dir="ltr"
                minLength={6}
                required
              />
            </InputField>

            {error && <ErrorBanner message={error} />}
            {successMsg && <SuccessBanner message={successMsg} />}

            <Button type="submit" variant="premium" className="w-full" disabled={loading}>
              {loading ? 'מאמת...' : 'אפס סיסמה'}
            </Button>

            <div className="flex flex-col gap-2 pt-2 text-center">
              <button
                type="button"
                onClick={sendResetCode}
                disabled={loading}
                className="text-sm text-[hsl(14,100%,57%)] hover:underline"
              >
                לא קיבלת? שלח קוד חדש
              </button>
              <button
                type="button"
                onClick={() => { setResetStep('none'); setResetCode(''); setNewPassword(''); setConfirmNewPassword(''); setError(''); setSuccessMsg(''); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                חזור להתחברות
              </button>
            </div>
          </form>
        </Card>
      </main>
    );
  }

  if (otpStep) {
    return (
      <main className="min-h-screen flex items-center justify-center p-5 relative">
        <AuthBackground />
        <Card>
          <div className="text-center mb-8">
            <BrandMark />
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">בדוק את המייל שלך</h1>
            <p className="text-sm text-white/50">
              שלחנו קוד בן 8 ספרות אל{' '}
              <span className="text-white/80 font-medium" dir="ltr">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <Label className="text-center block mb-2 text-xs font-semibold text-white/60 uppercase tracking-wider">קוד אימות</Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="00000000"
                className="premium-input text-center text-3xl font-bold tracking-[0.35em] h-16"
                dir="ltr"
                autoFocus
              />
            </div>

            {error && <ErrorBanner message={error} />}
            {successMsg && <SuccessBanner message={successMsg} />}

            <Button type="submit" variant="premium" className="w-full" disabled={loading || otpCode.length !== 8}>
              {loading ? 'מאמת...' : 'אמת קוד'}
            </Button>

            <div className="flex flex-col gap-2 pt-2 text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-sm text-[hsl(14,100%,57%)] hover:underline"
              >
                לא קיבלת? שלח קוד חדש
              </button>
              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtpCode(''); setError(''); setSuccessMsg(''); }}
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                חזור להרשמה
              </button>
            </div>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden">
      <AuthBackground />

      <Card className="relative">
        {/* Top ambient highlight on card */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-[hsl(14,100%,57%)]/50 to-transparent rounded-full opacity-60" />

        <div className="text-center mb-8">
          <BrandMark />
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">
            {isLogin ? 'ברוך הבא' : 'הצטרף למערכה'}
          </h1>
          <p className="text-sm text-white/50">
            {isLogin ? 'התחבר כדי להמשיך לבנות את המשמעת שלך' : 'צור חשבון ותתחיל לשלוט ביומך'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <InputField label="שם תצוגה" icon={<User className="w-5 h-5" />}>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="השם שלך"
                className="premium-input pr-11"
              />
            </InputField>
          )}

          <InputField label="אימייל" icon={<Mail className="w-5 h-5" />}>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="premium-input pr-11"
              required
              dir="ltr"
            />
          </InputField>

          <InputField label="סיסמה" icon={<Lock className="w-5 h-5" />} error={undefined}>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="premium-input pr-11"
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
                className="text-xs text-[hsl(14,100%,57%)] hover:underline mt-1.5 mr-1"
              >
                שכחת סיסמה?
              </button>
            )}
          </InputField>

          {!isLogin && (
            <label className="flex items-start gap-2.5 text-xs text-white/50 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[hsl(14,100%,57%)] cursor-pointer rounded"
              />
              <span className="leading-relaxed">
                אני מאשר/ת שקראתי ואני מסכים/ה ל
                <a href="/terms" target="_blank" rel="noopener" className="text-[hsl(14,100%,57%)] underline mx-1">תנאי השימוש</a>
                ול
                <a href="/privacy" target="_blank" rel="noopener" className="text-[hsl(14,100%,57%)] underline mx-1">מדיניות הפרטיות</a>
              </span>
            </label>
          )}

          {error && <ErrorBanner message={error} />}
          {successMsg && <SuccessBanner message={successMsg} />}

          <Button type="submit" variant="premium" className="w-full mt-2" disabled={loading || (!isLogin && !acceptedTerms)}>
            <span>{loading ? 'טוען...' : isLogin ? 'התחבר' : 'הירשם'}</span>
            {!loading && <ArrowRight className="w-4 h-4 mr-1" />}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[hsl(0,0%,7%)] px-3 text-white/40">או המשך עם</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <SocialButton
            onClick={handleAppleSignIn}
            label="התחבר עם Apple"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            }
          />

          {appleError && (
            <div className="mt-3 rounded-xl border border-[hsl(0,84%,60%)]/30 bg-[hsl(0,84%,60%)]/10 p-3 space-y-2">
              <p className="text-[hsl(0,84%,60%)] text-sm font-medium">{appleError}</p>
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

          <SocialButton
            onClick={handleGoogleSignIn}
            label="התחבר עם Google"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            }
          />
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            {isLogin ? 'אין לך חשבון? ' : 'יש לך חשבון? '}
            <span className="text-[hsl(14,100%,57%)] font-semibold hover:underline">
              {isLogin ? 'הירשם עכשיו' : 'התחבר'}
            </span>
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/30 leading-relaxed">
          בהמשך, אתה מסכים ל
          <a href="/terms" className="text-[hsl(14,100%,57%)]/70 underline mx-1">תנאי השימוש</a>
          ול
          <a href="/privacy" className="text-[hsl(14,100%,57%)]/70 underline mx-1">מדיניות הפרטיות</a>
        </p>
      </Card>
    </main>
  );
};

export default AuthPage;
