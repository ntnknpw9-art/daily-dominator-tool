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
  appId: 'com.natanknafo.app',
  appName: 'Daily Dominator',
  webDir: 'dist',
  ...(liveServerUrl && {
    server: {
      url: liveServerUrl,
      cleartext: false,
    },
  }),
  ios: {
    contentInset: 'never',
    backgroundColor: '#0a0a0a',
  },
  backgroundColor: '#0a0a0a',
  plugins: {
    StatusBar: {
      style: 'LIGHT', // default dark mode: light text on dark background
      overlaysWebView: true, // status bar is transparent; app header fills the safe area
    },
    SplashScreen: {
      backgroundColor: '#0a0a0a',
    },
  },
};

export default config;
