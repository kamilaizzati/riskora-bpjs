import { createContext, useContext, useMemo, useState } from 'react';
import { getSession, signIn as signInService, signOut as signOutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSession);

  const value = useMemo(
    () => ({
      user,
      async signIn(credentials) {
        const session = await signInService(credentials);
        setUser(session);
        return session;
      },
      signOut() {
        signOutService();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Shared hooks live beside the provider so the mock-auth boundary stays self-contained.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  return context;
}
