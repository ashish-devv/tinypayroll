import { ScrollView, View, Pressable, ActivityIndicator, Share, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { Screen, Card, AppText, Divider, Chip, TopBar, usePalette } from '@/src/components/ui';
import { getExpenseSummary, exportExpenseCsv, downloadReportPdf, downloadReportPdfWeb } from '@/src/services/reports';
import { listPayrollRuns } from '@/src/services/payroll';
import { listEmployees } from '@/src/services/employees';
import type { Employee, PayrollRun } from '@/src/types';
import type { ExpenseSummary } from '@/src/services/reports';

function SpendBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0.04, value / max) : 0.04;
  return (
    <View style={{ flex: 1, height: 80, justifyContent: 'flex-end', alignItems: 'center' }}>
      <View style={{ width: '72%', height: `${Math.round(pct * 100)}%`, backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#8b5cf6', '#10b981'];

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ReportsScreen() {
  const P = usePalette();

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
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={P.primary} /></View>
      </Screen>
    );
  }

  if (error || !summary) {
    return (
      <Screen variant="surface">
        <View className="flex-1 items-center justify-center gap-3 p-6">
          <Ionicons name="alert-circle-outline" size={32} color={P.muted} />
          <AppText className="text-center text-sm text-muted-light dark:text-muted-dark">
            {error ?? 'Could not load reports'}
          </AppText>
        </View>
      </Screen>
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
    <Screen variant="surface">
      {/* ── Top bar ── */}
      <TopBar title="Reports" onNotifications={() => {}} />

      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-5 px-5 pb-10 pt-6">

          {/* ── YTD summary card ── */}
          <Card variant="ink" className="gap-4 p-[22px]">
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[1px] text-white/50">
                  YTD Payroll Spend
                </AppText>
                <AppText className="font-mono font-inter-bold text-[34px] tracking-[-1px] text-white">
                  ₹{ytdTotal.toLocaleString('en-IN')}
                </AppText>
              </View>
              <View className="rounded-input bg-white/10 px-2.5 py-[5px]">
                <AppText className="font-inter-semibold text-[11px] tracking-[0.4px] text-white/70">2026</AppText>
              </View>
            </View>
            <View className="h-px w-full bg-white/[0.12]" />
            <View className="flex-row gap-6">
              <View className="gap-0.5">
                <AppText className="text-[11px] tracking-[0.4px] text-white/50">MONTHS</AppText>
                <AppText className="font-inter-semibold text-[15px] text-white">{trend.length}</AppText>
              </View>
              <View className="gap-0.5">
                <AppText className="text-[11px] tracking-[0.4px] text-white/50">ACTIVE STAFF</AppText>
                <AppText className="font-inter-semibold text-[15px] text-white">
                  {employees.length}
                </AppText>
              </View>
              <View className="gap-0.5">
                <AppText className="text-[11px] tracking-[0.4px] text-white/50">AVG / MONTH</AppText>
                <AppText className="font-inter-semibold text-[15px] text-white">
                  ₹{Math.round(ytdTotal / trend.length).toLocaleString('en-IN')}
                </AppText>
              </View>
            </View>
          </Card>

          {/* ── Monthly spend bar chart ── */}
          <Card className="gap-3.5 p-[18px]">
            <AppText className="font-inter-semibold text-sm">
              Monthly Payroll Trend
            </AppText>

            <View className="h-24 flex-row items-end gap-2">
              {trend.map((t) => (
                <View key={t.label} className="flex-1 items-center gap-1.5">
                  <SpendBar value={t.amount} max={maxAmount} color={t.paid ? P.primary : P.secondary} />
                  <AppText className={`font-inter-semibold text-[11px] ${t.paid ? 'text-muted-light dark:text-muted-dark' : 'text-secondary'}`}>{t.label}</AppText>
                </View>
              ))}
            </View>

            <View className="flex-row gap-4">
              <View className="flex-row items-center gap-[5px]">
                <View className="h-2 w-2 rounded-[2px] bg-primary" />
                <AppText className="text-[11px] text-muted-light dark:text-muted-dark">Paid</AppText>
              </View>
              <View className="flex-row items-center gap-[5px]">
                <View className="h-2 w-2 rounded-[2px] bg-secondary" />
                <AppText className="text-[11px] text-muted-light dark:text-muted-dark">Pending</AppText>
              </View>
            </View>

            <Divider />

            <View className="gap-2">
              {trend.map((t) => (
                <View key={t.label} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className={`h-7 w-7 items-center justify-center rounded-lg ${t.paid ? 'bg-surface-low-light dark:bg-surface-low-dark' : 'bg-secondary-container-light dark:bg-secondary-container-dark'}`}>
                      <Ionicons name={t.paid ? 'checkmark-circle' : 'time-outline'}
                                size={14} color={t.paid ? '#16a34a' : P.secondary} />
                    </View>
                    <AppText className="text-[13px]">{t.label} 2026</AppText>
                  </View>
                  <AppText className="font-mono font-inter-semibold text-[13px]">
                    ₹{t.amount.toLocaleString('en-IN')}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>

          {/* ── Per-employee cost ── */}
          {latestRun && latestRun.items.length > 0 && (
            <Card className="gap-3.5 p-[18px]">
              <View className="flex-row items-center justify-between">
                <AppText className="font-inter-semibold text-sm">
                  Employee Cost — {latestRun.period.split(' ')[0]}
                </AppText>
                <Chip label={latestRun.status.toUpperCase()} tone={latestRun.status === 'paid' ? 'success' : 'warning'} />
              </View>
              <Divider />
              <View className="gap-3">
                {latestRun.items.map((item, i) => {
                  const emp = empMap[item.employeeId];
                  if (!emp) return null;
                  const pct = latestRun.totalAmount > 0
                    ? Math.round((item.finalSalary / latestRun.totalAmount) * 100) : 0;
                  return (
                    <View key={item.employeeId} className="gap-2">
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-[34px] w-[34px] items-center justify-center rounded-[17px]"
                              style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                          <AppText className="font-inter-bold text-[11px] text-white">
                            {initials(emp.name)}
                          </AppText>
                        </View>
                        <View className="flex-1 gap-px">
                          <AppText className="font-inter-semibold text-[13px]">{emp.name}</AppText>
                          <AppText className="text-[11px] text-muted-light dark:text-muted-dark">{emp.role}</AppText>
                        </View>
                        <View className="items-end gap-px">
                          <AppText className="font-mono font-inter-semibold text-[13px]">
                            ₹{item.finalSalary.toLocaleString('en-IN')}
                          </AppText>
                          <AppText className="text-[11px] text-muted-light dark:text-muted-dark">{pct}%</AppText>
                        </View>
                      </View>
                      <View className="h-1 overflow-hidden rounded-[2px] bg-border-light dark:bg-border-dark">
                        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: P.primary, borderRadius: 2 }} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}

          {/* ── Export actions ── */}
          <View className="gap-2.5">
            <AppText className="font-inter-semibold text-sm">Export &amp; Share</AppText>
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
                <Card className="flex-row items-center gap-3 px-4 py-3.5">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-low-light dark:bg-surface-low-dark">
                    {action.loading
                      ? <ActivityIndicator size="small" color={P.primary} />
                      : <Ionicons name={action.icon} size={18} color={P.primary} />}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <AppText className="font-inter-semibold text-[13px]">{action.label}</AppText>
                    <AppText className="text-xs text-muted-light dark:text-muted-dark">{action.desc}</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={P.placeholder} />
                </Card>
              </Pressable>
            ))}
            {exportError && (
              <View className="flex-row items-center gap-2.5 rounded-button border border-rose-300 bg-rose-50 p-3 dark:border-rose-500/40 dark:bg-rose-500/10">
                <Ionicons name="alert-circle" size={16} color="#e11d48" />
                <AppText className="flex-1 text-xs text-rose-600 dark:text-rose-300">{exportError}</AppText>
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </Screen>
  );
}
