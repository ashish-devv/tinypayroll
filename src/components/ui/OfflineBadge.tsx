import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Saturated red that reads on both light and dark headers.
const RED = '#ef4444';

// OfflineBadge — pulsing red "cloud-offline" icon. A wrapping Animated.View glows
// (opacity + scale + shadow halo swelling) and dims on a continuous loop to draw the
// eye. The icon itself is a plain child — vector icons don't support setNativeProps,
// so we never animate Ionicons directly. Rendered only while offline (the parent
// gates on connectivity), so the loop lives just for the badge's mount.
export function OfflineBadge() {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1, // infinite
      true, // reverse each cycle → glow up, dim down
    );
  }, [pulse]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55, // 0.45 → 1.0
    transform: [{ scale: 0.9 + pulse.value * 0.2 }], // 0.9 → 1.1
    // red halo that swells/fades with the pulse (iOS/web shadow)
    shadowColor: RED,
    shadowOpacity: 0.3 + pulse.value * 0.6,
    shadowRadius: 3 + pulse.value * 6,
    shadowOffset: { width: 0, height: 0 },
  }));

  return (
    <Animated.View style={iconStyle} accessibilityLabel="Offline">
      <Ionicons name="cloud-offline" size={16} color={RED} />
    </Animated.View>
  );
}
