'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, CalendarDays, Award } from 'lucide-react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface QuickStat {
  label: string;
  value: number;
  suffix?: string;
  icon: typeof Flame;
  gradient: string;
  iconBg: string;
  statusColor: string; // green, amber, red
}

// ── Animated Counter ──────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === display) return;

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / (duration * 1000);
      const progress = Math.min(elapsed, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    startRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, display]);

  return <span className="tabular-nums">{display}</span>;
}

// ── Mini Progress Ring ─────────────────────────────────────────────

function MiniProgressRing({
  percentage,
  color,
  size = 40,
  strokeWidth = 3.5,
}: {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted/40"
        strokeWidth={strokeWidth}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function QuickStatsWidget({ classrooms }: { classrooms: { id: string; userRole: string }[] }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!accessToken || classrooms.length === 0) return;
    setLoading(true);

    try {
      // Fetch attendance for the user
      const attendanceRes = await fetch('/api/attendance/my', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      let streak = 0;
      let avgRate = 0;
      let totalSessions = 0;
      let totalPresent = 0;
      let upcomingAssessments = 0;

      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        const records = data.records ?? [];

        if (records.length > 0) {
          // Calculate streak: consecutive days with at least one "present" or "late"
          const dates = [...new Set(
            records
              .filter((r: { status: string }) => r.status === 'present' || r.status === 'late')
              .map((r: { date: string }) => r.date)
          )].sort().reverse();

          let lastDate: Date | null = null;
          for (const dateStr of dates) {
            const date = new Date(dateStr + 'T00:00:00');
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!lastDate) {
              // First date should be today or yesterday
              const diff = today.getTime() - date.getTime();
              if (diff < 2 * 24 * 60 * 60 * 1000) {
                streak++;
                lastDate = date;
              }
            } else {
              const diff = lastDate.getTime() - date.getTime();
              if (diff <= 1 * 24 * 60 * 60 * 1000) {
                streak++;
                lastDate = date;
              } else {
                break;
              }
            }
          }

          // Calculate average attendance rate
          const presentCount = records.filter(
            (r: { status: string }) => r.status === 'present' || r.status === 'late'
          ).length;
          totalSessions = records.length;
          totalPresent = presentCount;
          avgRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;
        }
      }

      // Fetch upcoming assessments count
      try {
        for (const classroom of classrooms) {
          const res = await fetch(
            `/api/results/assessments?classroomId=${classroom.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const assessments = data.assessments ?? [];
            const now = new Date();
            upcomingAssessments += assessments.filter(
              (a: { isPublished: boolean; dateConducted: string | null }) =>
                !a.isPublished && a.dateConducted && new Date(a.dateConducted) > now
            ).length;
          }
        }
      } catch {
        // Silently fail
      }

      // Calculate rank (based on avgRate)
      let rank = '-';
      let rankSuffix = '';
      if (avgRate >= 90) { rank = 'A'; rankSuffix = '+'; }
      else if (avgRate >= 80) { rank = 'A'; }
      else if (avgRate >= 70) { rank = 'B'; rankSuffix = '+'; }
      else if (avgRate >= 60) { rank = 'B'; }
      else if (avgRate >= 50) { rank = 'C'; }
      else { rank = 'D'; }

      const getStatusColor = (val: number, thresholds: [number, number] = [75, 50]): string => {
        if (val >= thresholds[0]) return 'emerald';
        if (val >= thresholds[1]) return 'amber';
        return 'red';
      };

      setStats([
        {
          label: 'Attendance Streak',
          value: streak,
          suffix: ' days',
          icon: Flame,
          gradient: 'from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10',
          iconBg: 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400',
          statusColor: streak >= 3 ? 'emerald' : streak >= 1 ? 'amber' : 'red',
        },
        {
          label: 'Attendance Grade',
          value: 0,
          displayValue: `${rank}${rankSuffix}`,
          icon: Trophy,
          gradient: 'from-teal-50 to-emerald-50/50 dark:from-teal-950/20 dark:to-emerald-950/10',
          iconBg: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400',
          statusColor: getStatusColor(avgRate),
          percentage: avgRate,
        },
        {
          label: 'Upcoming Tests',
          value: upcomingAssessments,
          icon: CalendarDays,
          gradient: 'from-amber-50 to-yellow-50/50 dark:from-amber-950/20 dark:to-yellow-950/10',
          iconBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
          statusColor: upcomingAssessments <= 2 ? 'emerald' : upcomingAssessments <= 5 ? 'amber' : 'red',
        },
        {
          label: 'Attendance Rate',
          value: avgRate,
          suffix: '%',
          icon: Award,
          gradient: 'from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10',
          iconBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
          statusColor: getStatusColor(avgRate),
          percentage: avgRate,
        },
      ]);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, classrooms]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statusColors: Record<string, string> = {
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-3 gap-0">
            <CardContent className="px-3 pt-0 pb-0">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <Card className={`py-3 gap-0 overflow-hidden relative hover:shadow-md transition-all duration-200 bg-gradient-to-br ${stat.gradient}`}>
            <CardContent className="px-3 pt-0 pb-0">
              <div className="flex items-start gap-2">
                {/* Icon + Progress Ring */}
                <div className="relative shrink-0">
                  <div className={`flex items-center justify-center size-8 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className="size-4" />
                  </div>
                  {stat.percentage !== undefined && (
                    <div className="absolute -inset-1">
                      <MiniProgressRing
                        percentage={stat.percentage}
                        color={statusColors[stat.statusColor]}
                        size={40}
                        strokeWidth={3}
                      />
                    </div>
                  )}
                </div>

                {/* Value */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight font-medium truncate">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-lg font-bold">
                      {'displayValue' in stat && stat.displayValue ? (
                        <AnimatedNumber value={stat.value} />
                      ) : (
                        <AnimatedNumber value={stat.value} />
                      )}
                    </span>
                    {stat.suffix && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: statusColors[stat.statusColor] }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {stat.statusColor === 'emerald' ? 'Good' : stat.statusColor === 'amber' ? 'Average' : 'Needs attention'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
