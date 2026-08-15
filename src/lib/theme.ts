import { Capacitor } from '@capacitor/core';

export const THEME_KEY = 'app_theme';

export const getTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
};

const syncNativeStatusBar = async (theme: 'dark' | 'light') => {
  if (!Capacitor.isNativePlatform()) return;
  const mod = await import('@capacitor/status-bar');
  const { StatusBar, Style } = mod;
  if (!StatusBar || !Style) {
    console.error('[StatusBar] @capacitor/status-bar loaded but exports missing', mod);
    return;
  }
  try {
    // Capacitor StatusBar style describes the TEXT color, not the background:
    // - Style.Dark = dark text, for light backgrounds
    // - Style.Light = light text, for dark backgrounds
    await StatusBar.setStyle({ style: theme === 'light' ? Style.Dark : Style.Light });

    // On Android we can also set the status bar background color. On iOS with
    // overlaysWebView=true the status bar is transparent and the app header shows
    // through, so the background color is ignored.
    if (Capacitor.getPlatform() !== 'ios') {
      const bgColor = theme === 'light' ? '#fafafa' : '#0a0a0a';
      await StatusBar.setBackgroundColor({ color: bgColor });
    }

    console.log(`[StatusBar] synced -> ${theme} on ${Capacitor.getPlatform()}`);
  } catch (e) {
    console.error('[StatusBar] native call failed:', e);
  }
};

export const applyTheme = (theme: 'dark' | 'light') => {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  // עדכון של ה-Status Bar במכשיר נטיב (iOS/Android)
  void syncNativeStatusBar(theme);
};

export const initTheme = () => {
  applyTheme(getTheme());
};
