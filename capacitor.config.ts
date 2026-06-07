import type { CapacitorConfig } from '@capacitor/cli';

// =============================================================
// Capacitor configuration
// =============================================================
// ברירת המחדל לריצה מ-Xcode היא טעינת ה-assets המקומיים שסונכרנו לאפליקציה.
// חשוב במיוחד ל-RevenueCat: אחרת Xcode עלול לטעון גרסה ישנה מהאתר המפורסם.
// לפיתוח מול URL חי בלבד: CAP_SERVER_URL=https://... npx cap sync ios
// =============================================================

const liveServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.natanknafo.dailydominator',
  appName: 'Daily Dominator',
  webDir: 'dist',
  ...(liveServerUrl && {
    server: {
      url: liveServerUrl,
      cleartext: false,
    },
  }),
  ios: {
    contentInset: 'always',
    backgroundColor: '#0a0a0a',
  },
  backgroundColor: '#0a0a0a',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a0a',
      overlaysWebView: false,
    },
    SplashScreen: {
      backgroundColor: '#0a0a0a',
    },
  },
};

export default config;
