import { View } from 'react-native';
import { AppText } from './AppText';

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Chip — small status pill. Low-opacity tinted background + high-contrast text,
// per the Precision & Grace "Chips & Badges" rule.
const TONES: Record<ChipTone, { bg: string; text: string }> = {
  success: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300' },
  warning: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300' },
  danger:  { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300' },
  info:    { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300' },
  neutral: { bg: 'bg-surface-low-light dark:bg-surface-low-dark', text: 'text-muted-light dark:text-muted-dark' },
};

export function Chip({ label, tone = 'neutral', className = '' }: { label: string; tone?: ChipTone; className?: string }) {
  const t = TONES[tone];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${t.bg} ${className}`}>
      <AppText className={`font-inter-semibold text-[11px] ${t.text}`}>{label}</AppText>
    </View>
  );
}
