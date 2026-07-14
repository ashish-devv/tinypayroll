import { ScrollView, YStack, XStack, Text, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { listEmployees } from '@/src/services/employees';
import { listAttendance, markAttendance } from '@/src/services/attendance';
import type { AttendanceStatus, Employee } from '@/src/types';

const CYCLE: AttendanceStatus[] = ['present', 'absent', 'leave', 'holiday'];

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
    ink:         '#1a1f2c',
    gold:        '#d4af37',
    dark,
    // Status cell styles — saturated in dark so they're visible on dark surface
    status: {
      present: { bg: dark ? '#166534' : '#dcfce7', dot: '#16a34a', text: dark ? '#ffffff' : '#15803d' },
      absent:  { bg: dark ? '#991b1b' : '#fee2e2', dot: '#dc2626', text: dark ? '#ffffff' : '#dc2626' },
      leave:   { bg: dark ? '#854d0e' : '#fef9c3', dot: '#ca8a04', text: dark ? '#ffffff' : '#92400e' },
      holiday: { bg: dark ? '#1e3a5f' : '#dbeafe', dot: '#3b82f6', text: dark ? '#ffffff' : '#1d4ed8' },
      weekend: { bg: 'transparent',                dot: 'transparent', text: '' },
    } as Record<AttendanceStatus, { bg: string; dot: string; text: string }>,
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

const DAYS   = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
}

export default function AttendanceScreen() {
  const C = useC();

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedEmpIdx, setSelectedEmpIdx] = useState(0);
  const [activeEmployees, setActiveEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<{ date: string; status: AttendanceStatus }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmployees('ACTIVE').then(setActiveEmployees).catch((e) => setError(e instanceof Error ? e.message : 'Could not load employees'));
  }, []);

  const emp = activeEmployees[selectedEmpIdx];

  useEffect(() => {
    if (!emp) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAttendance(month + 1, year, emp.id)
      .then((data) => { if (!cancelled) setRecords(data); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load attendance'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [emp, month, year]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDayOfWeek(year, month);

  const attMap: Record<number, AttendanceStatus> = {};
  if (emp) {
    records
      .filter(a => a.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .forEach(a => { attMap[parseInt(a.date.split('-')[2], 10)] = a.status; });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if ((dow === 0 || dow === 6) && !attMap[d]) attMap[d] = 'weekend';
  }

  async function markDay(day: number, current: AttendanceStatus | undefined) {
    if (!emp) return;
    const idx = current && current !== 'weekend' ? CYCLE.indexOf(current) : -1;
    const next = CYCLE[(idx + 1) % CYCLE.length];
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setRecords(rs => [...rs.filter(r => r.date !== date), { date, status: next }]);
    try {
      await markAttendance(emp.id, date, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark attendance');
    }
  }

  const present = Object.values(attMap).filter(s => s === 'present').length;
  const absent  = Object.values(attMap).filter(s => s === 'absent').length;
  const offs    = Object.values(attMap).filter(s => s === 'holiday' || s === 'weekend').length;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today          = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  if (!emp) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={8}>
          {error ? (
            <Text fontSize={13} fontFamily="$body" color="#dc2626">{error}</Text>
          ) : (
            <Spinner color={C.gold} />
          )}
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>

      {/* ── Top bar ── */}
      <XStack paddingHorizontal={20} paddingVertical={14}
              alignItems="center" justifyContent="space-between"
              backgroundColor={C.surface} borderBottomWidth={1} borderBottomColor={C.border}>
        <XStack alignItems="center" gap={10}>
          <YStack width={34} height={34} borderRadius={17} backgroundColor={C.ink}
                  alignItems="center" justifyContent="center">
            <Text color="white" fontSize={12} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>TP</Text>
          </YStack>
          <Text fontSize={16} fontFamily="$body" fontWeight="600" color={C.text}>Attendance</Text>
        </XStack>
        <Pressable hitSlop={12}>
          <Ionicons name="notifications-outline" size={22} color={C.muted} />
        </Pressable>
      </XStack>

      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={32} gap={20}>

          {/* ── Employee selector ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} paddingHorizontal={16} paddingVertical={14}
                  style={C.cardShadow}>
            <XStack alignItems="center" gap={12}>
              <YStack width={40} height={40} borderRadius={20} backgroundColor={C.ink}
                      alignItems="center" justifyContent="center">
                <Text fontSize={13} fontFamily="$body" fontWeight="700" color="white">
                  {emp.avatarInitials}
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>{emp.name}</Text>
                <Text fontSize={12} fontFamily="$body" color={C.muted}>
                  {emp.role} • {MONTHS[month]} {year}
                </Text>
              </YStack>
              <XStack gap={4}>
                <Pressable hitSlop={8} onPress={() => setSelectedEmpIdx(i => Math.max(0, i - 1))}>
                  <Ionicons name="chevron-up" size={18}
                            color={selectedEmpIdx === 0 ? C.placeholder : C.muted} />
                </Pressable>
                <Pressable hitSlop={8}
                           onPress={() => setSelectedEmpIdx(i => Math.min(activeEmployees.length - 1, i + 1))}>
                  <Ionicons name="chevron-down" size={18}
                            color={selectedEmpIdx === activeEmployees.length - 1 ? C.placeholder : C.muted} />
                </Pressable>
              </XStack>
            </XStack>
          </YStack>

          {/* ── Calendar card ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={16} gap={14} style={C.cardShadow}>

            {/* Month nav */}
            <XStack alignItems="center" justifyContent="space-between">
              <Pressable onPress={prevMonth} hitSlop={12}>
                <Ionicons name="chevron-back" size={20} color={C.muted} />
              </Pressable>
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color={C.text}>
                {MONTHS[month]} {year}
              </Text>
              <Pressable onPress={nextMonth} hitSlop={12}>
                <Ionicons name="chevron-forward" size={20} color={C.muted} />
              </Pressable>
            </XStack>

            {/* Day-of-week headers */}
            <XStack>
              {DAYS.map(d => (
                <YStack key={d} flex={1} alignItems="center">
                  <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.3}
                        color={d === 'Sa' || d === 'Su' ? C.placeholder : C.muted}>
                    {d}
                  </Text>
                </YStack>
              ))}
            </XStack>

            {/* Calendar grid */}
            <YStack gap={4}>
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <XStack key={row}>
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (!day) return <YStack key={col} flex={1} />;

                    const status  = attMap[day];
                    const isToday = isCurrentMonth && day === today;
                    const st      = status ? C.status[status] : null;

                    // today = gold; status cell = saturated colour; plain = transparent
                    const cellBg   = isToday ? C.gold : (st?.bg ?? 'transparent');
                    const textColor = isToday
                      ? C.ink
                      : status === 'weekend'
                        ? C.placeholder
                        : st
                          ? st.text
                          : C.text;

                    return (
                      <Pressable key={col} onPress={() => markDay(day, status)} style={{ flex: 1, alignItems: 'center' }}>
                        <YStack width={34} height={34} borderRadius={17}
                                alignItems="center" justifyContent="center"
                                backgroundColor={cellBg}>
                          <Text fontSize={12} fontFamily="$body"
                                fontWeight={isToday ? '700' : '500'}
                                color={textColor}>
                            {day}
                          </Text>
                          {/* dot only when no coloured bg (plain days) */}
                          {status && status !== 'weekend' && !isToday && C.dark && (
                            // in dark: bg is saturated — dot redundant; skip
                            null
                          )}
                          {status && status !== 'weekend' && !isToday && !C.dark && (
                            <YStack position="absolute" bottom={2}
                                    width={4} height={4} borderRadius={2}
                                    backgroundColor={st?.dot ?? 'transparent'} />
                          )}
                        </YStack>
                      </Pressable>
                    );
                  })}
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* ── Summary stats ── */}
          <XStack gap={10}>
            {[
              { label: 'Present', value: present, dot: '#16a34a' },
              { label: 'Absent',  value: absent,  dot: '#dc2626' },
              { label: 'Offs',    value: offs,     dot: '#3b82f6' },
            ].map(s => (
              <YStack key={s.label} flex={1} backgroundColor={C.surface} borderRadius={12}
                      borderWidth={1} borderColor={C.border} paddingVertical={14}
                      alignItems="center" gap={4} style={C.cardShadow}>
                <Text fontSize={22} fontFamily="$body" fontWeight="700" color={C.text}>{s.value}</Text>
                <XStack alignItems="center" gap={5}>
                  <YStack width={7} height={7} borderRadius={4} backgroundColor={s.dot} />
                  <Text fontSize={12} fontFamily="$body" color={C.muted}>{s.label}</Text>
                </XStack>
              </YStack>
            ))}
          </XStack>

          {/* ── Legend ── */}
          <XStack justifyContent="center" gap={16} flexWrap="wrap">
            {[
              { label: 'Present',    dot: '#16a34a' },
              { label: 'Absent',     dot: '#dc2626' },
              { label: 'Paid Leave', dot: '#ca8a04' },
              { label: 'Holiday',    dot: '#3b82f6' },
            ].map(l => (
              <XStack key={l.label} alignItems="center" gap={5}>
                <YStack width={7} height={7} borderRadius={4} backgroundColor={l.dot} />
                <Text fontSize={12} fontFamily="$body" color={C.muted}>{l.label}</Text>
              </XStack>
            ))}
          </XStack>

          {/* ── Quick mark CTA ── */}
          <Pressable
            onPress={() => isCurrentMonth && markDay(today, attMap[today])}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <XStack backgroundColor={C.ink} borderRadius={14} paddingVertical={16}
                    alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
              <Ionicons name="calendar-outline" size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                Quick Mark Today's Attendance
              </Text>
            </XStack>
          </Pressable>

          {error && <Text fontSize={12} fontFamily="$body" color="#dc2626" textAlign="center">{error}</Text>}

          <Text fontSize={12} fontFamily="$body" color={C.placeholder} textAlign="center">
            {loading ? 'Loading…' : 'Tap on any date to cycle status (present → absent → leave → holiday).'}
          </Text>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
