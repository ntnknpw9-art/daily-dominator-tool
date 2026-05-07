import type { CapacitorConfig } from '@capacitor/cli';

// =============================================================
// Capacitor configuration
// =============================================================
// בפיתוח (hot-reload מהסנדבוקס של Lovable): הסירו את ההערות מ-server
// בבנייה לאפל סטור: השאירו את server מוסתר כדי שהאפליקציה תטען
// את הקבצים מתוך dist/ המקומי (חובה לאישור בחנות).
// =============================================================

const isDev = process.env.CAP_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.natanknafo.dailydominator',
  appName: 'Daily Dominator',
  webDir: 'dist',
  ...(isDev && {
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
    GoogleSignIn: {
      clientId: '309108409035-3sl22316bkmuom32e1c2jtjjbmgava6i.apps.googleusercontent.com',
      serverClientId: '309108409035-c9khmlr7vf8lqg1r608tkcl2q7fu86mq.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
    },
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
