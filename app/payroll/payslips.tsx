import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { Screen, AppText, usePalette, useShadows } from '@/src/components/ui';
import { getPayrollRun } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { PayrollRun, PayrollRunItem } from '@/src/types';

// ponytail: run items only carry employeeId — join against the employee list so each row can show
// a name/role. Falls back to the id if an employee was deleted after the run was finalized.
interface Row extends PayrollRunItem {
  name: string;
  role: string;
  initials: string;
}

export default function PayslipsListScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const router = useRouter();
  const { runId } = useLocalSearchParams<{ runId: string }>();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    // A run is a snapshot of who was active at creation time. Show every item in the run; load
    // ALL employees only to resolve names/roles (an employee active at creation but deactivated
    // since must still show here). Never re-filter membership by current status.
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
      <Screen variant="surface" edges={['bottom']}>
        <View className="flex-1 items-center justify-center gap-2">
          {error
            ? <AppText className="text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>
            : <ActivityIndicator color={P.primary} />}
        </View>
      </Screen>
    );
  }

  return (
    <Screen variant="surface" edges={['bottom']}>
      <ScrollView className="flex-1 bg-canvas-light dark:bg-canvas-dark">
        <View className="gap-3 p-5">

          {/* ── Run summary ── */}
          <View className="gap-1 rounded-card bg-gold-bg-light p-[18px] dark:bg-gold-bg-dark">
            <AppText className="font-inter-semibold text-xs uppercase tracking-[0.6px] text-muted-light dark:text-muted-dark">{run.period}</AppText>
            <AppText className="font-mono font-inter-bold text-2xl text-primary">
              ₹{run.totalAmount.toLocaleString('en-IN')}
            </AppText>
            <AppText className="text-xs text-muted-light dark:text-muted-dark">
              {rows.length} {rows.length === 1 ? 'employee' : 'employees'} • tap a name to view their payslip
            </AppText>
          </View>

          {rows.map((row) => (
            <Pressable
              key={row.employeeId}
              onPress={() => router.push({
                pathname: '/payroll/payslip',
                params: { runId: run.id, employeeId: row.employeeId },
              } as any)}
              style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View
                className="flex-row items-center gap-3 rounded-card border border-border-light bg-surface-light px-4 py-3.5 dark:border-border-dark dark:bg-surface-dark"
                style={shadows.card}
              >
                <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-primary">
                  <AppText className="font-inter-bold text-sm text-white">{row.initials}</AppText>
                </View>
                <View className="flex-1 gap-0.5">
                  <AppText className="font-inter-semibold text-[15px]">{row.name}</AppText>
                  {!!row.role && <AppText className="text-xs text-muted-light dark:text-muted-dark">{row.role}</AppText>}
                </View>
                <View className="items-end gap-0.5">
                  <AppText className="font-mono font-inter-bold text-base text-primary">
                    ₹{row.finalSalary.toLocaleString('en-IN')}
                  </AppText>
                  <Ionicons name="chevron-forward" size={16} color={P.muted} />
                </View>
              </View>
            </Pressable>
          ))}

        </View>
      </ScrollView>
    </Screen>
  );
}
