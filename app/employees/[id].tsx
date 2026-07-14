import { ScrollView, YStack, XStack, Text, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Pressable, useColorScheme, Alert } from 'react-native';
import { useCallback, useState } from 'react';

import { getEmployee, deleteEmployee } from '@/src/services/employees';
import type { Employee } from '@/src/types';

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
    ink:         '#1a1f2c',
    gold:        '#d4af37',
    success:     '#16a34a',
    successBg:   dark ? '#14301e' : '#f0fdf4',
    cardShadow: {
      shadowColor: dark ? '#000000' : '#1a1f2c',
      shadowOpacity: dark ? 0.28 : 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: dark ? 5 : 2,
    } as const,
    heroShadow: {
      shadowColor: '#d4af37',
      shadowOpacity: dark ? 0.28 : 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
      elevation: dark ? 10 : 6,
    } as const,
  };
}

function InfoRow({ label, value, C }: { label: string; value: string; C: ReturnType<typeof useC> }) {
  return (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical={6}>
      <Text fontSize={13} fontFamily="$body" color={C.muted}>{label}</Text>
      <Text fontSize={14} fontFamily="$body" fontWeight="500" color={C.text}>{value}</Text>
    </XStack>
  );
}

export default function EmployeeDetailScreen() {
  const C = useC();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [emp, setEmp] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ponytail: refetch on focus so returning from the edit form shows fresh data.
  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let cancelled = false;
      setError(null);
      getEmployee(id)
        .then((e) => { if (!cancelled) setEmp(e); })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load employee'); });
      return () => { cancelled = true; };
    }, [id])
  );

  function confirmDelete() {
    if (!emp) return;
    Alert.alert(
      'Delete employee',
      `Remove ${emp.name}? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteEmployee(emp.id);
              router.back();
            } catch (e) {
              Alert.alert('Delete failed', e instanceof Error ? e.message : 'Could not delete employee');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!emp) {
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

  const payType = emp.salaryType ?? (emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY');
  const salaryLabel = payType === 'MONTHLY'
    ? `₹${emp.baseSalary.toLocaleString('en-IN')} / month`
    : `₹${emp.baseSalary.toLocaleString('en-IN')} / day`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={16}>

          {/* ── Identity header ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1} borderColor={C.border}
                  padding={20} alignItems="center" gap={10} style={C.cardShadow}>
            <YStack width={72} height={72} borderRadius={36} backgroundColor={C.ink}
                    alignItems="center" justifyContent="center">
              <Text fontSize={24} fontFamily="$body" fontWeight="700" color={C.gold}>{emp.avatarInitials}</Text>
            </YStack>
            <YStack alignItems="center" gap={2}>
              <Text fontSize={18} fontFamily="$body" fontWeight="700" color={C.text}>{emp.name}</Text>
              <Text fontSize={13} fontFamily="$body" color={C.muted} textTransform="uppercase" letterSpacing={0.4}>
                {emp.role}
              </Text>
            </YStack>
            <YStack backgroundColor={emp.status === 'active' ? C.successBg : C.surfaceLow}
                    borderRadius={9999} paddingHorizontal={10} paddingVertical={4}>
              <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.4}
                    color={emp.status === 'active' ? C.success : C.muted} textTransform="uppercase">
                {emp.status}
              </Text>
            </YStack>
          </YStack>

          {/* ── Salary ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1} borderColor={C.border}
                  padding={18} gap={4} style={C.cardShadow}>
            <Text fontSize={12} fontFamily="$body" fontWeight="600" color={C.text}
                  letterSpacing={0.3} textTransform="uppercase">Salary</Text>
            <Separator borderColor={C.border} marginVertical={6} />
            <InfoRow label="Type" value={payType === 'MONTHLY' ? 'Monthly' : 'Daily Wage'} C={C} />
            <InfoRow label="Base" value={salaryLabel} C={C} />
            <InfoRow label="Joined" value={emp.joinDate} C={C} />
          </YStack>

          {/* ── Contact & bank ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1} borderColor={C.border}
                  padding={18} gap={4} style={C.cardShadow}>
            <Text fontSize={12} fontFamily="$body" fontWeight="600" color={C.text}
                  letterSpacing={0.3} textTransform="uppercase">Contact &amp; Bank</Text>
            <Separator borderColor={C.border} marginVertical={6} />
            <InfoRow label="Phone" value={emp.phone || '—'} C={C} />
            <InfoRow label="Bank" value={emp.bankName || '—'} C={C} />
            <InfoRow label="IFSC" value={emp.ifsc || '—'} C={C} />
            <InfoRow label="Account" value={emp.bankAccount ? `••• ${emp.bankAccount.slice(-4)}` : '—'} C={C} />
          </YStack>

          {/* ── Actions ── */}
          <Pressable
            onPress={() => router.push({ pathname: '/employees/edit', params: { id: emp.id } } as any)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                    alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
              <Ionicons name="create-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">Edit Employee</Text>
            </XStack>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: deleting ? 0.6 : 1 })}
          >
            <XStack backgroundColor={C.surface} borderRadius={14} borderWidth={1} borderColor="#fecaca"
                    paddingVertical={16} alignItems="center" justifyContent="center" gap={8} style={C.cardShadow}>
              {deleting
                ? <Spinner size="small" color="#dc2626" />
                : <Ionicons name="trash-outline" size={18} color="#dc2626" />}
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="#dc2626">
                {deleting ? 'Deleting…' : 'Delete Employee'}
              </Text>
            </XStack>
          </Pressable>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
