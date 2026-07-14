import { YStack, XStack, Text } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, useColorScheme, useWindowDimensions } from 'react-native';
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

import { useAuth } from '@/src/services/auth';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:          dark ? '#0d0f14' : '#f8f9ff',
    surfaceLow:  dark ? '#1e2235' : '#eff4ff',
    text:        dark ? '#e8eaf0' : '#0b1c30',
    muted:       dark ? '#8b8fa8' : '#45464c',
    border:      dark ? '#2a2f3e' : '#e0e3ea',
    ink:         '#1a1f2c',
    gold:        '#d4af37',
    heroShadow: {
      shadowColor: '#d4af37',
      shadowOpacity: dark ? 0.28 : 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: dark ? 10 : 6,
    } as const,
  };
}

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

function Slide({ item, index, scrollX, width, C }: {
  item: typeof SLIDES[number];
  index: number;
  scrollX: Animated.SharedValue<number>;
  width: number;
  C: ReturnType<typeof useC>;
}) {
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
    <YStack width={width} alignItems="center" justifyContent="center" paddingHorizontal={32} gap={32}>
      <Animated.View style={[{
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center',
      }, C.heroShadow, iconStyle]}>
        <Ionicons name={item.icon} size={56} color={C.gold} />
      </Animated.View>
      <Animated.View style={textStyle}>
        <YStack gap={10} alignItems="center">
          <Text fontSize={24} fontFamily="$body" fontWeight="700" color={C.text}
                textAlign="center" letterSpacing={-0.3}>
            {item.title}
          </Text>
          <Text fontSize={14} fontFamily="$body" color={C.muted} textAlign="center" lineHeight={21}>
            {item.subtitle}
          </Text>
        </YStack>
      </Animated.View>
    </YStack>
  );
}

function Dot({ index, scrollX, width, C }: {
  index: number; scrollX: Animated.SharedValue<number>; width: number; C: ReturnType<typeof useC>;
}) {
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP),
    backgroundColor: interpolateColor(scrollX.value, inputRange, [C.border, C.gold, C.border]),
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4 }, style]} />;
}

export default function OnboardingScreen() {
  const C = useC();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <XStack justifyContent="flex-end" paddingHorizontal={20} paddingTop={8}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.muted}>Skip</Text>
        </Pressable>
      </XStack>

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
          <Slide key={item.title} item={item} index={i} scrollX={scrollX} width={width} C={C} />
        ))}
      </Animated.ScrollView>

      <YStack paddingHorizontal={24} paddingBottom={20} gap={28}>
        <XStack justifyContent="center" alignItems="center" gap={8}>
          {SLIDES.map((item, i) => (
            <Dot key={item.title} index={i} scrollX={scrollX} width={width} C={C} />
          ))}
        </XStack>

        <Pressable
          onPress={() => (isLast ? finish() : goTo(index + 1))}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                  alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
            <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
              {isLast ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons name={isLast ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color="white" />
          </XStack>
        </Pressable>
      </YStack>
    </SafeAreaView>
  );
}
