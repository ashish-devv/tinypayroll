import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ponytail: base URL resolution.
// - EXPO_PUBLIC_API_URL wins when set (e.g. the deployed Render backend) — set it in .env.
// - Otherwise fall back to local dev: Android emulator can't see "localhost" on the host, so use 10.0.2.2.
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1');

const ACCESS_KEY = 'tp_access_token';
const REFRESH_KEY = 'tp_refresh_token';

export interface ApiFieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  fieldErrors: ApiFieldError[];
  constructor(status: number, message: string, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  // ponytail: helper for screens — look up a single field's backend message by name.
  fieldMessage(field: string): string | undefined {
    return this.fieldErrors.find((f) => f.field === field)?.message;
  }
}

// ponytail: expo-secure-store has no web binding — fall back to localStorage there.
// Exported so other services (e.g. the onboarding flag) can share the same storage without
// duplicating the platform fallback.
export const store = Platform.OS === 'web'
  ? {
      getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
      setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
      deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
    }
  : SecureStore;

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    store.getItemAsync(ACCESS_KEY),
    store.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    store.setItemAsync(ACCESS_KEY, accessToken),
    store.setItemAsync(REFRESH_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    store.deleteItemAsync(ACCESS_KEY),
    store.deleteItemAsync(REFRESH_KEY),
    clearCache(),
  ]);
}

// ponytail: read-through offline cache. GETs mirror their last live response into AsyncStorage,
// keyed by path; on a network failure (fetch throws, vs. a resolved non-ok server response) we
// serve that mirror. Writes never touch the cache — offline writes hard-fail (see apiFetch).
// AsyncStorage is one cross-platform KV (native on iOS/Android, localStorage on web), unlike
// SecureStore (2KB Android cap) or expo-file-system (native-only).
const CACHE_PREFIX = 'tp_cache:';

async function clearCache() {
  const keys = await AsyncStorage.getAllKeys();
  const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
  if (ours.length) await AsyncStorage.multiRemove(ours);
}

// ponytail: bridge from this non-React module to AuthProvider. When a request 401s and the
// session can't be recovered (refresh failed / no token), we clear tokens and call this so the
// context can drop `user` — the declarative <Stack.Protected> guard then redirects to /login.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function parseError(res: Response): Promise<{ message: string; fieldErrors: ApiFieldError[] }> {
  try {
    const body = await res.json();
    return {
      message: body.message ?? `Request failed (${res.status})`,
      fieldErrors: Array.isArray(body.fieldErrors) ? body.fieldErrors : [],
    };
  } catch {
    return { message: `Request failed (${res.status})`, fieldErrors: [] };
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return null;
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    await clearTokens();
    return null;
  }
  const data = await res.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true): Promise<any> {
  const { accessToken } = await getTokens();
  const method = (options.method ?? 'GET').toUpperCase();
  const isRead = method === 'GET';
  const cacheKey = CACHE_PREFIX + path;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
    });
  } catch (e) {
    // ponytail: fetch throws only on network failure (offline/DNS/timeout) — server errors resolve
    // with a non-ok status. So a throw here means we're offline: serve the cached GET if we have one,
    // otherwise fail writes/uncached reads with a clear offline message.
    if (isRead) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached !== null) return JSON.parse(cached);
    }
    throw new ApiError(0, "You're offline — connect to sync changes.");
  }

  if (res.status === 401 && retry && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch(path, options, false);
  }

  // ponytail: terminal 401 — either no way to refresh, or the refresh itself failed. Kill the
  // session so the router bounces the user to the login screen instead of leaving a dead token.
  if (res.status === 401) {
    await clearTokens();
    onUnauthorized?.();
  }

  if (!res.ok) {
    const { message, fieldErrors } = await parseError(res);
    throw new ApiError(res.status, message, fieldErrors);
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (isRead) await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body?: unknown) => apiFetch(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: unknown) => apiFetch(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
};
