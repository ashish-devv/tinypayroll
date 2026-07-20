import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SidebarProvider } from '@/src/components/ui';

function useColors() {
  const dark = useColorScheme().colorScheme === 'dark';
  return {
    bg:       dark ? '#1e293b' : '#ffffff',
    border:   dark ? '#334155' : '#e2e8f0',
    active:   '#6366f1',
    inactive: dark ? '#94a3b8' : '#94a3b8',
  };
}

function icon(name: keyof typeof Ionicons.glyphMap, focused: boolean, color: string) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();

  return (
    <SidebarProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 8,
          height: 60 + insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: 'Roboto_500Medium',
          fontSize: 11,
          letterSpacing: 0.02,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused, color }) => icon('grid-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          title: 'Employees',
          tabBarIcon: ({ focused, color }) => icon('people-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ focused, color }) => icon('calendar-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="payroll"
        options={{
          title: 'Payroll',
          tabBarIcon: ({ focused, color }) => icon('wallet-outline', focused, color),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ focused, color }) => icon('bar-chart-outline', focused, color),
        }}
      />
    </Tabs>
    </SidebarProvider>
  );
}
