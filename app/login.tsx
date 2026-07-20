import { View, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen, AppText, usePalette, useShadows } from '@/src/components/ui';
import { useAuth } from '@/src/services/auth';

export default function LoginScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ponytail: simple, permissive email shape check — good enough for a client-side gate; the
  // backend is the real authority. Trim so trailing spaces from autofill don't fail the regex.
  const trimmedEmail = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const emailError = emailTouched && trimmedEmail.length > 0 && !emailValid ? 'Enter a valid email address' : null;
  const canSubmit = emailValid && password.length > 0 && !loading;

  async function handleLogin() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      {/* ponytail: android keyboard covers inputs without adjustResize (broken by edge-to-edge) */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-center gap-7 px-6">

        <View className="items-center gap-2.5">
          <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-primary" style={shadows.hero}>
            <AppText className="font-inter-bold text-[22px] text-white">TP</AppText>
          </View>
          <AppText className="font-inter-bold text-[22px]">Welcome back</AppText>
          <AppText className="text-[13px] text-muted-light dark:text-muted-dark">Log in to TinyPayroll</AppText>
        </View>

        <View className="gap-4">
          <View className="gap-1.5">
            <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">Email</AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={P.placeholder}
              className={`h-12 rounded-input border bg-surface-low-light px-3.5 text-sm text-text-light dark:bg-surface-low-dark dark:text-text-dark ${emailError ? 'border-rose-400' : 'border-border-light dark:border-border-dark'}`}
              style={{ fontFamily: 'Inter_400Regular' }}
            />
            {emailError && <AppText className="text-xs text-rose-600 dark:text-rose-300">{emailError}</AppText>}
          </View>
          <View className="gap-1.5">
            <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">Password</AppText>
            <View className="h-12 flex-row items-center rounded-input border border-border-light bg-surface-low-light pr-3 dark:border-border-dark dark:bg-surface-low-dark">
              {/* ponytail: native TextInput — Tamagui's <Input> drops secureTextEntry (bug tamagui#2926). */}
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={P.placeholder}
                style={{
                  flex: 1,
                  paddingHorizontal: 14,
                  height: 48,
                  fontSize: 14,
                  fontFamily: 'Inter_400Regular',
                  color: P.text,
                }}
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={P.muted} />
              </Pressable>
            </View>
          </View>
        </View>

        {error && <AppText className="text-center text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>}

        <Pressable onPress={handleLogin} disabled={!canSubmit} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: canSubmit ? 1 : 0.5 })}>
          <View className="flex-row items-center justify-center gap-2 rounded-card bg-primary py-4" style={shadows.hero}>
            <Ionicons name="log-in-outline" size={18} color="white" />
            <AppText className="font-inter-semibold text-[15px] text-white">{loading ? 'Logging in…' : 'Log In'}</AppText>
          </View>
        </Pressable>

        <View className="flex-row justify-center gap-1.5">
          <AppText className="text-[13px] text-muted-light dark:text-muted-dark">Don&apos;t have an account?</AppText>
          <Pressable onPress={() => router.push('/signup')}>
            <AppText className="font-inter-semibold text-[13px] text-primary">Sign up</AppText>
          </Pressable>
        </View>

      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
