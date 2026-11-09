import { useEffect, useState, type ReactNode } from 'react';
import { AuthContext } from './AuthContext.ts';
import type { User } from '../types.ts';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  // On first load, ask the API whether our cookie is still a valid session.
  // This is what keeps you logged in after a page refresh.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user: User | null }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(username: string, password: string): Promise<string | null> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data: { user?: User; error?: string } = await res.json();
      if (!res.ok || !data.user) return data.error ?? 'Login failed';
      setUser(data.user);
      return null;
    } catch {
      return 'Could not reach the server';
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return <AuthContext value={{ user, checking, login, logout }}>{children}</AuthContext>;
}
