import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Screen, Card, AppText, Divider, TopBar, usePalette, pressScale } from '@/src/components/ui';
import { getBusiness, type Business } from '@/src/services/business';
import { listEmployees } from '@/src/services/employees';
import { listAttendance } from '@/src/services/attendance';
import { listPayrollRuns } from '@/src/services/payroll';
import type { Employee, PayrollRun, AttendanceRecord } from '@/src/types';

function rupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const recentActivity = [
  { id: '1', icon: 'time-outline'       as const, label: 'Overtime added for Rahul', time: '2 hours ago' },
  { id: '2', icon: 'person-add-outline' as const, label: 'New employee: Priya',       time: 'Yesterday'  },
];

// Quick-action circle — the round icon buttons under the hero.
function QuickAction({ icon, label, tint, bg, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={pressScale} className="flex-1 items-center gap-2">
      <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: bg }}>
        <Ionicons name={icon} size={24} color={tint} />
      </View>
      <AppText className="font-inter-medium text-[12px] text-muted-light dark:text-muted-dark">{label}</AppText>
    </Pressable>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex-1 p-4">
      <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">
        {label}
      </AppText>
      <AppText className="mt-2 font-mono text-[28px] leading-[32px] tracking-[-1px] text-text-light dark:text-text-dark">
        {value}
      </AppText>
      {sub ? <AppText className="mt-0.5 text-[12px] text-muted-light dark:text-muted-dark">{sub}</AppText> : null}
    </Card>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const P = usePalette();

  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const now = new Date();
    Promise.all([
      getBusiness(),
      listEmployees('ACTIVE'),
      listAttendance(now.getMonth() + 1, now.getFullYear()),
      listPayrollRuns(),
    ])
      .then(([b, e, a, r]) => {
        if (cancelled) return;
        setBusiness(b);
        setEmployees(e);
        setAttendance(a);
        setRuns(r);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load dashboard'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []));

  if (loading) {
    return (
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={P.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !business) {
    return (
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Ionicons name="alert-circle-outline" size={32} color={P.muted} />
          <AppText className="text-center text-sm text-muted-light dark:text-muted-dark">
            {error ?? 'Could not load dashboard'}
          </AppText>
        </View>
      </Screen>
    );
  }

  const activeEmployees = employees;
  const pendingRun = runs.find((r) => r.status === 'pending');
  const now = new Date();
  const currentPeriod = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
  const monthExpense = runs.find((r) => r.period === currentPeriod)?.totalAmount ?? 0;
  const today = todayIso();
  const todayPresent = attendance.filter((a) => a.date === today && a.status === 'present').length;

  return (
    <Screen variant="canvas">

      {/* ── Glass top bar ── */}
      <TopBar
        title="TinyPayroll"
        variant="glass"
        onNotifications={() => {}}
        onSettings={() => router.push('/settings/business' as any)}
      />

      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-6 px-5 pb-8 pt-6">

          {/* ── Greeting ── */}
          <View className="gap-1">
            <AppText className="font-inter-extrabold text-[26px] tracking-[-0.5px]">
              Good morning, {business.companyName}
            </AppText>
            <AppText className="text-[14px] text-muted-light dark:text-muted-dark">
              Here&apos;s your business overview for {now.toLocaleString('en-US', { month: 'long' })}.
            </AppText>
          </View>

          {/* ── Hero payroll card ── */}
          <Card variant="ink" className="overflow-hidden p-5">
            {/* ambient blobs */}
            <View className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <View className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/5" />
            <View className="relative gap-4">
              <View className="flex-row items-center justify-between">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[1.2px] text-white/70">
                  Total Payroll (Current Month)
                </AppText>
                <Ionicons name="cash-outline" size={20} color="rgba(255,255,255,0.7)" />
              </View>
              <AppText className="font-mono text-[36px] leading-[40px] tracking-[-1.5px] text-white">
                {rupee(monthExpense)}
              </AppText>
              <Pressable
                onPress={() => router.push('/payroll/review' as any)}
                style={pressScale}
              >
                <View className="flex-row items-center justify-between rounded-input bg-white/15 px-4 py-3">
                  <AppText className="font-inter-medium text-[13px] text-white">
                    Review payroll · {activeEmployees.length} employees
                  </AppText>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </View>
              </Pressable>
            </View>
          </Card>

          {/* ── Stat tiles ── */}
          <View className="flex-row gap-3">
            <StatCard label="Active Staff" value={String(activeEmployees.length)} sub="Employees on payroll" />
            <StatCard label="Present Today" value={`${todayPresent}/${activeEmployees.length}`} sub="Checked in" />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Pending" value={pendingRun ? rupee(pendingRun.totalAmount) : '₹0'} sub="Awaiting run" />
            <StatCard label="This Month" value={rupee(monthExpense)} sub="Total cost" />
          </View>

          {/* ── Quick actions ── */}
          <View className="gap-3">
            <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">
              Quick Actions
            </AppText>
            <View className="flex-row gap-2">
              <QuickAction icon="play" label="Run Payroll" tint="#ffffff" bg={P.primary}
                onPress={() => router.push('/payroll/review' as any)} />
              <QuickAction icon="person-add" label="Add Staff" tint={P.secondary} bg={P.dark ? '#075985' : '#e0f2fe'}
                onPress={() => router.push('/employees/add' as any)} />
              <QuickAction icon="bar-chart" label="Reports" tint={P.muted} bg={P.surfaceLow}
                onPress={() => router.push('/(tabs)/reports' as any)} />
            </View>
          </View>

          {/* ── Recent activity ── */}
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <AppText className="font-inter-semibold text-[15px]">Recent Activity</AppText>
              <AppText className="font-inter-semibold text-[13px] text-primary">See all</AppText>
            </View>
            <Card className="overflow-hidden p-0">
              {recentActivity.map((item, i) => (
                <View key={item.id}>
                  <View className="flex-row items-center gap-3 px-4 py-3.5">
                    <View className="h-[38px] w-[38px] items-center justify-center rounded-full bg-surface-low-light dark:bg-surface-low-dark">
                      <Ionicons name={item.icon} size={18} color={P.primary} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <AppText className="font-inter-medium text-sm">{item.label}</AppText>
                      <AppText className="text-xs text-placeholder-light dark:text-placeholder-dark">{item.time}</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={P.placeholder} />
                  </View>
                  {i < recentActivity.length - 1 && <Divider />}
                </View>
              ))}
            </Card>
          </View>

        </View>
      </ScrollView>
    </Screen>
  );
}
