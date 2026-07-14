import { ScrollView, YStack, XStack, Text, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Pressable, useColorScheme, Platform, Alert, Linking } from 'react-native';
import { useEffect, useState } from 'react';
import * as Sharing from 'expo-sharing';

import { getPayrollRun, downloadPayslipPdf, downloadPayslipPdfWeb } from '@/src/services/payroll';
import { getEmployee } from '@/src/services/employees';
import { getBusiness, type Business } from '@/src/services/business';
import type { PayrollRun, Employee } from '@/src/types';

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

function LineItem({ label, value, color, C }: {
  label: string; value: string; color?: string; C: ReturnType<typeof useC>;
}) {
  return (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical={4}>
      <Text fontSize={14} fontFamily="$body" color={C.muted}>{label}</Text>
      <Text fontSize={14} fontFamily="$body" fontWeight="500" color={color ?? C.text}>{value}</Text>
    </XStack>
  );
}

export default function PayslipScreen() {
  const C = useC();
  const router = useRouter();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={16}>

          {/* ── Company info card ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={18} gap={6} style={C.cardShadow}>
            <XStack alignItems="center" gap={12}>
              <YStack width={42} height={42} borderRadius={10} backgroundColor={C.ink}
                      alignItems="center" justifyContent="center">
                <Text fontSize={13} fontFamily="$body" fontWeight="700" color="white">TP</Text>
              </YStack>
              <YStack>
                <Text fontSize={15} fontFamily="$body" fontWeight="700" color={C.text}>
                  {business.companyName}
                </Text>
                {business.industry && <Text fontSize={12} fontFamily="$body" color={C.muted}>{business.industry}</Text>}
              </YStack>
            </XStack>
            {business.address && (
              <Text fontSize={12} fontFamily="$body" color={C.placeholder} marginTop={4}>
                {business.address}
              </Text>
            )}
            {business.email && <Text fontSize={12} fontFamily="$body" color={C.placeholder}>{business.email}</Text>}
          </YStack>

          {/* ── Employee + period meta ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>
            <XStack gap={24}>
              <YStack flex={1} gap={3}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
                      color={C.placeholder} textTransform="uppercase">Employee</Text>
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>{emp.name}</Text>
                <Text fontSize={12} fontFamily="$body" color={C.muted}>ID: EMP-{emp.id.slice(-4).toUpperCase()}</Text>
              </YStack>
              <YStack flex={1} gap={3}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
                      color={C.placeholder} textTransform="uppercase">Pay Period</Text>
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
                  {periodStart} – {periodEnd}
                </Text>
              </YStack>
            </XStack>
            <Separator borderColor={C.border} />
            <XStack gap={24}>
              <YStack flex={1} gap={3}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
                      color={C.placeholder} textTransform="uppercase">Payment Method</Text>
                <Text fontSize={14} fontFamily="$body" color={C.text}>Bank Transfer</Text>
                <Text fontSize={12} fontFamily="$body" color={C.muted}>••• {emp.bankAccount ?? '0000'}</Text>
              </YStack>
              <YStack flex={1} gap={3}>
                <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.6}
                      color={C.placeholder} textTransform="uppercase">Payment Date</Text>
                <Text fontSize={14} fontFamily="$body" color={C.text}>{payDateStr}</Text>
                <YStack backgroundColor={C.successBg} borderRadius={9999}
                        paddingHorizontal={8} paddingVertical={3} alignSelf="flex-start">
                  <Text fontSize={11} fontFamily="$body" fontWeight="600"
                        color={C.success} letterSpacing={0.4}>PAID</Text>
                </YStack>
              </YStack>
            </XStack>
          </YStack>

          {/* ── Earnings ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={18} gap={10} style={C.cardShadow}>
            <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}
                  letterSpacing={0.3} textTransform="uppercase">Earnings</Text>
            <Separator borderColor={C.border} />
            <XStack justifyContent="space-between">
              <Text fontSize={12} fontFamily="$body" fontWeight="600" color={C.muted}>COMPONENT</Text>
              <Text fontSize={12} fontFamily="$body" fontWeight="600" color={C.muted}>AMOUNT</Text>
            </XStack>
            <LineItem label="Base Salary" value={`₹${item.baseSalary.toLocaleString('en-IN')}`} C={C} />
            {item.overtime > 0 && <LineItem label="Overtime" value={`₹${item.overtime.toLocaleString('en-IN')}`} C={C} />}
            {item.bonus > 0 && <LineItem label="Bonus" value={`₹${item.bonus.toLocaleString('en-IN')}`} C={C} />}
          </YStack>

          {/* ── Deductions ── */}
          {(item.unpaidLeave > 0 || item.advances > 0 || item.deductions > 0) && (
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.border} padding={18} gap={10} style={C.cardShadow}>
              <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}
                    letterSpacing={0.3} textTransform="uppercase">Deductions</Text>
              <Separator borderColor={C.border} />
              {item.unpaidLeave > 0 && <LineItem label="Unpaid Leave" value={`−₹${item.unpaidLeave.toLocaleString('en-IN')}`} color="#dc2626" C={C} />}
              {item.advances > 0 && <LineItem label="Advance" value={`−₹${item.advances.toLocaleString('en-IN')}`} color="#dc2626" C={C} />}
              {item.deductions > 0 && <LineItem label="Other Deductions" value={`−₹${item.deductions.toLocaleString('en-IN')}`} color="#dc2626" C={C} />}
            </YStack>
          )}

          {/* ── Net pay ── */}
          <YStack backgroundColor={C.goldBg} borderRadius={14} padding={22}
                  alignItems="center" gap={6}
                  style={{ shadowColor: '#d4af37', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 6 }}>
            <Text fontSize={12} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
                  color={C.muted} textTransform="uppercase">Net Payable</Text>
            <Text fontSize={38} fontFamily="$body" fontWeight="700" color={C.gold} letterSpacing={-1}>
              ₹{item.finalSalary.toLocaleString('en-IN')}
            </Text>
          </YStack>

          {/* ── Thank-you note ── */}
          <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                  borderColor={C.border} padding={18} style={C.cardShadow}>
            <Text fontSize={13} fontFamily="$body" color={C.muted} textAlign="center" fontStyle="italic">
              "Thank you for your hard work this period, {emp.name.split(' ')[0]}. The passion you bring is exceptional."
            </Text>
          </YStack>

          {/* ── Actions ── */}
          <XStack gap={12}>
            <Pressable
              disabled={downloading}
              onPress={handleDownload}
              style={({ pressed }) => ({ flex: 1, opacity: downloading ? 0.6 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <XStack backgroundColor={C.ink} borderRadius={12} paddingVertical={14}
                      alignItems="center" justifyContent="center" gap={8} style={C.heroShadow}>
                {downloading
                  ? <Spinner size="small" color="white" />
                  : <Ionicons name="download-outline" size={16} color="white" />}
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color="white">
                  {downloading ? 'Downloading…' : 'Download PDF'}
                </Text>
              </XStack>
            </Pressable>
            <Pressable
              disabled={sharing}
              onPress={handleShare}
              style={({ pressed }) => ({ flex: 1, opacity: sharing ? 0.6 : pressed ? 0.7 : 1 })}
            >
              <XStack backgroundColor={C.surface} borderRadius={12} borderWidth={1}
                      borderColor={C.border} paddingVertical={14}
                      alignItems="center" justifyContent="center" gap={8} style={C.cardShadow}>
                {sharing
                  ? <Spinner size="small" color={C.text} />
                  : <Ionicons name="logo-whatsapp" size={16} color={C.text} />}
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
                  {sharing ? 'Preparing…' : 'Share'}
                </Text>
              </XStack>
            </Pressable>
          </XStack>

          {business.whatsappPayslip && (
            <Pressable
              onPress={handleWhatsAppChat}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <XStack backgroundColor={C.goldBg} borderRadius={12} paddingVertical={14}
                      alignItems="center" justifyContent="center" gap={8}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.gold} />
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.gold}>
                  Open Chat with {emp.name.split(' ')[0]}
                </Text>
              </XStack>
            </Pressable>
          )}

          <Text fontSize={11} fontFamily="$body" color={C.placeholder} textAlign="center">
            Verified by TinyPayroll • Doc ID: PAY-{run.id.toUpperCase()}-{emp.id.toUpperCase()}
          </Text>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
