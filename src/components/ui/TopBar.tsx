import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { OfflineBadge } from './OfflineBadge';
import { usePalette } from './palette';
import { useSidebar } from './Sidebar';
import { useIsOnline } from '@/src/hooks/useIsOnline';

type TopBarProps = {
  /** Title text shown next to the TP badge. */
  title: string;
  /** 'surface' (solid, default) or 'glass' (translucent — Dashboard). */
  variant?: 'surface' | 'glass';
  /** Show a settings gear on the right (Dashboard). */
  onSettings?: () => void;
  /** Show a notifications bell on the right. */
  onNotifications?: () => void;
};

// TopBar — the shared tab-screen header. Hamburger (opens the sidebar) + TP badge
// + title on the left; optional bell / settings actions on the right. Keeps all
// five tabs visually identical.
export function TopBar({ title, variant = 'surface', onSettings, onNotifications }: TopBarProps) {
  const P = usePalette();
  const { open } = useSidebar();
  const online = useIsOnline();

  const barClass =
    variant === 'glass'
      ? 'border-border-light/60 bg-surface-light/80 dark:border-border-dark/60 dark:bg-surface-dark/80'
      : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark';

  return (
    <View className={`flex-row items-center justify-between border-b px-5 py-3.5 ${barClass}`}>
      <View className="flex-row items-center gap-2.5">
        <Pressable hitSlop={12} onPress={open}>
          <Ionicons name="menu" size={24} color={P.text} />
        </Pressable>
        <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-primary">
          <AppText className="font-inter-bold text-xs tracking-[0.5px] text-white">TP</AppText>
        </View>
        <AppText className="font-inter-semibold text-base">{title}</AppText>
        {!online && <OfflineBadge />}
      </View>

      <View className="flex-row items-center gap-3">
        {onNotifications !== undefined && (
          <Pressable hitSlop={12} onPress={onNotifications}>
            <Ionicons name="notifications-outline" size={22} color={P.muted} />
          </Pressable>
        )}
        {onSettings !== undefined && (
          <Pressable hitSlop={12} onPress={onSettings}>
            <Ionicons name="settings-outline" size={22} color={P.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
