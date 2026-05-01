'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Wifi, WifiOff, LogIn } from 'lucide-react';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

/**
 * NotificationProvider — wraps the app and provides real-time monitoring:
 * - Polls /api/auth/me every 30s to verify the token is still valid
 * - Shows a toast and redirects to auth if the token expires
 * - Shows a "Connection restored" toast when coming back online
 */
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavStore((s) => s.navigate);

  const isOnlineRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasShownExpiredToast = useRef(false);

  // ── Token validity check ──────────────────────────────────────────

  const checkTokenValidity = useCallback(async () => {
    if (!accessToken || !isAuthenticated) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        // Token is expired or invalid
        if (!hasShownExpiredToast.current) {
          hasShownExpiredToast.current = true;
          toast.error('Session expired', {
            description: 'Your session has expired. Please log in again.',
            icon: <LogIn className="size-4" />,
            duration: 5000,
          });
        }
        logout();
        navigate('auth');
      } else {
        // Reset the flag if the token is still valid
        hasShownExpiredToast.current = false;
      }
    } catch {
      // Network error — don't log out, just skip
    }
  }, [accessToken, isAuthenticated, logout, navigate]);

  // ── Token polling on mount/unmount ────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkTokenValidity, 5000);

    // Poll every 30 seconds
    intervalRef.current = setInterval(checkTokenValidity, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, accessToken, checkTokenValidity]);

  // ── Online/offline detection ──────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      if (!isOnlineRef.current) {
        isOnlineRef.current = true;
        toast.success('Connection restored', {
          description: 'You are back online.',
          icon: <Wifi className="size-4" />,
          duration: 3000,
        });
        // Re-check token validity when coming back online
        checkTokenValidity();
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      toast.warning('You are offline', {
        description: 'Some features may not work properly.',
        icon: <WifiOff className="size-4" />,
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkTokenValidity]);

  return <>{children}</>;
}
