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
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'light' ? '#fafafa' : '#0a0a0a' });
    }
  } catch (e) {
    console.warn('StatusBar sync failed', e);
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
