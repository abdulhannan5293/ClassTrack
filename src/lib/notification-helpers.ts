/**
 * Web Push API helpers for system-level push notifications.
 *
 * These helpers enable showing native OS notifications (not just in-app toast)
 * on both desktop browsers and mobile PWAs via the service worker.
 */

// ── Permission helpers ──────────────────────────────────────────────

/**
 * Request notification permission from the browser.
 * Returns true if granted, false if denied or unsupported.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

/**
 * Returns the current notification permission status.
 */
export function getNotificationStatus():
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'default' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ── Show notification helpers ───────────────────────────────────────

/**
 * Show a system-level notification via the service worker (if available)
 * or fall back to the Notification API directly.
 */
export function showSystemNotification(
  title: string,
  options?: NotificationOptions
) {
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return;

  // Prefer service worker for better background/mobile support
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: { title, ...options },
    });
  } else {
    new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      ...options,
    });
  }
}
