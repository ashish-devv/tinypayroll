import { ScrollView, YStack, XStack, Text, Input, Separator, Spinner } from 'tamagui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, useColorScheme, Switch } from 'react-native';
import { useEffect, useState } from 'react';

import { getBusiness, updateBusiness } from '@/src/services/business';
import { useAuth } from '@/src/services/auth';
import { ApiError } from '@/src/services/api';

// ponytail: mirrors backend's @Pattern on UpdateBusinessRequest.gstin — validate client-side on blur
// so the user sees the error as soon as they finish typing, instead of only after Save round-trips.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

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
    goldBg:      dark ? '#2a2410' : '#fdf6d8',
    danger:      '#dc2626',
    dangerBg:    dark ? '#2d1414' : '#fef2f2',
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

function SectionLabel({ label, C }: { label: string; C: ReturnType<typeof useC> }) {
  return (
    <Text fontSize={11} fontFamily="$body" fontWeight="600" letterSpacing={0.8}
          color={C.placeholder} textTransform="uppercase" paddingBottom={4}>
      {label}
    </Text>
  );
}

function FieldRow({ label, value, placeholder, onChangeText, onBlur, errorText, C }: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText?: (v: string) => void;
  onBlur?: () => void;
  errorText?: string;
  C: ReturnType<typeof useC>;
}) {
  return (
    <YStack gap={6}>
      <Text fontSize={13} fontFamily="$body" fontWeight="500" color={C.muted}>{label}</Text>
      <Input
        value={value}
        placeholder={placeholder ?? label}
        onChangeText={onChangeText}
        onBlur={onBlur}
        backgroundColor={C.inputBg}
        borderWidth={1}
        borderColor={errorText ? C.danger : C.border}
        borderRadius={10}
        paddingHorizontal={14}
        height={44}
        fontSize={14}
        fontFamily="$body"
        color={C.text}
        placeholderTextColor={C.placeholder}
      />
      {errorText && (
        <XStack alignItems="center" gap={5}>
          <Ionicons name="alert-circle" size={13} color={C.danger} />
          <Text fontSize={12} fontFamily="$body" color={C.danger}>{errorText}</Text>
        </XStack>
      )}
    </YStack>
  );
}

function ToggleRow({ label, desc, value, onValueChange, C }: {
  label: string;
  desc?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  C: ReturnType<typeof useC>;
}) {
  return (
    <XStack alignItems="center" justifyContent="space-between" paddingVertical={4}>
      <YStack flex={1} gap={2} paddingRight={12}>
        <Text fontSize={14} fontFamily="$body" fontWeight="500" color={C.text}>{label}</Text>
        {desc && <Text fontSize={12} fontFamily="$body" color={C.muted}>{desc}</Text>}
      </YStack>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: C.border, true: C.ink }}
        thumbColor="white"
      />
    </XStack>
  );
}

export default function BusinessConfigScreen() {
  const C = useC();
  const { signOut } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [payDay, setPayDay] = useState('1');
  const [workingDays, setWorkingDays] = useState('26');
  const [otRate, setOtRate] = useState('1.5');
  const [autoReminders, setAutoReminders] = useState(true);
  const [whatsappPayslip, setWhatsappPayslip] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ponytail: small helper so each FieldRow's onChangeText also clears its own error as the user retypes.
  function fieldSetter(field: string, setter: (v: string) => void) {
    return (v: string) => {
      setter(v);
      if (fieldErrors[field]) setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
    };
  }

  function handleGstinBlur() {
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      setFieldErrors((prev) => ({ ...prev, gstin: 'Invalid GSTIN format' }));
    }
  }

  useEffect(() => {
    getBusiness()
      .then((b) => {
        setCompanyName(b.companyName);
        setIndustry(b.industry ?? '');
        setGstin(b.gstin ?? '');
        setAddress(b.address ?? '');
        setEmail(b.email ?? '');
        setPhone(b.phone ?? '');
        setCurrency(b.currency);
        setCurrencySymbol(b.currencySymbol);
        setPayDay(String(b.payDay));
        setWorkingDays(String(b.workingDaysPerMonth));
        setOtRate(String(b.otRate));
        setAutoReminders(b.autoReminders);
        setWhatsappPayslip(b.whatsappPayslip);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load business config'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await updateBusiness({
        companyName, industry: industry || undefined, gstin: gstin || undefined,
        address: address || undefined, email: email || undefined, phone: phone || undefined,
        currency, currencySymbol,
        payDay: Number(payDay) || 1,
        workingDaysPerMonth: Number(workingDays) || 26,
        otRate: Number(otRate) || 1.5,
        autoReminders, whatsappPayslip,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length > 0) {
        // ponytail: surface each backend field error inline under its input — no generic banner needed,
        // the highlighted field(s) already say what's wrong.
        setFieldErrors(Object.fromEntries(e.fieldErrors.map((f) => [f.field, f.message])));
      } else {
        setError(e instanceof Error ? e.message : 'Could not save changes');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
        <YStack flex={1} alignItems="center" justifyContent="center"><Spinner color={C.gold} /></YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={['bottom']}>
      <ScrollView backgroundColor={C.bg} showsVerticalScrollIndicator={false}>
        <YStack paddingHorizontal={20} paddingTop={24} paddingBottom={40} gap={24}>

          {/* ── Company profile ── */}
          <YStack gap={14}>
            <SectionLabel label="Company Profile" C={C} />
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>

              {/* Logo placeholder */}
              <XStack alignItems="center" gap={14}>
                <YStack width={56} height={56} borderRadius={14} backgroundColor={C.ink}
                        alignItems="center" justifyContent="center">
                  <Text fontSize={18} fontFamily="$body" fontWeight="700" color="white">TP</Text>
                </YStack>
                <YStack flex={1} gap={4}>
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color={C.text}>
                    {companyName}
                  </Text>
                  <Pressable>
                    <Text fontSize={12} fontFamily="$body" color={C.gold}>Change logo</Text>
                  </Pressable>
                </YStack>
              </XStack>

              <Separator borderColor={C.border} />

              <FieldRow label="Company Name" value={companyName} onChangeText={fieldSetter('companyName', setCompanyName)}
                        errorText={fieldErrors.companyName} C={C} />
              <FieldRow label="Industry / Type" value={industry} onChangeText={fieldSetter('industry', setIndustry)}
                        errorText={fieldErrors.industry} C={C} />
              <FieldRow label="GSTIN" value={gstin} onChangeText={fieldSetter('gstin', setGstin)}
                        onBlur={handleGstinBlur} placeholder="22AAAAA0000A1Z5" errorText={fieldErrors.gstin} C={C} />
              <FieldRow label="Address" value={address} onChangeText={fieldSetter('address', setAddress)}
                        errorText={fieldErrors.address} C={C} />
            </YStack>
          </YStack>

          {/* ── Contact info ── */}
          <YStack gap={14}>
            <SectionLabel label="Contact Information" C={C} />
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>
              <FieldRow label="Email" value={email} onChangeText={fieldSetter('email', setEmail)}
                        placeholder="you@company.com" errorText={fieldErrors.email} C={C} />
              <FieldRow label="Phone" value={phone} onChangeText={fieldSetter('phone', setPhone)}
                        placeholder="+91 XXXXX XXXXX" errorText={fieldErrors.phone} C={C} />
            </YStack>
          </YStack>

          {/* ── Payroll settings ── */}
          <YStack gap={14}>
            <SectionLabel label="Payroll Settings" C={C} />
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.border} padding={18} gap={14} style={C.cardShadow}>
              <FieldRow label="Pay Day (day of month)" value={payDay} onChangeText={fieldSetter('payDay', setPayDay)}
                        placeholder="1" errorText={fieldErrors.payDay} C={C} />
              <FieldRow label="Working Days / Month" value={workingDays} onChangeText={fieldSetter('workingDaysPerMonth', setWorkingDays)}
                        placeholder="26" errorText={fieldErrors.workingDaysPerMonth} C={C} />
              <FieldRow label="Overtime Rate (×)" value={otRate} onChangeText={fieldSetter('otRate', setOtRate)}
                        placeholder="1.5" errorText={fieldErrors.otRate} C={C} />

              <Separator borderColor={C.border} />

              <ToggleRow
                label="Auto Payment Reminders"
                desc="Get notified 3 days before pay day"
                value={autoReminders}
                onValueChange={setAutoReminders}
                C={C}
              />
              <ToggleRow
                label="WhatsApp Payslip Delivery"
                desc="Send payslips to employees on WhatsApp"
                value={whatsappPayslip}
                onValueChange={setWhatsappPayslip}
                C={C}
              />
            </YStack>
          </YStack>

          {/* ── Account ── */}
          <YStack gap={14}>
            <SectionLabel label="Account" C={C} />
            <Pressable onPress={signOut}>
              <XStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                      borderColor={C.border} padding={18} alignItems="center" gap={12} style={C.cardShadow}>
                <YStack width={36} height={36} borderRadius={18}
                        backgroundColor={C.surfaceLow} alignItems="center" justifyContent="center">
                  <Ionicons name="log-out-outline" size={16} color={C.text} />
                </YStack>
                <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.text}>Log Out</Text>
              </XStack>
            </Pressable>
          </YStack>

          {/* ── Danger zone ── */}
          <YStack gap={14}>
            <SectionLabel label="Danger Zone" C={C} />
            <YStack backgroundColor={C.surface} borderRadius={14} borderWidth={1}
                    borderColor={C.dangerBg} padding={18} gap={12}>
              <Pressable>
                <XStack alignItems="center" gap={12}>
                  <YStack width={36} height={36} borderRadius={18}
                          backgroundColor={C.dangerBg} alignItems="center" justifyContent="center">
                    <Ionicons name="trash-outline" size={16} color={C.danger} />
                  </YStack>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={13} fontFamily="$body" fontWeight="600" color={C.danger}>
                      Clear All Payroll Data
                    </Text>
                    <Text fontSize={12} fontFamily="$body" color={C.muted}>
                      Permanently deletes all runs and payslips
                    </Text>
                  </YStack>
                </XStack>
              </Pressable>
            </YStack>
          </YStack>

          {error && (
            <XStack backgroundColor={C.dangerBg} borderRadius={12} borderWidth={1} borderColor={C.danger}
                    padding={12} alignItems="center" gap={10}>
              <Ionicons name="alert-circle" size={18} color={C.danger} />
              <Text flex={1} fontSize={13} fontFamily="$body" color={C.danger}>{error}</Text>
            </XStack>
          )}

          {/* ── Save button ── */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 })}
          >
            <XStack
              backgroundColor={saved ? '#16a34a' : C.ink}
              borderRadius={14}
              paddingVertical={16}
              alignItems="center"
              justifyContent="center"
              gap={8}
              style={C.heroShadow}
            >
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color="white" />
              <Text fontSize={15} fontFamily="$body" fontWeight="600" color="white">
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </Text>
            </XStack>
          </Pressable>

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
