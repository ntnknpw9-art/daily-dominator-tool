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
    await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'light' ? '#fafafa' : '#0a0a0a' });
    }
    console.log(`[StatusBar] synced -> ${theme} on ${Capacitor.getPlatform()}`);
  } catch (e) {
    // לוג רועש בלי fallback שקט במכשיר נטיב
    console.error('[StatusBar] native call failed:', e);
    throw e;
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
  syncNativeStatusBar(theme);
};

export const initTheme = () => {
  applyTheme(getTheme());
};
