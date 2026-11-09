import { createContext, useContext } from 'react';
import type { User } from '../types.ts';

export interface AuthState {
  user: User | null; // null = logged out
  checking: boolean; // true until we know whether a session already exists
  login: (username: string, password: string) => Promise<string | null>; // error message, or null on success
  logout: () => Promise<void>;
  sessionExpired: () => void; // call when the API says 401
}

export const AuthContext = createContext<AuthState | null>(null);

// Any component can call useAuth() to read or change the login state.
export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
