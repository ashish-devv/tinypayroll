import { useColorScheme } from 'nativewind';

/**
 * Native shadow presets — RN shadow props don't map cleanly to Tailwind classes,
 * so these are applied via the `style` prop. Mirrors the old useC() shadow tokens.
 * Reads NativeWind's scheme so it tracks the manual dark-mode override.
 */
export function useShadows() {
  const dark = useColorScheme().colorScheme === 'dark';
  return {
    // Surface / white cards — soft ambient shadow (slate-tinted, never pure black).
    card: {
      shadowColor: dark ? '#000000' : '#0f172a',
      shadowOpacity: dark ? 0.3 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: dark ? 5 : 2,
    } as const,
    // Indigo hero cards + primary CTAs — indigo ambient glow.
    hero: {
      shadowColor: '#6366f1',
      shadowOpacity: dark ? 0.4 : 0.28,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: dark ? 12 : 8,
    } as const,
  };
}

/** Press-in scale feedback for tappable cards. */
export const pressScale = ({ pressed }: { pressed: boolean }) => ({
  transform: [{ scale: pressed ? 0.97 : 1 }],
});
