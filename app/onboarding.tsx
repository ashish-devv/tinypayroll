import { View, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated';

import { Screen, AppText, usePalette, useShadows } from '@/src/components/ui';
import { useAuth } from '@/src/services/auth';

const SLIDES = [
  {
    icon: 'flash-outline' as const,
    title: 'Run Payroll in Minutes',
    subtitle: 'Calculate salaries, overtime, and deductions automatically — no spreadsheets needed.',
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Track Attendance Effortlessly',
    subtitle: 'Mark present, absent, or leave with a tap. Payroll updates itself.',
  },
  {
    icon: 'wallet-outline' as const,
    title: 'Payslips Your Team Will Love',
    subtitle: 'Generate clean, shareable payslips in one tap — WhatsApp ready.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Your Data, Locked Down',
    subtitle: 'Bank-grade security for every rupee that moves through your business.',
  },
];

function Slide({ item, index, scrollX, width }: {
  item: typeof SLIDES[number];
  index: number;
  scrollX: Animated.SharedValue<number>;
  width: number;
}) {
  const P = usePalette();
  const shadows = useShadows();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollX.value, inputRange, [40, 0, 40], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP) }],
  }));

  return (
    <View className="items-center justify-center gap-8 px-8" style={{ width }}>
      <Animated.View style={[{
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center',
      }, shadows.hero, iconStyle]}>
        <Ionicons name={item.icon} size={56} color="#ffffff" />
      </Animated.View>
      <Animated.View style={textStyle}>
        <View className="items-center gap-2.5">
          <AppText className="text-center font-inter-bold text-2xl tracking-[-0.3px]">
            {item.title}
          </AppText>
          <AppText className="text-center text-sm leading-[21px] text-muted-light dark:text-muted-dark">
            {item.subtitle}
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX, width }: {
  index: number; scrollX: Animated.SharedValue<number>; width: number;
}) {
  const P = usePalette();
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, inputRange, [P.border, P.primary, P.border]),
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => { scrollX.value = e.contentOffset.x; },
  });

  function goTo(i: number) {
    Haptics.selectionAsync();
    scrollRef.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  }

  function finish() {
    completeOnboarding();
    router.replace('/login');
  }

  const shadows = useShadows();

  return (
    <Screen>
      <View className="flex-row justify-end px-5 pt-2">
        <Pressable onPress={finish} hitSlop={12}>
          <AppText className="font-inter-semibold text-sm text-muted-light dark:text-muted-dark">Skip</AppText>
        </Pressable>
      </View>

      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((item, i) => (
          <Slide key={item.title} item={item} index={i} scrollX={scrollX} width={width} />
        ))}
      </Animated.ScrollView>

      <View className="gap-7 px-6 pb-5">
        <View className="flex-row items-center justify-center gap-2">
          {SLIDES.map((item, i) => (
            <Dot key={item.title} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        <Pressable
          onPress={() => (isLast ? finish() : goTo(index + 1))}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <View className="flex-row items-center justify-center gap-2 rounded-card bg-primary py-4" style={shadows.hero}>
            <AppText className="font-inter-semibold text-[15px] text-white">
              {isLast ? 'Get Started' : 'Next'}
            </AppText>
            <Ionicons name={isLast ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color="white" />
          </View>
        </Pressable>
      </View>
    </Screen>
  );
}
