import { ScrollView, YStack, XStack, Text } from 'tamagui';
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

function Field({ label, C, keyboardType, secureTextEntry, ...rest }: {
  label: string; C: ReturnType<typeof useC>;
  value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
}) {
  // ponytail: native TextInput — Tamagui's <Input> drops secureTextEntry & keyboardType (bug tamagui#2926).
  const [show, setShow] = useState(false);
  return (
    <YStack gap={6}>
      <Text fontSize={12} fontFamily="$body" fontWeight="500" color={C.muted}>{label}</Text>
      <XStack
        alignItems="center"
        backgroundColor={C.inputBg}
        borderWidth={1} borderColor={C.border} borderRadius={10}
        paddingRight={secureTextEntry ? 12 : 0} height={48}
      >
        <TextInput
          {...rest}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !show}
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
        {secureTextEntry && (
          <Pressable hitSlop={10} onPress={() => setShow((v) => !v)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
          </Pressable>
        )}
      </XStack>
    </YStack>
  );
}

export default function SignupScreen() {
  const C = useC();
  const router = useRouter();
  const { signUp } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setError(null);
    setLoading(true);
    try {
      await signUp(companyName, name, email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack flex={1} paddingHorizontal={24} paddingTop={48} paddingBottom={40} gap={28}>

          <YStack gap={6}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </Pressable>
            <Text fontSize={22} fontFamily="$body" fontWeight="700" color={C.text} marginTop={12}>
              Create your account
            </Text>
            <Text fontSize={13} fontFamily="$body" color={C.muted}>
              Set up TinyPayroll for your business.
            </Text>
          </YStack>

          <YStack gap={16}>
            <Field label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="e.g. Acme Co" C={C} />
            <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" C={C} />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" C={C} />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry C={C} />
          </YStack>

          {error && <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>}

          <Pressable onPress={handleSignup} disabled={loading} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: loading ? 0.6 : 1 })}>
            <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                    alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
              <Ionicons name="person-add-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">{loading ? 'Creating…' : 'Create Account'}</Text>
            </XStack>
          </Pressable>

          <XStack justifyContent="center" gap={6}>
            <Text fontSize={13} fontFamily="$body" color={C.muted}>Already have an account?</Text>
            <Pressable onPress={() => router.back()}>
              <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.gold}>Log in</Text>
            </Pressable>
          </XStack>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
