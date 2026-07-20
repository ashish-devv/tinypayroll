import { View, type ViewProps } from 'react-native';

// Divider — horizontal hairline separator matching the design border color.
export function Divider({ className = '', ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`h-px w-full bg-border-light dark:bg-border-dark ${className}`}
      {...props}
    />
  );
}
