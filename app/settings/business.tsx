import { ScrollView, View, Pressable, TextInput, Switch, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { Screen, Card, AppText, Divider, usePalette, useShadows } from '@/src/components/ui';
import { getBusiness, updateBusiness } from '@/src/services/business';
import { useAuth } from '@/src/services/auth';
import { ApiError } from '@/src/services/api';

// ponytail: mirrors backend's @Pattern on UpdateBusinessRequest.gstin — validate client-side on blur
// so the user sees the error as soon as they finish typing, instead of only after Save round-trips.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText className="pb-1 font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-placeholder-light dark:text-placeholder-dark">
      {label}
    </AppText>
  );
}

function FieldRow({ label, value, placeholder, onChangeText, onBlur, errorText }: {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText?: (v: string) => void;
  onBlur?: () => void;
  errorText?: string;
}) {
  const P = usePalette();
  return (
    <View className="gap-1.5">
      <AppText className="font-inter-medium text-[13px] text-muted-light dark:text-muted-dark">{label}</AppText>
      <TextInput
        value={value}
        placeholder={placeholder ?? label}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholderTextColor={P.placeholder}
        className={`h-11 rounded-input border bg-surface-low-light px-3.5 text-sm text-text-light dark:bg-surface-low-dark dark:text-text-dark ${errorText ? 'border-rose-400' : 'border-border-light dark:border-border-dark'}`}
        style={{ fontFamily: 'Inter_400Regular' }}
      />
      {errorText && (
        <View className="flex-row items-center gap-[5px]">
          <Ionicons name="alert-circle" size={13} color="#e11d48" />
          <AppText className="text-xs text-rose-600 dark:text-rose-300">{errorText}</AppText>
        </View>
      )}
    </View>
  );
}

function ToggleRow({ label, desc, value, onValueChange }: {
  label: string;
  desc?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const P = usePalette();
  return (
    <View className="flex-row items-center justify-between py-1">
      <View className="flex-1 gap-0.5 pr-3">
        <AppText className="font-inter-medium text-sm">{label}</AppText>
        {desc && <AppText className="text-xs text-muted-light dark:text-muted-dark">{desc}</AppText>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: P.border, true: P.primary }}
        thumbColor="white"
      />
    </View>
  );
}

export default function BusinessConfigScreen() {
  const P = usePalette();
  const shadows = useShadows();
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
      <Screen variant="surface" edges={['bottom']}>
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={P.primary} /></View>
      </Screen>
    );
  }

  return (
    <Screen variant="surface" edges={['bottom']}>
      {/* ponytail: android keyboard covers inputs without adjustResize (broken by edge-to-edge) */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-6 px-5 pb-10 pt-6">

          {/* ── Company profile ── */}
          <View className="gap-3.5">
            <SectionLabel label="Company Profile" />
            <Card className="gap-3.5 p-[18px]">

              {/* Logo placeholder */}
              <View className="flex-row items-center gap-3.5">
                <View className="h-14 w-14 items-center justify-center rounded-card bg-primary">
                  <AppText className="font-inter-bold text-lg text-white">TP</AppText>
                </View>
                <View className="flex-1 gap-1">
                  <AppText className="font-inter-semibold text-sm">
                    {companyName}
                  </AppText>
                  <Pressable>
                    <AppText className="text-xs text-primary">Change logo</AppText>
                  </Pressable>
                </View>
              </View>

              <Divider />

              <FieldRow label="Company Name" value={companyName} onChangeText={fieldSetter('companyName', setCompanyName)}
                        errorText={fieldErrors.companyName} />
              <FieldRow label="Industry / Type" value={industry} onChangeText={fieldSetter('industry', setIndustry)}
                        errorText={fieldErrors.industry} />
              <FieldRow label="GSTIN" value={gstin} onChangeText={fieldSetter('gstin', setGstin)}
                        onBlur={handleGstinBlur} placeholder="22AAAAA0000A1Z5" errorText={fieldErrors.gstin} />
              <FieldRow label="Address" value={address} onChangeText={fieldSetter('address', setAddress)}
                        errorText={fieldErrors.address} />
            </Card>
          </View>

          {/* ── Contact info ── */}
          <View className="gap-3.5">
            <SectionLabel label="Contact Information" />
            <Card className="gap-3.5 p-[18px]">
              <FieldRow label="Email" value={email} onChangeText={fieldSetter('email', setEmail)}
                        placeholder="you@company.com" errorText={fieldErrors.email} />
              <FieldRow label="Phone" value={phone} onChangeText={fieldSetter('phone', setPhone)}
                        placeholder="+91 XXXXX XXXXX" errorText={fieldErrors.phone} />
            </Card>
          </View>

          {/* ── Payroll settings ── */}
          <View className="gap-3.5">
            <SectionLabel label="Payroll Settings" />
            <Card className="gap-3.5 p-[18px]">
              <FieldRow label="Pay Day (day of month)" value={payDay} onChangeText={fieldSetter('payDay', setPayDay)}
                        placeholder="1" errorText={fieldErrors.payDay} />
              <FieldRow label="Working Days / Month" value={workingDays} onChangeText={fieldSetter('workingDaysPerMonth', setWorkingDays)}
                        placeholder="26" errorText={fieldErrors.workingDaysPerMonth} />
              <FieldRow label="Overtime Rate (×)" value={otRate} onChangeText={fieldSetter('otRate', setOtRate)}
                        placeholder="1.5" errorText={fieldErrors.otRate} />

              <Divider />

              <ToggleRow
                label="Auto Payment Reminders"
                desc="Get notified 3 days before pay day"
                value={autoReminders}
                onValueChange={setAutoReminders}
              />
              <ToggleRow
                label="WhatsApp Payslip Delivery"
                desc="Send payslips to employees on WhatsApp"
                value={whatsappPayslip}
                onValueChange={setWhatsappPayslip}
              />
            </Card>
          </View>

          {/* ── Account ── */}
          <View className="gap-3.5">
            <SectionLabel label="Account" />
            <Pressable onPress={signOut}>
              <Card className="flex-row items-center gap-3 p-[18px]">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-low-light dark:bg-surface-low-dark">
                  <Ionicons name="log-out-outline" size={16} color={P.text} />
                </View>
                <AppText className="font-inter-semibold text-[13px]">Log Out</AppText>
              </Card>
            </Pressable>
          </View>

          {/* ── Danger zone ── */}
          <View className="gap-3.5">
            <SectionLabel label="Danger Zone" />
            <View className="gap-3 rounded-card border border-rose-100 bg-surface-light p-[18px] dark:border-rose-500/20 dark:bg-surface-dark">
              <Pressable>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
                    <Ionicons name="trash-outline" size={16} color="#e11d48" />
                  </View>
                  <View className="flex-1 gap-0.5">
                    <AppText className="font-inter-semibold text-[13px] text-rose-600 dark:text-rose-300">
                      Clear All Payroll Data
                    </AppText>
                    <AppText className="text-xs text-muted-light dark:text-muted-dark">
                      Permanently deletes all runs and payslips
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>

          {error && (
            <View className="flex-row items-center gap-2.5 rounded-button border border-rose-300 bg-rose-50 p-3 dark:border-rose-500/40 dark:bg-rose-500/10">
              <Ionicons name="alert-circle" size={18} color="#e11d48" />
              <AppText className="flex-1 text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>
            </View>
          )}

          {/* ── Save button ── */}
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 })}
          >
            <View
              className={`flex-row items-center justify-center gap-2 rounded-card py-4 ${saved ? 'bg-emerald-600' : 'bg-primary'}`}
              style={shadows.hero}
            >
              <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">
                {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
              </AppText>
            </View>
          </Pressable>

        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
