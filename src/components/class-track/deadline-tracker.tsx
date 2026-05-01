'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  isBefore,
  isAfter,
  differenceInDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from 'date-fns';
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  Calendar,
  Plus,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';
import { toast } from 'sonner';

const easeOut = [0.22, 1, 0.36, 1] as const;

// ── Types ──────────────────────────────────────────────────────────

interface Assessment {
  id: string;
  name: string;
  type: string;
  dateConducted: string;
  isPublished: boolean;
  subjectName?: string;
}

interface DeadlineGroup {
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  assessments: Assessment[];
}

// ── Container / Item Variants ─────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, duration: 0.3, ease: easeOut },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: 'tween' as const, duration: 0.3, ease: easeOut } },
};

// ── Helpers ───────────────────────────────────────────────────────

function getTypeBadge(type: string) {
  switch (type?.toLowerCase()) {
    case 'quiz':
      return { label: 'Quiz', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    case 'mid':
    case 'midterm':
      return { label: 'Mid', className: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200 dark:border-orange-800' };
    case 'final':
      return { label: 'Final', className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800' };
    case 'assignment':
      return { label: 'Assignment', className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border-teal-200 dark:border-teal-800' };
    case 'lab':
      return { label: 'Lab', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
    default:
      return { label: type || 'Assessment', className: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
  }
}

function getDaysRemainingBadge(daysLeft: number) {
  if (daysLeft < 0) {
    return { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-300 dark:border-red-800' };
  }
  if (daysLeft < 2) {
    return { label: `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`, className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-300 dark:border-red-800' };
  }
  if (daysLeft < 7) {
    return { label: `${daysLeft} days left`, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300 dark:border-amber-800' };
  }
  return { label: `${daysLeft} days left`, className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' };
}

function groupDeadlines(assessments: Assessment[]): DeadlineGroup[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(weekStart, 1);
  const nextWeekEnd = addWeeks(weekEnd, 1);

  const groups: DeadlineGroup[] = [
    { label: 'Overdue', color: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-400', bgColor: 'bg-red-50 dark:bg-red-950/20', assessments: [] },
    { label: 'This Week', color: 'text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/20', assessments: [] },
    { label: 'Next Week', color: 'text-teal-600 dark:text-teal-400', borderColor: 'border-l-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/20', assessments: [] },
    { label: 'Later', color: 'text-emerald-600 dark:text-emerald-400', borderColor: 'border-l-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/20', assessments: [] },
  ];

  assessments.forEach((a) => {
    const deadlineDate = new Date(a.dateConducted + 'T00:00:00');

    if (isBefore(deadlineDate, now)) {
      groups[0].assessments.push(a);
    } else if (
      (isAfter(deadlineDate, weekStart) || deadlineDate.getTime() === weekStart.getTime()) &&
      (isBefore(deadlineDate, weekEnd) || deadlineDate.getTime() === weekEnd.getTime())
    ) {
      groups[1].assessments.push(a);
    } else if (
      (isAfter(deadlineDate, nextWeekStart) || deadlineDate.getTime() === nextWeekStart.getTime()) &&
      (isBefore(deadlineDate, nextWeekEnd) || deadlineDate.getTime() === nextWeekEnd.getTime())
    ) {
      groups[2].assessments.push(a);
    } else {
      groups[3].assessments.push(a);
    }
  });

  // Remove empty groups
  return groups.filter((g) => g.assessments.length > 0);
}

// ── Main Component ─────────────────────────────────────────────────

export function DeadlineTracker({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accessToken || !classroomId) return;

    async function fetchAssessments() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch(
          `/api/results/assessments?classroomId=${classroomId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) throw new Error('Failed to fetch assessments');

        const data = await res.json();
        const allAssessments: Assessment[] = (data.assessments ?? [])
          .filter((a: Assessment) => !a.isPublished)
          .sort((a: Assessment, b: Assessment) =>
            new Date(a.dateConducted).getTime() - new Date(b.dateConducted).getTime()
          );

        setAssessments(allAssessments);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchAssessments();
  }, [accessToken, classroomId]);

  // ── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Upcoming Deadlines
            <Skeleton className="h-4 w-16 ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error State ──────────────────────────────────────────────────

  if (error) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-red-50 dark:bg-red-950/30 mb-3">
              <AlertTriangle className="size-5 text-red-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Could not load deadlines
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Empty State ──────────────────────────────────────────────────

  if (assessments.length === 0) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-3">
              <Calendar className="size-5 text-emerald-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              No upcoming deadlines
            </p>
            <p className="text-[10px] text-muted-foreground">
              All assessments have been published or none scheduled yet.
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 text-xs"
                onClick={() => {
                  setClassroomTab('results');
                  toast.info('Navigate to Results tab to create an assessment');
                }}
              >
                <Plus className="size-3.5" />
                Schedule Assessment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Group Deadlines ──────────────────────────────────────────────

  const grouped = groupDeadlines(assessments);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            Upcoming Deadlines
          </CardTitle>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[10px] px-2"
              onClick={() => {
                setClassroomTab('results');
                toast.info('Navigate to Results tab to create an assessment');
              }}
            >
              <Plus className="size-3" />
              Schedule
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {grouped.map((group) => (
            <motion.div key={group.label} variants={itemVariants}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold ${group.color}`}>
                  {group.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({group.assessments.length})
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-2">
                {group.assessments.map((assessment) => {
                  const deadlineDate = new Date(assessment.dateConducted + 'T00:00:00');
                  const daysLeft = differenceInDays(deadlineDate, new Date());
                  const typeBadge = getTypeBadge(assessment.type);
                  const daysBadge = getDaysRemainingBadge(daysLeft);
                  const relativeTime = daysLeft < 0
                    ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`
                    : daysLeft === 0
                      ? 'Today'
                      : `In ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;

                  return (
                    <motion.div
                      key={assessment.id}
                      className={`rounded-lg border border-l-4 ${group.borderColor} ${group.bgColor} px-3 py-2.5`}
                      variants={itemVariants}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <p className="text-xs font-medium truncate">{assessment.name}</p>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${typeBadge.className}`}>
                              {typeBadge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="size-3" />
                              {format(deadlineDate, 'MMM d, yyyy')}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ·
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {relativeTime}
                            </span>
                          </div>
                          {assessment.subjectName && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {assessment.subjectName}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${daysBadge.className}`}>
                          {daysBadge.label}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  );
}
