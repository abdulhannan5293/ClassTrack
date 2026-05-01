'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  ClipboardCheck,
  FilePlus,
  Megaphone,
  BarChart3,
  TrendingUp,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useNavStore } from '@/stores/nav-store';
import type { ClassroomTab } from '@/stores/nav-store';
import { toast } from 'sonner';

const easeOut = [0.22, 1, 0.36, 1] as const;

// ── Types ──────────────────────────────────────────────────────────

interface QuickAction {
  icon: typeof Plus;
  label: string;
  tab: ClassroomTab;
  gradient: string;
  shadowColor: string;
}

// ── Admin Actions ──────────────────────────────────────────────────

const ADMIN_ACTIONS: QuickAction[] = [
  {
    icon: ClipboardCheck,
    label: 'Take Attendance',
    tab: 'attendance',
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/30',
  },
  {
    icon: FilePlus,
    label: 'Create Assessment',
    tab: 'results',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/30',
  },
  {
    icon: Megaphone,
    label: 'Post Announcement',
    tab: 'announcements',
    gradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
    shadowColor: 'shadow-rose-500/30',
  },
  {
    icon: BarChart3,
    label: 'New Poll',
    tab: 'polls',
    gradient: 'bg-gradient-to-br from-teal-500 to-emerald-600',
    shadowColor: 'shadow-teal-500/30',
  },
];

// ── Student Actions ────────────────────────────────────────────────

const STUDENT_ACTIONS: QuickAction[] = [
  {
    icon: TrendingUp,
    label: 'View Grades',
    tab: 'grades',
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-500/30',
  },
  {
    icon: MessageSquare,
    label: 'Give Feedback',
    tab: 'feedback',
    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-500/30',
  },
  {
    icon: BookOpen,
    label: 'View Resources',
    tab: 'resources',
    gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    shadowColor: 'shadow-teal-500/30',
  },
];

// ── Main Component ─────────────────────────────────────────────────

export function QuickActionsPanel({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);

  const actions = isAdmin ? ADMIN_ACTIONS : STUDENT_ACTIONS;

  const handleAction = (action: QuickAction) => {
    setIsOpen(false);
    setClassroomTab(action.tab);
    toast.success(`Navigated to ${action.label}`);
  };

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────── */}
      <AnimatePresence mode="sync">
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'tween', duration: 0.2, ease: easeOut }}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Floating Actions ──────────────────────────────────────── */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col-reverse items-end gap-3">
        {/* Expanded Action Buttons */}
        <AnimatePresence mode="sync">
          {isOpen &&
            actions.map((action, idx) => {
              const Icon = action.icon;
              // Position buttons in a fan above the FAB
              const yOffset = -(idx + 1) * 56;

              return (
                <motion.div
                  key={action.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: yOffset, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{
                    type: 'tween',
                    duration: 0.3,
                    ease: easeOut,
                    delay: idx * 0.05,
                  }}
                  style={{ transformOrigin: 'bottom right' }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleAction(action)}
                        className={`h-10 px-3 gap-2 rounded-xl shadow-lg ${action.gradient} ${action.shadowColor} text-white hover:opacity-90 transition-opacity border-0`}
                      >
                        <Icon className="size-4" />
                        <span className="text-xs font-medium">{action.label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>{action.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* FAB Button */}
        <motion.button
          className={`relative flex items-center justify-center size-14 rounded-full shadow-lg transition-colors z-50 ${
            isOpen
              ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30'
              : 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
          }`}
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
        >
          {/* Pulse animation when closed */}
          {!isOpen && (
            <motion.span
              className="absolute inset-0 rounded-full bg-amber-400/40"
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
          )}

          <AnimatePresence mode="sync">
            {isOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ type: 'tween', duration: 0.2, ease: easeOut }}
              >
                <X className="size-6 text-white" />
              </motion.span>
            ) : (
              <motion.span
                key="plus"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ type: 'tween', duration: 0.2, ease: easeOut }}
              >
                <Plus className="size-6 text-white" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
}
