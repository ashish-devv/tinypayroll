import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { Screen, Card, AppText, TopBar, usePalette, useShadows, pressScale } from '@/src/components/ui';
import { listEmployees } from '@/src/services/employees';
import { listAttendance, markAttendance } from '@/src/services/attendance';
import type { AttendanceStatus, Employee } from '@/src/types';

const CYCLE: AttendanceStatus[] = ['present', 'absent', 'leave', 'holiday'];

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
  const P = usePalette();
  const shadows = useShadows();

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
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center gap-2">
          {error ? (
            <AppText className="text-[13px] text-rose-600">{error}</AppText>
          ) : (
            <ActivityIndicator color={P.primary} />
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen variant="surface">

      {/* ── Top bar ── */}
      <TopBar title="Attendance" onNotifications={() => {}} />

      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-5 px-5 pb-8 pt-6">

          {/* ── Employee selector ── */}
          <Card className="px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
                <AppText className="font-inter-bold text-[13px] text-white">
                  {emp.avatarInitials}
                </AppText>
              </View>
              <View className="flex-1">
                <AppText className="font-inter-semibold text-sm">{emp.name}</AppText>
                <AppText className="text-xs text-muted-light dark:text-muted-dark">
                  {emp.role} • {MONTHS[month]} {year}
                </AppText>
              </View>
              <View className="flex-row gap-1">
                <Pressable hitSlop={8} onPress={() => setSelectedEmpIdx(i => Math.max(0, i - 1))}>
                  <Ionicons name="chevron-up" size={18}
                            color={selectedEmpIdx === 0 ? P.placeholder : P.muted} />
                </Pressable>
                <Pressable hitSlop={8}
                           onPress={() => setSelectedEmpIdx(i => Math.min(activeEmployees.length - 1, i + 1))}>
                  <Ionicons name="chevron-down" size={18}
                            color={selectedEmpIdx === activeEmployees.length - 1 ? P.placeholder : P.muted} />
                </Pressable>
              </View>
            </View>
          </Card>

          {/* ── Calendar card ── */}
          <Card className="gap-3.5 p-4">

            {/* Month nav */}
            <View className="flex-row items-center justify-between">
              <Pressable onPress={prevMonth} hitSlop={12}>
                <Ionicons name="chevron-back" size={20} color={P.muted} />
              </Pressable>
              <AppText className="font-inter-semibold text-[15px]">
                {MONTHS[month]} {year}
              </AppText>
              <Pressable onPress={nextMonth} hitSlop={12}>
                <Ionicons name="chevron-forward" size={20} color={P.muted} />
              </Pressable>
            </View>

            {/* Day-of-week headers */}
            <View className="flex-row">
              {DAYS.map(d => (
                <View key={d} className="flex-1 items-center">
                  <AppText className={`font-inter-semibold text-[11px] tracking-[0.3px] ${d === 'Sa' || d === 'Su' ? 'text-placeholder-light dark:text-placeholder-dark' : 'text-muted-light dark:text-muted-dark'}`}>
                    {d}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View className="gap-1">
              {Array.from({ length: cells.length / 7 }, (_, row) => (
                <View key={row} className="flex-row">
                  {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                    if (!day) return <View key={col} className="flex-1" />;

                    const status  = attMap[day];
                    const isToday = isCurrentMonth && day === today;
                    const st      = status ? P.status[status] : null;

                    // today = primary indigo; status cell = saturated colour; plain = transparent
                    const cellBg   = isToday ? P.primary : (st?.bg ?? 'transparent');
                    const textColor = isToday
                      ? '#ffffff'
                      : status === 'weekend'
                        ? P.placeholder
                        : st
                          ? st.text
                          : P.text;

                    return (
                      <Pressable key={col} onPress={() => markDay(day, status)} style={{ flex: 1, alignItems: 'center' }}>
                        <View className="h-[34px] w-[34px] items-center justify-center rounded-[17px]"
                              style={{ backgroundColor: cellBg }}>
                          <AppText
                            className={isToday ? 'font-inter-bold text-xs' : 'font-inter-medium text-xs'}
                            style={{ color: textColor }}>
                            {day}
                          </AppText>
                          {/* dot only when no coloured bg (plain days) */}
                          {status && status !== 'weekend' && !isToday && P.dark && (
                            // in dark: bg is saturated — dot redundant; skip
                            null
                          )}
                          {status && status !== 'weekend' && !isToday && !P.dark && (
                            <View className="absolute bottom-0.5 h-1 w-1 rounded-[2px]"
                                  style={{ backgroundColor: st?.dot ?? 'transparent' }} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Card>

          {/* ── Summary stats ── */}
          <View className="flex-row gap-2.5">
            {[
              { label: 'Present', value: present, dot: '#16a34a' },
              { label: 'Absent',  value: absent,  dot: '#dc2626' },
              { label: 'Offs',    value: offs,     dot: '#3b82f6' },
            ].map(s => (
              <Card key={s.label} className="flex-1 items-center gap-1 rounded-button py-3.5">
                <AppText className="font-mono text-[22px] text-text-light dark:text-text-dark">{s.value}</AppText>
                <View className="flex-row items-center gap-[5px]">
                  <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: s.dot }} />
                  <AppText className="text-xs text-muted-light dark:text-muted-dark">{s.label}</AppText>
                </View>
              </Card>
            ))}
          </View>

          {/* ── Legend ── */}
          <View className="flex-row flex-wrap justify-center gap-4">
            {[
              { label: 'Present',    dot: '#16a34a' },
              { label: 'Absent',     dot: '#dc2626' },
              { label: 'Paid Leave', dot: '#ca8a04' },
              { label: 'Holiday',    dot: '#3b82f6' },
            ].map(l => (
              <View key={l.label} className="flex-row items-center gap-[5px]">
                <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: l.dot }} />
                <AppText className="text-xs text-muted-light dark:text-muted-dark">{l.label}</AppText>
              </View>
            ))}
          </View>

          {/* ── Quick mark CTA ── */}
          <Pressable
            onPress={() => isCurrentMonth && markDay(today, attMap[today])}
            style={pressScale}
          >
            <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-4" style={shadows.hero}>
              <Ionicons name="calendar-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">
                Quick Mark Today&apos;s Attendance
              </AppText>
            </View>
          </Pressable>

          {error && <AppText className="text-center text-xs text-rose-600">{error}</AppText>}

          <AppText className="text-center text-xs text-placeholder-light dark:text-placeholder-dark">
            {loading ? 'Loading…' : 'Tap on any date to cycle status (present → absent → leave → holiday).'}
          </AppText>

        </View>
      </ScrollView>
    </Screen>
  );
}
