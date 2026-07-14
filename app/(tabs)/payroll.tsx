import { YStack, Text, XStack, Spinner, ScrollView } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme, Pressable } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import { listPayrollRuns, createPayrollRun } from '@/src/services/payroll';
import type { PayrollRun } from '@/src/types';

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

export default function PayrollScreen() {
  const C = useC();
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPayrollRuns()
      .then((data) => { if (!cancelled) setRuns(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load payroll runs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => refetch(), [refetch]));

  const hasPending = runs.some((r) => r.status === 'pending');

  // ponytail: open the per-employee payslip list for this run. The list screen fetches the full
  // run itself, so no pre-fetch here — just hand it the runId.
  function openPayslip(runId: string) {
    router.push({ pathname: '/payroll/payslips', params: { runId } } as any);
  }

  async function startThisMonth() {
    setCreating(true);
    setCreateError(null);
    try {
      const now = new Date();
      const run = await createPayrollRun(now.getMonth() + 1, now.getFullYear());
      router.push({ pathname: '/payroll/review', params: { runId: run.id } } as any);
    } catch (e) {
      // 409 = a run for this period already exists (e.g. a prior attempt succeeded before an
      // earlier error was reported) — refetch so the existing run shows up instead of just
      // leaving the user stuck looking at an error with a stale list.
      refetch();
      setCreateError(e instanceof Error ? e.message : 'Could not start payroll run');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
      <XStack
        paddingHorizontal={20} paddingVertical={14}
        borderBottomWidth={1} borderBottomColor={C.border}
        backgroundColor={C.surface}
      >
        <Text fontSize={17} fontFamily="$body" fontWeight="600" color={C.text}>Payroll</Text>
      </XStack>

      <ScrollView flex={1} backgroundColor={C.bg}>
        <YStack padding={20} gap={12}>
        {loading ? (
          <YStack paddingVertical={40} alignItems="center"><Spinner color={C.gold} /></YStack>
        ) : error ? (
          <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>
        ) : (
          <>
        {createError && (
          <Pressable onPress={() => setCreateError(null)}>
            <XStack backgroundColor="#fef2f2" borderRadius={12} borderWidth={1} borderColor="#fecaca"
                    paddingHorizontal={14} paddingVertical={12} alignItems="center" gap={8}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text flex={1} fontSize={13} fontFamily="$body" color="#dc2626">{createError}</Text>
              <Ionicons name="close" size={16} color="#dc2626" />
            </XStack>
          </Pressable>
        )}
        {!hasPending && (
          <Pressable
            onPress={startThisMonth}
            disabled={creating}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: creating ? 0.6 : 1 })}
          >
            <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                    alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
              <Ionicons name="add-circle-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                {creating ? 'Starting…' : "Start This Month's Payroll"}
              </Text>
            </XStack>
          </Pressable>
        )}
        {runs.map((run) => (
          <Pressable
            key={run.id}
            onPress={() => {
              if (run.status === 'pending') {
                router.push({ pathname: '/payroll/review', params: { runId: run.id } } as any);
              } else if (run.status === 'paid') {
                openPayslip(run.id);
              }
            }}
            style={({ pressed }) => ({
              transform: [{ scale: (run.status === 'pending' || run.status === 'paid') && pressed ? 0.97 : 1 }],
            })}
          >
            <YStack
              backgroundColor={C.surface}
              borderRadius={14}
              borderWidth={1}
              borderColor={C.border}
              paddingHorizontal={16}
              paddingVertical={14}
              style={run.status === 'pending' ? C.heroShadow : C.cardShadow}
            >
              <YStack gap={8}>
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize={15} fontFamily="$body" fontWeight="600" color={C.text}>
                    {run.period}
                  </Text>
                  <YStack
                    backgroundColor={
                      run.status === 'paid'    ? '#f0fdf4' :
                      run.status === 'pending' ? '#fefce8' : '#fef2f2'
                    }
                    borderRadius={9999}
                    paddingHorizontal={10}
                    paddingVertical={4}
                  >
                    <Text
                      fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.4}
                      color={
                        run.status === 'paid'    ? '#16a34a' :
                        run.status === 'pending' ? '#ca8a04' : '#dc2626'
                      }
                      textTransform="uppercase"
                    >
                      {run.status}
                    </Text>
                  </YStack>
                </XStack>
                <Text fontSize={24} fontFamily="$body" fontWeight="700" color={C.gold}>
                  ₹{run.totalAmount.toLocaleString('en-IN')}
                </Text>
                {run.status === 'pending' && (
                  <XStack alignItems="center" gap={4}>
                    <Ionicons name="arrow-forward-circle-outline" size={14} color={C.muted} />
                    <Text fontSize={12} fontFamily="$body" color={C.muted}>Tap to review &amp; confirm</Text>
                  </XStack>
                )}
                {run.status === 'paid' && (
                  <XStack alignItems="center" gap={4}>
                    <Ionicons name="document-text-outline" size={14} color={C.muted} />
                    <Text fontSize={12} fontFamily="$body" color={C.muted}>
                      Tap to view payslips
                    </Text>
                  </XStack>
                )}
              </YStack>
            </YStack>
          </Pressable>
        ))}
          </>
        )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
