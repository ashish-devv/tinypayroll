import { useColorScheme } from 'nativewind';

/**
 * Raw Precision & Grace palette for non-className consumers:
 * Ionicons `color`, native `style` props, StatusBar, navigation headers.
 * For JSX layout/text, prefer Tailwind classes over these values.
 *
 * Reads NativeWind's color scheme (not react-native's) so it tracks the manual
 * dark-mode override from the sidebar toggle, staying in sync with `dark:` classes.
 */
export function usePalette() {
  const dark = useColorScheme().colorScheme === 'dark';
  return {
    dark,
    canvas:      dark ? '#0f172a' : '#f8fafc',
    surface:     dark ? '#1e293b' : '#ffffff',
    surfaceLow:  dark ? '#334155' : '#f1f5f9',
    text:        dark ? '#f1f5f9' : '#0f172a',
    muted:       dark ? '#94a3b8' : '#64748b',
    placeholder: dark ? '#64748b' : '#94a3b8',
    border:      dark ? '#334155' : '#e2e8f0',
    // Brand — Indigo Violet primary, Electric Blue secondary.
    ink:  dark ? '#4648d4' : '#6366f1',
    gold: '#6366f1',
    primary: '#6366f1',
    secondary: '#0ea5e9',
    goldBg: dark ? '#1e1b4b' : '#eef2ff',
    status: {
      present: { bg: dark ? '#166534' : '#dcfce7', dot: '#16a34a', text: dark ? '#ffffff' : '#15803d' },
      absent:  { bg: dark ? '#991b1b' : '#fee2e2', dot: '#dc2626', text: dark ? '#ffffff' : '#dc2626' },
      leave:   { bg: dark ? '#854d0e' : '#fef9c3', dot: '#ca8a04', text: dark ? '#ffffff' : '#92400e' },
      holiday: { bg: dark ? '#1e3a5f' : '#dbeafe', dot: '#3b82f6', text: dark ? '#ffffff' : '#1d4ed8' },
      weekend: { bg: 'transparent', dot: 'transparent', text: '' },
    },
  };
}
