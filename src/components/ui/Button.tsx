import { Pressable, type PressableProps, View } from 'react-native';
import { AppText } from './AppText';
import { useShadows, pressScale } from './shadows';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  /** 'primary' = solid indigo pill w/ glow; 'secondary' = ghost outline; 'light' = white on indigo. */
  variant?: 'primary' | 'secondary' | 'light';
  className?: string;
  /** Optional leading icon element (e.g. an Ionicons node). */
  icon?: React.ReactNode;
};

// Button — pill-shaped CTA matching Precision & Grace. Primary carries the indigo glow.
export function Button({ label, variant = 'primary', className = '', icon, disabled, ...props }: ButtonProps) {
  const shadows = useShadows();

  const base = 'rounded-button py-4 px-6 flex-row items-center justify-center';
  const palette =
    variant === 'primary'
      ? 'bg-primary'
      : variant === 'light'
        ? 'bg-white'
        : 'bg-transparent border border-border-light dark:border-border-dark';

  const textClass =
    variant === 'primary'
      ? 'text-white'
      : variant === 'light'
        ? 'text-primary'
        : 'text-text-light dark:text-text-dark';

  return (
    <Pressable
      disabled={disabled}
      style={(state) => [
        variant === 'primary' ? shadows.hero : undefined,
        pressScale(state),
        disabled ? { opacity: 0.5 } : undefined,
      ]}
      className={`${base} ${palette} ${className}`}
      {...props}
    >
      {icon ? <View className="mr-2">{icon}</View> : null}
      <AppText className={`font-inter-semibold text-[15px] ${textClass}`}>{label}</AppText>
    </Pressable>
  );
}
