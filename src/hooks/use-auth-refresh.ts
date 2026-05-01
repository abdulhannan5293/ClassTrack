'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// Check token validity every 5 minutes and refresh when needed
const CHECK_INTERVAL = 5 * 60 * 1000;

export function useAuthRefresh() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !refreshToken) return;

    const tryRefresh = async () => {
      try {
        const res = await fetch('/api/auth/refresh-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
          logout();
          return;
        }

        const data = await res.json();
        if (user) {
          setAuth(user, data.accessToken, data.refreshToken);
        }
      } catch {
        // Silent fail - will retry on next interval
      }
    };

    // Start periodic refresh check
    intervalRef.current = setInterval(tryRefresh, CHECK_INTERVAL);

    // Also refresh on mount if authenticated
    tryRefresh();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, accessToken, refreshToken, logout, setAuth, user]);
}
