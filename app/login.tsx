import { YStack, XStack, Text, Input } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, TextInput, useColorScheme } from 'react-native';
import { useState } from 'react';

import { useAuth } from '@/src/services/auth';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:          dark ? '#0d0f14' : '#f8f9ff',
    surface:     dark ? '#161a24' : '#ffffff',
    text:        dark ? '#e8eaf0' : '#0b1c30',
    muted:       dark ? '#8b8fa8' : '#45464c',
    placeholder: dark ? '#555a72' : '#9ba1b0',
    border:      dark ? '#2a2f3e' : '#e0e3ea',
    inputBg:     dark ? '#1e2235' : '#f2f4f8',
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

export default function LoginScreen() {
  const C = useC();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <YStack flex={1} paddingHorizontal={24} justifyContent="center" gap={28}>

        <YStack alignItems="center" gap={10}>
          <YStack width={64} height={64} borderRadius={20} backgroundColor={C.ink}
                  alignItems="center" justifyContent="center" style={C.heroShadow}>
            <Text fontSize={22} fontFamily="$body" fontWeight="700" color={C.gold}>TP</Text>
          </YStack>
          <Text fontSize={22} fontFamily="$body" fontWeight="700" color={C.text}>Welcome back</Text>
          <Text fontSize={13} fontFamily="$body" color={C.muted}>Log in to TinyPayroll</Text>
        </YStack>

        <YStack gap={16}>
          <YStack gap={6}>
            <Text fontSize={12} fontFamily="$body" fontWeight="500" color={C.muted}>Email</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              backgroundColor={C.inputBg}
              borderWidth={1} borderColor={emailError ? '#dc2626' : C.border} borderRadius={10}
              paddingHorizontal={14} height={48} fontSize={14} fontFamily="$body"
              color={C.text} placeholderTextColor={C.placeholder}
            />
            {emailError && <Text fontSize={12} fontFamily="$body" color="#dc2626">{emailError}</Text>}
          </YStack>
          <YStack gap={6}>
            <Text fontSize={12} fontFamily="$body" fontWeight="500" color={C.muted}>Password</Text>
            <XStack
              alignItems="center"
              backgroundColor={C.inputBg}
              borderWidth={1} borderColor={C.border} borderRadius={10}
              paddingRight={12} height={48}
            >
              {/* ponytail: native TextInput — Tamagui's <Input> drops secureTextEntry (bug tamagui#2926). */}
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={C.placeholder}
                style={{
                  flex: 1,
                  paddingHorizontal: 14,
                  height: 48,
                  fontSize: 14,
                  fontFamily: 'Inter_400Regular',
                  color: C.text,
                }}
              />
              <Pressable hitSlop={10} onPress={() => setShowPassword((v) => !v)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </Pressable>
            </XStack>
          </YStack>
        </YStack>

        {error && <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>}

        <Pressable onPress={handleLogin} disabled={!canSubmit} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: canSubmit ? 1 : 0.5 })}>
          <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                  alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
            <Ionicons name="log-in-outline" size={18} color="white" />
            <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">{loading ? 'Logging in…' : 'Log In'}</Text>
          </XStack>
        </Pressable>

        <XStack justifyContent="center" gap={6}>
          <Text fontSize={13} fontFamily="$body" color={C.muted}>Don&apos;t have an account?</Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.gold}>Sign up</Text>
          </Pressable>
        </XStack>

      </YStack>
    </SafeAreaView>
  );
}
