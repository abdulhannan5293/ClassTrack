'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Clock,
  Minus,
  Loader2,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth-store';

const easeOut = [0.22, 1, 0.36, 1] as const;

// ── Types ──────────────────────────────────────────────────────────

interface AttendanceSession {
  id: string;
  conductedDate: string;
  status: string;
}

interface AttendanceRecord {
  status: string;
  session: AttendanceSession;
}

interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number;
  trend: 'improving' | 'declining' | 'stable';
  lastTenStatuses: ('present' | 'absent' | 'late' | 'excused')[];
}

// ── Progress Ring ──────────────────────────────────────────────────

function ProgressRing({ percentage, size = 100, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 75
      ? 'text-emerald-500'
      : percentage >= 50
        ? 'text-amber-500'
        : 'text-red-500';

  const trackColor =
    percentage >= 75
      ? 'stroke-emerald-200 dark:stroke-emerald-900/40'
      : percentage >= 50
        ? 'stroke-amber-200 dark:stroke-amber-900/40'
        : 'stroke-red-200 dark:stroke-red-900/40';

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className={trackColor}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={color}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: easeOut }}
      />
    </svg>
  );
}

// ── Animated Number ────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayed(value);
        clearInterval(timer);
      } else {
        setDisplayed(Math.round(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayed}%</span>;
}

// ── Status Dot ─────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    present: 'bg-emerald-500',
    absent: 'bg-red-500',
    late: 'bg-amber-500',
    excused: 'bg-gray-400',
  };

  return (
    <motion.span
      className={`block size-2.5 rounded-full ${colorMap[status] || 'bg-gray-300'}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'tween', duration: 0.3, ease: easeOut }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AttendanceSummaryWidget({ classroomId }: { classroomId: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accessToken || !classroomId) return;

    async function fetchData() {
      setLoading(true);
      setError(false);

      try {
        // Fetch sessions
        const sessionsRes = await fetch(
          `/api/attendance/sessions?classroomId=${classroomId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');
        const sessionsData = await sessionsRes.json();
        const sessions: AttendanceSession[] = sessionsData.sessions ?? [];

        // Fetch student's own attendance
        const myRes = await fetch(
          `/api/attendance/my?classroomId=${classroomId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!myRes.ok) throw new Error('Failed to fetch attendance');
        const myData = await myRes.json();
        const records: AttendanceRecord[] = myData.records ?? [];

        const finalizedSessions = sessions.filter((s) => s.status === 'finalized');
        const totalSessions = finalizedSessions.length;

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;

        records.forEach((r) => {
          switch (r.status) {
            case 'present': presentCount++; break;
            case 'absent': absentCount++; break;
            case 'late': lateCount++; break;
            case 'excused': excusedCount++; break;
          }
        });

        const attendanceRate = totalSessions > 0
          ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
          : 0;

        // Get last 10 session statuses (most recent first, sorted ascending for display)
        const sortedRecords = [...records]
          .sort((a, b) => new Date(a.session.conductedDate).getTime() - new Date(b.session.conductedDate).getTime());
        const lastTenStatuses = sortedRecords
          .slice(-10)
          .map((r) => r.status as 'present' | 'absent' | 'late' | 'excused');

        // Compute trend: compare recent half vs older half
        let trend: 'improving' | 'declining' | 'stable' = 'stable';
        if (lastTenStatuses.length >= 4) {
          const mid = Math.floor(lastTenStatuses.length / 2);
          const olderHalf = lastTenStatuses.slice(0, mid);
          const recentHalf = lastTenStatuses.slice(mid);

          const rateForHalf = (statuses: string[]) => {
            const good = statuses.filter((s) => s === 'present' || s === 'late').length;
            return statuses.length > 0 ? good / statuses.length : 0;
          };

          const olderRate = rateForHalf(olderHalf);
          const recentRate = rateForHalf(recentHalf);

          if (recentRate > olderRate + 0.1) trend = 'improving';
          else if (recentRate < olderRate - 0.1) trend = 'declining';
        }

        setStats({
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate,
          trend,
          lastTenStatuses,
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [accessToken, classroomId]);

  // ── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="size-[100px] rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error State ──────────────────────────────────────────────────

  if (error || !stats) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex items-center justify-center size-10 rounded-full bg-red-50 dark:bg-red-950/30 mb-3">
              <Activity className="size-5 text-red-500" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              Could not load attendance data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const rateColor =
    stats.attendanceRate >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.attendanceRate >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardContent className="p-4">
        <motion.div
          className="flex items-start gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'tween', duration: 0.3, ease: easeOut }}
        >
          {/* Progress Ring */}
          <div className="relative shrink-0">
            <ProgressRing percentage={stats.attendanceRate} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold tabular-nums ${rateColor}`}>
                <AnimatedNumber value={stats.attendanceRate} />
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 space-y-3 min-w-0">
            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {stats.presentCount}
                  </p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">Present</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 px-3 py-2">
                <X className="size-3.5 text-red-600 dark:text-red-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold tabular-nums text-red-700 dark:text-red-300">
                    {stats.absentCount}
                  </p>
                  <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Absent</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
                <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {stats.lateCount}
                  </p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Late</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-900/30 px-3 py-2">
                <Minus className="size-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold tabular-nums text-gray-700 dark:text-gray-300">
                    {stats.excusedCount}
                  </p>
                  <p className="text-[10px] text-gray-500/70 dark:text-gray-400/70">Excused</p>
                </div>
              </div>
            </div>

            {/* Trend Indicator + Last 10 Status Dots */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {stats.trend === 'improving' ? (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] gap-1 px-2 py-0.5">
                    <TrendingUp className="size-3" />
                    Improving
                  </Badge>
                ) : stats.trend === 'declining' ? (
                  <Badge className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800 text-[10px] gap-1 px-2 py-0.5">
                    <TrendingDown className="size-3" />
                    Declining
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                    Stable
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {stats.totalSessions} sessions
                </span>
              </div>

              {stats.lastTenStatuses.length > 0 && (
                <div className="flex items-center gap-1">
                  {stats.lastTenStatuses.map((status, idx) => (
                    <StatusDot key={idx} status={status} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
