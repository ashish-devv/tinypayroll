import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import { Screen, AppText, Chip, type ChipTone, TopBar, usePalette, useShadows } from '@/src/components/ui';
import { listPayrollRuns, createPayrollRun, deletePayrollRun } from '@/src/services/payroll';
import type { PayrollRun } from '@/src/types';

export default function PayrollScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const now = new Date();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickMonth, setPickMonth] = useState(now.getMonth() + 1); // 1-12
  const [pickYear, setPickYear] = useState(now.getFullYear());
  const [pendingDelete, setPendingDelete] = useState<PayrollRun | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // ponytail: open the per-employee payslip list for this run. The list screen fetches the full
  // run itself, so no pre-fetch here — just hand it the runId.
  function openPayslip(runId: string) {
    router.push({ pathname: '/payroll/payslips', params: { runId } } as any);
  }

  function openPicker() {
    const d = new Date();
    setPickMonth(d.getMonth() + 1);
    setPickYear(d.getFullYear());
    setCreateError(null);
    setPickerOpen(true);
  }

  async function startRun() {
    setCreating(true);
    setCreateError(null);
    try {
      const run = await createPayrollRun(pickMonth, pickYear);
      setPickerOpen(false);
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

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setCreateError(null);
    try {
      await deletePayrollRun(pendingDelete.id);
      setPendingDelete(null);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not delete payroll run');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen variant="surface">
      <TopBar title="Payroll" onNotifications={() => {}} />

      <ScrollView className="flex-1 bg-canvas-light dark:bg-canvas-dark">
        <View className="gap-3 p-5">
        {loading ? (
          <View className="items-center py-10"><ActivityIndicator color={P.primary} /></View>
        ) : error ? (
          <AppText className="text-center text-[13px] text-rose-600">{error}</AppText>
        ) : (
          <>
        <Pressable
          onPress={openPicker}
          disabled={creating}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: creating ? 0.6 : 1 })}
        >
          <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-4" style={shadows.hero}>
            <Ionicons name="add-circle-outline" size={18} color="white" />
            <AppText className="font-inter-semibold text-[15px] text-white">
              New Payroll Run
            </AppText>
          </View>
        </Pressable>
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
            <View
              className="rounded-card border border-border-light bg-surface-light px-4 py-3.5 dark:border-border-dark dark:bg-surface-dark"
              style={run.status === 'pending' ? shadows.hero : shadows.card}
            >
              <View className="gap-2">
                <View className="flex-row items-center justify-between">
                  <AppText className="font-inter-semibold text-[15px]">
                    {run.period}
                  </AppText>
                  <View className="flex-row items-center gap-2">
                    <Chip
                      label={run.status}
                      tone={((run.status === 'paid' ? 'success' : run.status === 'pending' ? 'warning' : 'danger') as ChipTone)}
                      className="uppercase"
                    />
                    <Pressable hitSlop={8} onPress={() => { setCreateError(null); setPendingDelete(run); }}>
                      <Ionicons name="trash-outline" size={18} color={P.muted} />
                    </Pressable>
                  </View>
                </View>
                <AppText className="font-mono text-2xl text-primary">
                  ₹{run.totalAmount.toLocaleString('en-IN')}
                </AppText>
                {run.status === 'pending' && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="arrow-forward-circle-outline" size={14} color={P.muted} />
                    <AppText className="text-xs text-muted-light dark:text-muted-dark">Tap to review &amp; confirm</AppText>
                  </View>
                )}
                {run.status === 'paid' && (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="document-text-outline" size={14} color={P.muted} />
                    <AppText className="text-xs text-muted-light dark:text-muted-dark">
                      Tap to view payslips
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
          </>
        )}
        </View>
      </ScrollView>

      {pickerOpen && (
        <View className="absolute inset-0 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => !creating && setPickerOpen(false)} />
          <View className="rounded-t-card-lg bg-surface-light px-5 pb-8 pt-3 dark:bg-surface-dark" style={shadows.card}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border-light dark:bg-border-dark" />
            <AppText className="mb-1 font-inter-semibold text-lg">Select Period</AppText>
            <AppText className="mb-4 text-[13px] text-muted-light dark:text-muted-dark">
              Choose the month and year to run payroll for.
            </AppText>

            {/* Year stepper */}
            <View className="mb-4 flex-row items-center justify-between rounded-input border border-border-light bg-surface-low-light px-4 py-2.5 dark:border-border-dark dark:bg-surface-low-dark">
              <Pressable hitSlop={10} onPress={() => setPickYear((y) => y - 1)}>
                <Ionicons name="chevron-back" size={22} color={P.text} />
              </Pressable>
              <AppText className="font-mono text-lg">{pickYear}</AppText>
              <Pressable hitSlop={10} onPress={() => setPickYear((y) => y + 1)}>
                <Ionicons name="chevron-forward" size={22} color={P.text} />
              </Pressable>
            </View>

            {/* Month grid */}
            <View className="flex-row flex-wrap gap-2">
              {MONTHS_SHORT.map((label, i) => {
                const m = i + 1;
                const active = m === pickMonth;
                return (
                  <Pressable key={m} onPress={() => setPickMonth(m)} style={{ width: '30.5%' }}>
                    <View
                      className={`items-center rounded-input border py-2.5 ${
                        active
                          ? 'border-primary bg-primary'
                          : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'
                      }`}
                    >
                      <AppText className={`font-inter-medium text-[13px] ${active ? 'text-white' : 'text-muted-light dark:text-muted-dark'}`}>
                        {label}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={startRun}
              disabled={creating}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: creating ? 0.6 : 1 })}
            >
              <View className="mt-5 flex-row items-center justify-center gap-2 rounded-button bg-primary py-4" style={shadows.hero}>
                {creating && <ActivityIndicator color="white" size="small" />}
                <AppText className="font-inter-semibold text-[15px] text-white">
                  {creating ? 'Starting…' : `Start ${MONTHS_SHORT[pickMonth - 1]} ${pickYear} Payroll`}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}

      {pendingDelete && (
        <View className="absolute inset-0 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => !deleting && setPendingDelete(null)} />
          <View className="rounded-t-card-lg bg-surface-light px-5 pb-8 pt-3 dark:bg-surface-dark" style={shadows.card}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border-light dark:bg-border-dark" />
            <AppText className="mb-1 font-inter-semibold text-lg">Delete payroll run?</AppText>
            <AppText className="mb-5 text-[13px] text-muted-light dark:text-muted-dark">
              {pendingDelete.period} will be removed from your payroll list and reports. This can be restored by an admin if needed.
            </AppText>
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1"
                disabled={deleting}
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: deleting ? 0.5 : 1 })}
              >
                <View className="items-center rounded-button border border-border-light py-3.5 dark:border-border-dark">
                  <AppText className="font-inter-semibold text-[15px]">Cancel</AppText>
                </View>
              </Pressable>
              <Pressable
                className="flex-1"
                disabled={deleting}
                onPress={confirmDelete}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: deleting ? 0.6 : 1 })}
              >
                <View className="flex-row items-center justify-center gap-2 rounded-button bg-rose-600 py-3.5">
                  {deleting && <ActivityIndicator color="white" size="small" />}
                  <AppText className="font-inter-semibold text-[15px] text-white">
                    {deleting ? 'Deleting…' : 'Delete'}
                  </AppText>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {createError && (
        <View className="absolute inset-0 items-center justify-center px-8">
          <Pressable className="absolute inset-0 bg-black/50" onPress={() => setCreateError(null)} />
          <View className="w-full max-w-sm items-center rounded-card-lg bg-surface-light px-6 pb-6 pt-7 dark:bg-surface-dark" style={shadows.card}>
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
              <Ionicons name="alert-circle-outline" size={30} color="#e11d48" />
            </View>
            <AppText className="mb-1.5 font-inter-semibold text-lg">Something went wrong</AppText>
            <AppText className="mb-6 text-center text-[13px] text-muted-light dark:text-muted-dark">
              {createError}
            </AppText>
            <Pressable
              className="w-full"
              onPress={() => setCreateError(null)}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View className="items-center rounded-button bg-primary py-3.5">
                <AppText className="font-inter-semibold text-[15px] text-white">Got it</AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
