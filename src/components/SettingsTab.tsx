import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sun, Moon, Bell, BellOff, Skull, Trash2, Watch, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { isSoundEnabled, setSoundEnabled } from '@/lib/sounds';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { getTheme, applyTheme } from '@/lib/theme';

const NO_MERCY_KEY = 'app_no_mercy_mode';

export const isNoMercyMode = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NO_MERCY_KEY) === 'true';
};

const SettingsTab = () => {
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme);
  const [notificationsOn, setNotificationsOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('app_notifications_enabled') === 'true';
  });
  const [noMercy, setNoMercy] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(NO_MERCY_KEY) === 'true';
  });

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      try { localStorage.clear(); } catch {}
      toast.success('החשבון נמחק');
      await signOut();
    } catch (e: any) {
      toast.error('שגיאה במחיקת החשבון: ' + (e?.message || ''));
      setDeleting(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">⚙️ הגדרות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">מצב תצוגה</div>
              <div className="text-xs text-muted-foreground">מעבר בין מצב כהה לבהיר</div>
            </div>
            <Button
              variant={theme === 'dark' ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'dark' ? 'כהה' : 'בהיר'}
            </Button>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">אפקטי סאונד</div>
              <div className="text-xs text-muted-foreground">צלילים בעת סימון משימות, טיימר והישגים</div>
            </div>
            <Button
              variant={soundOn ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                const newVal = !soundOn;
                setSoundEnabled(newVal);
                setSoundOn(newVal);
              }}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {soundOn ? 'מופעל' : 'מושבת'}
            </Button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">התראות חכמות</div>
              <div className="text-xs text-muted-foreground">תזכורות לפני משימות, התראות פספוס ועידוד. דורש אישורך.</div>
            </div>
            <Button
              variant={notificationsOn ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (!notificationsOn) {
                  // Request explicit consent before enabling
                  try {
                    const { Capacitor } = await import('@capacitor/core');
                    if (Capacitor.isNativePlatform()) {
                      const { LocalNotifications } = await import('@capacitor/local-notifications');
                      const status = await LocalNotifications.checkPermissions();
                      let display = status.display;
                      if (display !== 'granted') {
                        const req = await LocalNotifications.requestPermissions();
                        display = req.display;
                      }
                      if (display !== 'granted') {
                        toast.error('לא ניתן אישור להתראות. ניתן להפעיל מההגדרות של המכשיר.');
                        return;
                      }
                    } else if (typeof Notification !== 'undefined' && Notification.requestPermission) {
                      const perm = await Notification.requestPermission();
                      if (perm !== 'granted') {
                        toast.error('לא ניתן אישור להתראות. ניתן להפעיל מההגדרות של המכשיר.');
                        return;
                      }
                    }
                  } catch (e) {
                    toast.error('שגיאה בבקשת אישור להתראות.');
                    return;
                  }
                  setNotificationsOn(true);
                  localStorage.setItem('app_notifications_enabled', 'true');
                  toast.success('התראות הופעלו');
                } else {
                  setNotificationsOn(false);
                  localStorage.setItem('app_notifications_enabled', 'false');
                }
              }}
            >
              {notificationsOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              {notificationsOn ? 'מופעל' : 'מושבת'}
            </Button>
          </div>

          {/* No Mercy Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-1">
                <Skull className="w-4 h-4 text-destructive" />
                מצב אין רחמים
              </div>
              <div className="text-xs text-muted-foreground">הודעות קשות וישירות. בלי פילטרים.</div>
            </div>
            <Button
              variant={noMercy ? "destructive" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                const newVal = !noMercy;
                setNoMercy(newVal);
                localStorage.setItem(NO_MERCY_KEY, String(newVal));
              }}
            >
              <Skull className="w-4 h-4" />
              {noMercy ? 'מופעל' : 'מושבת'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-destructive">⚠️ אזור מסוכן</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">מחיקת חשבון</div>
              <div className="text-xs text-muted-foreground">מחיקה מלאה של החשבון וכל הנתונים. לא ניתן לשחזר.</div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'מוחק...' : 'מחק חשבון'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>בטוח שברצונך למחוק את החשבון?</AlertDialogTitle>
                  <AlertDialogDescription>
                    פעולה זו תמחק לצמיתות את החשבון, ההישגים, המשימות וכל הנתונים מהשרת. לא ניתן לבטל.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    כן, מחק את החשבון
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsTab;
