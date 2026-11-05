import * as React from 'react';
import { ThemeContext, type ResolvedTheme, type Theme } from '~/hooks/use-theme';

// Keep in sync with the inline script in index.html (it applies the theme before the first paint).
const STORAGE_KEY = 'chatwave-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

const systemTheme = (): ResolvedTheme => (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');

/** Light / dark / system, saved per browser, applied as the `dark` class on <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readStoredTheme);
  const [system, setSystem] = React.useState<ResolvedTheme>(systemTheme);
  const resolvedTheme = theme === 'system' ? system : theme;

  // Follow the OS setting while the theme is "system".
  React.useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystem(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    // Switch without every colour transition animating at once.
    root.classList.add('[&_*]:transition-none!');
    root.classList.toggle('dark', resolvedTheme === 'dark');
    const frame = requestAnimationFrame(() => root.classList.remove('[&_*]:transition-none!'));
    return () => cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this tab only.
    }
  }, []);

  const value = React.useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}
