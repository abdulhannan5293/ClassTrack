'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock,
  BookOpen,
  FlaskConical,
  Clock,
  Loader2,
  Coffee,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface TodayScheduleProps {
  classrooms: Array<{ id: string; name: string; department: string; userRole: string }>;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  type: string;
  classroomId: string;
  scheduleDays: number[];
  startTime: string | null;
  endTime: string | null;
}

interface ScheduledSubject extends Subject {
  classroomName: string;
  department: string;
}

// ── Constants ──────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

const SHORT_DAYS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

// JS Date.getDay() => 0=Sun, 1=Mon, ..., 6=Sat
// Our scheduleDays => 1=Mon, 2=Tue, ..., 7=Sun
function getTodayScheduleDay(): number {
  const jsDay = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  return jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon, ..., 7=Sun
}

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'No time set';
  if (start && end) return `${start} – ${end}`;
  return start || end || '—';
}

// Department border color mapping
function getDeptBorderClass(dept: string): string {
  if (dept === 'CE') return 'border-l-orange-400';
  if (dept === 'CS') return 'border-l-teal-400';
  return 'border-l-gray-400';
}

// Type color configuration
function getTypeConfig(type: string) {
  const t = type?.toUpperCase();
  if (t === 'LAB') {
    return {
      dot: 'bg-amber-500',
      badge: 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 dark:from-amber-900/40 dark:to-amber-900/20 dark:text-amber-300',
      icon: FlaskConical,
    };
  }
  return {
    dot: 'bg-teal-500',
    badge: 'bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 dark:from-teal-900/40 dark:to-teal-900/20 dark:text-teal-300',
    icon: BookOpen,
  };
}

// Department badge color
function getDeptBadgeClass(dept: string): string {
  if (dept === 'CE') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  if (dept === 'CS') return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
  return 'bg-muted text-muted-foreground';
}

// ── Animation variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -12, y: 4 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
  exit: { opacity: 0, x: -8, transition: { duration: 0.2 } },
};

// ── Loading Skeleton ───────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Gradient accent */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-teal-500" />
      <CardHeader className="pb-2 px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-6 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-stretch gap-3">
            {/* Time column */}
            <div className="flex flex-col items-center pt-1 w-16 shrink-0">
              <Skeleton className="size-2.5 rounded-full mb-1.5" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10 mt-0.5" />
            </div>
            {/* Vertical line */}
            <div className="w-px bg-border" />
            {/* Content */}
            <div className="flex-1 rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-10 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Empty State ────────────────────────────────────────────────────

function EmptySchedule() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-10 text-center"
    >
      {/* Relaxing illustration */}
      <div className="relative mb-5">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center size-20 rounded-2xl bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50 dark:from-teal-950/20 dark:via-emerald-950/15 dark:to-amber-950/20 border border-teal-200/40 dark:border-teal-800/20"
        >
          <Coffee className="size-9 text-teal-500 dark:text-teal-400" />
        </motion.div>
        {/* Sparkle decorations */}
        <motion.div
          animate={{ rotate: [0, 90, 180, 270, 360], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-2 -right-2 size-5 flex items-center justify-center"
        >
          <Sparkles className="size-4 text-amber-400 dark:text-amber-500" />
        </motion.div>
        <motion.div
          animate={{ rotate: [360, 270, 180, 90, 0], scale: [1, 0.7, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-1 -left-2 size-4 flex items-center justify-center"
        >
          <Sparkles className="size-3 text-teal-400 dark:text-teal-500" />
        </motion.div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-1">
        No classes scheduled for today
      </h3>
      <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
        {DAY_LABELS[getTodayScheduleDay()]} is all yours! Relax, study, or catch up on assignments.
      </p>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function TodaySchedule({ classrooms }: TodayScheduleProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [subjects, setSubjects] = useState<ScheduledSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // ── Fetch all subjects from all classrooms ───────────────────────

  const fetchSubjects = useCallback(async () => {
    if (!accessToken || classrooms.length === 0) {
      setLoading(false);
      setSubjects([]);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      // Fetch subjects for all classrooms in parallel
      const results = await Promise.allSettled(
        classrooms.map(async (classroom) => {
          const res = await fetch(`/api/subjects?classroomId=${classroom.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) throw new Error('Failed to fetch');

          const data = await res.json();
          const classroomSubjects: ScheduledSubject[] = (data.subjects ?? []).map((s: Subject) => ({
            ...s,
            classroomName: classroom.name,
            department: classroom.department,
          }));

          return classroomSubjects;
        })
      );

      // Collect all successful results
      const allSubjects: ScheduledSubject[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allSubjects.push(...result.value);
        }
      }

      setSubjects(allSubjects);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken, classrooms]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ── Filter & sort today's subjects ───────────────────────────────

  const todaySchedule = useMemo(() => {
    const todayDay = getTodayScheduleDay();

    // Filter subjects scheduled for today
    const todaySubjects = subjects.filter(
      (s) => Array.isArray(s.scheduleDays) && s.scheduleDays.includes(todayDay)
    );

    // Sort by startTime (nulls last), then by name
    return todaySubjects.sort((a, b) => {
      // Both have start times — compare
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      // Only a has start time — a comes first
      if (a.startTime && !b.startTime) return -1;
      // Only b has start time — b comes first
      if (!a.startTime && b.startTime) return 1;
      // Neither has start time — alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }, [subjects]);

  // ── Current time indicator ───────────────────────────────────────

  const now = new Date();
  const currentTimeStr = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // ── Render ──────────────────────────────────────────────────────

  // Loading state
  if (loading) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-6 rounded-md bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10">
          <CalendarClock className="size-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-sm font-semibold">Today&apos;s Schedule</h2>
        {todaySchedule.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {todaySchedule.length} class{todaySchedule.length !== 1 ? 'es' : ''}
          </Badge>
        )}
      </div>

      {/* Date subtitle */}
      <p className="text-xs text-muted-foreground -mt-1 pl-8">
        {formatTodayDate()} &middot; {currentTimeStr}
      </p>

      {/* Error state */}
      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-amber-200/50 dark:border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/10 p-4 text-center"
        >
          <p className="text-xs text-muted-foreground">
            Could not load today&apos;s schedule. It will retry when the page refreshes.
          </p>
        </motion.div>
      ) : todaySchedule.length === 0 ? (
        /* Empty state */
        <EmptySchedule />
      ) : (
        /* Timeline */
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative space-y-0"
        >
          {/* Vertical connecting line */}
          <div className="absolute left-[27px] top-3 bottom-3 w-px bg-gradient-to-b from-amber-300/50 via-teal-300/30 to-transparent dark:from-amber-500/30 dark:via-teal-500/20 dark:to-transparent" />

          <AnimatePresence mode="popLayout">
            {todaySchedule.map((subject, idx) => {
              const typeConfig = getTypeConfig(subject.type);
              const TypeIcon = typeConfig.icon;
              const deptBorder = getDeptBorderClass(subject.department);
              const deptBadge = getDeptBadgeClass(subject.department);
              const isLast = idx === todaySchedule.length - 1;
              const hasTime = !!subject.startTime || !!subject.endTime;

              return (
                <motion.div
                  key={`${subject.classroomId}-${subject.id}`}
                  variants={itemVariants}
                  custom={idx}
                  className={`relative flex items-stretch gap-3 ${!isLast ? 'pb-3' : ''}`}
                >
                  {/* ── Time Column ──────────────────────────────── */}
                  <div className="flex flex-col items-center w-14 shrink-0 pt-2.5">
                    {/* Colored dot on timeline */}
                    <div
                      className={`size-2.5 rounded-full ring-[3px] ring-background z-10 shrink-0 ${typeConfig.dot} shadow-sm`}
                    />
                    {/* Time range */}
                    <span className="text-[10px] font-mono font-medium text-muted-foreground mt-1.5 leading-tight text-center tabular-nums">
                      {subject.startTime || ''}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 leading-tight text-center tabular-nums">
                      {subject.endTime || ''}
                    </span>
                  </div>

                  {/* ── Content Card ─────────────────────────────── */}
                  <motion.div
                    whileHover={{ y: -1, transition: { duration: 0.2 } }}
                    className={`flex-1 rounded-lg border-l-[3px] ${deptBorder} border border-t-0 border-r border-b bg-card overflow-hidden transition-shadow duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20`}
                  >
                    <div className="p-3">
                      {/* Top row: subject name + badges */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold leading-snug truncate">
                            {subject.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] px-1.5 py-0 bg-muted/50"
                            >
                              {subject.code}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`gap-1 text-[10px] px-1.5 py-0 ${typeConfig.badge}`}
                            >
                              <TypeIcon className="size-2.5" />
                              {subject.type?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: department + classroom */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-medium ${deptBadge}`}
                        >
                          {subject.department}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground truncate">
                          {subject.classroomName}
                        </span>
                        {hasTime && (
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1 shrink-0">
                            <Clock className="size-2.5" />
                            <span className="font-mono tabular-nums">
                              {formatTimeRange(subject.startTime, subject.endTime)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
