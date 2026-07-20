import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { colorScheme, useColorScheme } from 'nativewind';

import { store } from './api';

// ponytail: manual dark-mode override.
// The app defaults to following the OS ('system'). When the user flips the sidebar
// toggle we persist an explicit 'light' | 'dark' and drive NativeWind's colorScheme.
// Every consumer — `dark:` classes AND raw-hex hooks (palette.ts / shadows.ts) and
// the layouts — reads NativeWind's scheme, so they all track the override together.
// Requires tailwind.config darkMode: 'class' (media mode forbids manual set()).
const THEME_KEY = 'tp_theme_pref';

export type ThemePref = 'light' | 'dark' | 'system';

interface ThemeCtx {
  /** The stored preference — 'system' means follow the OS. */
  pref: ThemePref;
  /** The resolved scheme actually in effect right now. */
  scheme: 'light' | 'dark';
  setPref: (pref: ThemePref) => void;
  /** Flip between light and dark (resolving 'system' first). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  pref: 'system',
  scheme: 'light',
  setPref: () => {},
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>('system');
  const { colorScheme: active } = useColorScheme();
  const scheme = active ?? 'light';

  // Load the persisted preference once on boot and apply it.
  useEffect(() => {
    let cancelled = false;
    store.getItemAsync(THEME_KEY).then((v) => {
      if (cancelled) return;
      const stored = (v === 'light' || v === 'dark' || v === 'system') ? v : 'system';
      setPrefState(stored);
      colorScheme.set(stored);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function setPref(next: ThemePref) {
    setPrefState(next);
    colorScheme.set(next);
    store.setItemAsync(THEME_KEY, next).catch(() => {});
  }

  function toggle() {
    setPref(scheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <ThemeContext.Provider value={{ pref, scheme, setPref, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
