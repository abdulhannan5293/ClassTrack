'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, Check, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  requestNotificationPermission,
  getNotificationStatus,
} from '@/lib/notification-helpers';

const DISMISSAL_KEY = 'classtrack-notif-prompt-dismissed';

type PromptState = 'idle' | 'loading' | 'granted' | 'denied';

function getInitialState(): PromptState {
  // If dismissed this session, stay idle and the component returns null
  if (typeof sessionStorage !== 'undefined') {
    const sessionDismissed = sessionStorage.getItem(DISMISSAL_KEY);
    if (sessionDismissed) return 'idle';
  }

  const perm = getNotificationStatus();
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'idle'; // 'default' or 'unsupported' → show the prompt
}

export function NotificationPermission() {
  const [status, setStatus] = useState<PromptState>(getInitialState);

  const isDismissed = useMemo(
    () =>
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(DISMISSAL_KEY) !== null,
    []
  );

  const isUnsupported = useMemo(
    () => getNotificationStatus() === 'unsupported',
    []
  );

  const handleEnable = useCallback(async () => {
    setStatus('loading');
    const granted = await requestNotificationPermission();
    if (granted) {
      setStatus('granted');
    } else {
      setStatus('denied');
    }
  }, []);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISSAL_KEY, 'true');
    // Re-read to force re-render
    setStatus('idle');
  }, []);

  // Don't render if already dismissed, or if notifications are unsupported
  if (isDismissed) return null;
  if (isUnsupported) return null;

  return (
    <AnimatePresence>
      {status === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-xl"
        >
          {/* Teal gradient background */}
          <div className="relative bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 p-4 shadow-lg shadow-teal-500/20">
            {/* Decorative shapes */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative flex items-center gap-3">
              {/* Animated bell icon */}
              <div className="flex items-center justify-center size-10 rounded-xl bg-white/20 shrink-0">
                <motion.div
                  animate={{ rotate: [0, 15, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <BellRing className="size-5 text-white" />
                </motion.div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  Enable Notifications
                </p>
                <p className="text-xs text-white/80 leading-snug mt-0.5">
                  Stay updated with announcements, results &amp; polls
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {status === 'loading' ? (
                  <div className="flex items-center gap-1.5 bg-white/20 rounded-lg px-3 h-8">
                    <motion.div
                      className="size-3.5 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleEnable}
                    className="bg-white text-teal-700 hover:bg-white/90 font-semibold shadow-sm rounded-lg h-8 px-4 text-xs"
                  >
                    Enable
                  </Button>
                )}

                <button
                  onClick={handleDismiss}
                  className="flex items-center justify-center size-7 rounded-lg hover:bg-white/15 transition-colors"
                  aria-label="Dismiss notification banner"
                >
                  <X className="size-4 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Brief success message */}
      {status === 'granted' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3"
        >
          <div className="flex items-center justify-center size-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Notifications enabled
          </p>
        </motion.div>
      )}

      {/* Denied state — subtle info message */}
      {status === 'denied' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2.5 rounded-xl border border-muted bg-muted/30 px-4 py-3"
        >
          <div className="flex items-center justify-center size-7 rounded-lg bg-muted">
            <Info className="size-4 text-muted-foreground" />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Notifications blocked in browser settings
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
