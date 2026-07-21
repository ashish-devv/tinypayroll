import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Screen, Card, AppText, Divider, Chip, usePalette, useShadows, pressScale } from '@/src/components/ui';
import { getEmployee, deleteEmployee, setEmployeeStatus } from '@/src/services/employees';
import type { Employee } from '@/src/types';

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <AppText className="text-[13px] text-muted-light dark:text-muted-dark">{label}</AppText>
      <AppText className={`text-sm ${mono ? 'font-mono text-primary' : 'font-inter-medium'}`}>{value}</AppText>
    </View>
  );
}

export default function EmployeeDetailScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [emp, setEmp] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Delete via an in-app confirm sheet — RN Web's Alert.alert ignores multi-button
  // dialogs, so the old Alert-based flow never fired the destructive action.
  async function performDelete() {
    if (!emp) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteEmployee(emp.id);
      setConfirmOpen(false);
      router.back();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete employee');
      setDeleting(false);
    }
  }

  // Toggle active ⇄ inactive in place; refresh the header chip from the response.
  async function toggleStatus() {
    if (!emp || statusSaving) return;
    setStatusSaving(true);
    setActionError(null);
    const next = emp.status === 'active' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await setEmployeeStatus(emp, next);
      setEmp(updated);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update status');
    } finally {
      setStatusSaving(false);
    }
  }

  if (!emp) {
    return (
      <Screen variant="surface" edges={['bottom']}>
        <View className="flex-1 items-center justify-center gap-2">
          {error
            ? <AppText className="text-[13px] text-rose-600">{error}</AppText>
            : <ActivityIndicator color={P.primary} />}
        </View>
      </Screen>
    );
  }

  const payType = emp.salaryType ?? (emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY');
  const salaryLabel = payType === 'MONTHLY'
    ? `₹${emp.baseSalary.toLocaleString('en-IN')} / month`
    : `₹${emp.baseSalary.toLocaleString('en-IN')} / day`;

  return (
    <Screen variant="surface" edges={['bottom']}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-5 pb-10 pt-6">

          {/* ── Identity header ── */}
          <Card className="items-center gap-2.5 p-5">
            <View className="h-[72px] w-[72px] items-center justify-center rounded-[36px] bg-primary">
              <AppText className="font-inter-bold text-2xl text-white">{emp.avatarInitials}</AppText>
            </View>
            <View className="items-center gap-0.5">
              <AppText className="font-inter-bold text-lg">{emp.name}</AppText>
              <AppText className="text-[13px] uppercase tracking-[0.4px] text-muted-light dark:text-muted-dark">
                {emp.role}
              </AppText>
            </View>
            <Chip
              label={emp.status}
              tone={emp.status === 'active' ? 'success' : 'neutral'}
              className="uppercase"
            />
          </Card>

          {/* ── Salary ── */}
          <Card className="gap-1 p-[18px]">
            <AppText className="font-inter-semibold text-xs uppercase tracking-[0.3px]">Salary</AppText>
            <Divider className="my-1.5" />
            <InfoRow label="Type" value={payType === 'MONTHLY' ? 'Monthly' : 'Daily Wage'} />
            <InfoRow label="Base" value={salaryLabel} mono />
            <InfoRow label="Joined" value={emp.joinDate} />
          </Card>

          {/* ── Contact & bank ── */}
          <Card className="gap-1 p-[18px]">
            <AppText className="font-inter-semibold text-xs uppercase tracking-[0.3px]">Contact &amp; Bank</AppText>
            <Divider className="my-1.5" />
            <InfoRow label="Phone" value={emp.phone || '—'} />
            <InfoRow label="Bank" value={emp.bankName || '—'} />
            <InfoRow label="IFSC" value={emp.ifsc || '—'} />
            <InfoRow label="Account" value={emp.bankAccount ? `••• ${emp.bankAccount.slice(-4)}` : '—'} />
          </Card>

          {/* ── Actions ── */}
          <Pressable
            onPress={() => router.push({ pathname: '/employees/edit', params: { id: emp.id } } as any)}
            style={pressScale}
          >
            <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-4" style={shadows.hero}>
              <Ionicons name="create-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">Edit Employee</AppText>
            </View>
          </Pressable>

          {/* Activate / Deactivate */}
          <Pressable
            onPress={toggleStatus}
            disabled={statusSaving}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: statusSaving ? 0.6 : 1 })}
          >
            <View
              className="flex-row items-center justify-center gap-2 rounded-button border border-border-light bg-surface-light py-4 dark:border-border-dark dark:bg-surface-dark"
              style={shadows.card}
            >
              {statusSaving
                ? <ActivityIndicator size="small" color={P.muted} />
                : <Ionicons name={emp.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={P.text} />}
              <AppText className="font-inter-semibold text-[15px] text-text-light dark:text-text-dark">
                {statusSaving
                  ? 'Updating…'
                  : emp.status === 'active' ? 'Make Inactive' : 'Reactivate Employee'}
              </AppText>
            </View>
          </Pressable>

          <Pressable
            onPress={() => { setActionError(null); setConfirmOpen(true); }}
            disabled={deleting}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: deleting ? 0.6 : 1 })}
          >
            <View
              className="flex-row items-center justify-center gap-2 rounded-button border border-rose-200 bg-surface-light py-4 dark:border-rose-500/30 dark:bg-surface-dark"
              style={shadows.card}
            >
              <Ionicons name="trash-outline" size={18} color="#e11d48" />
              <AppText className="font-inter-semibold text-[15px] text-rose-600">
                Delete Employee
              </AppText>
            </View>
          </Pressable>

          {actionError && !confirmOpen && (
            <AppText className="text-center text-[13px] text-rose-600">{actionError}</AppText>
          )}

        </View>
      </ScrollView>

      {/* ── Delete confirm sheet ── */}
      {confirmOpen && (
        <View className="absolute inset-0 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => !deleting && setConfirmOpen(false)} />
          <View className="rounded-t-card-lg bg-surface-light px-5 pb-8 pt-3 dark:bg-surface-dark" style={shadows.card}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border-light dark:bg-border-dark" />
            <AppText className="mb-1 font-inter-semibold text-lg">Delete {emp.name}?</AppText>
            <AppText className="mb-5 text-[13px] text-muted-light dark:text-muted-dark">
              This permanently removes the employee. To keep records but stop payroll, use “Make Inactive” instead.
            </AppText>

            {actionError && (
              <AppText className="mb-3 text-[13px] text-rose-600">{actionError}</AppText>
            )}

            <Pressable onPress={performDelete} disabled={deleting} style={pressScale}>
              <View className="flex-row items-center justify-center gap-2 rounded-button bg-rose-600 py-4" style={shadows.hero}>
                {deleting && <ActivityIndicator size="small" color="white" />}
                <AppText className="font-inter-semibold text-[15px] text-white">
                  {deleting ? 'Deleting…' : 'Delete Employee'}
                </AppText>
              </View>
            </Pressable>

            <Pressable onPress={() => !deleting && setConfirmOpen(false)} disabled={deleting} style={pressScale}>
              <View className="mt-2.5 items-center justify-center rounded-button border border-border-light py-4 dark:border-border-dark">
                <AppText className="font-inter-semibold text-[15px] text-muted-light dark:text-muted-dark">Cancel</AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
