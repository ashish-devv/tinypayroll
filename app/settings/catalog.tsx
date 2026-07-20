import { ScrollView, View, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';

import { Screen, AppText, Card, Divider, usePalette, useShadows, pressScale } from '@/src/components/ui';
import type { Department, Designation } from '@/src/types';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/src/services/departments';
import {
  listDesignations, createDesignation, updateDesignation, deleteDesignation,
} from '@/src/services/designations';

type SalaryType = 'MONTHLY' | 'DAILY';

// ── Sheet editor state — one sheet handles add/edit for both departments and roles ──
type SheetState =
  | { kind: 'department'; id?: string; name: string }
  | { kind: 'role'; id?: string; name: string; departmentId: string | null; salary: string; salaryType: SalaryType }
  | null;

function confirmDelete(label: string, onConfirm: () => void) {
  Alert.alert('Delete', `Delete “${label}”?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function CatalogScreen() {
  const P = usePalette();
  const shadows = useShadows();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [saving, setSaving] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Open/replace the sheet, clearing any stale error from a previous edit.
  function openSheet(s: SheetState) {
    setSheetError(null);
    setSheet(s);
  }

  async function reload() {
    const [d, g] = await Promise.all([listDepartments(), listDesignations()]);
    setDepartments(d);
    setDesignations(g);
  }

  useEffect(() => {
    reload().then(() => setLoaded(true)).catch((e) =>
      setError(e instanceof Error ? e.message : 'Could not load catalog'));
  }, []);

  // Run a mutation, reload on success, surface any error (incl. 409 "in use").
  function guarded(fn: () => Promise<unknown>, after?: () => void) {
    setError(null);
    fn().then(reload).then(() => after?.()).catch((e) =>
      setError(e instanceof Error ? e.message : 'Something went wrong'));
  }

  // Group roles under their department; collect the rest as "unassigned".
  const rolesByDept = useMemo(() => {
    const map = new Map<string, Designation[]>();
    const unassigned: Designation[] = [];
    for (const g of designations) {
      if (g.departmentId && departments.some((d) => d.id === g.departmentId)) {
        const list = map.get(g.departmentId) ?? [];
        list.push(g);
        map.set(g.departmentId, list);
      } else {
        unassigned.push(g);
      }
    }
    return { map, unassigned };
  }, [departments, designations]);

  function saveSheet(s: NonNullable<SheetState>) {
    const name = s.name.trim();
    if (!name || saving) return;

    let op: () => Promise<unknown>;
    if (s.kind === 'department') {
      op = () => s.id ? updateDepartment(s.id, name) : createDepartment(name);
    } else {
      const salary = s.salary.trim() ? Number(s.salary) : undefined;
      const input = {
        name,
        departmentId: s.departmentId != null ? Number(s.departmentId) : null,
        defaultSalary: salary,
        defaultSalaryType: salary != null ? s.salaryType : undefined,
      };
      op = () => s.id ? updateDesignation(s.id, input) : createDesignation(input);
    }

    setSheetError(null);
    setSaving(true);
    op()
      .then(reload)
      .then(() => setSheet(null))
      .catch((e) => setSheetError(e instanceof Error ? e.message : 'Could not save. Please try again.'))
      .finally(() => setSaving(false));
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

  const empty = departments.length === 0 && designations.length === 0;

  return (
    <Screen variant="surface" edges={['bottom']}>
      <ScrollView className="bg-canvas-light dark:bg-canvas-dark" showsVerticalScrollIndicator={false}>
        <View className="gap-5 px-5 pb-24 pt-6">

          <View className="gap-1">
            <AppText className="font-inter-bold text-[22px] text-text-light dark:text-text-dark">
              Departments & Roles
            </AppText>
            <AppText className="text-[13px] text-muted-light dark:text-muted-dark">
              Organize your team structure. Roles live under a department.
            </AppText>
          </View>

          {error && (
            <View className="rounded-input bg-rose-50 px-3.5 py-2.5 dark:bg-rose-950/40">
              <AppText className="text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>
            </View>
          )}

          {empty && (
            <View className="items-center gap-2 py-10">
              <Ionicons name="business-outline" size={40} color={P.placeholder} />
              <AppText className="text-[15px] font-inter-semibold text-text-light dark:text-text-dark">No departments yet</AppText>
              <AppText className="text-center text-[13px] text-muted-light dark:text-muted-dark">
                Create your first department to start organizing roles.
              </AppText>
            </View>
          )}

          {/* ── Department cards, each with its nested roles ── */}
          {departments.map((d) => {
            const roles = rolesByDept.map.get(d.id) ?? [];
            return (
              <Card key={d.id} className="overflow-hidden p-0">
                {/* header */}
                <View className="flex-row items-center gap-3 px-4 py-3.5">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-gold-bg-light dark:bg-gold-bg-dark">
                    <Ionicons name="business" size={17} color={P.primary} />
                  </View>
                  <View className="flex-1">
                    <AppText className="text-[15px] font-inter-semibold text-text-light dark:text-text-dark">{d.name}</AppText>
                    <AppText className="text-xs text-muted-light dark:text-muted-dark">
                      {roles.length} {roles.length === 1 ? 'role' : 'roles'}
                    </AppText>
                  </View>
                  <Pressable hitSlop={8} onPress={() => openSheet({ kind: 'department', id: d.id, name: d.name })}>
                    <Ionicons name="create-outline" size={20} color={P.muted} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => confirmDelete(d.name, () => guarded(() => deleteDepartment(d.id)))}>
                    <Ionicons name="trash-outline" size={19} color="#e11d48" />
                  </Pressable>
                </View>

                <Divider />

                {/* nested roles */}
                <View className="px-4">
                  {roles.map((g, i) => (
                    <View key={g.id}>
                      {i > 0 && <Divider />}
                      <RoleRow
                        desig={g}
                        onPress={() => openSheet({
                          kind: 'role', id: g.id, name: g.name,
                          departmentId: g.departmentId ?? d.id,
                          salary: g.defaultSalary != null ? String(g.defaultSalary) : '',
                          salaryType: g.defaultSalaryType ?? 'MONTHLY',
                        })}
                      />
                    </View>
                  ))}
                </View>

                {/* add role to this department */}
                <Pressable
                  onPress={() => openSheet({ kind: 'role', name: '', departmentId: d.id, salary: '', salaryType: 'MONTHLY' })}
                  className="flex-row items-center gap-2 border-t border-border-light px-4 py-3 dark:border-border-dark"
                >
                  <Ionicons name="add-circle-outline" size={18} color={P.primary} />
                  <AppText className="text-[13px] font-inter-medium text-primary">Add role to {d.name}</AppText>
                </Pressable>
              </Card>
            );
          })}

          {/* ── Unassigned roles ── */}
          {rolesByDept.unassigned.length > 0 && (
            <View className="gap-2.5">
              <AppText className="font-inter-semibold text-[11px] uppercase tracking-[0.8px] text-muted-light dark:text-muted-dark">
                Unassigned Roles
              </AppText>
              <Card className="px-4 py-0">
                {rolesByDept.unassigned.map((g, i) => (
                  <View key={g.id}>
                    {i > 0 && <Divider />}
                    <RoleRow
                      desig={g}
                      onPress={() => openSheet({
                        kind: 'role', id: g.id, name: g.name,
                        departmentId: null,
                        salary: g.defaultSalary != null ? String(g.defaultSalary) : '',
                        salaryType: g.defaultSalaryType ?? 'MONTHLY',
                      })}
                    />
                  </View>
                ))}
              </Card>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── Floating "Add Department" button ── */}
      <View className="absolute bottom-6 left-5 right-5">
        <Pressable
          onPress={() => openSheet({ kind: 'department', name: '' })}
          style={(state) => [shadows.hero, pressScale(state)]}
        >
          <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-4">
            <Ionicons name="add" size={20} color="white" />
            <AppText className="font-inter-semibold text-[15px] text-white">Add Department</AppText>
          </View>
        </Pressable>
      </View>

      {/* ── Editor bottom sheet ── */}
      {sheet && (
        <CatalogSheet
          state={sheet}
          departments={departments}
          saving={saving}
          error={sheetError}
          onChange={setSheet}
          onClose={() => { if (!saving) setSheet(null); }}
          onSave={() => saveSheet(sheet)}
          onDelete={sheet.id ? () => {
            const s = sheet;
            if (saving) return;
            confirmDelete(s.name || 'this item', () => {
              setSheetError(null);
              setSaving(true);
              (s.kind === 'department' ? deleteDepartment(s.id!) : deleteDesignation(s.id!))
                .then(reload)
                .then(() => setSheet(null))
                .catch((e) => setSheetError(e instanceof Error ? e.message : 'Could not delete. It may be in use.'))
                .finally(() => setSaving(false));
            });
          } : undefined}
        />
      )}
    </Screen>
  );
}

// ── A single role row (name + salary), tappable to open its editor sheet ──
function RoleRow({ desig, onPress }: { desig: Designation; onPress: () => void }) {
  const P = usePalette();
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 py-3">
      <View className="flex-1">
        <AppText className="text-[15px] text-text-light dark:text-text-dark">{desig.name}</AppText>
        {desig.defaultSalary != null && (
          <AppText className="mt-0.5 font-geist text-xs text-muted-light dark:text-muted-dark">
            ₹{desig.defaultSalary.toLocaleString('en-IN')}{desig.defaultSalaryType === 'DAILY' ? ' / day' : ' / mo'}
          </AppText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={P.placeholder} />
    </Pressable>
  );
}

// ── Bottom-sheet editor — absolute overlay + backdrop, matching payroll/review.tsx ──
function CatalogSheet({
  state, departments, saving, error, onChange, onClose, onSave, onDelete,
}: {
  state: NonNullable<SheetState>;
  departments: Department[];
  saving: boolean;
  error: string | null;
  onChange: (s: NonNullable<SheetState>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  const P = usePalette();
  const isDept = state.kind === 'department';
  const title = `${state.id ? 'Edit' : 'New'} ${isDept ? 'Department' : 'Role'}`;
  const canSave = state.name.trim().length > 0 && !saving;

  return (
    <View className="absolute inset-0 justify-end">
      <Pressable
        onPress={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
      />
      <View
        className="gap-5 rounded-t-[24px] bg-surface-light p-6 pb-8 dark:bg-surface-dark"
        style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 20 }}
      >
        <View className="items-center">
          <View className="h-1 w-10 rounded-[2px] bg-border-light dark:bg-border-dark" />
        </View>

        <View className="flex-row items-center justify-between">
          <AppText className="font-inter-bold text-lg text-text-light dark:text-text-dark">{title}</AppText>
          {onDelete && (
            <Pressable hitSlop={8} disabled={saving} onPress={onDelete} className="flex-row items-center gap-1.5" style={{ opacity: saving ? 0.5 : 1 }}>
              <Ionicons name="trash-outline" size={17} color="#e11d48" />
              <AppText className="text-[13px] font-inter-medium text-rose-600 dark:text-rose-400">Delete</AppText>
            </Pressable>
          )}
        </View>

        {/* Error banner — lives inside the sheet so failures are visible over the backdrop */}
        {error && (
          <View className="flex-row items-center gap-2 rounded-input bg-rose-50 px-3.5 py-3 dark:bg-rose-950/40">
            <Ionicons name="alert-circle" size={17} color="#e11d48" />
            <AppText className="flex-1 text-[13px] text-rose-600 dark:text-rose-300">{error}</AppText>
          </View>
        )}

        {/* Name */}
        <View className="gap-1.5">
          <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">
            {isDept ? 'Department name' : 'Role name'}
          </AppText>
          <View className="rounded-input border border-border-light bg-surface-low-light px-3.5 py-3 dark:border-border-dark dark:bg-surface-low-dark">
            <TextInput
              autoFocus
              className="font-inter text-[15px] text-text-light dark:text-text-dark"
              placeholderTextColor={P.placeholder}
              placeholder={isDept ? 'e.g. Sales' : 'e.g. Sales Executive'}
              value={state.name}
              onChangeText={(t) => onChange({ ...state, name: t })}
            />
          </View>
        </View>

        {/* Role-only fields */}
        {state.kind === 'role' && (
          <>
            <View className="gap-1.5">
              <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">Department</AppText>
              <View className="flex-row flex-wrap gap-2">
                <DeptChip
                  label="Unassigned"
                  active={state.departmentId == null}
                  onPress={() => onChange({ ...state, departmentId: null })}
                />
                {departments.map((d) => (
                  <DeptChip
                    key={d.id}
                    label={d.name}
                    active={state.departmentId === d.id}
                    onPress={() => onChange({ ...state, departmentId: d.id })}
                  />
                ))}
              </View>
            </View>

            <View className="gap-1.5">
              <AppText className="font-inter-medium text-xs text-muted-light dark:text-muted-dark">Default salary (optional)</AppText>
              <View className="rounded-input border border-border-light bg-surface-low-light px-3.5 py-3 dark:border-border-dark dark:bg-surface-low-dark">
                <TextInput
                  className="font-geist text-[15px] text-text-light dark:text-text-dark"
                  placeholderTextColor={P.placeholder}
                  placeholder="₹ 0"
                  keyboardType="numeric"
                  value={state.salary}
                  onChangeText={(t) => onChange({ ...state, salary: t })}
                />
              </View>
              <View className="mt-1 flex-row gap-2.5">
                {(['MONTHLY', 'DAILY'] as const).map((t) => (
                  <Pressable key={t} onPress={() => onChange({ ...state, salaryType: t })} style={{ flex: 1 }}>
                    <View className={`items-center rounded-input border-[1.5px] py-2.5 ${
                      state.salaryType === t
                        ? 'border-primary bg-primary'
                        : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'
                    }`}>
                      <AppText className={`font-inter-semibold text-[13px] ${
                        state.salaryType === t ? 'text-white' : 'text-muted-light dark:text-muted-dark'
                      }`}>
                        {t === 'MONTHLY' ? 'Monthly' : 'Daily Wage'}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Actions */}
        <View className="flex-row gap-3 pt-1">
          <Pressable disabled={saving} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: saving ? 0.5 : 1 })} onPress={onClose}>
            <View className="items-center rounded-button border border-border-light py-3.5 dark:border-border-dark">
              <AppText className="font-inter-semibold text-sm text-text-light dark:text-text-dark">Cancel</AppText>
            </View>
          </Pressable>
          <Pressable
            disabled={!canSave}
            style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: canSave ? 1 : 0.5 })}
            onPress={onSave}
          >
            <View className="flex-row items-center justify-center gap-2 rounded-button bg-primary py-3.5">
              {saving && <ActivityIndicator size="small" color="white" />}
              <AppText className="font-inter-semibold text-sm text-white">{saving ? 'Saving…' : 'Save'}</AppText>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function DeptChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      hitSlop={4}
      onPress={onPress}
      className={`rounded-full border px-3.5 py-2 ${active
        ? 'border-primary bg-primary'
        : 'border-border-light bg-surface-low-light dark:border-border-dark dark:bg-surface-low-dark'}`}
    >
      <AppText className={`text-[13px] ${active ? 'text-white font-inter-medium' : 'text-muted-light dark:text-muted-dark'}`}>
        {label}
      </AppText>
    </Pressable>
  );
}
