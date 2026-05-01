'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────

interface ClassroomInfo {
  id: string;
  name: string;
  department: string;
}

interface AttendanceStats {
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
}

// ── Animated Counter ───────────────────────────────────────────────

function AnimatedCounter({
  value,
  duration = 0.8,
  suffix = '',
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const stepTime = (duration * 1000) / Math.max(end, 1);
    const timer = setInterval(() => {
      start += 1;
      setDisplay(start);
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

// ── Progress Ring (SVG donut chart) ────────────────────────────────

function ProgressRing({
  percentage,
  size = 100,
  strokeWidth = 8,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 75) return { stroke: '#10b981', glow: 'rgba(16,185,129,0.2)' };
    if (pct >= 50) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.2)' };
    return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.2)' };
  };

  const colors = getColor(percentage);
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/50"
        />
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', type: 'tween' }}
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
        />
      </svg>
      {/* Center percentage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-bold tabular-nums"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4, type: 'tween' }}
        >
          <AnimatedCounter value={percentage} />
          <span className="text-xs font-medium text-muted-foreground">%</span>
        </motion.span>
        <span className="text-[9px] text-muted-foreground mt-0.5">Overall</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function DashboardAttendanceSummary() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const openClassroom = useNavStore((s) => s.openClassroom);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);

  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch attendance data ──────────────────────────────────────

  const fetchAttendanceSummary = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      // Step 1: Get user's classrooms
      const classroomsRes = await fetch('/api/classrooms', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!classroomsRes.ok) throw new Error('Failed to fetch classrooms');
      const classroomsData = await classroomsRes.json();
      const classrooms: ClassroomInfo[] = (classroomsData.classrooms ?? []).map(
        (c: { id: string; name: string; department: string }) => ({
          id: c.id,
          name: c.name,
          department: c.department,
        })
      );

      if (classrooms.length === 0) {
        setStats({ totalSessions: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0 });
        setLoading(false);
        return;
      }

      // Step 2: Fetch attendance for each classroom in parallel
      const allResults = await Promise.allSettled(
        classrooms.map(async (classroom) => {
          const res = await fetch(
            `/api/attendance/my?classroomId=${classroom.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!res.ok) return null;
          const data = await res.json();
          return data.sessions ?? data.records ?? [];
        })
      );

      // Step 3: Aggregate stats
      let totalSessions = 0;
      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;

      allResults.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        const records = result.value;

        records.forEach((record: { status?: string }) => {
          totalSessions += 1;
          const status = record.status?.toLowerCase() ?? '';
          if (status === 'present') present += 1;
          else if (status === 'absent') absent += 1;
          else if (status === 'late') late += 1;
          else if (status === 'excused') excused += 1;
        });
      });

      const attended = present + late;
      const percentage =
        totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

      setStats({ totalSessions, present, absent, late, excused, percentage });
    } catch {
      setError('Could not load attendance data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  // ── Navigate to attendance tab ─────────────────────────────────

  const handleViewDetails = useCallback(() => {
    // Navigate to first classroom's attendance tab
    openClassroom('__dashboard__');
    setClassroomTab('attendance');
  }, [openClassroom, setClassroomTab]);

  // ── Loading skeleton ───────────────────────────────────────────

  if (loading) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-5">
            <Skeleton className="size-[100px] rounded-full shrink-0" />
            <div className="flex-1 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error state ────────────────────────────────────────────────

  if (error) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="size-4 text-muted-foreground" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-4 text-center">
            <ShieldCheck className="size-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ────────────────────────────────────────────────

  if (!stats || stats.totalSessions === 0) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardCheck className="size-4 text-muted-foreground" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="flex items-center justify-center size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-2">
              <ClipboardCheck className="size-6 text-emerald-500/60" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">No attendance data yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Start attending classes to see your summary here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Color coding ───────────────────────────────────────────────

  const percentageColor =
    stats.percentage >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats.percentage >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  const percentageBg =
    stats.percentage >= 75
      ? 'bg-emerald-50 dark:bg-emerald-950/30'
      : stats.percentage >= 50
        ? 'bg-amber-50 dark:bg-amber-950/30'
        : 'bg-red-50 dark:bg-red-950/30';

  const statusBadge =
    stats.percentage >= 75
      ? { label: 'Good', variant: 'default' as const, className: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50' }
      : stats.percentage >= 50
        ? { label: 'Warning', variant: 'secondary' as const, className: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/50' }
        : { label: 'Critical', variant: 'destructive' as const, className: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-800/50' };

  // ── Stat items ─────────────────────────────────────────────────

  const statItems = [
    {
      icon: ClipboardCheck,
      label: 'Total Sessions',
      value: stats.totalSessions,
      color: 'text-muted-foreground',
      bg: 'bg-muted/50',
    },
    {
      icon: CheckCircle2,
      label: 'Present',
      value: stats.present,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      icon: XCircle,
      label: 'Absent',
      value: stats.absent,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/30',
    },
    {
      icon: Clock,
      label: 'Late',
      value: stats.late,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, type: 'tween' }}
    >
      <Card className="py-0 gap-0 overflow-hidden relative">
        {/* Top gradient accent */}
        <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500" />

        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardCheck className="size-4 text-amber-500" />
              Attendance Summary
            </CardTitle>
            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${statusBadge.className}`}>
              {statusBadge.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          <div className="flex items-center gap-5">
            {/* Donut Chart */}
            <div className="shrink-0">
              <ProgressRing percentage={stats.percentage} size={110} strokeWidth={10} />
            </div>

            {/* Quick Stats */}
            <div className="flex-1 space-y-2.5 min-w-0">
              {statItems.map((item, idx) => (
                <motion.div
                  key={item.label}
                  className="flex items-center justify-between gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + idx * 0.08, duration: 0.3, type: 'tween' }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex items-center justify-center size-6 rounded-md ${item.bg}`}>
                      <item.icon className={`size-3 ${item.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{item.label}</span>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${item.color}`}>
                    <AnimatedCounter value={item.value} duration={0.5 + idx * 0.1} />
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* View Details Link */}
          <motion.div
            className="mt-4 pt-3 border-t"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.3, type: 'tween' }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
              onClick={handleViewDetails}
            >
              <span>View Details</span>
              <ArrowRight className="size-3" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
