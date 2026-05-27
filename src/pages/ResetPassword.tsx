import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SeoHead } from '@/components/SeoHead';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setSuccess('הסיסמה עודכנה בהצלחה! מעביר...');
      setTimeout(() => navigate('/'), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md animate-scale-in">
        <h1 className="text-2xl font-bold text-foreground text-center mb-6">איפוס סיסמה</h1>
        {!ready ? (
          <p className="text-center text-muted-foreground text-sm">
            הקישור לא תקין או שפג תוקפו. בקש קישור איפוס חדש מדף ההתחברות.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>סיסמה חדשה</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} dir="ltr" required minLength={6} />
            </div>
            <div>
              <Label>אימות סיסמה</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} dir="ltr" required minLength={6} />
            </div>
            {error && <div className="text-destructive text-sm bg-destructive/10 rounded-lg p-3">{error}</div>}
            {success && <div className="text-success text-sm bg-success/10 rounded-lg p-3">{success}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '...' : 'עדכן סיסמה'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
