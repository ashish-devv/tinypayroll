import { createTamagui, createTokens, createFont } from 'tamagui';
import { shorthands } from '@tamagui/shorthands';
import { themes, tokens as defaultTokens } from '@tamagui/themes';
import { animations } from '@tamagui/animations-react-native';

// Calm Precision — extracted from TinyPayroll Stitch design system
const colors = {
  // Brand
  inkIndigo: '#1a1f2c',
  inkIndigoLight: '#2d3548',
  gold: '#d4af37',
  goldLight: '#f5e9b0',

  // Backgrounds
  background: '#f8f9ff',
  surface: '#ffffff',
  surfaceContainer: '#e5eeff',
  surfaceContainerLow: '#eff4ff',

  // Text
  textPrimary: '#0b1c30',
  textMuted: '#45464c',
  textPlaceholder: '#9ba1b0',

  // Borders
  outline: '#76777c',
  outlineVariant: '#c6c6cc',

  // Semantic
  success: '#16a34a',
  successBg: '#f0fdf4',
  warning: '#d97706',
  warningBg: '#fffbeb',
  error: '#ba1a1a',
  errorBg: '#fef2f2',
};

const interFont = createFont({
  family: 'Inter_400Regular',
  size: {
    1: 11,
    2: 13,
    3: 14,
    4: 16,
    5: 20,
    6: 24,
    7: 30,
    8: 40,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 20,
    4: 24,
    5: 28,
    6: 32,
    7: 36,
    8: 48,
  },
  weight: {
    1: '400',
    2: '500',
    3: '600',
    4: '700',
  },
  letterSpacing: {
    1: 0.08,   // label-caps
    2: 0,
    3: -0.01,  // headline-lg
  },
  face: {
    400: { normal: 'Inter_400Regular' },
    500: { normal: 'Inter_500Medium' },
    600: { normal: 'Inter_600SemiBold' },
    700: { normal: 'Inter_700Bold' },
  },
});

const geistFont = createFont({
  family: 'Geist_500Medium',
  size: { 3: 14 },
  lineHeight: { 3: 20 },
  weight: { 2: '500' },
  face: {
    500: { normal: 'Geist_500Medium' },
  },
});

const tamaguiConfig = createTamagui({
  animations,
  defaultTheme: 'light',
  shouldAddPrefersColorThemes: false,
  themeClassNameOnRoot: false,
  shorthands,
  fonts: {
    heading: interFont,
    body: interFont,
    mono: geistFont,
  },
  tokens: createTokens({
    ...defaultTokens,
    color: {
      ...defaultTokens.color,
      ...colors,
    },
    radius: {
      0: 0,
      1: 4,    // sm
      2: 8,    // DEFAULT — inputs, buttons
      3: 12,   // buttons
      4: 16,
      5: 20,   // cards
      6: 9999, // pill/full
    },
    space: {
      ...defaultTokens.space,
      containerMargin: 20,
      gapSm: 8,
      gapMd: 16,
      gapLg: 24,
      cardPadding: 20,
    },
  }),
  themes: {
    light: {
      background: colors.background,
      backgroundHover: colors.surfaceContainerLow,
      backgroundPress: colors.surfaceContainer,
      backgroundFocus: colors.surfaceContainerLow,
      borderColor: colors.outlineVariant,
      borderColorHover: colors.outline,
      color: colors.textPrimary,
      colorHover: colors.inkIndigo,
      placeholderColor: colors.textPlaceholder,
      // map Tamagui semantic tokens
      blue10: colors.inkIndigo,
      green10: colors.success,
      yellow10: colors.gold,
      red10: colors.error,
    },
    dark: {
      ...themes.dark,
    },
  },
  media: {
    sm: { maxWidth: 767 },
    md: { minWidth: 768 },
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
