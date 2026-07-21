import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { Roboto_600SemiBold } from '@expo-google-fonts/roboto/600SemiBold';
import { Roboto_700Bold } from '@expo-google-fonts/roboto/700Bold';
import { Roboto_800ExtraBold } from '@expo-google-fonts/roboto/800ExtraBold';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';

import { AuthProvider, useAuth } from '@/src/services/auth';
import { ThemeProvider as AppThemeProvider } from '@/src/services/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const dark = useColorScheme().colorScheme === 'dark';
  const { isAuthenticated, hasOnboarded, isBooting } = useAuth();
  const headerBg   = dark ? '#1e293b' : '#ffffff';
  const headerText = dark ? '#f1f5f9' : '#0f172a';
  const headerBorder = dark ? '#334155' : '#e2e8f0';

  if (isBooting) return null;

  const headerOpts = {
    headerStyle: { backgroundColor: headerBg },
    headerTintColor: headerText,
    headerTitleStyle: { fontFamily: 'Roboto_600SemiBold', fontSize: 17 } as const,
    headerShadowVisible: false,
    headerBorderBottomColor: headerBorder, // iOS
  };

  // ponytail: explicit back button — some routes (e.g. settings/business, pushed as a plain stack
  // screen rather than a modal) weren't reliably getting native-stack's default back arrow.
  const backHeaderLeft = () => (
    <Pressable hitSlop={12} onPress={() => router.back()} style={{ paddingRight: 8 }}>
      <Ionicons name="chevron-back" size={26} color={headerText} />
    </Pressable>
  );

  return (
    <Stack screenOptions={headerOpts}>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="employees/add" options={{ title: 'Add Employee', presentation: 'modal', ...headerOpts }} />
        <Stack.Screen name="employees/[id]" options={{ title: 'Employee', ...headerOpts, headerLeft: backHeaderLeft }} />
        <Stack.Screen name="employees/edit" options={{ title: 'Edit Employee', ...headerOpts, headerLeft: backHeaderLeft }} />
        <Stack.Screen name="payroll/review" options={{ title: 'Review Payroll', ...headerOpts }} />
        <Stack.Screen name="payroll/payslips" options={{ title: 'Payslips', ...headerOpts }} />
        <Stack.Screen name="payroll/payslip" options={{ title: 'Payslip', ...headerOpts }} />
        <Stack.Screen name="settings/business" options={{ title: 'Business Configuration', ...headerOpts, headerLeft: backHeaderLeft }} />
        <Stack.Screen name="settings/catalog" options={{ title: 'Departments & Roles', ...headerOpts, headerLeft: backHeaderLeft }} />
        <Stack.Screen name="activity" options={{ title: 'All Activity', ...headerOpts, headerLeft: backHeaderLeft }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated && !hasOnboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthenticated && hasOnboarded}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_600SemiBold,
    Roboto_700Bold,
    Roboto_800ExtraBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const dark = useColorScheme().colorScheme === 'dark';

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
          <AppThemeProvider>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
            <StatusBar style={dark ? 'light' : 'dark'} />
          </AppThemeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
