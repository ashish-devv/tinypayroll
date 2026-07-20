import { View, type ViewProps } from 'react-native';
import { useShadows } from './shadows';

type CardProps = ViewProps & {
  className?: string;
  /** 'surface' = white/dark card w/ border + card shadow; 'ink' = indigo hero card w/ glow. */
  variant?: 'surface' | 'ink';
};

// Card — the repeated surface/ink card pattern with baked-in border, radius and shadow.
export function Card({ className = '', variant = 'surface', style, children, ...props }: CardProps) {
  const shadows = useShadows();

  if (variant === 'ink') {
    return (
      <View
        className={`rounded-card-lg bg-primary ${className}`}
        style={[shadows.hero, style]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      className={`rounded-card border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${className}`}
      style={[shadows.card, style]}
      {...props}
    >
      {children}
    </View>
  );
}
