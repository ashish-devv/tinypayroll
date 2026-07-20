import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type ScreenProps = {
  children: React.ReactNode;
  className?: string;
  edges?: readonly Edge[];
  /** Background variant — 'canvas' (scroll area) or 'surface' (top-bar screens). */
  variant?: 'canvas' | 'surface';
};

// Screen — SafeAreaView wrapper with the two standard backgrounds.
export function Screen({ children, className = '', edges, variant = 'canvas' }: ScreenProps) {
  const bg =
    variant === 'surface'
      ? 'bg-surface-light dark:bg-surface-dark'
      : 'bg-canvas-light dark:bg-canvas-dark';
  return (
    <SafeAreaView edges={edges} className={`flex-1 ${bg} ${className}`}>
      {children}
    </SafeAreaView>
  );
}
