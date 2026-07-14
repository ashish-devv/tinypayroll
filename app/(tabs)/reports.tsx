import { ScrollView, YStack, XStack, Text, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, useColorScheme, View, Share, Alert, Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getExpenseSummary, exportExpenseCsv, downloadReportPdf, downloadReportPdfWeb } from '@/src/services/reports';
import { listPayrollRuns } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { Employee, PayrollRun } from '@/src/types';
import type { ExpenseSummary } from '@/src/services/reports';

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
    goldBg:      dark ? '#2a2410' : '#fdf6d8',
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

function SpendBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0.04, value / max) : 0.04;
  return (
    <View style={{ flex: 1, height: 80, justifyContent: 'flex-end', alignItems: 'center' }}>
      <View style={{ width: '72%', height: `${Math.round(pct * 100)}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

const AVATAR_COLORS = ['#2d3548', '#3b4a6b', '#4a3728', '#2a4a3b'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ReportsScreen() {
  const C = useC();

  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const year = new Date().getFullYear();
    Promise.all([
      getExpenseSummary(`${year}-01-01`, `${year}-12-31`),
      listPayrollRuns(),
      listEmployees('ACTIVE'),
    ])
      .then(([s, r, e]) => {
        if (cancelled) return;
        setSummary(s);
        setRuns(r);
        setEmployees(e);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load reports'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(useCallback(() => refetch(), [refetch]));

  async function handleExportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const year = new Date().getFullYear();
      const csv = await exportExpenseCsv(`${year}-01-01`, `${year}-12-31`);
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expense-summary.csv';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: csv, title: 'expense-summary.csv' });
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export report');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    setExportError(null);
    try {
      const year = new Date().getFullYear();
      const filename = `payroll-summary-${year}.pdf`;
      if (Platform.OS === 'web') {
        await downloadReportPdfWeb(`${year}-01-01`, `${year}-12-31`, filename);
      } else {
        await downloadReportPdf(`${year}-01-01`, `${year}-12-31`, filename);
        Alert.alert('Downloaded', 'Payroll summary PDF saved.');
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export report');
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center"><Spinner color={C.gold} /></YStack>
      </SafeAreaView>
    );
  }

  if (error || !summary) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }}>
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
          <Ionicons name="alert-circle-outline" size={32} color={C.muted} />
          <Text fontSize={14} fontFamily="$body" color={C.muted} textAlign="center">
            {error ?? 'Could not load reports'}
          </Text>
        </YStack>
      </SafeAreaView>
    );
  }

  const trend = summary.periods.map((p) => ({
    label: p.period.split(' ')[0].slice(0, 3),
    amount: p.totalAmount,
    paid: p.status === 'PAID',
  }));
  const maxAmount = Math.max(1, ...trend.map((t) => t.amount));
  const ytdTotal = summary.totalAmount;

  // ponytail: "current" run for the employee-cost breakdown — prefer the pending/draft one (this
  // month's in-progress run), falling back to the most recently paid run if everything is settled.
  const latestRun = runs.find((r) => r.status === 'pending') ?? runs[runs.length - 1];
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

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
            <Text color="white" fontSize={12} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>TP</Text>
          </YStack>
          <Text fontSize={16} fontFamily="$body" fontWeight="600" color={C.text}>Reports</Text>
        </XStack>
        <Pressable hitSlop={12}>
          <Ionicons name="notifications-outline" size={22} color={C.muted} />
        </Pressable>
      </XStack>

      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={20}>

          {/* ── YTD summary card ── */}
          <YStack backgroundColor={C.ink} borderRadius={18} padding={22} gap={16}
                  style={C.heroShadow}>
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack gap={4}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={1}
                      color="rgba(255,255,255,0.5)" textTransform="uppercase">
                  YTD Payroll Spend
                </Text>
                <Text fontSize={34} fontFamily="$body" fontWeight="700" color={C.gold} letterSpacing={-1}>
                  ₹{ytdTotal.toLocaleString('en-IN')}
                </Text>
              </YStack>
              <YStack backgroundColor="rgba(255,255,255,0.1)" borderRadius={10}
                      paddingHorizontal={10} paddingVertical={5}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600"
                      color="rgba(255,255,255,0.7)" letterSpacing={0.4}>2026</Text>
              </YStack>
            </XStack>
            <Separator borderColor="rgba(255,255,255,0.12)" />
            <XStack gap={24}>
              <YStack gap={2}>
                <Text fontSize={11} fontFamily="$body" color="rgba(255,255,255,0.5)" letterSpacing={0.4}>MONTHS</Text>
                <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">{trend.length}</Text>
              </YStack>
              <YStack gap={2}>
                <Text fontSize={11} fontFamily="$body" color="rgba(255,255,255,0.5)" letterSpacing={0.4}>ACTIVE STAFF</Text>
                <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                  {employees.length}
                </Text>
              </YStack>
              <YStack gap={2}>
                <Text fontSize={11} fontFamily="$body" color="rgba(255,255,255,0.5)" letterSpacing={0.4}>AVG / MONTH</Text>
                <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                  ₹{Math.round(ytdTotal / trend.length).toLocaleString('en-IN')}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* ── Monthly spend bar chart ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>
            <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
              Monthly Payroll Trend
            </Text>

            <XStack height={96} alignItems="flex-end" gap={8}>
              {trend.map((t) => (
                <YStack key={t.label} flex={1} alignItems="center" gap={6}>
                  <SpendBar value={t.amount} max={maxAmount} color={t.paid ? C.ink : C.gold} />
                  <Text fontSize={11} fontFamily="$body" fontWeight="600"
                        color={t.paid ? C.muted : C.gold}>{t.label}</Text>
                </YStack>
              ))}
            </XStack>

            <XStack gap={16}>
              <XStack alignItems="center" gap={5}>
                <YStack width={8} height={8} borderRadius={2} backgroundColor={C.ink} />
                <Text fontSize={11} fontFamily="$body" color={C.muted}>Paid</Text>
              </XStack>
              <XStack alignItems="center" gap={5}>
                <YStack width={8} height={8} borderRadius={2} backgroundColor={C.gold} />
                <Text fontSize={11} fontFamily="$body" color={C.muted}>Pending</Text>
              </XStack>
            </XStack>

            <Separator borderColor={C.border} />

            <YStack gap={8}>
              {trend.map((t) => (
                <XStack key={t.label} justifyContent="space-between" alignItems="center">
                  <XStack alignItems="center" gap={8}>
                    <YStack width={28} height={28} borderRadius={8}
                            backgroundColor={t.paid ? C.surfaceLow : C.goldBg}
                            alignItems="center" justifyContent="center">
                      <Ionicons name={t.paid ? 'checkmark-circle' : 'time-outline'}
                                size={14} color={t.paid ? C.success : C.gold} />
                    </YStack>
                    <Text fontSize={13} fontFamily="$body" color={C.text}>{t.label} 2026</Text>
                  </XStack>
                  <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>
                    ₹{t.amount.toLocaleString('en-IN')}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>

          {/* ── Per-employee cost ── */}
          {latestRun && latestRun.items.length > 0 && (
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
                  Employee Cost — {latestRun.period.split(' ')[0]}
                </Text>
                <YStack backgroundColor={latestRun.status === 'paid' ? C.successBg : C.goldBg} borderRadius={9999}
                        paddingHorizontal={8} paddingVertical={3}>
                  <Text fontSize={10} fontFamily="$body" fontWeight="600"
                        color={latestRun.status === 'paid' ? C.success : C.gold} letterSpacing={0.4}>
                    {latestRun.status.toUpperCase()}
                  </Text>
                </YStack>
              </XStack>
              <Separator borderColor={C.border} />
              <YStack gap={12}>
                {latestRun.items.map((item, i) => {
                  const emp = empMap[item.employeeId];
                  if (!emp) return null;
                  const pct = latestRun.totalAmount > 0
                    ? Math.round((item.finalSalary / latestRun.totalAmount) * 100) : 0;
                  return (
                    <YStack key={item.employeeId} gap={8}>
                      <XStack alignItems="center" gap={10}>
                        <YStack width={34} height={34} borderRadius={17}
                                backgroundColor={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                                alignItems="center" justifyContent="center">
                          <Text fontSize={11} fontFamily="$body" fontWeight="700" color="white">
                            {initials(emp.name)}
                          </Text>
                        </YStack>
                        <YStack flex={1} gap={1}>
                          <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>{emp.name}</Text>
                          <Text fontSize={11} fontFamily="$body" color={C.muted}>{emp.role}</Text>
                        </YStack>
                        <YStack alignItems="flex-end" gap={1}>
                          <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>
                            ₹{item.finalSalary.toLocaleString('en-IN')}
                          </Text>
                          <Text fontSize={11} fontFamily="$body" color={C.muted}>{pct}%</Text>
                        </YStack>
                      </XStack>
                      <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.ink, borderRadius: 2 }} />
                      </View>
                    </YStack>
                  );
                })}
              </YStack>
            </YStack>
          )}

          {/* ── Export actions ── */}
          <YStack gap={10}>
            <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>Export &amp; Share</Text>
            {[
              {
                icon: 'document-text-outline' as const,
                label: exportingPdf ? 'Exporting…' : 'Download Payroll Summary (PDF)',
                desc: `Jan – Dec ${new Date().getFullYear()}`,
                onPress: handleExportPdf,
                loading: exportingPdf,
              },
              {
                icon: 'stats-chart-outline' as const,
                label: exporting ? 'Exporting…' : 'Export Expense Report (CSV)',
                desc: `Jan – Dec ${new Date().getFullYear()}`,
                onPress: handleExportCsv,
                loading: exporting,
              },
              {
                icon: 'logo-whatsapp' as const,
                label: 'Share via WhatsApp',
                desc: 'Coming soon — Phase 2',
                onPress: () => Alert.alert('Coming soon', 'WhatsApp payslip delivery is planned for a future release.'),
              },
            ].map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                disabled={action.loading}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: action.loading ? 0.6 : 1 })}
              >
                <XStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                        borderColor={C.border} paddingHorizontal={16} paddingVertical={14}
                        alignItems="center" gap={12} style={C.cardShadow}>
                  <YStack width={40} height={40} borderRadius={20} backgroundColor={C.surfaceLow}
                          alignItems="center" justifyContent="center">
                    {action.loading
                      ? <Spinner size="small" color={C.ink} />
                      : <Ionicons name={action.icon} size={18} color={C.ink} />}
                  </YStack>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>{action.label}</Text>
                    <Text fontSize={12} fontFamily="$body" color={C.muted}>{action.desc}</Text>
                  </YStack>
                  <Ionicons name="chevron-forward" size={16} color={C.placeholder} />
                </XStack>
              </Pressable>
            ))}
            {exportError && (
              <XStack backgroundColor="#fef2f2" borderRadius={12} borderWidth={1} borderColor="#dc2626"
                      padding={12} alignItems="center" gap={10}>
                <Ionicons name="alert-circle" size={16} color="#dc2626" />
                <Text flex={1} fontSize={12} fontFamily="$body" color="#dc2626">{exportError}</Text>
              </XStack>
            )}
          </YStack>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
