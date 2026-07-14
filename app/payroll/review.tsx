import { ScrollView, YStack, XStack, Text, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { getPayrollRun, finalizePayrollRun } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { PayrollRun, Employee } from '@/src/types';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:        dark ? '#0d0f14' : '#f8f9ff',
    surface:   dark ? '#161a24' : '#ffffff',
    text:      dark ? '#e8eaf0' : '#0b1c30',
    muted:     dark ? '#8b8fa8' : '#45464c',
    placeholder: dark ? '#555a72' : '#9ba1b0',
    border:    dark ? '#2a2f3e' : '#e0e3ea',
    ink:       '#1a1f2c',
    gold:      '#d4af37',
    goldBg:    dark ? '#2a2410' : '#fdf6d8',
    success:   '#16a34a',
    successBg: dark ? '#14301e' : '#f0fdf4',
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

const AVATAR_COLORS = ['#2d3548', '#3b4a6b', '#4a3728', '#2a4a3b'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ReviewPayrollScreen() {
  const C = useC();
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  const { runId } = useLocalSearchParams<{ runId: string }>();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    if (!runId) return;
    Promise.all([getPayrollRun(runId), listEmployees()])
      .then(([r, emps]) => { setRun(r); setEmployees(emps); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load payroll run'))
      .finally(() => setLoading(false));
  }, [runId]);

  async function handleConfirm() {
    if (!run) return;
    setFinalizing(true);
    setError(null);
    try {
      const updated = await finalizePayrollRun(run.id);
      setRun(updated);
      setConfirmed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finalize payroll run');
    } finally {
      setFinalizing(false);
    }
  }

  if (loading || !run) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
          {error ? (
            <Text fontSize={13} fontFamily="$body" color="#dc2626">{error}</Text>
          ) : (
            <Spinner color={C.gold} />
          )}
        </YStack>
      </SafeAreaView>
    );
  }

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>

      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={20}>

          {/* ── Summary hero card ── */}
          <YStack backgroundColor={C.ink} borderRadius={18} padding={22} gap={16}
                  style={C.heroShadow}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack gap={4}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={1}
                      color="rgba(255,255,255,0.5)" textTransform="uppercase">
                  Total Payroll
                </Text>
                <Text fontSize={36} fontFamily="$body" fontWeight="700" color={C.gold} letterSpacing={-1}>
                  ₹{run.totalAmount.toLocaleString('en-IN')}
                </Text>
              </YStack>
              <YStack backgroundColor="rgba(255,255,255,0.1)" borderRadius={10}
                      paddingHorizontal={10} paddingVertical={5}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600"
                      color="rgba(255,255,255,0.7)" letterSpacing={0.4}>PENDING</Text>
              </YStack>
            </XStack>

            <Separator borderColor="rgba(255,255,255,0.12)" />

            <XStack gap={24}>
              <YStack gap={2}>
                <Text fontSize={11} fontFamily="$body" color="rgba(255,255,255,0.5)" letterSpacing={0.4}>EMPLOYEES</Text>
                <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">{run.items.length}</Text>
              </YStack>
              <YStack gap={2}>
                <Text fontSize={11} fontFamily="$body" color="rgba(255,255,255,0.5)" letterSpacing={0.4}>PAY PERIOD</Text>
                <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">{run.period}</Text>
              </YStack>
            </XStack>
          </YStack>

          {/* ── Breakdown ── */}
          <YStack gap={10}>
            <Text fontSize={15} fontFamily="$body" fontWeight="600" color={C.text}>Breakdown</Text>

            {run.items.map((item, i) => {
              const emp = empMap[item.employeeId];
              if (!emp) return null;
              const hasAdj = item.overtime > 0 || item.bonus > 0 || item.unpaidLeave > 0 || item.advances > 0 || item.deductions > 0;

              return (
                <YStack key={item.employeeId} backgroundColor={C.surface} borderRadius={14}
                        borderWidth={1} borderColor={C.border} overflow="hidden"
                        style={C.cardShadow}>
                  <XStack paddingHorizontal={16} paddingVertical={14} alignItems="center" gap={12}>
                    <YStack width={40} height={40} borderRadius={20}
                            backgroundColor={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                            alignItems="center" justifyContent="center">
                      <Text fontSize={13} fontFamily="$body" fontWeight="700" color="white">
                        {initials(emp.name)}
                      </Text>
                    </YStack>
                    <YStack flex={1} gap={2}>
                      <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>{emp.name}</Text>
                      <Text fontSize={12} fontFamily="$body" color={C.muted}>{emp.role}</Text>
                    </YStack>
                    <YStack alignItems="flex-end" gap={2}>
                      <Text fontSize={15} fontFamily="$body" fontWeight="700" color={C.gold}>
                        ₹{item.finalSalary.toLocaleString('en-IN')}
                      </Text>
                      <Text fontSize={11} fontFamily="$body" color={C.placeholder}>net pay</Text>
                    </YStack>
                  </XStack>

                  {hasAdj && (
                    <>
                      <Separator borderColor={C.border} />
                      <YStack backgroundColor={C.bg} paddingHorizontal={16} paddingVertical={12} gap={8}>
                        <XStack justifyContent="space-between">
                          <Text fontSize={12} fontFamily="$body" color={C.muted}>Base Salary</Text>
                          <Text fontSize={12} fontFamily="$body" color={C.text}>₹{item.baseSalary.toLocaleString('en-IN')}</Text>
                        </XStack>
                        {item.overtime > 0 && (
                          <XStack justifyContent="space-between">
                            <Text fontSize={12} fontFamily="$body" color={C.muted}>+ Overtime</Text>
                            <Text fontSize={12} fontFamily="$body" color={C.success}>+₹{item.overtime.toLocaleString('en-IN')}</Text>
                          </XStack>
                        )}
                        {item.bonus > 0 && (
                          <XStack justifyContent="space-between">
                            <Text fontSize={12} fontFamily="$body" color={C.muted}>+ Bonus</Text>
                            <Text fontSize={12} fontFamily="$body" color={C.success}>+₹{item.bonus.toLocaleString('en-IN')}</Text>
                          </XStack>
                        )}
                        {item.unpaidLeave > 0 && (
                          <XStack justifyContent="space-between">
                            <Text fontSize={12} fontFamily="$body" color={C.muted}>− Unpaid Leave</Text>
                            <Text fontSize={12} fontFamily="$body" color="#dc2626">−₹{item.unpaidLeave.toLocaleString('en-IN')}</Text>
                          </XStack>
                        )}
                        {item.advances > 0 && (
                          <XStack justifyContent="space-between">
                            <Text fontSize={12} fontFamily="$body" color={C.muted}>− Advance</Text>
                            <Text fontSize={12} fontFamily="$body" color="#dc2626">−₹{item.advances.toLocaleString('en-IN')}</Text>
                          </XStack>
                        )}
                        {item.deductions > 0 && (
                          <XStack justifyContent="space-between">
                            <Text fontSize={12} fontFamily="$body" color={C.muted}>− Deductions</Text>
                            <Text fontSize={12} fontFamily="$body" color="#dc2626">−₹{item.deductions.toLocaleString('en-IN')}</Text>
                          </XStack>
                        )}
                      </YStack>
                    </>
                  )}
                </YStack>
              );
            })}
          </YStack>

          {error && <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>}

          {/* ── Confirm CTA ── */}
          <Pressable
            onPress={handleConfirm}
            disabled={finalizing}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: finalizing ? 0.6 : 1 })}
          >
            <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                    alignItems="center" justifyContent="center" gap={8}
                    style={C.heroShadow}>
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                {finalizing ? 'Finalizing…' : 'Confirm & Generate Payslips'}
              </Text>
            </XStack>
          </Pressable>

        </YStack>
      </ScrollView>

      {/* ── Success overlay ── */}
      {confirmed && (
        // ponytail: absolute View — Modal/Sheet both crash or look wrong
        <YStack position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="flex-end">
          <Pressable
            onPress={() => setConfirmed(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
          <YStack backgroundColor={C.surface} borderTopLeftRadius={24} borderTopRightRadius={24}
                  padding={28} gap={20} alignItems="center"
                  style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 20 }}>
            <YStack width={40} height={4} borderRadius={2} backgroundColor={C.border} />

            <YStack width={72} height={72} borderRadius={36}
                    backgroundColor={C.successBg} alignItems="center" justifyContent="center">
              <Ionicons name="checkmark" size={36} color={C.success} />
            </YStack>

            <YStack alignItems="center" gap={6}>
              <Text fontSize={20} fontFamily="$body" fontWeight="700" color={C.text}>Payroll Success!</Text>
              <Text fontSize={14} fontFamily="$body" color={C.muted} textAlign="center">
                {run.period} payroll processed for {run.items.length} employees.
              </Text>
            </YStack>

            <YStack backgroundColor={C.goldBg} borderRadius={14} padding={18}
                    width="100%" alignItems="center" gap={4}
                    style={{ shadowColor: '#d4af37', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
              <Text fontSize={11} fontFamily="$body" color={C.muted} letterSpacing={0.6} textTransform="uppercase">
                Total Disbursed
              </Text>
              <Text fontSize={32} fontFamily="$body" fontWeight="700" color={C.gold} letterSpacing={-0.5}>
                ₹{run.totalAmount.toLocaleString('en-IN')}
              </Text>
            </YStack>

            <XStack gap={12} width="100%">
              <Pressable
                style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                onPress={() => { setConfirmed(false); router.push({ pathname: '/payroll/payslips', params: { runId: run.id } } as any); }}
              >
                <YStack borderRadius={12} borderWidth={1} borderColor={C.border}
                        paddingVertical={14} alignItems="center">
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>View Payslips</Text>
                </YStack>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                onPress={() => { setConfirmed(false); router.replace('/(tabs)/' as any); }}
              >
                <YStack backgroundColor={C.ink} borderRadius={12} paddingVertical={14} alignItems="center">
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="white">Done</Text>
                </YStack>
              </Pressable>
            </XStack>
          </YStack>
        </YStack>
      )}

    </SafeAreaView>
  );
}
