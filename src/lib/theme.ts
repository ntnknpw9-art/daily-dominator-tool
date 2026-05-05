export const THEME_KEY = 'app_theme';

export const getTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
};

export const applyTheme = (theme: 'dark' | 'light') => {
  localStorage.setItem(THEME_KEY, theme);
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
};

export const initTheme = () => {
  applyTheme(getTheme());
};
