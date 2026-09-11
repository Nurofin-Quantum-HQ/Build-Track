import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authAPI, projectAPI, transactionAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('bt_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bt_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('bt_token');
    if (storedToken) {
      authAPI.me()
        .then(async (res) => {
          let userData = res.data?.user || res.data;
          
          if (userData && (!userData.onboarding || !userData.onboarding.visitedModules || userData.onboarding.visitedModules.length === 0)) {
            try {
              const [pRes, tRes] = await Promise.all([
                projectAPI.getAll().catch(() => ({ data: [] })),
                transactionAPI.getAll().catch(() => ({ data: [] }))
              ]);
              const pList = pRes.data?.projects || pRes.data || [];
              const tList = tRes.data?.transactions || tRes.data?.data || tRes.data || [];
              
              if (pList.length > 0 || tList.length > 0) {
                if (!userData.onboarding) userData.onboarding = {};
                userData.onboarding.hasSkippedTour = true;
                userData.onboarding.visitedModules = ['AdminDashboard', 'Settings', 'AssignRole', 'AddEntryPage', 'ApprovalDashboard', 'AssignTaskPage', 'InventoryPage', 'VoiceAssistant', 'AuditLogsPage', 'ProjectDetailPage', 'FinancialReport', 'SubscriptionPage', 'HomeScreen'];
              }
            } catch (e) {}
          }

          setUser(userData);
          localStorage.setItem('bt_user', JSON.stringify(userData));

          // Try to request Firebase token after successful login
          try {
            const { requestFirebaseToken } = await import('../api/firebaseConfig');
            await requestFirebaseToken();
          } catch (e) {
            console.warn("Could not load/request firebase token", e);
          }
        })
        .catch(() => {
          localStorage.removeItem('bt_token');
          localStorage.removeItem('bt_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const data = res.data;
    const t = data.token || data.accessToken;
    let u = data.user || data;
    
    // Set token immediately so subsequent API calls use the new token
    localStorage.setItem('bt_token', t);

    if (u && (!u.onboarding || !u.onboarding.visitedModules || u.onboarding.visitedModules.length === 0)) {
      try {
        const [pRes, tRes] = await Promise.all([
          projectAPI.getAll().catch(() => ({ data: [] })),
          transactionAPI.getAll().catch(() => ({ data: [] }))
        ]);
        const pList = pRes.data?.projects || pRes.data || [];
        const tList = tRes.data?.transactions || tRes.data?.data || tRes.data || [];
        
        if (pList.length > 0 || tList.length > 0) {
          if (!u.onboarding) u.onboarding = {};
          u.onboarding.hasSkippedTour = true;
          u.onboarding.visitedModules = ['AdminDashboard', 'Settings', 'AssignRole', 'AddEntryPage', 'ApprovalDashboard', 'AssignTaskPage', 'InventoryPage', 'VoiceAssistant', 'AuditLogsPage', 'ProjectDetailPage', 'FinancialReport', 'SubscriptionPage', 'HomeScreen'];
        }
      } catch (e) {}
    }

    localStorage.setItem('bt_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setLoading(false);
    window.dispatchEvent(new Event('userUpdated'));

    // Try to request Firebase token after successful login
    try {
      const { requestFirebaseToken } = await import('../api/firebaseConfig');
      await requestFirebaseToken();
    } catch (e) {
      console.warn("Could not load/request firebase token", e);
    }

    return u;
  }, []);

  const register = useCallback(async (name, email, password) => {
    localStorage.clear(); // Clear any stale data from previous accounts
    const res = await authAPI.register({ name, email, password });
    const data = res.data;
    const t = data.token || data.accessToken;
    const u = data.user || data;
    localStorage.setItem('bt_token', t);
    localStorage.setItem('bt_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    setLoading(false);
    window.dispatchEvent(new Event('userUpdated'));

    // Try to request Firebase token after successful register
    try {
      const { requestFirebaseToken } = await import('../api/firebaseConfig');
      await requestFirebaseToken();
    } catch (e) {
      console.warn("Could not load/request firebase token", e);
    }

    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('bt_user', JSON.stringify(updated));
    window.dispatchEvent(new Event('userUpdated'));
  }, [user]);

  const isAuthenticated = !!token;
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const can = useCallback((permission) => {
    const r = user?.role?.toLowerCase();
    if (r === 'admin' || r === 'supervisor') return true;
    const perms = user?.permissions || [];
    return perms.includes(permission);
  }, [user]);

  const value = useMemo(() => ({
    user, token, loading,
    isAuthenticated, isAdmin, can,
    login, register, logout, updateUser,
  }), [user, token, loading, isAuthenticated, isAdmin, can, login, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
