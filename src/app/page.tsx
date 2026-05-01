'use client';

import { useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';
import { useAuthRefresh } from '@/hooks/use-auth-refresh';
import { ErrorBoundary } from '@/components/class-track/error-boundary';
import { AuthScreen } from '@/components/class-track/auth-screen';
import { Dashboard } from '@/components/class-track/dashboard';
import { ClassroomDetail } from '@/components/class-track/classroom-detail';
import { GPACalculator } from '@/components/class-track/gpa-calculator';
import { StudentViewWrapper } from '@/components/class-track/student-view-wrapper';
import { StudentProfile } from '@/components/class-track/student-profile';
import { StudentReportCard } from '@/components/class-track/student-report-card';
import { DeploymentGuide } from '@/components/class-track/deployment-guide';

const PAGE_VARIANTS = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const PAGE_TRANSITION = {
  duration: 0.2,
  ease: 'easeOut' as const,
};

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const view = useNavStore((s) => s.view);

  // Auto-refresh tokens to prevent session expiry
  useAuthRefresh();

  // On mount, if already authenticated, go to dashboard
  useEffect(() => {
    if (isAuthenticated && view === 'auth') {
      useNavStore.getState().navigate('dashboard');
    }
  }, [isAuthenticated, view]);

  // Register service worker for push notifications
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed — non-critical
      });
    }
  }, []);

  const renderView = useCallback(() => {
    switch (view) {
      case 'auth':
        return <AuthScreen />;
      case 'profile':
        return <StudentProfile />;
      case 'classroom':
        return <ClassroomDetail />;
      case 'gpa-calculator':
        return <GPACalculator />;
      case 'my-attendance':
        return <StudentViewWrapper mode="attendance" />;
      case 'my-results':
        return <StudentViewWrapper mode="results" />;
      case 'report':
        return <StudentReportCard />;
      case 'deploy':
        return <DeploymentGuide />;
      default:
        return <Dashboard />;
    }
  }, [view]);

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={view}
        variants={PAGE_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={PAGE_TRANSITION}
      >
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}
