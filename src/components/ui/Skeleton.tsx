import { useEffect } from 'react';
import { View, type ViewStyle, type DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { usePalette } from './palette';

// Skeleton — a single shimmering placeholder block. Opacity breathes between ~0.35 and ~0.75
// on a loop so a loading section reads as "content coming" rather than "frozen". Colour tracks
// the current scheme via usePalette so it's visible on both light and dark surfaces.
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const P = usePalette();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);

  const animStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.value * 0.4 }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: P.dark ? '#2a2f3a' : '#e6e8f0' },
        animStyle,
        style,
      ]}
    />
  );
}

// SkeletonGroup — convenience wrapper so callers can lay out several Skeletons with a shared gap.
export function SkeletonGroup({ children, gap = 8, style }: { children: React.ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}
