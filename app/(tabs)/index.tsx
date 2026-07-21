import { ScrollView, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Screen, Card, AppText, TopBar, usePalette, pressScale, Skeleton } from '@/src/components/ui';
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
  // Local calendar date (NOT toISOString(), which is UTC). Attendance is marked/stored using the
  // device's local Y-M-D (see attendance.tsx dateStr), so the dashboard must compare against the
  // same local date — otherwise, in timezones ahead of UTC, the pre-dawn hours read "yesterday"
  // and "Present Today" silently under-counts.
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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

function StatCard({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <Card className="flex-1 p-4">
      <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">
        {label}
      </AppText>
      {loading ? (
        <Skeleton width="60%" height={28} radius={6} style={{ marginTop: 8 }} />
      ) : (
        <AppText className="mt-2 font-mono text-[28px] leading-[32px] tracking-[-1px] text-text-light dark:text-text-dark">
          {value}
        </AppText>
      )}
      {sub ? <AppText className="mt-0.5 text-[12px] text-muted-light dark:text-muted-dark">{sub}</AppText> : null}
    </Card>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const P = usePalette();

  // ── Core: business + employees + payroll runs. These drive the greeting, hero card and 3 of
  // the 4 stat tiles, so they're clubbed into one request group and share one loading state —
  // the "necessary" above-the-fold content appears together.
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [coreLoading, setCoreLoading] = useState(true);
  const [coreError, setCoreError] = useState<string | null>(null);

  // ── Attendance: feeds only the "Present Today" tile. Loaded independently so a slow attendance
  // query never holds back the hero/greeting.
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const now = new Date();

    // Group 1 — core essentials, fetched together.
    setCoreLoading(true);
    setCoreError(null);
    Promise.all([getBusiness(), listEmployees('ACTIVE'), listPayrollRuns()])
      .then(([b, e, r]) => {
        if (cancelled) return;
        setBusiness(b);
        setEmployees(e);
        setRuns(r);
      })
      .catch((err) => { if (!cancelled) setCoreError(err instanceof Error ? err.message : 'Could not load dashboard'); })
      .finally(() => { if (!cancelled) setCoreLoading(false); });

    // Group 2 — attendance, on its own.
    setAttendanceLoading(true);
    listAttendance(now.getMonth() + 1, now.getFullYear())
      .then((a) => { if (!cancelled) setAttendance(a); })
      .catch(() => { if (!cancelled) setAttendance([]); })
      .finally(() => { if (!cancelled) setAttendanceLoading(false); });

    return () => { cancelled = true; };
  }, []));

  const now = new Date();
  const activeEmployees = employees;
  const pendingRun = runs.find((r) => r.status === 'pending');
  const currentPeriod = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
  const monthExpense = runs.find((r) => r.period === currentPeriod)?.totalAmount ?? 0;
  const today = todayIso();
  const todayPresent = attendance.filter((a) => a.date === today && a.status === 'present').length;

  // Only a hard failure of the core group blocks the screen; attendance/activity degrade in place.
  if (coreError && !business) {
    return (
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Ionicons name="alert-circle-outline" size={32} color={P.muted} />
          <AppText className="text-center text-sm text-muted-light dark:text-muted-dark">
            {coreError}
          </AppText>
        </View>
      </Screen>
    );
  }

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
            {coreLoading ? (
              <>
                <Skeleton width="70%" height={30} radius={8} />
                <Skeleton width="55%" height={16} radius={6} style={{ marginTop: 6 }} />
              </>
            ) : (
              <>
                <AppText className="font-inter-extrabold text-[26px] tracking-[-0.5px]">
                  Good morning, {business?.companyName}
                </AppText>
                <AppText className="text-[14px] text-muted-light dark:text-muted-dark">
                  Here&apos;s your business overview for {now.toLocaleString('en-US', { month: 'long' })}.
                </AppText>
              </>
            )}
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
                {coreLoading ? '—' : rupee(monthExpense)}
              </AppText>
              <Pressable
                onPress={() => router.push('/payroll/review' as any)}
                style={pressScale}
              >
                <View className="flex-row items-center justify-between rounded-input bg-white/15 px-4 py-3">
                  <AppText className="font-inter-medium text-[13px] text-white">
                    {coreLoading ? 'Review payroll' : `Review payroll · ${activeEmployees.length} employees`}
                  </AppText>
                  <Ionicons name="arrow-forward" size={16} color="#ffffff" />
                </View>
              </Pressable>
            </View>
          </Card>

          {/* ── Stat tiles ── */}
          <View className="flex-row gap-3">
            <StatCard label="Active Staff" value={String(activeEmployees.length)} sub="Employees on payroll" loading={coreLoading} />
            <StatCard label="Present Today" value={`${todayPresent}/${activeEmployees.length}`} sub="Checked in" loading={coreLoading || attendanceLoading} />
          </View>
          <View className="flex-row gap-3">
            <StatCard label="Pending" value={pendingRun ? rupee(pendingRun.totalAmount) : '₹0'} sub="Awaiting run" loading={coreLoading} />
            <StatCard label="This Month" value={rupee(monthExpense)} sub="Total cost" loading={coreLoading} />
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
          <Pressable onPress={() => router.push('/activity' as any)} style={pressScale}>
            <Card className="flex-row items-center gap-3 p-4">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-full bg-surface-low-light dark:bg-surface-low-dark">
                <Ionicons name="pulse-outline" size={20} color={P.primary} />
              </View>
              <View className="flex-1 gap-0.5">
                <AppText className="font-inter-semibold text-[15px]">Recent Activity</AppText>
                <AppText className="text-[13px] text-muted-light dark:text-muted-dark">
                  See everything happening in your business
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={P.muted} />
            </Card>
          </Pressable>

        </View>
      </ScrollView>
    </Screen>
  );
}
