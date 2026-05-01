'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Extend BeforeInstallPromptEvent for TypeScript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISSAL_KEY = 'classtrack-pwa-dismissed';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // Check if the prompt was dismissed this session
  useEffect(() => {
    const sessionDismissed = sessionStorage.getItem(DISMISSAL_KEY);
    if (sessionDismissed) {
      return; // Already dismissed this session, don't show
    }

    const handler = (e: Event) => {
      // Prevent the default mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so the dashboard renders first
      setTimeout(() => setVisible(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        // User installed — hide the banner permanently
        setVisible(false);
        setDeferredPrompt(null);
      }
    } catch {
      // Prompt failed or was ignored, hide banner
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    sessionStorage.setItem(DISMISSAL_KEY, 'true');
  }, []);

  // Listen for successful install (in case user installs via browser menu)
  useEffect(() => {
    const handler = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-xl"
        >
          {/* Amber gradient background */}
          <div className="relative bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 p-4 shadow-lg shadow-amber-500/20">
            {/* Decorative shape */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full pointer-events-none" />

            <div className="relative flex items-center gap-3">
              {/* Icon */}
              <div className="flex items-center justify-center size-10 rounded-xl bg-white/20 shrink-0">
                <Download className="size-5 text-white" />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">
                  Install ClassTrack
                </p>
                <p className="text-xs text-white/80 leading-snug mt-0.5">
                  Add to home screen for quick access
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-white text-amber-700 hover:bg-white/90 font-semibold shadow-sm rounded-lg h-8 px-4 text-xs"
                >
                  Install
                </Button>

                <button
                  onClick={handleDismiss}
                  className="flex items-center justify-center size-7 rounded-lg hover:bg-white/15 transition-colors"
                  aria-label="Dismiss install banner"
                >
                  <X className="size-4 text-white/70" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
