import { ScrollView, View, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Screen, AppText, usePalette, useShadows } from '@/src/components/ui';
import { useAuth } from '@/src/services/auth';

function Field({ label, keyboardType, secureTextEntry, ...rest }: {
  label: string;
  value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
}) {
  // ponytail: native TextInput — Tamagui's <Input> drops secureTextEntry & keyboardType (bug tamagui#2926).
  const P = usePalette();
  const [show, setShow] = useState(false);
  return (
    <View className="gap-1.5">
      <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">{label}</AppText>
      <View className={`h-12 flex-row items-center rounded-input border border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark ${secureTextEntry ? 'pr-3' : 'pr-0'}`}>
        <TextInput
          {...rest}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !show}
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
        {secureTextEntry && (
          <Pressable hitSlop={10} onPress={() => setShow((v) => !v)}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={P.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function SignupScreen() {
  const P = usePalette();
  const shadows = useShadows();
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
    <Screen>
      {/* ponytail: android keyboard covers inputs without adjustResize (broken by edge-to-edge) */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="flex-1 gap-7 px-6 pb-10 pt-12">

          <View className="gap-1.5">
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ alignSelf: 'flex-start' }}>
              <Ionicons name="arrow-back" size={22} color={P.text} />
            </Pressable>
            <AppText className="mt-3 font-inter-bold text-[22px]">
              Create your account
            </AppText>
            <AppText className="text-[13px] text-muted-light dark:text-muted-dark">
              Set up TinyPayroll for your business.
            </AppText>
          </View>

          <View className="gap-4">
            <Field label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="e.g. Acme Co" />
            <Field label="Full Name" value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@company.com" keyboardType="email-address" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          </View>

          {error && <AppText className="text-center text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>}

          <Pressable onPress={handleSignup} disabled={loading} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: loading ? 0.6 : 1 })}>
            <View className="flex-row items-center justify-center gap-2 rounded-card bg-primary py-4" style={shadows.hero}>
              <Ionicons name="person-add-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">{loading ? 'Creating…' : 'Create Account'}</AppText>
            </View>
          </Pressable>

          <View className="flex-row justify-center gap-1.5">
            <AppText className="text-[13px] text-muted-light dark:text-muted-dark">Already have an account?</AppText>
            <Pressable onPress={() => router.back()}>
              <AppText className="font-inter-semibold text-[13px] text-primary">Log in</AppText>
            </Pressable>
          </View>

        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
