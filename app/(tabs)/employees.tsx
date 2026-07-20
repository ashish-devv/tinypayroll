import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { Screen, Card, AppText, Chip, TopBar, usePalette, useShadows, pressScale } from '@/src/components/ui';
import { listEmployees } from '@/src/services/employees';
import type { Employee } from '@/src/types';

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e'];

function avatar(name: string, i: number) {
  return { bg: AVATAR_COLORS[i % AVATAR_COLORS.length], initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() };
}

function PayChip({ type }: { type: string }) {
  const monthly = type === 'MONTHLY';
  return (
    <Chip
      label={type}
      tone={monthly ? 'info' : 'neutral'}
    />
  );
}

function EmployeeRow({ emp, index, onPress }: { emp: Employee; index: number; onPress: () => void }) {
  const P = usePalette();
  const av = avatar(emp.name, index);
  const payType = emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY WAGE';
  const payDisplay = payType === 'MONTHLY'
    ? `₹${emp.baseSalary.toLocaleString('en-IN')}`
    : `₹${Math.round(emp.baseSalary / 26)}/day`;

  return (
    <Pressable onPress={onPress} style={pressScale}>
      <Card className="flex-row items-center gap-3 px-4 py-3.5">
        <View
          className="relative h-11 w-11 items-center justify-center rounded-[22px]"
          style={{ backgroundColor: av.bg }}
        >
          <AppText className="font-inter-bold text-[15px] text-white">
            {av.initials}
          </AppText>
          {emp.status === 'active' && (
            <View
              className="absolute bottom-px right-px h-2.5 w-2.5 rounded-[5px] border-2 border-surface-light dark:border-surface-dark"
              style={{ backgroundColor: '#16a34a' }}
            />
          )}
        </View>

        <View className="flex-1 gap-0.5">
          <AppText className="font-inter-semibold text-sm">
            {emp.name}
          </AppText>
          <AppText className="text-xs uppercase tracking-[0.4px] text-muted-light dark:text-muted-dark">
            {emp.role}
          </AppText>
        </View>

        <View className="items-end gap-1">
          <PayChip type={payType} />
          <AppText className="font-mono text-[13px] text-primary">
            {payDisplay}
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={16} color={P.placeholder} />
      </Card>
    </Pressable>
  );
}

export default function EmployeesScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      listEmployees()
        .then((data) => { if (!cancelled) setEmployees(data); })
        .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load employees'); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [])
  );

  const active = employees.filter((e) => e.status === 'active');

  return (
    <Screen variant="surface">

      {/* ── Top bar ── */}
      <TopBar title="TinyPayroll" onNotifications={() => {}} />

      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-5 px-5 pb-8 pt-6">

          <View className="gap-1">
            <AppText className="font-inter-semibold text-[22px] tracking-[-0.3px]">
              Employees
            </AppText>
            <AppText className="text-[13px] text-muted-light dark:text-muted-dark">
              Managing {active.length} active staff
            </AppText>
          </View>

          {/* ── Search row ── */}
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 flex-row items-center gap-2 rounded-input bg-surface-low-light px-3 py-2.5 dark:bg-surface-low-dark">
              <Ionicons name="search-outline" size={16} color={P.placeholder} />
              <AppText className="text-sm text-placeholder-light dark:text-placeholder-dark">Search employees…</AppText>
            </View>
            <Pressable>
              <View className="h-[42px] w-[42px] items-center justify-center rounded-input bg-surface-low-light dark:bg-surface-low-dark">
                <Ionicons name="options-outline" size={18} color={P.muted} />
              </View>
            </Pressable>
          </View>

          {/* ── Add Employee CTA ── */}
          <Pressable
            onPress={() => router.push('/employees/add' as any)}
            style={pressScale}
          >
            <View
              className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5"
              style={shadows.hero}
            >
              <Ionicons name="person-add-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">
                Add Employee
              </AppText>
            </View>
          </Pressable>

          {/* ── Employee list ── */}
          {loading ? (
            <View className="items-center py-10"><ActivityIndicator color={P.primary} /></View>
          ) : error ? (
            <AppText className="text-center text-[13px] text-rose-600">{error}</AppText>
          ) : (
            <View className="gap-2.5">
              {active.map((emp, i) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  index={i}
                  onPress={() => router.push({ pathname: '/employees/[id]', params: { id: emp.id } } as any)}
                />
              ))}
            </View>
          )}

          {/* ── View all ── */}
          <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <Card className="items-center justify-center py-[13px]">
              <AppText className="font-inter-semibold text-sm">
                VIEW ALL EMPLOYEES
              </AppText>
            </Card>
          </Pressable>

        </View>
      </ScrollView>
    </Screen>
  );
}
