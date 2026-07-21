import { api } from '@/src/services/api';

export interface ActivityEntry {
  id: string;
  /** e.g. "CREATE_EMPLOYEE" — used to pick the icon + verb. */
  action: string;
  entityType: string;
  entityId?: string;
  /** Best-effort display name pulled from the audit row (employee name, payroll period, …). */
  entityLabel?: string;
  createdAt: string;
  /** Composed human-readable sentence, e.g. "New employee: Priya". */
  label: string;
  /** Ionicons glyph name for the row. */
  icon: string;
}

// Maps each audited action to a phrasing + icon. `label` receives the entity label (may be empty).
const ACTION_META: Record<string, { icon: string; phrase: (name: string) => string }> = {
  CREATE_EMPLOYEE:       { icon: 'person-add-outline',    phrase: (n) => n ? `New employee: ${n}` : 'New employee added' },
  UPDATE_EMPLOYEE:       { icon: 'create-outline',        phrase: (n) => n ? `Updated ${n}` : 'Employee updated' },
  DELETE_EMPLOYEE:       { icon: 'person-remove-outline', phrase: (n) => n ? `Removed ${n}` : 'Employee removed' },
  CREATE_PAYROLL_RUN:    { icon: 'cash-outline',          phrase: (n) => n ? `Payroll started for ${n}` : 'Payroll run started' },
  ADJUST_PAYROLL_ITEM:   { icon: 'options-outline',       phrase: () => 'Payroll adjustment made' },
  FINALIZE_PAYROLL_RUN:  { icon: 'checkmark-done-outline',phrase: (n) => n ? `Payroll finalized for ${n}` : 'Payroll finalized' },
  DELETE_PAYROLL_RUN:    { icon: 'trash-outline',         phrase: (n) => n ? `Deleted payroll for ${n}` : 'Payroll run deleted' },
  UPDATE_BUSINESS_CONFIG:{ icon: 'business-outline',      phrase: (n) => n ? `Business settings updated` : 'Business settings updated' },
  CREATE_DEPARTMENT:     { icon: 'add-circle-outline',    phrase: (n) => n ? `New department: ${n}` : 'Department added' },
  UPDATE_DEPARTMENT:     { icon: 'create-outline',        phrase: (n) => n ? `Department updated: ${n}` : 'Department updated' },
  DELETE_DEPARTMENT:     { icon: 'trash-outline',         phrase: (n) => n ? `Department removed: ${n}` : 'Department removed' },
  CREATE_DESIGNATION:    { icon: 'add-circle-outline',    phrase: (n) => n ? `New designation: ${n}` : 'Designation added' },
  UPDATE_DESIGNATION:    { icon: 'create-outline',        phrase: (n) => n ? `Designation updated: ${n}` : 'Designation updated' },
  DELETE_DESIGNATION:    { icon: 'trash-outline',         phrase: (n) => n ? `Designation removed: ${n}` : 'Designation removed' },
};

function metaFor(action: string) {
  return ACTION_META[action] ?? {
    icon: 'ellipse-outline',
    phrase: (n: string) => n ? `${action}: ${n}` : action.replace(/_/g, ' ').toLowerCase(),
  };
}

/** Compact relative time: "just now", "5m ago", "2h ago", "Yesterday", "3d ago", or a date. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function toEntry(r: any): ActivityEntry {
  const label: string = r.entityLabel ?? '';
  const meta = metaFor(r.action);
  return {
    id: String(r.id),
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId != null ? String(r.entityId) : undefined,
    entityLabel: label || undefined,
    createdAt: r.createdAt,
    label: meta.phrase(label),
    icon: meta.icon,
  };
}

/** Recent business activity, newest first (backed by the server-side audit trail). */
export async function listActivity(size = 20): Promise<ActivityEntry[]> {
  const qs = new URLSearchParams({ page: '0', size: String(size) });
  const data = await api.get(`/audit-logs?${qs}`);
  return (data?.content ?? []).map(toEntry);
}

export interface ActivityPage {
  entries: ActivityEntry[];
  page: number;
  /** True when there are more pages after this one. */
  hasMore: boolean;
}

// ── 10s stale-cache for the activity feed ──────────────────────────────────────────────────
// Audit-log reads are the app's slowest endpoint (remote DB round-trip). To spare the DB, each
// (page,size) result is held in-memory for TTL_MS: any re-query inside that window returns the
// cached page and makes NO network call. Only after the window expires does the next call hit the
// API and refresh the cache. `inflight` also de-dupes concurrent callers so a burst fires one
// request, not N. Cache is per-session (module scope) and cleared on sign-out via clearActivityCache().
const TTL_MS = 10_000;

type CacheEntry = { at: number; value: ActivityPage };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ActivityPage>>();

/** Drop all cached activity pages — call on sign-out / business switch so stale data can't leak. */
export function clearActivityCache() {
  cache.clear();
  inflight.clear();
}

async function fetchActivityPage(page: number, size: number): Promise<ActivityPage> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  const data = await api.get(`/audit-logs?${qs}`);
  const entries: ActivityEntry[] = (data?.content ?? []).map(toEntry);
  const totalPages: number = data?.totalPages ?? 0;
  return { entries, page, hasMore: page + 1 < totalPages };
}

/**
 * One page of business activity, newest first — used by the full "All Activity" screen.
 * Served from a 10-second in-memory cache: repeated opens within the window reuse the last
 * result and skip the API entirely, lowering DB load. Pass `force: true` to bypass the cache
 * (e.g. an explicit pull-to-refresh).
 */
export async function listActivityPage(page = 0, size = 15, force = false): Promise<ActivityPage> {
  const key = `${page}:${size}`;
  const now = Date.now();

  // Within the TTL → serve cache, no network call.
  if (!force) {
    const hit = cache.get(key);
    if (hit && now - hit.at < TTL_MS) return hit.value;
    // A request for this key is already in flight → share it instead of firing another.
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const req = fetchActivityPage(page, size)
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => { inflight.delete(key); });

  inflight.set(key, req);
  return req;
}
