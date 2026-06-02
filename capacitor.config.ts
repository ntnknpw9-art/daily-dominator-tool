import type { CapacitorConfig } from '@capacitor/cli';

// =============================================================
// Capacitor configuration
// =============================================================
// ברירת המחדל לריצה מ-Xcode היא טעינה ישירה מהאפליקציה ב-Lovable.
// זה מונע מסך שחור שנגרם כש-Xcode רץ בלי assets מקומיים מעודכנים.
// לבניית App Store מקומית: הריצו npm run cap:sync:ios:store.
// =============================================================

const isStoreBuild = process.env.CAP_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.natanknafo.dailydominator',
  appName: 'Daily Dominator',
  webDir: 'dist',
  ...(!isStoreBuild && {
    server: {
      url: 'https://296df08a-68ba-481e-b169-30e2cb9c50f6.lovableproject.com?forceHideBadge=true',
      cleartext: true,
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
