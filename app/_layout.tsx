import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Geist_500Medium } from '@expo-google-fonts/geist';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, useColorScheme } from 'react-native';

import tamaguiConfig from '@/tamagui.config';
import { AuthProvider, useAuth } from '@/src/services/auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const dark = useColorScheme() === 'dark';
  const { isAuthenticated, hasOnboarded, isBooting } = useAuth();
  const headerBg   = dark ? '#161a24' : '#ffffff';
  const headerText = dark ? '#e8eaf0' : '#0b1c30';
  const headerBorder = dark ? '#2a2f3e' : '#e0e3ea';

  if (isBooting) return null;

  const headerOpts = {
    headerStyle: { backgroundColor: headerBg },
    headerTintColor: headerText,
    headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 } as const,
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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Geist_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const dark = useColorScheme() === 'dark';

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
        <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
          <StatusBar style={dark ? 'light' : 'dark'} />
        </ThemeProvider>
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
