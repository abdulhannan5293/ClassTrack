'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Megaphone,
  Pin,
  AlertTriangle,
  Clock,
  Loader2,
  Activity,
  User,
  Inbox,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  postedById: string;
  posterRole: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  postedBy: { id: string; name: string; email: string };
}

interface ActivityFeedProps {
  classroomId: string;
  isAdmin: boolean;
}

// ── Priority helpers ───────────────────────────────────────────────

const priorityDotColor: Record<string, string> = {
  normal: 'bg-muted-foreground/40',
  important: 'bg-amber-500',
  urgent: 'bg-red-500',
};

const priorityBadgeClass: Record<string, string> = {
  normal: 'bg-muted text-muted-foreground hover:bg-muted',
  important:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40',
  urgent:
    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40',
};

const priorityLabel: Record<string, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
};

const priorityGlow: Record<string, string> = {
  normal: '',
  important: 'shadow-[0_0_8px_rgba(245,158,11,0.3)]',
  urgent: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]',
};

// ── Animation variants ─────────────────────────────────────────────

const timelineItemVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: 'easeOut' as const,
      delay: i * 0.06,
    },
  }),
  exit: { opacity: 0, x: -12, transition: { duration: 0.2 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

// ── Component ──────────────────────────────────────────────────────

export function ActivityFeed({ classroomId, isAdmin }: ActivityFeedProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch announcements ──────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    if (!accessToken || !classroomId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/announcements?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setAnnouncements(data.announcements ?? []);
    } catch {
      // Silently fail on dashboard - it's supplementary info
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Helpers ───────────────────────────────────────────────────────

  const renderRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const getPosterName = (a: Announcement) => {
    return a.postedBy.name || a.postedBy.email.split('@')[0] || 'Unknown';
  };

  // ── Loading skeleton ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="relative pl-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative">
              <Skeleton className="absolute -left-8 top-2 size-3 rounded-full" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────

  if (announcements.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-10 text-center"
      >
        <div className="relative mb-4">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/60">
            <Inbox className="size-7 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-sm font-semibold mb-1">No recent activity</h3>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          {isAdmin
            ? 'Post an announcement to start the activity feed.'
            : 'There are no announcements yet from your class representatives.'}
        </p>
      </motion.div>
    );
  }

  // ── Timeline render ──────────────────────────────────────────────

  const displayItems = announcements.slice(0, 10); // Show max 10 items

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center size-6 rounded-md bg-emerald-500/10">
          <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-sm font-semibold">Recent Activity</h2>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {announcements.length}
        </Badge>
      </div>

      {/* Timeline */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative pl-8 space-y-0"
      >
        {/* Vertical connecting line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        {displayItems.map((announcement, idx) => {
          const isLast = idx === displayItems.length - 1;
          return (
            <motion.div
              key={announcement.id}
              variants={timelineItemVariants}
              custom={idx}
              className="relative pb-5 last:pb-0"
            >
              {/* Timeline dot */}
              <div
                className={`absolute -left-8 top-3 size-[7px] rounded-full ring-[3px] ring-background transition-shadow duration-300 ${priorityDotColor[announcement.priority]} ${priorityGlow[announcement.priority]}`}
              />

              {/* Activity card */}
              <div
                className={`group rounded-lg border p-3 transition-all duration-200 hover:shadow-sm ${
                  announcement.isPinned
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30'
                    : announcement.priority === 'urgent'
                      ? 'bg-red-50/30 dark:bg-red-950/10 border-red-200/40 dark:border-red-800/20'
                      : 'bg-card'
                }`}
              >
                {/* Top row: badges + title */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {announcement.isPinned && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1 py-0 gap-0.5"
                        >
                          <Pin className="size-2.5" />
                          Pinned
                        </Badge>
                      )}
                      {announcement.priority !== 'normal' && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 gap-0.5 ${priorityBadgeClass[announcement.priority]}`}
                        >
                          <AlertTriangle className="size-2.5" />
                          {priorityLabel[announcement.priority]}
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold leading-snug line-clamp-2">
                      {announcement.title}
                    </h4>
                  </div>
                </div>

                {/* Content preview */}
                <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {announcement.content}
                </p>

                {/* Footer: poster info + timestamp */}
                <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center justify-center size-4 rounded-full bg-muted">
                      <User className="size-2.5 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {getPosterName(announcement)}
                    </span>
                    {isAdmin && announcement.posterRole && (
                      <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 h-3.5 leading-none"
                      >
                        {announcement.posterRole.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {renderRelativeTime(announcement.createdAt)}
                  </span>
                </div>
              </div>

              {/* Extend the line only if not the last item */}
              {!isLast && (
                <div className="absolute left-[11px] bottom-0 translate-y-1/2 w-px h-5 bg-border" />
              )}
            </motion.div>
          );
        })}

        {/* Show more indicator if there are more than 10 */}
        {announcements.length > 10 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: displayItems.length * 0.06 + 0.2 }}
            className="relative pl-0"
          >
            <div className="flex items-center justify-center py-2">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Megaphone className="size-2.5" />
                +{announcements.length - 10} more announcements
              </Badge>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
