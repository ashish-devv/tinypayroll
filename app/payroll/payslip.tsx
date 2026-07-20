import { ScrollView, View, Pressable, ActivityIndicator, Platform, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Sharing from 'expo-sharing';

import { Screen, Card, AppText, Divider, Chip, usePalette, useShadows } from '@/src/components/ui';
import { getPayrollRun, downloadPayslipPdf, downloadPayslipPdfWeb } from '@/src/services/payroll';
import { getEmployee } from '@/src/services/employees';
import { getBusiness, type Business } from '@/src/services/business';
import type { PayrollRun, Employee } from '@/src/types';

function LineItem({ label, value, color }: {
  label: string; value: string; color?: string;
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <AppText className="text-sm text-muted-light dark:text-muted-dark">{label}</AppText>
      <AppText className="font-mono text-sm text-text-light dark:text-text-dark" style={color ? { color } : undefined}>{value}</AppText>
    </View>
  );
}

export default function PayslipScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const { runId, employeeId } = useLocalSearchParams<{ runId: string; employeeId: string }>();

  const [run, setRun] = useState<PayrollRun | null>(null);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!runId || !employeeId) return;
    Promise.all([getPayrollRun(runId), getEmployee(employeeId), getBusiness()])
      .then(([r, e, b]) => { setRun(r); setEmp(e); setBusiness(b); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load payslip'));
  }, [runId, employeeId]);

  if (!run || !emp || !business) {
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

  const item = run.items.find(i => i.employeeId === emp.id) ?? run.items[0];
  if (!item) return null;

  const payDate = new Date(run.runDate);
  const periodStart = new Date(run.year, run.month - 1, 1).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const periodEnd   = new Date(run.year, run.month, 0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const payDateStr  = payDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const pdfFilename = `payslip-${run.period.replace(/\s+/g, '-').toLowerCase()}-${emp.name.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  async function handleDownload() {
    setDownloading(true);
    try {
      if (Platform.OS === 'web') {
        await downloadPayslipPdfWeb(run!.id, emp!.id, pdfFilename);
      } else {
        await downloadPayslipPdf(run!.id, emp!.id, pdfFilename);
        Alert.alert('Downloaded', 'Payslip PDF saved.');
      }
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Could not download payslip');
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      if (Platform.OS === 'web') {
        // ponytail: expo-sharing's native share sheet isn't available on web — fall back to the
        // browser's own share/download affordances, mirroring handleDownload's web branch.
        await downloadPayslipPdfWeb(run!.id, emp!.id, pdfFilename);
        return;
      }
      const uri = await downloadPayslipPdf(run!.id, emp!.id, pdfFilename);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share payslip' });
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Could not share payslip');
    } finally {
      setSharing(false);
    }
  }

  // ponytail: wa.me supports a pre-filled message but not an attachment — "Share" (above) is the
  // attachment half of the WhatsApp MVP flow; this opens the chat so the owner can attach the PDF
  // they just downloaded/shared themselves. See TASKS.md "WhatsApp payslip delivery (MVP)".
  async function handleWhatsAppChat() {
    const digits = (emp!.phone ?? '').replace(/[^\d]/g, '');
    if (!digits) {
      Alert.alert('No phone number', `${emp!.name} doesn't have a phone number on file.`);
      return;
    }
    const message = `Hi ${emp!.name.split(' ')[0]}, here's your payslip for ${run!.period}.`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open WhatsApp', 'Make sure WhatsApp is installed on this device.');
    }
  }

  return (
    <Screen variant="surface" edges={['bottom']}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-5 pb-10 pt-6">

          {/* ── Company info card ── */}
          <Card className="gap-1.5 p-[18px]">
            <View className="flex-row items-center gap-3">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-input bg-primary">
                <AppText className="font-inter-bold text-[13px] text-white">TP</AppText>
              </View>
              <View>
                <AppText className="font-inter-bold text-[15px]">
                  {business.companyName}
                </AppText>
                {business.industry && <AppText className="text-xs text-muted-light dark:text-muted-dark">{business.industry}</AppText>}
              </View>
            </View>
            {business.address && (
              <AppText className="mt-1 text-xs text-placeholder-light dark:text-placeholder-dark">
                {business.address}
              </AppText>
            )}
            {business.email && <AppText className="text-xs text-placeholder-light dark:text-placeholder-dark">{business.email}</AppText>}
          </Card>

          {/* ── Employee + period meta ── */}
          <Card className="gap-3.5 p-[18px]">
            <View className="flex-row gap-6">
              <View className="flex-1 gap-[3px]">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-placeholder-light dark:text-placeholder-dark">Employee</AppText>
                <AppText className="font-inter-semibold text-sm">{emp.name}</AppText>
                <AppText className="text-xs text-muted-light dark:text-muted-dark">ID: EMP-{emp.id.slice(-4).toUpperCase()}</AppText>
              </View>
              <View className="flex-1 gap-[3px]">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-placeholder-light dark:text-placeholder-dark">Pay Period</AppText>
                <AppText className="font-inter-semibold text-sm">
                  {periodStart} – {periodEnd}
                </AppText>
              </View>
            </View>
            <Divider />
            <View className="flex-row gap-6">
              <View className="flex-1 gap-[3px]">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-placeholder-light dark:text-placeholder-dark">Payment Method</AppText>
                <AppText className="text-sm">Bank Transfer</AppText>
                <AppText className="text-xs text-muted-light dark:text-muted-dark">••• {emp.bankAccount ?? '0000'}</AppText>
              </View>
              <View className="flex-1 gap-[3px]">
                <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.6px] text-placeholder-light dark:text-placeholder-dark">Payment Date</AppText>
                <AppText className="text-sm">{payDateStr}</AppText>
                <Chip label="PAID" tone="success" />
              </View>
            </View>
          </Card>

          {/* ── Earnings ── */}
          <Card className="gap-2.5 p-[18px]">
            <AppText className="font-inter-semibold text-[13px] uppercase tracking-[0.3px]">Earnings</AppText>
            <Divider />
            <View className="flex-row justify-between">
              <AppText className="font-inter-semibold text-xs text-muted-light dark:text-muted-dark">COMPONENT</AppText>
              <AppText className="font-inter-semibold text-xs text-muted-light dark:text-muted-dark">AMOUNT</AppText>
            </View>
            <LineItem label="Base Salary" value={`₹${item.baseSalary.toLocaleString('en-IN')}`} />
            {item.overtime > 0 && <LineItem label="Overtime" value={`₹${item.overtime.toLocaleString('en-IN')}`} />}
            {item.bonus > 0 && <LineItem label="Bonus" value={`₹${item.bonus.toLocaleString('en-IN')}`} />}
          </Card>

          {/* ── Deductions ── */}
          {(item.unpaidLeave > 0 || item.advances > 0 || item.deductions > 0) && (
            <Card className="gap-2.5 p-[18px]">
              <AppText className="font-inter-semibold text-[13px] uppercase tracking-[0.3px]">Deductions</AppText>
              <Divider />
              {item.unpaidLeave > 0 && <LineItem label="Unpaid Leave" value={`−₹${item.unpaidLeave.toLocaleString('en-IN')}`} color="#e11d48" />}
              {item.advances > 0 && <LineItem label="Advance" value={`−₹${item.advances.toLocaleString('en-IN')}`} color="#e11d48" />}
              {item.deductions > 0 && <LineItem label="Other Deductions" value={`−₹${item.deductions.toLocaleString('en-IN')}`} color="#e11d48" />}
            </Card>
          )}

          {/* ── Net pay ── */}
          <View
            className="items-center gap-1.5 rounded-card-lg bg-gold-bg-light p-[22px] dark:bg-gold-bg-dark"
            style={shadows.hero}
          >
            <AppText className="font-inter-semibold text-xs uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">Net Payable</AppText>
            <AppText className="font-mono text-[38px] tracking-[-1px] text-primary">
              ₹{item.finalSalary.toLocaleString('en-IN')}
            </AppText>
          </View>

          {/* ── Thank-you note ── */}
          <Card className="p-[18px]">
            <AppText className="text-center text-[13px] italic text-muted-light dark:text-muted-dark">
              &quot;Thank you for your hard work this period, {emp.name.split(' ')[0]}. The passion you bring is exceptional.&quot;
            </AppText>
          </Card>

          {/* ── Actions ── */}
          <View className="flex-row gap-3">
            <Pressable
              disabled={downloading}
              onPress={handleDownload}
              style={({ pressed }) => ({ flex: 1, opacity: downloading ? 0.6 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5" style={shadows.hero}>
                {downloading
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="download-outline" size={16} color="white" />}
                <AppText className="font-inter-semibold text-sm text-white">
                  {downloading ? 'Downloading…' : 'Download PDF'}
                </AppText>
              </View>
            </Pressable>
            <Pressable
              disabled={sharing}
              onPress={handleShare}
              style={({ pressed }) => ({ flex: 1, opacity: sharing ? 0.6 : pressed ? 0.7 : 1 })}
            >
              <View className="flex-row items-center justify-center gap-2 rounded-button border border-border-light bg-surface-light py-3.5 dark:border-border-dark dark:bg-surface-dark" style={shadows.card}>
                {sharing
                  ? <ActivityIndicator size="small" color={P.text} />
                  : <Ionicons name="logo-whatsapp" size={16} color={P.text} />}
                <AppText className="font-inter-semibold text-sm">
                  {sharing ? 'Preparing…' : 'Share'}
                </AppText>
              </View>
            </Pressable>
          </View>

          {business.whatsappPayslip && (
            <Pressable
              onPress={handleWhatsAppChat}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <View className="flex-row items-center justify-center gap-2 rounded-button bg-gold-bg-light py-3.5 dark:bg-gold-bg-dark">
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={P.primary} />
                <AppText className="font-inter-semibold text-sm text-primary">
                  Open Chat with {emp.name.split(' ')[0]}
                </AppText>
              </View>
            </Pressable>
          )}

          <AppText className="text-center text-[11px] text-placeholder-light dark:text-placeholder-dark">
            Verified by TinyPayroll • Doc ID: PAY-{run.id.toUpperCase()}-{emp.id.toUpperCase()}
          </AppText>

        </View>
      </ScrollView>
    </Screen>
  );
}
