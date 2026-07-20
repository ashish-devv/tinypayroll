import { ScrollView, View, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen, AppText, ComboBox, usePalette } from '@/src/components/ui';
import { getEmployee, updateEmployee } from '@/src/services/employees';
import { listDepartments, createDepartment } from '@/src/services/departments';
import { listDesignations, createDesignation } from '@/src/services/designations';
import type { Department, Designation } from '@/src/types';

function Field({
  label, placeholder, keyboardType = 'default', value, onChangeText,
}: {
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'email-address';
  value: string;
  onChangeText: (v: string) => void;
}) {
  const P = usePalette();
  return (
    <View className="gap-1.5">
      <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">{label}</AppText>
      <View className="rounded-input border border-border-light bg-surface-low-light px-3.5 py-3 dark:border-border-dark dark:bg-surface-low-dark">
        <TextInput
          className="font-inter text-sm text-text-light dark:text-text-dark"
          placeholderTextColor={P.placeholder}
          placeholder={placeholder}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

export default function EditEmployeeScreen() {
  const P = usePalette();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [salaryType, setSalaryType] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [designationId, setDesignationId] = useState<string | undefined>();
  const [department, setDepartment] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [phone, setPhone] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [joinDate, setJoinDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getEmployee(id)
      .then((e) => {
        if (cancelled) return;
        setName(e.name);
        setRole(e.role);
        setDesignationId(e.designationId);
        setDepartment(e.department ?? '');
        setDepartmentId(e.departmentId);
        setPhone(e.phone ?? '');
        setBaseAmount(String(e.baseSalary));
        setJoinDate(e.joinDate ?? '');
        setBankName(e.bankName ?? '');
        setIfsc(e.ifsc ?? '');
        setAccountNumber(e.bankAccount ?? '');
        setSalaryType(e.salaryType ?? 'MONTHLY');
        setStatus(e.status === 'active' ? 'ACTIVE' : 'INACTIVE');
        setLoaded(true);
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load employee'); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    listDepartments().then(setDepartments).catch(() => {});
    listDesignations().then(setDesignations).catch(() => {});
  }, []);

  function onPickDesignation(opt: Designation | null) {
    setDesignationId(opt?.id);
    if (opt?.defaultSalary != null) {
      setBaseAmount(String(opt.defaultSalary));
      if (opt.defaultSalaryType) setSalaryType(opt.defaultSalaryType);
    }
  }

  async function handleSave() {
    if (!id) return;
    setError(null);
    setSaving(true);
    try {
      // ponytail: create-on-the-fly — a typed name with no id becomes a new catalog row first.
      let depId = departmentId;
      if (department.trim() && !depId) {
        depId = (await createDepartment(department.trim())).id;
      }
      let desigId = designationId;
      if (role.trim() && !desigId) {
        desigId = (await createDesignation({
          name: role.trim(),
          departmentId: depId != null ? Number(depId) : null,
        })).id;
      }
      await updateEmployee(id, {
        name, role,
        department: department.trim() || undefined,
        departmentId: depId,
        designationId: desigId,
        baseSalary: Number(baseAmount) || 0, salaryType, status,
        joinDate: joinDate || new Date().toISOString().slice(0, 10),
        phone: phone || undefined,
        bankName: bankName || undefined,
        ifsc: ifsc || undefined,
        bankAccountNumber: accountNumber || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <Screen variant="surface" edges={['bottom']}>
        <View className="flex-1 items-center justify-center gap-2">
          {error
            ? <AppText className="text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>
            : <ActivityIndicator color={P.primary} />}
        </View>
      </Screen>
    );
  }

  return (
    <Screen variant="surface" edges={['bottom']}>
      {/* ponytail: android keyboard covers inputs without adjustResize (broken by edge-to-edge) */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
        <View className="gap-7 px-5 pb-10 pt-6">

          {/* ── Basic Information ── */}
          <View className="gap-3.5">
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="person-outline" size={14} color={P.muted} />
              <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">Basic Information</AppText>
            </View>
            <Field label="Full Name" placeholder="e.g. Rahul Sharma" value={name} onChangeText={setName} />
            <ComboBox
              label="Department"
              placeholder="e.g. Sales"
              value={department}
              options={departments}
              onChange={(t) => { setDepartment(t); setDepartmentId(undefined); }}
              onSelect={(opt) => setDepartmentId(opt?.id)}
            />
            <ComboBox
              label="Designation / Role"
              placeholder="e.g. Sales Executive"
              value={role}
              options={departmentId
                ? designations.filter((d) => d.departmentId == null || d.departmentId === departmentId)
                : department.trim()
                  ? designations.filter((d) => d.departmentId == null)
                  : designations}
              onChange={(t) => { setRole(t); setDesignationId(undefined); }}
              onSelect={onPickDesignation}
            />
            <Field label="Phone Number" placeholder="+91 98XXX XXX-XXXX" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>

          {/* ── Salary Details ── */}
          <View className="gap-3.5">
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="wallet-outline" size={14} color={P.muted} />
              <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">Salary Details</AppText>
            </View>

            <View className="gap-1.5">
              <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">Salary Type</AppText>
              <View className="flex-row gap-2.5">
                {(['MONTHLY', 'DAILY'] as const).map((t) => (
                  <Pressable key={t} onPress={() => setSalaryType(t)} style={{ flex: 1 }}>
                    <View
                      className={`flex-1 items-center rounded-input border-[1.5px] py-[11px] ${
                        salaryType === t
                          ? 'border-primary bg-primary'
                          : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'
                      }`}
                    >
                      <AppText
                        className={`font-inter-semibold text-[13px] ${
                          salaryType === t ? 'text-white' : 'text-muted-light dark:text-muted-dark'
                        }`}
                      >
                        {t === 'MONTHLY' ? 'Monthly' : 'Daily Wage'}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Base Amount"
                  placeholder={salaryType === 'MONTHLY' ? '₹ 0' : '₹ 0 / day'}
                  keyboardType="numeric"
                  value={baseAmount}
                  onChangeText={setBaseAmount}
                />
              </View>
              <View className="flex-1">
                <Field label="Joining Date" placeholder="yyyy-mm-dd" value={joinDate} onChangeText={setJoinDate} />
              </View>
            </View>
          </View>

          {/* ── Bank Details ── */}
          <View className="gap-3.5">
            <View className="mb-1 flex-row items-center gap-2">
              <Ionicons name="card-outline" size={14} color={P.muted} />
              <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">Bank Details</AppText>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Bank Name" placeholder="e.g. HDFC Bank" value={bankName} onChangeText={setBankName} />
              </View>
              <View className="flex-1">
                <Field label="IFSC / ID" placeholder="e.g. HDFC0001" value={ifsc} onChangeText={setIfsc} />
              </View>
            </View>
            <Field label="Account Number" placeholder="000-000-000-000" keyboardType="numeric" value={accountNumber} onChangeText={setAccountNumber} />
          </View>

          {error && <AppText className="text-center text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>}

          {/* ── Save ── */}
          <Pressable onPress={handleSave} disabled={saving} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.6 : 1 })}>
            <View className="flex-row items-center justify-center gap-2 rounded-card bg-primary py-4">
              <Ionicons name="checkmark-circle-outline" size={18} color="white" />
              <AppText className="font-inter-semibold text-[15px] text-white">
                {saving ? 'Saving…' : 'Save Changes'}
              </AppText>
            </View>
          </Pressable>

        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
