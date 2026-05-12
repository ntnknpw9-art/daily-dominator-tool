import { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sun, Moon, Bell, BellOff, Skull, Trash2, Watch, CheckCircle2, RefreshCw } from 'lucide-react';
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
import { useHealthSync } from '@/hooks/useHealthSync';

const NO_MERCY_KEY = 'app_no_mercy_mode';

export const isNoMercyMode = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NO_MERCY_KEY) === 'true';
};

const SettingsTab = () => {
  const { signOut } = useAuth();
  const { syncHealthData, isSyncing } = useHealthSync();
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

  const [wearableToConnect, setWearableToConnect] = useState<string | null>(null);

  const [connectedWearables, setConnectedWearables] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('app_connected_wearables') || '[]');
    } catch { return []; }
  });

  const toggleWearable = (wearable: string) => {
    setConnectedWearables(prev => {
      const next = prev.includes(wearable) ? prev.filter(w => w !== wearable) : [...prev, wearable];
      localStorage.setItem('app_connected_wearables', JSON.stringify(next));
      if (!prev.includes(wearable)) {
        toast.success(`חובר בהצלחה: ${wearable}`);
      } else {
        toast.info(`נותק: ${wearable}`);
      }
      return next;
    });
  };

  const getWearableInstructions = (wearable: string) => {
    if (wearable.includes('Garmin')) {
      return (
        <div className="space-y-2 text-sm text-right mt-2">
          <p>האפליקציה שלנו שואבת נתונים מ-Apple Health. כדי שנתוני ה-Garmin יגיעו אלינו, צריך לחבר אותו ל-Apple Health:</p>
          <ol className="list-decimal list-inside space-y-1 pr-4">
            <li>פתח את אפליקציית <strong>Garmin Connect</strong> בטלפון שלך.</li>
            <li>עבור להגדרות (Settings) {'>'} אפליקציות מחוברות (Connected Apps).</li>
            <li>בחר ב-<strong>Apple Health</strong> ואשר את כל ההרשאות.</li>
            <li>אחרי שאישרת, הנתונים יסתנכרו אוטומטית כשתלחץ על ״סנכרן נתונים״ אצלנו.</li>
          </ol>
        </div>
      );
    }
    if (wearable.includes('Fitbit')) {
      return (
        <div className="space-y-2 text-sm text-right mt-2">
          <p>האפליקציה שלנו שואבת נתונים מ-Apple Health. כדי שנתוני ה-Fitbit יגיעו אלינו, צריך לחבר אותו ל-Apple Health:</p>
          <ol className="list-decimal list-inside space-y-1 pr-4">
            <li>פתח את אפליקציית <strong>Fitbit</strong> בטלפון שלך.</li>
            <li>עבור להגדרות החשבון {'>'} שילובים/אפליקציות צד שלישי.</li>
            <li>בחר ב-<strong>Apple Health</strong> ואפשר גישה.</li>
            <li>אחרי שאישרת, הנתונים יסתנכרו אוטומטית כשתלחץ על ״סנכרן נתונים״ אצלנו.</li>
          </ol>
        </div>
      );
    }
    return (
      <div className="space-y-2 text-sm text-right mt-2">
        <p>כדי לחבר את המכשיר ל-Apple Health:</p>
        <ol className="list-decimal list-inside space-y-1 pr-4">
          <li>לחץ על "הבנתי".</li>
          <li>המערכת שלנו תקפיץ חלון שמבקש הרשאה מ-Apple Health לצעדים, שינה, קלוריות וזמן אימון.</li>
          <li><strong>סמן את כל ההרשאות באישורים (Turn On All).</strong></li>
          <li>זהו! כעת אפשר ללחוץ תמיד על ״סנכרן נתונים״ והכל יתעדכן.</li>
        </ol>
      </div>
    );
  };

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

      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Watch className="w-5 h-5 text-blue-400" />
              שעונים ובריאות
            </CardTitle>
            <Button variant="outline" size="sm" onClick={syncHealthData} disabled={isSyncing} className="gap-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              סנכרן נתונים
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground mb-4">
            חבר את השעון החכם שלך (Apple Health, Garmin, Fitbit) לקבלת נתוני צעדים ושינה.
            <br/><span className="text-primary font-bold">הערה:</span> משתמשי Garmin/Fitbit ב-iOS צריכים להגדיר סנכרון דרך Apple Health.
          </div>
          
          {['Apple Health (iOS)', 'Garmin Connect (דרך Apple Health)', 'Fitbit (דרך Apple Health)'].map(wearable => (
            <div key={wearable} className="flex items-center justify-between bg-background/50 border border-border/50 rounded-lg p-3">
              <div className="text-sm font-medium">{wearable}</div>
              <Button
                variant={connectedWearables.includes(wearable) ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (connectedWearables.includes(wearable)) {
                    toggleWearable(wearable);
                  } else {
                    setWearableToConnect(wearable);
                  }
                }}
              >
                {connectedWearables.includes(wearable) ? (
                  <><CheckCircle2 className="w-4 h-4" /> מחובר</>
                ) : 'התחבר'}
              </Button>
            </div>
          ))}
          
          <AlertDialog open={!!wearableToConnect} onOpenChange={(open) => !open && setWearableToConnect(null)}>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>חיבור {wearableToConnect}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  {wearableToConnect && getWearableInstructions(wearableToConnect)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2 justify-end sm:justify-start">
                <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  if (wearableToConnect) {
                    toggleWearable(wearableToConnect);
                    if (wearableToConnect.includes('Apple')) {
                      syncHealthData(); // Trigger the actual prompt
                    }
                  }
                }}>
                  הבנתי, סמן כמחובר
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
