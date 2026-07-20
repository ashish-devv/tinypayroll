import { Text as RNText, type TextProps } from 'react-native';

// AppText — defaults to Plus Jakarta Sans body font + primary text color.
// Pass className to override weight/size/color, e.g. className="font-inter-bold text-primary".
export function AppText({ className = '', ...props }: TextProps & { className?: string }) {
  return (
    <RNText
      className={`font-inter text-text-light dark:text-text-dark ${className}`}
      {...props}
    />
  );
}
