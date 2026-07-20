import { ScrollView, View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Screen, Card, AppText, Divider, Chip, usePalette, useShadows, pressScale } from '@/src/components/ui';
import { getEmployee, deleteEmployee } from '@/src/services/employees';
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

          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: deleting ? 0.6 : 1 })}
          >
            <View
              className="flex-row items-center justify-center gap-2 rounded-button border border-rose-200 bg-surface-light py-4 dark:border-rose-500/30 dark:bg-surface-dark"
              style={shadows.card}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#e11d48" />
                : <Ionicons name="trash-outline" size={18} color="#e11d48" />}
              <AppText className="font-inter-semibold text-[15px] text-rose-600">
                {deleting ? 'Deleting…' : 'Delete Employee'}
              </AppText>
            </View>
          </Pressable>

        </View>
      </ScrollView>
    </Screen>
  );
}
