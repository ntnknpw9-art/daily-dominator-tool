import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
