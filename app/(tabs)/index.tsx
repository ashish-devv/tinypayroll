import { ScrollView, YStack, XStack, Text, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { useCallback, useState } from 'react';

import { getBusiness, type Business } from '@/src/services/business';
import { listEmployees } from '@/src/services/employees';
import { listAttendance } from '@/src/services/attendance';
import { listPayrollRuns } from '@/src/services/payroll';
import type { Employee, PayrollRun, AttendanceRecord } from '@/src/types';

function useC() {
  const dark = useColorScheme() === 'dark';
  return {
    bg:          dark ? '#0d0f14' : '#f8f9ff',
    surface:     dark ? '#161a24' : '#ffffff',
    surfaceLow:  dark ? '#1e2235' : '#eff4ff',
    text:        dark ? '#e8eaf0' : '#0b1c30',
    muted:       dark ? '#8b8fa8' : '#45464c',
    placeholder: dark ? '#555a72' : '#9ba1b0',
    border:      dark ? '#2a2f3e' : '#e0e3ea',
    ink:  '#1a1f2c',
    gold: '#d4af37',
    // shadows
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

function StatCard({ label, value, C }: { label: string; value: string; C: ReturnType<typeof useC> }) {
  return (
    <YStack
      flex={1}
      backgroundColor={C.surface}
      borderRadius={14}
      borderWidth={1}
      borderColor={C.border}
      paddingHorizontal={14}
      paddingVertical={14}
      gap={6}
      style={C.cardShadow}
    >
      <Text fontSize={10} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
            color={C.muted} textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize={24} fontFamily="$body" fontWeight="700" color={C.text} letterSpacing={-0.5}>
        {value}
      </Text>
    </YStack>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const C = useC();

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
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center"><Spinner color={C.gold} /></YStack>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
          <Ionicons name="alert-circle-outline" size={32} color={C.muted} />
          <Text fontSize={14} fontFamily="$body" color={C.muted} textAlign="center">
            {error ?? 'Could not load dashboard'}
          </Text>
        </YStack>
      </SafeAreaView>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Top bar ── */}
      <XStack
        paddingHorizontal={20} paddingVertical={14}
        alignItems="center" justifyContent="space-between"
        backgroundColor={C.surface}
        borderBottomWidth={1} borderBottomColor={C.border}
      >
        <XStack alignItems="center" gap={10}>
          <YStack width={34} height={34} borderRadius={17}
                  backgroundColor={C.ink} alignItems="center" justifyContent="center">
            <Text color="white" fontSize={12} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>
              TP
            </Text>
          </YStack>
          <Text fontSize={16} fontFamily="$body" fontWeight="600" color={C.text}>
            TinyPayroll
          </Text>
        </XStack>
        <XStack alignItems="center" gap={12}>
          <Pressable hitSlop={12}>
            <Ionicons name="notifications-outline" size={22} color={C.muted} />
          </Pressable>
          <Pressable hitSlop={12} onPress={() => router.push('/settings/business' as any)}>
            <Ionicons name="settings-outline" size={22} color={C.muted} />
          </Pressable>
        </XStack>
      </XStack>

      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={32} gap={20}>

          {/* ── Greeting ── */}
          <YStack gap={4}>
            <Text fontSize={22} fontFamily="$body" fontWeight="600" color={C.text} letterSpacing={-0.3}>
              Good morning, {business.companyName}
            </Text>
            <XStack alignItems="center" gap={5}>
              <Ionicons name="calendar-outline" size={13} color={C.muted} />
              <Text fontSize={13} fontFamily="$body" color={C.muted}>
                {now.toLocaleString('en-US', { month: 'short' })} 1 – {now.toLocaleString('en-US', { month: 'short' })} {new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}
              </Text>
            </XStack>
          </YStack>

          {/* ── Pay cycle card ── */}
          <YStack backgroundColor={C.ink} borderRadius={18} padding={20} gap={16}
                  style={C.heroShadow}>
            <Text fontSize={10} fontFamily="$body" fontWeight="600" letterSpacing={1.2}
                  color="rgba(255,255,255,0.55)" textTransform="uppercase">
              Current Pay Cycle
            </Text>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={20} fontFamily="$body" fontWeight="600" color="white" letterSpacing={-0.3}>
                Generate Payroll
              </Text>
              <YStack width={42} height={42} borderRadius={21}
                      backgroundColor={C.gold} alignItems="center" justifyContent="center">
                <Ionicons name="flash" size={20} color={C.ink} />
              </YStack>
            </XStack>
            <Pressable
              onPress={() => router.push('/payroll/review' as any)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <XStack backgroundColor="rgba(255,255,255,0.1)" borderRadius={10}
                      paddingHorizontal={14} paddingVertical={12}
                      alignItems="center" justifyContent="space-between">
                <Text fontSize={13} fontFamily="$body" color="rgba(255,255,255,0.8)">
                  Ready for review: {activeEmployees.length} employees
                </Text>
                <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.6)" />
              </XStack>
            </Pressable>
          </YStack>

          {/* ── Stat tiles ── */}
          <XStack gap={12}>
            <StatCard label="Total Employees"    value={String(activeEmployees.length)} C={C} />
            <StatCard label="Today's Attendance" value={`${todayPresent} / ${activeEmployees.length}`} C={C} />
          </XStack>
          <XStack gap={12}>
            <StatCard label="Payroll Pending"  value={pendingRun ? rupee(pendingRun.totalAmount) : '₹0'} C={C} />
            <StatCard label="Month's Expense"  value={rupee(monthExpense)} C={C} />
          </XStack>

          {/* ── Recent activity ── */}
          <YStack gap={12}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color={C.text}>Recent Activity</Text>
              <Text fontSize={12} fontFamily="$body" fontWeight="600" color={C.ink} letterSpacing={0.3}>VIEW ALL</Text>
            </XStack>
            <YStack backgroundColor={C.surface} borderRadius={14}
                    borderWidth={1} borderColor={C.border} overflow="hidden"
                    style={C.cardShadow}>
              {recentActivity.map((item, i) => (
                <YStack key={item.id}>
                  <XStack paddingHorizontal={16} paddingVertical={14} alignItems="center" gap={12}>
                    <YStack width={38} height={38} borderRadius={19}
                            backgroundColor={C.surfaceLow} alignItems="center" justifyContent="center">
                      <Ionicons name={item.icon} size={18} color={C.muted} />
                    </YStack>
                    <YStack flex={1} gap={2}>
                      <Text fontSize={14} fontFamily="$body" fontWeight="500" color={C.text}>{item.label}</Text>
                      <Text fontSize={12} fontFamily="$body" color={C.placeholder}>{item.time}</Text>
                    </YStack>
                    <Ionicons name="chevron-forward" size={16} color={C.placeholder} />
                  </XStack>
                  {i < recentActivity.length - 1 && <Separator borderColor={C.border} />}
                </YStack>
              ))}
            </YStack>
          </YStack>

          {/* ── Focus banner ── */}
          <YStack backgroundColor={C.ink} borderRadius={18} paddingHorizontal={22} paddingVertical={28}
                  gap={6} style={C.heroShadow}>
            <Text fontSize={19} fontFamily="$body" fontWeight="600" color="white" letterSpacing={-0.3}>
              Focus on your craft.
            </Text>
            <Text fontSize={13} fontFamily="$body" color="rgba(255,255,255,0.6)">
              We&apos;ll handle the paperwork.
            </Text>
          </YStack>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
