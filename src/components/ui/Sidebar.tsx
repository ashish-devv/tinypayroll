import { createContext, useContext, useState, type ReactNode } from 'react';
import { View, Pressable, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

import { AppText } from './AppText';
import { Divider } from './Divider';
import { usePalette } from './palette';
import { useAuth } from '@/src/services/auth';
import { useTheme } from '@/src/services/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const TIMING = { duration: 240 };

// ── Sidebar context ──────────────────────────────────────────────────────────
// `open()` is consumed by the TopBar hamburger; the edge-swipe gesture opens it
// directly. Default is a noop so a stray consumer outside the provider is safe.
interface SidebarCtx {
  open: () => void;
}
const SidebarContext = createContext<SidebarCtx>({ open: () => {} });
export const useSidebar = () => useContext(SidebarContext);

// SidebarProvider — renders the tab tree, a left-edge swipe catcher, and the
// slide-in drawer overlay (backdrop + panel). Mount once, around <Tabs>.
export function SidebarProvider({ children }: { children: ReactNode }) {
  const P = usePalette();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useAuth();
  const { scheme, toggle } = useTheme();
  const isDark = scheme === 'dark';
  const { width } = useWindowDimensions();
  const PANEL_W = Math.min(300, width * 0.82);

  const [visible, setVisible] = useState(false);
  const progress = useSharedValue(0); // 0 = closed, 1 = fully open

  function open() {
    setVisible(true);
    progress.value = withTiming(1, TIMING);
  }
  function close() {
    progress.value = withTiming(0, TIMING, (fin) => {
      if (fin) runOnJS(setVisible)(false);
    });
  }

  // Left-edge pan → drag the drawer open.
  const openPan = Gesture.Pan()
    .activeOffsetX(12)
    .failOffsetY([-16, 16])
    .onStart(() => {
      runOnJS(setVisible)(true);
    })
    .onUpdate((e) => {
      progress.value = Math.min(Math.max(e.translationX / PANEL_W, 0), 1);
    })
    .onEnd((e) => {
      if (progress.value > 0.4 || e.velocityX > 600) {
        progress.value = withTiming(1, TIMING);
      } else {
        progress.value = withTiming(0, TIMING, (fin) => {
          if (fin) runOnJS(setVisible)(false);
        });
      }
    });

  // Pan on the open panel → drag it back closed.
  const closePan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      progress.value = Math.min(Math.max(1 + e.translationX / PANEL_W, 0), 1);
    })
    .onEnd((e) => {
      if (progress.value < 0.6 || e.velocityX < -600) {
        progress.value = withTiming(0, TIMING, (fin) => {
          if (fin) runOnJS(setVisible)(false);
        });
      } else {
        progress.value = withTiming(1, TIMING);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-PANEL_W, 0], Extrapolation.CLAMP) },
    ],
  }));

  function go(path: string) {
    close();
    router.push(path as any);
  }
  async function handleLogout() {
    close();
    await signOut();
  }

  // Add future destinations here — the panel scales automatically.
  const NAV = [
    { icon: 'grid-outline' as const, label: 'Dashboard', onPress: () => go('/') },
    { icon: 'business-outline' as const, label: 'Business Settings', onPress: () => go('/settings/business') },
    { icon: 'pricetags-outline' as const, label: 'Departments & Roles', onPress: () => go('/settings/catalog') },
  ];

  return (
    <SidebarContext.Provider value={{ open }}>
      <View style={{ flex: 1 }}>
        {children}

        {/* Left-edge swipe catcher — disabled while the drawer is open. */}
        <GestureDetector gesture={openPan}>
          <Animated.View
            pointerEvents={visible ? 'none' : 'auto'}
            style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 20 }}
          />
        </GestureDetector>

        {/* Drawer overlay */}
        <View
          pointerEvents={visible ? 'auto' : 'none'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <AnimatedPressable
            onPress={close}
            style={[
              { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(2,6,23,0.5)' },
              backdropStyle,
            ]}
          />

          <GestureDetector gesture={closePan}>
            <Animated.View
              style={[
                { position: 'absolute', top: 0, left: 0, bottom: 0, width: PANEL_W },
                panelStyle,
              ]}
            >
              <View
                className="flex-1 border-r border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
                style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }}
              >
                {/* Brand header */}
                <View className="flex-row items-center justify-between px-5 pb-4">
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-primary">
                      <AppText className="font-inter-bold text-sm tracking-[0.5px] text-white">TP</AppText>
                    </View>
                    <View>
                      <AppText className="font-inter-bold text-[15px]">TinyPayroll</AppText>
                      <AppText className="text-[11px] text-muted-light dark:text-muted-dark">
                        Business workspace
                      </AppText>
                    </View>
                  </View>
                  <Pressable hitSlop={10} onPress={close}>
                    <Ionicons name="close" size={22} color={P.muted} />
                  </Pressable>
                </View>

                <Divider />

                {/* Nav items */}
                <View className="gap-1 px-3 pt-3">
                  {NAV.map((item) => (
                    <Pressable
                      key={item.label}
                      onPress={item.onPress}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                    >
                      <View className="flex-row items-center gap-3 rounded-input px-3 py-3">
                        <Ionicons name={item.icon} size={19} color={P.text} />
                        <AppText className="font-inter-medium text-[14px]">{item.label}</AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>

                {/* Log out pinned to the bottom */}
                <View className="mt-auto px-3">
                  <Divider />

                  {/* Dark mode toggle */}
                  <Pressable
                    onPress={toggle}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <View className="mt-2 flex-row items-center gap-3 rounded-input px-3 py-3">
                      <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={19} color={P.text} />
                      <AppText className="flex-1 font-inter-medium text-[14px]">Dark Mode</AppText>
                      {/* Track + thumb switch */}
                      <View
                        className={`h-[26px] w-[46px] justify-center rounded-full px-[3px] ${
                          isDark ? 'bg-primary' : 'bg-border-light dark:bg-border-dark'
                        }`}
                      >
                        <View
                          className="h-5 w-5 rounded-full bg-white"
                          style={{ transform: [{ translateX: isDark ? 20 : 0 }] }}
                        />
                      </View>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={handleLogout}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <View className="mt-1 flex-row items-center gap-3 rounded-input px-3 py-3">
                      <Ionicons name="log-out-outline" size={19} color="#e11d48" />
                      <AppText className="font-inter-semibold text-[14px] text-rose-600 dark:text-rose-300">
                        Log Out
                      </AppText>
                    </View>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </SidebarContext.Provider>
  );
}
