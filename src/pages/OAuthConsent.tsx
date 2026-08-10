import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';

type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: 'זיהוי החשבון שלך',
  email: 'כתובת המייל שלך',
  profile: 'פרטי הפרופיל הבסיסיים שלך',
};

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';

  const [session, setSession] = useState<boolean | null>(null);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // inline sign-in state (keeps the user on this exact consent URL)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const consentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('חסר מזהה בקשת הרשאה (authorization_id).');
        setSession(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (!data.session) {
        setSession(false);
        return;
      }
      setSession(true);
      const { data: details, error } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = details?.redirect_url ?? details?.redirect_to;
      if (immediate && !details?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(details);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const decide = async (approve: boolean) => {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError('שרת ההרשאות לא החזיר כתובת חזרה.');
      return;
    }
    window.location.href = target;
  };

  const signInWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setAuthError('אימייל או סיסמה שגויים');
      return;
    }
    window.location.href = consentUrl;
  };

  const signInWithGoogle = async () => {
    setAuthError('');
    const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: consentUrl });
    if (result.error) {
      setAuthError('ההתחברות עם Google נכשלה');
      return;
    }
    if (result.redirected) return;
    window.location.href = consentUrl;
  };

  const clientName = details?.client?.name ?? 'האפליקציה המבקשת';
  const scopes = (details?.scope ?? '').split(/\s+/).filter(Boolean);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">אישור חיבור</h1>
            <p className="text-sm text-muted-foreground">Daily Dominator</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        {session === null && !error && (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> טוען…
          </div>
        )}

        {session === false && authorizationId && (
          <form onSubmit={signInWithPassword} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              כדי לאשר את החיבור, התחבר לחשבון Daily Dominator שלך.
            </p>
            <div className="space-y-2">
              <Label htmlFor="oauth-email">אימייל</Label>
              <Input id="oauth-email" type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oauth-password">סיסמה</Label>
              <Input id="oauth-password" type="password" value={password} required onChange={(e) => setPassword(e.target.value)} />
            </div>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'מתחבר…' : 'התחבר והמשך'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle}>
              התחבר עם Google
            </Button>
          </form>
        )}

        {session && details && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                לחבר את {clientName} לחשבון שלך?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {clientName} יוכל להשתמש בכלים של Daily Dominator בשמך — לקרוא את המשימות, ההתקדמות
                והיומן שלך, ולעדכן אותם.
              </p>
            </div>

            {scopes.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                {scopes.map((scope) => (
                  <li key={scope}>• {SCOPE_LABELS[scope] ?? `הרשאה נוספת: ${scope}`}</li>
                ))}
              </ul>
            )}

            {details.client?.redirect_uri && (
              <p className="text-xs text-muted-foreground break-all">
                חזרה אל: {details.client.redirect_uri}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              החיבור לא עוקף את כללי ההרשאות של האפליקציה — תמיד תראה רק את הנתונים שלך.
            </p>

            <div className="flex gap-3">
              <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
                {busy ? 'מאשר…' : 'אישור'}
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
                ביטול
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OAuthConsent;
