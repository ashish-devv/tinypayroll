import { ScrollView, YStack, XStack, Text, Input, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { getEmployee, updateEmployee } from '@/src/services/employees';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:          dark ? '#0d0f14' : '#f8f9ff',
    surface:     dark ? '#161a24' : '#ffffff',
    surfaceLow:  dark ? '#1e2235' : '#eff4ff',
    text:        dark ? '#e8eaf0' : '#0b1c30',
    muted:       dark ? '#8b8fa8' : '#45464c',
    placeholder: dark ? '#555a72' : '#9ba1b0',
    border:      dark ? '#2a2f3e' : '#e0e3ea',
    inputBg:     dark ? '#1e2235' : '#f2f4f8',
    ink:         '#1a1f2c',
    gold:        '#d4af37',
  };
}

function Field({
  label, placeholder, keyboardType = 'default', C, value, onChangeText,
}: {
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  C: ReturnType<typeof useC>;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <YStack gap={6}>
      <Text fontSize={12} fontFamily="$body" fontWeight="500" color={C.muted}>{label}</Text>
      <YStack
        backgroundColor={C.inputBg}
        borderRadius={10}
        borderWidth={1}
        borderColor={C.border}
        paddingHorizontal={14}
        paddingVertical={12}
      >
        <Input
          unstyled
          fontSize={14}
          fontFamily="$body"
          color={C.text}
          placeholderTextColor={C.placeholder}
          placeholder={placeholder}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
        />
      </YStack>
    </YStack>
  );
}

export default function EditEmployeeScreen() {
  const C = useC();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [salaryType, setSalaryType] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEmployee(id)
      .then((e) => {
        if (cancelled) return;
        setName(e.name);
        setRole(e.role);
        setPhone(e.phone ?? '');
        setBaseAmount(String(e.baseSalary));
        setJoinDate(e.joinDate ?? '');
        setBankName(e.bankName ?? '');
        setIfsc(e.ifsc ?? '');
        setAccountNumber(e.bankAccount ?? '');
        setSalaryType(e.salaryType ?? 'MONTHLY');
        setStatus(e.status === 'active' ? 'ACTIVE' : 'INACTIVE');
        setLoaded(true);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load employee'); });
    return () => { cancelled = true; };
  }, [id]);

  async function handleSave() {
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      await updateEmployee(id, {
        name, role, baseSalary: Number(baseAmount) || 0, salaryType, status,
        joinDate: joinDate || new Date().toISOString().slice(0, 10),
        phone: phone || undefined,
        bankName: bankName || undefined,
        ifsc: ifsc || undefined,
        bankAccountNumber: accountNumber || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
          {error
            ? <Text fontSize={13} fontFamily="$body" color="#dc2626">{error}</Text>
            : <Spinner color={C.gold} />}
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={28}>

          {/* ── Basic Information ── */}
          <YStack gap={14}>
            <XStack alignItems="center" gap={8} marginBottom={4}>
              <Ionicons name="person-outline" size={14} color={C.muted} />
              <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
                    color={C.muted} textTransform="uppercase">Basic Information</Text>
            </XStack>
            <Field label="Full Name" placeholder="e.g. Rahul Sharma" value={name} onChangeText={setName} C={C} />
            <Field label="Designation / Role" placeholder="e.g. Sales Executive" value={role} onChangeText={setRole} C={C} />
            <Field label="Phone Number" placeholder="+91 98XXX XXX-XXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} C={C} />
          </YStack>

          {/* ── Salary Details ── */}
          <YStack gap={14}>
            <XStack alignItems="center" gap={8} marginBottom={4}>
              <Ionicons name="wallet-outline" size={14} color={C.muted} />
              <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
                    color={C.muted} textTransform="uppercase">Salary Details</Text>
            </XStack>

            <YStack gap={6}>
              <Text fontSize={12} fontFamily="$body" fontWeight="500" color={C.muted}>Salary Type</Text>
              <XStack gap={10}>
                {(['MONTHLY', 'DAILY'] as const).map((t) => (
                  <Pressable key={t} onPress={() => setSalaryType(t)} style={{ flex: 1 }}>
                    <YStack
                      flex={1}
                      paddingVertical={11}
                      borderRadius={10}
                      borderWidth={1.5}
                      borderColor={salaryType === t ? C.ink : C.border}
                      backgroundColor={salaryType === t ? C.ink : C.inputBg}
                      alignItems="center"
                    >
                      <Text fontSize={13} fontFamily="$body" fontWeight="600"
                            color={salaryType === t ? 'white' : C.muted}>
                        {t === 'MONTHLY' ? 'Monthly' : 'Daily Wage'}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            <XStack gap={12}>
              <YStack flex={1}>
                <Field
                  label="Base Amount"
                  placeholder={salaryType === 'MONTHLY' ? '₹ 0' : '₹ 0 / day'}
                  keyboardType="numeric"
                  value={baseAmount}
                  onChangeText={setBaseAmount}
                  C={C}
                />
              </YStack>
              <YStack flex={1}>
                <Field label="Joining Date" placeholder="yyyy-mm-dd" value={joinDate} onChangeText={setJoinDate} C={C} />
              </YStack>
            </XStack>
          </YStack>

          {/* ── Bank Details ── */}
          <YStack gap={14}>
            <XStack alignItems="center" gap={8} marginBottom={4}>
              <Ionicons name="card-outline" size={14} color={C.muted} />
              <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
                    color={C.muted} textTransform="uppercase">Bank Details</Text>
            </XStack>
            <XStack gap={12}>
              <YStack flex={1}>
                <Field label="Bank Name" placeholder="e.g. HDFC Bank" value={bankName} onChangeText={setBankName} C={C} />
              </YStack>
              <YStack flex={1}>
                <Field label="IFSC / ID" placeholder="e.g. HDFC0001" value={ifsc} onChangeText={setIfsc} C={C} />
              </YStack>
            </XStack>
            <Field label="Account Number" placeholder="000-000-000-000" keyboardType="numeric" value={accountNumber} onChangeText={setAccountNumber} C={C} />
          </YStack>

          {error && <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>}

          {/* ── Save ── */}
          <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 })}>
            <XStack
              backgroundColor={C.ink}
              borderRadius={14}
              paddingVertical={16}
              alignItems="center"
              justifyContent="center"
              gap={8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                {saving ? 'Saving…' : 'Save Changes'}
              </Text>
            </XStack>
          </Pressable>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
