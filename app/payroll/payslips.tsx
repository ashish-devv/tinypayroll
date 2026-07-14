import { YStack, XStack, Text, Spinner, ScrollView } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { getPayrollRun } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { PayrollRun, PayrollRunItem } from '@/src/types';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:      dark ? '#0d0f14' : '#f8f9ff',
    surface: dark ? '#161a24' : '#ffffff',
    text:    dark ? '#e8eaf0' : '#0b1c30',
    muted:   dark ? '#8b8fa8' : '#45464c',
    border:  dark ? '#2a2f3e' : '#e0e3ea',
    ink:     '#1a1f2c',
    gold:    '#d4af37',
    goldBg:  dark ? '#2a2410' : '#fdf6d8',
    cardShadow: {
      shadowColor: dark ? '#000000' : '#1a1f2c',
      shadowOpacity: dark ? 0.28 : 0.07,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: dark ? 5 : 2,
    } as const,
  };
}

// ponytail: run items only carry employeeId — join against the employee list so each row can show
// a name/role. Falls back to the id if an employee was deleted after the run was finalized.
interface Row extends PayrollRunItem {
  name: string;
  role: string;
  initials: string;
}

export default function PayslipsListScreen() {
  const C = useC();
  const router = useRouter();
  const { runId } = useLocalSearchParams<{ runId: string }>();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    Promise.all([getPayrollRun(runId), listEmployees()])
      .then(([r, employees]) => {
        if (cancelled) return;
        const byId = new Map(employees.map((e) => [e.id, e]));
        setRun(r);
        setRows(
          r.items.map((item) => {
            const emp = byId.get(item.employeeId);
            return {
              ...item,
              name: emp?.name ?? `Employee ${item.employeeId}`,
              role: emp?.role ?? '',
              initials: emp?.avatarInitials ?? '?',
            };
          }),
        );
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load payslips'); });
    return () => { cancelled = true; };
  }, [runId]);

  if (!run) {
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
      <ScrollView flex={1} backgroundColor={C.bg}>
        <YStack padding={20} gap={12}>

          {/* ── Run summary ── */}
          <YStack backgroundColor={C.goldBg} borderRadius={14} padding={18} gap={4}>
            <Text fontSize={12} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
                  color={C.muted} textTransform="uppercase">{run.period}</Text>
            <Text fontSize={24} fontFamily="$body" fontWeight="700" color={C.gold}>
              ₹{run.totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text fontSize={12} fontFamily="$body" color={C.muted}>
              {rows.length} {rows.length === 1 ? 'employee' : 'employees'} • tap a name to view their payslip
            </Text>
          </YStack>

          {rows.map((row) => (
            <Pressable
              key={row.employeeId}
              onPress={() => router.push({
                pathname: '/payroll/payslip',
                params: { runId: run.id, employeeId: row.employeeId },
              } as any)}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <XStack
                backgroundColor={C.surface} borderRadius={14} borderWidth={1} borderColor={C.border}
                paddingHorizontal={16} paddingVertical={14} alignItems="center" gap={12}
                style={C.cardShadow}
              >
                <YStack width={42} height={42} borderRadius={9999} backgroundColor={C.ink}
                        alignItems="center" justifyContent="center">
                  <Text fontSize={14} fontFamily="$body" fontWeight="700" color={C.gold}>{row.initials}</Text>
                </YStack>
                <YStack flex={1} gap={2}>
                  <Text fontSize={15} fontFamily="$body" fontWeight="600" color={C.text}>{row.name}</Text>
                  {!!row.role && <Text fontSize={12} fontFamily="$body" color={C.muted}>{row.role}</Text>}
                </YStack>
                <YStack alignItems="flex-end" gap={2}>
                  <Text fontSize={16} fontFamily="$body" fontWeight="700" color={C.gold}>
                    ₹{row.finalSalary.toLocaleString('en-IN')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={C.muted} />
                </YStack>
              </XStack>
            </Pressable>
          ))}

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
