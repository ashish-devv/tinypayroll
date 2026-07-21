import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, getTokens, setTokens, clearTokens, store, setUnauthorizedHandler } from '@/src/services/api';
import { clearActivityCache } from '@/src/services/activity';

const ONBOARDED_KEY = 'tp_has_onboarded';

interface SessionUser {
  userId: number;
  businessId: number;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isBooting: boolean;
  hasOnboarded: boolean;
  user: SessionUser | null;
  error: string | null;
  completeOnboarding: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (companyName: string, ownerName: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenResponseToUser(data: any): SessionUser {
  return { userId: data.userId, businessId: data.businessId, name: data.name, email: data.email, role: data.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ponytail: any API call that 401s (expired/invalid token, refresh failed) clears tokens in
    // api.ts and calls this — dropping `user` flips the <Stack.Protected> guard to /login.
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      // ponytail: no /auth/me endpoint — presence of a stored token is treated as "authenticated"
      // until the first API call 401s and clears it. Good enough for MVP session restore.
      const [{ accessToken }, onboarded] = await Promise.all([getTokens(), store.getItemAsync(ONBOARDED_KEY)]);
      if (accessToken) setUser({ userId: 0, businessId: 0, name: '', email: '', role: 'OWNER' });
      if (onboarded === '1') setHasOnboarded(true);
      setIsBooting(false);
    })();
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    try {
      const data = await api.post('/auth/login', { email, password });
      await setTokens(data.accessToken, data.refreshToken);
      setUser(tokenResponseToUser(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not log in');
      throw e;
    }
  }

  async function signUp(companyName: string, ownerName: string, email: string, password: string) {
    setError(null);
    try {
      const data = await api.post('/auth/signup', { companyName, ownerName, email, password });
      await setTokens(data.accessToken, data.refreshToken);
      setUser(tokenResponseToUser(data));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create account');
      throw e;
    }
  }

  async function signOut() {
    const { refreshToken } = await getTokens();
    await clearTokens();
    clearActivityCache();
    setUser(null);
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isBooting,
        hasOnboarded,
        user,
        error,
        completeOnboarding: () => {
          setHasOnboarded(true);
          store.setItemAsync(ONBOARDED_KEY, '1').catch(() => {});
        },
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
