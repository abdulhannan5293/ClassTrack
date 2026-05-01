'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  showSystemNotification,
  getNotificationStatus,
} from '@/lib/notification-helpers';

// ── Types ──────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: 'announcement' | 'result' | 'poll' | 'discussion' | 'attendance';
  title: string;
  body: string;
  classroomId: string;
  classroomName: string;
  timestamp: string;
}

// ── Seen-notification tracking (sessionStorage) ─────────────────────

function getSeenNotifications(): Set<string> {
  try {
    const stored = sessionStorage.getItem('classtrack-seen-notifications');
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

function markAsSeen(id: string) {
  const seen = getSeenNotifications();
  seen.add(id);
  sessionStorage.setItem(
    'classtrack-seen-notifications',
    JSON.stringify([...seen])
  );
}

// ── Hook ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Polls the server for new notifications and shows system-level
 * push notifications for unseen items.
 *
 * @param classroomId — Optional: only check notifications for a specific classroom.
 *                     When omitted, checks all classrooms the user belongs to.
 */
export function usePushNotifications(classroomId?: string | null) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkForNotifications = useCallback(async () => {
    if (!accessToken || !isAuthenticated) return;
    if (getNotificationStatus() !== 'granted') return;

    try {
      const url = classroomId
        ? `/api/notifications/check?classroomId=${classroomId}`
        : '/api/notifications/check';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;

      const data = await res.json();
      const notifications: NotificationItem[] = data.notifications ?? [];
      const seen = getSeenNotifications();

      for (const notif of notifications) {
        if (!seen.has(notif.id)) {
          showSystemNotification(
            `${notif.classroomName}: ${notif.title}`,
            {
              body: notif.body,
              tag: `classtrack-${notif.id}`,
              data: { url: '/', classroomId: notif.classroomId },
            }
          );
          markAsSeen(notif.id);
        }
      }
    } catch {
      // Silent fail — notifications are non-critical
    }
  }, [accessToken, isAuthenticated, classroomId]);

  useEffect(() => {
    if (!isAuthenticated || getNotificationStatus() !== 'granted') return;

    // Check immediately on mount
    checkForNotifications();

    // Then poll periodically
    intervalRef.current = setInterval(checkForNotifications, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, checkForNotifications]);
}
