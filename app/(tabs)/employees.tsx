import { ScrollView, View, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { Screen, Card, AppText, Chip, TopBar, usePalette, useShadows, pressScale } from '@/src/components/ui';
import { listEmployees } from '@/src/services/employees';
import type { Employee, EmployeeStatus } from '@/src/types';

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e'];

type StatusFilter = EmployeeStatus | 'all';
type PayFilter = 'MONTHLY' | 'DAILY' | 'all';

// Same threshold the row uses to label pay type.
function payTypeOf(emp: Employee): 'MONTHLY' | 'DAILY' {
  return emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY';
}

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

  // Search + filter state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [payFilter, setPayFilter] = useState<PayFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);

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

  // Number of non-default filters applied (drives the badge on the filter button).
  const activeFilterCount = (statusFilter !== 'active' ? 1 : 0) + (payFilter !== 'all' ? 1 : 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (payFilter !== 'all' && payTypeOf(e) !== payFilter) return false;
      if (q) {
        const hay = `${e.name} ${e.role} ${e.department ?? ''} ${e.phone ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [employees, query, statusFilter, payFilter]);

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
              {query.trim() || activeFilterCount > 0
                ? `${filtered.length} of ${employees.length} employees`
                : `Managing ${active.length} active staff`}
            </AppText>
          </View>

          {/* ── Search row ── */}
          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 flex-row items-center gap-2 rounded-input bg-surface-low-light px-3 py-2.5 dark:bg-surface-low-dark">
              <Ionicons name="search-outline" size={16} color={P.placeholder} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search employees…"
                placeholderTextColor={P.placeholder}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 p-0 text-sm text-text-light dark:text-text-dark"
                style={{ fontFamily: 'Inter_400Regular' }}
              />
              {query.length > 0 && (
                <Pressable hitSlop={8} onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={16} color={P.placeholder} />
                </Pressable>
              )}
            </View>
            <Pressable onPress={() => setFilterOpen(true)}>
              <View className="h-[42px] w-[42px] items-center justify-center rounded-input bg-surface-low-light dark:bg-surface-low-dark">
                <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? P.primary : P.muted} />
                {activeFilterCount > 0 && (
                  <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
                    <AppText className="font-inter-bold text-[10px] text-white">{activeFilterCount}</AppText>
                  </View>
                )}
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
          ) : filtered.length === 0 ? (
            <View className="items-center gap-2 py-10">
              <Ionicons name="people-outline" size={30} color={P.placeholder} />
              <AppText className="text-[13px] text-muted-light dark:text-muted-dark">
                {employees.length === 0 ? 'No employees yet' : 'No employees match your search'}
              </AppText>
              {(query.length > 0 || activeFilterCount > 0) && (
                <Pressable onPress={() => { setQuery(''); setStatusFilter('active'); setPayFilter('all'); }}>
                  <AppText className="font-inter-semibold text-[13px] text-primary">Clear search &amp; filters</AppText>
                </Pressable>
              )}
            </View>
          ) : (
            <View className="gap-2.5">
              {filtered.map((emp, i) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  index={i}
                  onPress={() => router.push({ pathname: '/employees/[id]', params: { id: emp.id } } as any)}
                />
              ))}
            </View>
          )}

          {/* ── View all / active toggle ── */}
          {!loading && !error && employees.length > active.length && (
            <Pressable
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              onPress={() => setStatusFilter((s) => (s === 'active' ? 'all' : 'active'))}
            >
              <Card className="items-center justify-center py-[13px]">
                <AppText className="font-inter-semibold text-sm">
                  {statusFilter === 'active' ? 'VIEW ALL EMPLOYEES' : 'SHOW ACTIVE ONLY'}
                </AppText>
              </Card>
            </Pressable>
          )}

        </View>
      </ScrollView>

      {/* ── Filter sheet ── */}
      {filterOpen && (
        <View className="absolute inset-0 justify-end">
          <Pressable className="absolute inset-0 bg-black/40" onPress={() => setFilterOpen(false)} />
          <View className="rounded-t-card-lg bg-surface-light px-5 pb-8 pt-3 dark:bg-surface-dark" style={shadows.card}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-border-light dark:bg-border-dark" />

            <View className="mb-4 flex-row items-center justify-between">
              <AppText className="font-inter-semibold text-lg">Filter</AppText>
              {activeFilterCount > 0 && (
                <Pressable hitSlop={8} onPress={() => { setStatusFilter('active'); setPayFilter('all'); }}>
                  <AppText className="font-inter-semibold text-[13px] text-primary">Reset</AppText>
                </Pressable>
              )}
            </View>

            {/* Status */}
            <AppText className="mb-2 font-inter-medium text-[13px] text-muted-light dark:text-muted-dark">Status</AppText>
            <View className="mb-5 flex-row gap-2">
              {([
                { key: 'active',   label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
                { key: 'all',      label: 'All' },
              ] as { key: StatusFilter; label: string }[]).map((opt) => {
                const on = statusFilter === opt.key;
                return (
                  <Pressable key={opt.key} onPress={() => setStatusFilter(opt.key)} style={{ flex: 1 }}>
                    <View className={`items-center rounded-input border py-3 ${on ? 'border-primary bg-primary' : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'}`}>
                      <AppText className={`font-inter-semibold text-[13px] ${on ? 'text-white' : 'text-muted-light dark:text-muted-dark'}`}>{opt.label}</AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Pay type */}
            <AppText className="mb-2 font-inter-medium text-[13px] text-muted-light dark:text-muted-dark">Pay type</AppText>
            <View className="mb-6 flex-row gap-2">
              {([
                { key: 'all',     label: 'All' },
                { key: 'MONTHLY', label: 'Monthly' },
                { key: 'DAILY',   label: 'Daily wage' },
              ] as { key: PayFilter; label: string }[]).map((opt) => {
                const on = payFilter === opt.key;
                return (
                  <Pressable key={opt.key} onPress={() => setPayFilter(opt.key)} style={{ flex: 1 }}>
                    <View className={`items-center rounded-input border py-3 ${on ? 'border-primary bg-primary' : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'}`}>
                      <AppText className={`font-inter-semibold text-[13px] ${on ? 'text-white' : 'text-muted-light dark:text-muted-dark'}`}>{opt.label}</AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setFilterOpen(false)} style={pressScale}>
              <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-4" style={shadows.hero}>
                <AppText className="font-inter-semibold text-[15px] text-white">
                  Show {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
                </AppText>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </Screen>
  );
}
