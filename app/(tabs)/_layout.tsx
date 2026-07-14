import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function useColors() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:       dark ? '#161a24' : '#ffffff',
    border:   dark ? '#2a2f3e' : '#e0e3ea',
    active:   '#d4af37',
    inactive: dark ? '#8b8fa8' : '#9ba1b0',
  };
}

function icon(name: keyof typeof Ionicons.glyphMap, focused: boolean, color: string) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();

  return (
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
          fontFamily: 'Inter_500Medium',
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
  );
}
