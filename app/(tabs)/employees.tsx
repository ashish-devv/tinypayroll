import { ScrollView, YStack, XStack, Text, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { Pressable, useColorScheme } from 'react-native';
import { useCallback, useState } from 'react';

import { listEmployees } from '@/src/services/employees';
import type { Employee } from '@/src/types';

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
    inputBg:     dark ? '#1e2235' : '#f2f4f8',
    ink:         '#1a1f2c',
    gold:        '#d4af37',
    success:     '#16a34a',
    successBg:   dark ? '#14301e' : '#f0fdf4',
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

const AVATAR_COLORS = ['#2d3548', '#3b4a6b', '#4a3728', '#2a4a3b', '#4a2a3a'];

function avatar(name: string, i: number) {
  return { bg: AVATAR_COLORS[i % AVATAR_COLORS.length], initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() };
}

function PayChip({ type, C }: { type: string; C: ReturnType<typeof useC> }) {
  const monthly = type === 'MONTHLY';
  return (
    <YStack
      backgroundColor={monthly ? C.gold + '22' : C.surfaceLow}
      borderRadius={9999}
      paddingHorizontal={8}
      paddingVertical={3}
    >
      <Text fontSize={10} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
            color={monthly ? '#a07c10' : C.muted} textTransform="uppercase">
        {type}
      </Text>
    </YStack>
  );
}

function EmployeeRow({ emp, index, C, onPress }: { emp: Employee; index: number; C: ReturnType<typeof useC>; onPress: () => void }) {
  const av = avatar(emp.name, index);
  const payType = emp.baseSalary >= 10000 ? 'MONTHLY' : 'DAILY WAGE';
  const payDisplay = payType === 'MONTHLY'
    ? `₹${emp.baseSalary.toLocaleString('en-IN')}`
    : `₹${Math.round(emp.baseSalary / 26)}/day`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <XStack
        backgroundColor={C.surface}
        borderRadius={14}
        borderWidth={1}
        borderColor={C.border}
        paddingHorizontal={16}
        paddingVertical={14}
        alignItems="center"
        gap={12}
        style={C.cardShadow}
      >
        <YStack
          width={44} height={44} borderRadius={22}
          backgroundColor={av.bg}
          alignItems="center" justifyContent="center"
          position="relative"
        >
          <Text fontSize={15} fontFamily="$body" fontWeight="700" color="white">
            {av.initials}
          </Text>
          {emp.status === 'active' && (
            <YStack
              position="absolute" bottom={1} right={1}
              width={10} height={10} borderRadius={5}
              backgroundColor={C.success}
              borderWidth={2} borderColor={C.surface}
            />
          )}
        </YStack>

        <YStack flex={1} gap={2}>
          <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
            {emp.name}
          </Text>
          <Text fontSize={12} fontFamily="$body" color={C.muted} textTransform="uppercase" letterSpacing={0.4}>
            {emp.role}
          </Text>
        </YStack>

        <YStack alignItems="flex-end" gap={4}>
          <PayChip type={payType} C={C} />
          <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>
            {payDisplay}
          </Text>
        </YStack>

        <Ionicons name="chevron-forward" size={16} color={C.placeholder} />
      </XStack>
    </Pressable>
  );
}

export default function EmployeesScreen() {
  const C = useC();
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
                  backgroundColor="#1a1f2c" alignItems="center" justifyContent="center">
            <Text color="white" fontSize={12} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>TP</Text>
          </YStack>
          <Text fontSize={16} fontFamily="$body" fontWeight="600" color={C.text}>TinyPayroll</Text>
        </XStack>
        <Pressable hitSlop={12}>
          <Ionicons name="notifications-outline" size={22} color={C.muted} />
        </Pressable>
      </XStack>

      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={32} gap={20}>

          <YStack gap={4}>
            <Text fontSize={22} fontFamily="$body" fontWeight="600" color={C.text} letterSpacing={-0.3}>
              Employees
            </Text>
            <Text fontSize={13} fontFamily="$body" color={C.muted}>
              Managing {active.length} active staff
            </Text>
          </YStack>

          {/* ── Search row ── */}
          <XStack gap={10} alignItems="center">
            <XStack
              flex={1}
              backgroundColor={C.inputBg}
              borderRadius={10}
              paddingHorizontal={12}
              paddingVertical={10}
              alignItems="center"
              gap={8}
            >
              <Ionicons name="search-outline" size={16} color={C.placeholder} />
              <Text fontSize={14} fontFamily="$body" color={C.placeholder}>Search employees…</Text>
            </XStack>
            <Pressable>
              <YStack
                width={42} height={42} borderRadius={10}
                backgroundColor={C.inputBg}
                alignItems="center" justifyContent="center"
              >
                <Ionicons name="options-outline" size={18} color={C.muted} />
              </YStack>
            </Pressable>
          </XStack>

          {/* ── Add Employee CTA ── */}
          <Pressable
            onPress={() => router.push('/employees/add' as any)}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <XStack
              backgroundColor={C.ink}
              borderRadius={12}
              paddingVertical={14}
              alignItems="center"
              justifyContent="center"
              gap={8}
              style={C.heroShadow}
            >
              <Ionicons name="person-add-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                Add Employee
              </Text>
            </XStack>
          </Pressable>

          {/* ── Employee list ── */}
          {loading ? (
            <YStack paddingVertical={40} alignItems="center"><Spinner color={C.gold} /></YStack>
          ) : error ? (
            <Text fontSize={13} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>
          ) : (
            <YStack gap={10}>
              {active.map((emp, i) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  index={i}
                  C={C}
                  onPress={() => router.push({ pathname: '/employees/[id]', params: { id: emp.id } } as any)}
                />
              ))}
            </YStack>
          )}

          {/* ── View all ── */}
          <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
            <XStack
              backgroundColor={C.surface}
              borderRadius={12}
              borderWidth={1}
              borderColor={C.border}
              paddingVertical={13}
              alignItems="center"
              justifyContent="center"
              style={C.cardShadow}
            >
              <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
                VIEW ALL EMPLOYEES
              </Text>
            </XStack>
          </Pressable>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
