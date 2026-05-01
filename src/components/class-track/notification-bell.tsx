'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Megaphone,
  ExternalLink,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

// ── Types ──────────────────────────────────────────────────────────

interface Classroom {
  id: string;
  name: string;
  department: string;
  sessionYear: string;
  inviteCode: string;
  studentCount: number;
  claimedCount: number;
  userRole: string;
}

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
  _classroomName?: string;
  _classroomDepartment?: string;
}

// ── Priority helpers ───────────────────────────────────────────────

const priorityDotColor: Record<string, string> = {
  normal: 'bg-muted-foreground/40',
  important: 'bg-amber-500',
  urgent: 'bg-red-500',
};

const priorityAccentBorder: Record<string, string> = {
  normal: 'border-l-muted-foreground/30',
  important: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

const priorityUnreadBg: Record<string, string> = {
  normal: 'bg-gradient-to-r from-muted/50 to-transparent',
  important: 'bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-950/20',
  urgent: 'bg-gradient-to-r from-red-50/60 to-transparent dark:from-red-950/20',
};

// ── Animation variants ─────────────────────────────────────────────

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const, delay: i * 0.03 },
  }),
};

const badgeVariants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.15, 1],
    transition: { duration: 0.4, ease: 'easeInOut' as const },
  },
};

// ── Component ──────────────────────────────────────────────────────

export function NotificationBell() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const openClassroom = useNavStore((s) => s.openClassroom);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const hasFetched = useRef(false);

  const unreadCount = unreadIds.size;

  // ── Close dropdown on outside click ──────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // ── Fetch notifications ──────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      // Step 1: Get all classrooms
      const classroomsRes = await fetch('/api/classrooms', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!classroomsRes.ok) return;

      const classroomsData = await classroomsRes.json();
      const classrooms: Classroom[] = classroomsData.classrooms ?? [];

      if (classrooms.length === 0) {
        setNotifications([]);
        return;
      }

      // Step 2: Fetch announcements for each classroom in parallel
      const announcementPromises = classrooms.map(async (classroom) => {
        try {
          const res = await fetch(
            `/api/announcements?classroomId=${classroom.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return [];
          const data = await res.json();
          return (data.announcements ?? []).map((a: Announcement) => ({
            ...a,
            _classroomName: classroom.name,
            _classroomDepartment: classroom.department,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(announcementPromises);
      const allAnnouncements = results.flat();

      // Sort by date desc (most recent first)
      allAnnouncements.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Take top 20
      const top20 = allAnnouncements.slice(0, 20);

      setNotifications(top20);
      // Mark all as unread on first fetch
      if (!hasFetched.current) {
        setUnreadIds(new Set(top20.map((a) => a.id)));
        hasFetched.current = true;
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // ── Mark all as read ─────────────────────────────────────────────

  const markAllRead = () => {
    setUnreadIds(new Set());
  };

  // ── Mark single as read on click ─────────────────────────────────

  const handleNotificationClick = (notification: Announcement) => {
    // Mark as read
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(notification.id);
      return next;
    });

    // Navigate to the classroom announcements tab
    openClassroom(notification.classroomId);
    setClassroomTab('announcements');
    setIsOpen(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────

  const renderRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // ── Render ───────────────────────────────────────────────────────

  return (
    <>
      {/* Bell Button */}
      <Button
        ref={bellButtonRef}
        variant="ghost"
        size="icon"
        className="size-8 relative"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <AnimatePresence mode="wait">
          {unreadCount > 0 ? (
            <motion.div
              key="bell-ring"
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 15, -10, 0] }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <BellRing className="size-4 text-amber-600 dark:text-amber-400" />
            </motion.div>
          ) : (
            <motion.div key="bell" initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
              <Bell className="size-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated badge counter */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              variants={badgeVariants}
              key={unreadCount}
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none ring-2 ring-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </Button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-14 right-2 sm:right-auto sm:left-1/2 sm:translate-x-[-30%] z-50 w-[calc(100vw-1rem)] sm:w-96"
          >
            <div className="rounded-xl border bg-card/95 backdrop-blur-xl shadow-xl shadow-black/10 overflow-hidden">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-muted/40 to-transparent">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[9px] px-1.5 py-0 h-4"
                    >
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={markAllRead}
                  >
                    <CheckCheck className="size-3" />
                    Mark all read
                  </Button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Skeleton className="size-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-2.5 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-3">
                      <Inbox className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      No notifications yet
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Announcements from your classrooms will appear here
                    </p>
                  </div>
                ) : (
                  <motion.div initial="hidden" animate="visible">
                    {notifications.map((notification, idx) => {
                      const isUnread = unreadIds.has(notification.id);
                      return (
                        <motion.button
                          key={notification.id}
                          variants={itemVariants}
                          custom={idx}
                          initial="hidden"
                          animate="visible"
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-4 py-3 transition-colors duration-150 border-l-2 hover:bg-accent/50 ${
                            isUnread
                              ? `${priorityAccentBorder[notification.priority]} ${priorityUnreadBg[notification.priority]}`
                              : 'border-l-transparent'
                          } ${idx !== notifications.length - 1 ? 'border-b border-border/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Priority dot */}
                            <div className="flex items-center justify-center size-6 rounded-full bg-muted shrink-0 mt-0.5">
                              {notification.isPinned ? (
                                <Megaphone className="size-3 text-amber-600 dark:text-amber-400" />
                              ) : notification.priority === 'urgent' ? (
                                <AlertTriangle className="size-3 text-red-500" />
                              ) : (
                                <div
                                  className={`size-2 rounded-full ${priorityDotColor[notification.priority]}`}
                                />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                <span
                                  className={`text-xs font-semibold leading-tight truncate ${isUnread ? '' : 'text-muted-foreground'}`}
                                >
                                  {notification.title}
                                </span>
                              </div>
                              {notification._classroomName && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 h-4 gap-0.5 mb-1"
                                >
                                  {notification._classroomName}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <Clock className="size-2.5 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground">
                                  {renderRelativeTime(notification.createdAt)}
                                </span>
                                {isUnread && (
                                  <div className="size-1.5 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>

                            {/* Unread indicator */}
                            {isUnread && (
                              <div className="flex items-center justify-center size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </div>

              {/* Dropdown Footer */}
              {notifications.length > 0 && (
                <>
                  <Separator />
                  <div className="px-4 py-2.5 bg-muted/20">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center gap-1.5 w-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      View all in classrooms
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
