/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 'class' lets us drive dark mode manually via NativeWind's colorScheme.set()
  // (the sidebar toggle). It still follows the OS until an explicit override is set.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Precision & Grace — brand (mode-invariant) ──
        // Indigo Violet primary + Electric Blue secondary. Coral/Emerald are used
        // via Tailwind's default `rose-*` / `emerald-*` scales (shipped in the preset).
        primary: '#6366f1',
        'primary-dark': '#4648d4',
        'primary-container': { light: '#e1e0ff', dark: '#2f2ebe' },
        'on-primary': '#ffffff',
        secondary: '#0ea5e9',
        'secondary-container': { light: '#e0f2fe', dark: '#075985' },

        // Legacy brand aliases kept so un-migrated screens stay coherent during the
        // migration. `ink` = indigo hero surface, `gold` = indigo money accent.
        ink: '#4648d4',
        gold: '#6366f1',
        'gold-bg': { light: '#eef2ff', dark: '#1e1b4b' },

        // ── Surfaces / text — Slate foundation, light + dark pairs ──
        canvas:      { light: '#f8fafc', dark: '#0f172a' },
        surface:     { light: '#ffffff', dark: '#1e293b' },
        'surface-low': { light: '#f1f5f9', dark: '#334155' },
        text:        { light: '#0f172a', dark: '#f1f5f9' },
        muted:       { light: '#64748b', dark: '#94a3b8' },
        placeholder: { light: '#94a3b8', dark: '#64748b' },
        border:      { light: '#e2e8f0', dark: '#334155' },

        // ── Attendance status (saturated dark) ──
        'status-present':  { light: '#dcfce7', dark: '#166534' },
        'status-absent':   { light: '#fee2e2', dark: '#991b1b' },
        'status-leave':    { light: '#fef9c3', dark: '#854d0e' },
        'status-holiday':  { light: '#dbeafe', dark: '#1e3a5f' },
      },
      fontFamily: {
        // Roboto for UI text, JetBrains Mono for numeric/currency data.
        // Legacy keys (`inter`, `jakarta`, `geist`) are repointed to Roboto so text
        // across every screen picks up the new typography automatically.
        jakarta: ['Roboto_400Regular'],
        'jakarta-medium': ['Roboto_500Medium'],
        'jakarta-semibold': ['Roboto_600SemiBold'],
        'jakarta-bold': ['Roboto_700Bold'],
        'jakarta-extrabold': ['Roboto_800ExtraBold'],
        mono: ['JetBrainsMono_500Medium'],
        inter: ['Roboto_400Regular'],
        'inter-medium': ['Roboto_500Medium'],
        'inter-semibold': ['Roboto_600SemiBold'],
        'inter-bold': ['Roboto_700Bold'],
        'inter-extrabold': ['Roboto_800ExtraBold'],
        geist: ['JetBrainsMono_500Medium'],
      },
      borderRadius: {
        // Precision & Grace radii: 16px cards, 24px hero, 12px inputs, pill buttons.
        card: '16px',
        'card-lg': '24px',
        input: '12px',
        button: '9999px',
      },
    },
  },
  plugins: [],
};
