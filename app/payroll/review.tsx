import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen, Card, AppText, Divider, usePalette } from '@/src/components/ui';
import { getPayrollRun, finalizePayrollRun } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { PayrollRun, Employee } from '@/src/types';

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ReviewPayrollScreen() {
  const P = usePalette();
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
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center gap-2">
          {error ? (
            <AppText className="text-[13px] text-rose-600">{error}</AppText>
          ) : (
            <ActivityIndicator color={P.primary} />
          )}
        </View>
      </Screen>
    );
  }

  const empMap = Object.fromEntries(employees.map(e => [e.id, e]));

  return (
    <Screen variant="surface" edges={['bottom']}>

      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-5 px-5 pb-10 pt-6">

          {/* ── Summary hero card ── */}
          <Card variant="ink" className="gap-4 p-[22px]">
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[1px] text-white/50">
                  Total Payroll
                </AppText>
                <AppText className="font-mono text-4xl tracking-[-1px] text-white">
                  ₹{run.totalAmount.toLocaleString('en-IN')}
                </AppText>
              </View>
              <View className="rounded-input bg-white/10 px-2.5 py-[5px]">
                <AppText className="font-inter-semibold text-[11px] tracking-[0.4px] text-white/70">PENDING</AppText>
              </View>
            </View>

            <Divider className="bg-white/[0.12]" />

            <View className="flex-row gap-6">
              <View className="gap-0.5">
                <AppText className="text-[11px] tracking-[0.4px] text-white/50">EMPLOYEES</AppText>
                <AppText className="font-mono text-[15px] text-white">{run.items.length}</AppText>
              </View>
              <View className="gap-0.5">
                <AppText className="text-[11px] tracking-[0.4px] text-white/50">PAY PERIOD</AppText>
                <AppText className="font-inter-semibold text-[15px] text-white">{run.period}</AppText>
              </View>
            </View>
          </Card>

          {/* ── Breakdown ── */}
          <View className="gap-2.5">
            <AppText className="font-inter-semibold text-[15px]">Breakdown</AppText>

            {run.items.map((item, i) => {
              const emp = empMap[item.employeeId];
              if (!emp) return null;
              const hasAdj = item.overtime > 0 || item.bonus > 0 || item.unpaidLeave > 0 || item.advances > 0 || item.deductions > 0;

              return (
                <Card key={item.employeeId} className="overflow-hidden">
                  <View className="flex-row items-center gap-3 px-4 py-3.5">
                    <View
                      className="h-10 w-10 items-center justify-center rounded-[20px]"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      <AppText className="font-inter-bold text-[13px] text-white">
                        {initials(emp.name)}
                      </AppText>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <AppText className="font-inter-semibold text-sm">{emp.name}</AppText>
                      <AppText className="text-xs text-muted-light dark:text-muted-dark">{emp.role}</AppText>
                    </View>
                    <View className="items-end gap-0.5">
                      <AppText className="font-mono text-[15px] text-primary">
                        ₹{item.finalSalary.toLocaleString('en-IN')}
                      </AppText>
                      <AppText className="text-[11px] text-placeholder-light dark:text-placeholder-dark">net pay</AppText>
                    </View>
                  </View>

                  {hasAdj && (
                    <>
                      <Divider />
                      <View className="gap-2 bg-canvas-light px-4 py-3 dark:bg-canvas-dark">
                        <View className="flex-row justify-between">
                          <AppText className="text-xs text-muted-light dark:text-muted-dark">Base Salary</AppText>
                          <AppText className="font-mono text-xs text-text-light dark:text-text-dark">₹{item.baseSalary.toLocaleString('en-IN')}</AppText>
                        </View>
                        {item.overtime > 0 && (
                          <View className="flex-row justify-between">
                            <AppText className="text-xs text-muted-light dark:text-muted-dark">+ Overtime</AppText>
                            <AppText className="font-mono text-xs text-emerald-600 dark:text-emerald-400">+₹{item.overtime.toLocaleString('en-IN')}</AppText>
                          </View>
                        )}
                        {item.bonus > 0 && (
                          <View className="flex-row justify-between">
                            <AppText className="text-xs text-muted-light dark:text-muted-dark">+ Bonus</AppText>
                            <AppText className="font-mono text-xs text-emerald-600 dark:text-emerald-400">+₹{item.bonus.toLocaleString('en-IN')}</AppText>
                          </View>
                        )}
                        {item.unpaidLeave > 0 && (
                          <View className="flex-row justify-between">
                            <AppText className="text-xs text-muted-light dark:text-muted-dark">− Unpaid Leave</AppText>
                            <AppText className="font-mono text-xs text-rose-600 dark:text-rose-400">−₹{item.unpaidLeave.toLocaleString('en-IN')}</AppText>
                          </View>
                        )}
                        {item.advances > 0 && (
                          <View className="flex-row justify-between">
                            <AppText className="text-xs text-muted-light dark:text-muted-dark">− Advance</AppText>
                            <AppText className="font-mono text-xs text-rose-600 dark:text-rose-400">−₹{item.advances.toLocaleString('en-IN')}</AppText>
                          </View>
                        )}
                        {item.deductions > 0 && (
                          <View className="flex-row justify-between">
                            <AppText className="text-xs text-muted-light dark:text-muted-dark">− Deductions</AppText>
                            <AppText className="font-mono text-xs text-rose-600 dark:text-rose-400">−₹{item.deductions.toLocaleString('en-IN')}</AppText>
                          </View>
                        )}
                      </View>
                    </>
                  )}
                </Card>
              );
            })}
          </View>

          {error && <AppText className="text-center text-[13px] text-rose-600">{error}</AppText>}

          {/* ── Confirm CTA ── */}
          <Pressable
            onPress={handleConfirm}
            disabled={finalizing}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: finalizing ? 0.6 : 1 })}
          >
            <Card variant="ink" className="flex-row items-center justify-center gap-2 py-4">
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">
                {finalizing ? 'Finalizing…' : 'Confirm & Generate Payslips'}
              </AppText>
            </Card>
          </Pressable>

        </View>
      </ScrollView>

      {/* ── Success overlay ── */}
      {confirmed && (
        // ponytail: absolute View — Modal/Sheet both crash or look wrong
        <View className="absolute inset-0 justify-end">
          <Pressable
            onPress={() => setConfirmed(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
          />
          <View
            className="items-center gap-5 rounded-t-[24px] bg-surface-light p-7 dark:bg-surface-dark"
            style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 20 }}
          >
            <View className="h-1 w-10 rounded-[2px] bg-border-light dark:bg-border-dark" />

            <View className="h-[72px] w-[72px] items-center justify-center rounded-[36px] bg-[#f0fdf4] dark:bg-[#14301e]">
              <Ionicons name="checkmark" size={36} color="#16a34a" />
            </View>

            <View className="items-center gap-1.5">
              <AppText className="font-inter-bold text-xl">Payroll Success!</AppText>
              <AppText className="text-center text-sm text-muted-light dark:text-muted-dark">
                {run.period} payroll processed for {run.items.length} employees.
              </AppText>
            </View>

            <View
              className="w-full items-center gap-1 rounded-card bg-gold-bg-light p-[18px] dark:bg-gold-bg-dark"
              style={{ shadowColor: '#6366f1', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <AppText className="text-[11px] uppercase tracking-[0.6px] text-muted-light dark:text-muted-dark">
                Total Disbursed
              </AppText>
              <AppText className="font-mono text-[32px] tracking-[-0.5px] text-primary">
                ₹{run.totalAmount.toLocaleString('en-IN')}
              </AppText>
            </View>

            <View className="w-full flex-row gap-3">
              <Pressable
                style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                onPress={() => { setConfirmed(false); router.push({ pathname: '/payroll/payslips', params: { runId: run.id } } as any); }}
              >
                <View className="items-center rounded-button border border-border-light py-3.5 dark:border-border-dark">
                  <AppText className="font-inter-semibold text-sm">View Payslips</AppText>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                onPress={() => { setConfirmed(false); router.replace('/(tabs)/' as any); }}
              >
                <View className="items-center rounded-button bg-primary py-3.5">
                  <AppText className="font-inter-semibold text-sm text-white">Done</AppText>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      )}

    </Screen>
  );
}
