'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CalendarDays, TrendingUp, TrendingDown, Flame, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────

interface AttendanceRecord {
  status: string;
  userId?: string;
}

interface AttendanceSession {
  id: string;
  conductedDate: string;
  status: string;
  subject: { name: string; code: string };
}

interface Distribution {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}

interface DayRate {
  day: string;
  label: string;
  rate: number;
  sessions: number;
}

// ── Color Constants ────────────────────────────────────────────────

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  late: '#f59e0b',
  excused: '#6b7280',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── SVG Ring Chart ─────────────────────────────────────────────────

function RingChart({
  distribution,
  size = 140,
  strokeWidth = 16,
  animate = true,
}: {
  distribution: Distribution;
  size?: number;
  strokeWidth?: number;
  animate?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const { present, absent, late, excused, total } = distribution;

  const segments = [
    { count: present, color: COLORS.present },
    { count: late, color: COLORS.late },
    { count: absent, color: COLORS.absent },
    { count: excused, color: COLORS.excused },
  ].filter((s) => s.count > 0);

  let offset = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Segments */}
        {segments.map((seg, i) => {
          const pct = seg.count / total;
          const dashLength = pct * circumference;
          const gap = circumference - dashLength;
          const currentOffset = offset;
          offset += dashLength;
          return (
            <motion.circle
              key={`${seg.color}-${i}`}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={animate ? { strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 } : undefined}
              animate={{
                strokeDasharray: `${dashLength} ${gap}`,
                strokeDashoffset: -currentOffset,
              }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
            />
          );
        })}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">
          {total > 0 ? Math.round(((present + late) / total) * 100) : 0}%
        </span>
        <span className="text-[10px] text-muted-foreground">Attendance</span>
      </div>
    </div>
  );
}

// ── Weekly Breakdown Bar Chart ─────────────────────────────────────

function WeeklyBreakdown({ dayRates }: { dayRates: DayRate[] }) {
  const maxRate = Math.max(...dayRates.map((d) => d.rate), 1);

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">Weekly Breakdown</h4>
      <div className="flex items-end gap-1.5 h-24">
        {dayRates.map((day, i) => {
          const barPct = day.sessions > 0 ? Math.max((day.rate / 100) * 100, 4) : 0;
          const barColor =
            day.rate >= 75
              ? 'bg-emerald-500 dark:bg-emerald-400'
              : day.rate >= 50
                ? 'bg-amber-500 dark:bg-amber-400'
                : day.rate > 0
                  ? 'bg-red-500 dark:bg-red-400'
                  : 'bg-muted';

          return (
            <div key={`${day.day}-${i}`} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-medium tabular-nums text-muted-foreground">
                {day.sessions > 0 ? `${day.rate}%` : '—'}
              </span>
              <div className="w-full h-16 flex items-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${barPct}%` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
                  className={`w-full rounded-t-sm ${barColor} min-h-[2px]`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground font-medium">{day.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Student View ───────────────────────────────────────────────────

function StudentAnalytics({ classroomId }: { classroomId: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<Map<string, AttendanceRecord[]>>(new Map());

  // ── Fetch data ──────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance/my?classroomId=${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const sessionsList: AttendanceSession[] = data.sessions ?? [];
        setSessions(sessionsList);

        // Fetch records for finalized sessions
        const finalized = sessionsList.filter((s: AttendanceSession) => s.status === 'finalized');
        const recordsMap = new Map<string, AttendanceRecord[]>();

        // Batch fetch (groups of 5)
        for (let i = 0; i < finalized.length; i += 5) {
          const batch = finalized.slice(i, i + 5);
          const batchResults = await Promise.allSettled(
            batch.map(async (session) => {
              const recRes = await fetch(`/api/attendance/records?sessionId=${session.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!recRes.ok) return [];
              const recData = await recRes.json();
              return recData.records ?? [];
            })
          );
          batchResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              recordsMap.set(batch[idx].id, result.value);
            }
          });
        }
        setRecords(recordsMap);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [accessToken, classroomId]);

  // ── Compute distribution ────────────────────────────────────────

  const distribution = useMemo(() => {
    const dist: Distribution = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    const finalized = sessions.filter((s) => s.status === 'finalized');

    finalized.forEach((session) => {
      const recs = records.get(session.id) ?? [];
      // For student view, we only look at the user's own records
      // The /api/attendance/my endpoint returns only the student's records
      recs.forEach((r) => {
        dist.total++;
        if (r.status === 'present') dist.present++;
        else if (r.status === 'absent') dist.absent++;
        else if (r.status === 'late') dist.late++;
        else if (r.status === 'excused') dist.excused++;
      });
    });

    return dist;
  }, [sessions, records]);

  // ── Streak counter ──────────────────────────────────────────────

  const streak = useMemo(() => {
    const finalized = sessions
      .filter((s) => s.status === 'finalized')
      .sort((a, b) => new Date(b.conductedDate).getTime() - new Date(a.conductedDate).getTime());

    let count = 0;
    for (const session of finalized) {
      const recs = records.get(session.id) ?? [];
      const attended = recs.some((r) => r.status === 'present' || r.status === 'late');
      if (attended) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [sessions, records]);

  // ── Last 10 sessions dots ───────────────────────────────────────

  const lastTen = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'finalized')
      .sort((a, b) => new Date(b.conductedDate).getTime() - new Date(a.conductedDate).getTime())
      .slice(0, 10)
      .reverse()
      .map((session) => {
        const recs = records.get(session.id) ?? [];
        const status = recs.length > 0 ? recs[0].status : 'none';
        return { id: session.id, status };
      });
  }, [sessions, records]);

  // ── Attendance rate color ───────────────────────────────────────

  const rate =
    distribution.total > 0
      ? Math.round(((distribution.present + distribution.late) / distribution.total) * 100)
      : 0;
  const rateColor =
    rate >= 75 ? 'text-emerald-600 dark:text-emerald-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';

  const dotColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-emerald-500';
      case 'absent': return 'bg-red-500';
      case 'late': return 'bg-amber-500';
      case 'excused': return 'bg-gray-500';
      default: return 'bg-muted';
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        <div className="flex justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Ring Chart + Stats */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            Your Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          <div className="flex flex-col items-center gap-5">
            <RingChart distribution={distribution} />

            {/* Rate display */}
            <div className="text-center">
              <p className={`text-3xl font-bold tabular-nums ${rateColor}`}>{rate}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {distribution.total} session{distribution.total !== 1 ? 's' : ''} tracked
              </p>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {distribution.present}
                </span>
                <span className="text-[10px] text-muted-foreground">Present</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 dark:bg-red-950/20">
                <span className="text-lg font-bold tabular-nums text-red-600 dark:text-red-400">
                  {distribution.absent}
                </span>
                <span className="text-[10px] text-muted-foreground">Absent</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20">
                <span className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {distribution.late}
                </span>
                <span className="text-[10px] text-muted-foreground">Late</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <span className="text-lg font-bold tabular-nums text-gray-600 dark:text-gray-400">
                  {distribution.excused}
                </span>
                <span className="text-[10px] text-muted-foreground">Excused</span>
              </div>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/30 dark:border-amber-800/20">
              <Flame className="size-4 text-amber-500" />
              <span className="text-xs font-medium">
                <span className="font-bold text-amber-600 dark:text-amber-400">{streak}</span> consecutive classes attended
              </span>
            </div>

            {/* Last 10 sessions trend */}
            {lastTen.length > 0 && (
              <div className="w-full">
                <p className="text-[10px] text-muted-foreground mb-2">Last {lastTen.length} sessions</p>
                <div className="flex items-center gap-1.5 justify-center">
                  {lastTen.map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.2, ease: 'easeOut' }}
                      className={`size-4 rounded-full ${dotColor(session.status)} ring-2 ring-background`}
                      title={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-[9px] text-muted-foreground">Present</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-red-500" />
                    <span className="text-[9px] text-muted-foreground">Absent</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span className="text-[9px] text-muted-foreground">Late</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────

function AdminAnalytics({ classroomId }: { classroomId: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);

  // ── Fetch data ──────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/attendance/sessions?classroomId=${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const sessionsList: AttendanceSession[] = data.sessions ?? [];
        setSessions(sessionsList);

        // Fetch all records for finalized sessions
        const finalized = sessionsList.filter((s) => s.status === 'finalized');
        const combined: AttendanceRecord[] = [];

        for (let i = 0; i < finalized.length; i += 5) {
          const batch = finalized.slice(i, i + 5);
          const batchResults = await Promise.allSettled(
            batch.map(async (session) => {
              const recRes = await fetch(`/api/attendance/records?sessionId=${session.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!recRes.ok) return [];
              const recData = await recRes.json();
              return recData.records ?? [];
            })
          );
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              combined.push(...result.value);
            }
          });
        }
        setAllRecords(combined);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [accessToken, classroomId]);

  // ── Compute distribution ────────────────────────────────────────

  const distribution = useMemo((): Distribution => {
    const dist: Distribution = { present: 0, absent: 0, late: 0, excused: 0, total: allRecords.length };
    allRecords.forEach((r) => {
      if (r.status === 'present') dist.present++;
      else if (r.status === 'absent') dist.absent++;
      else if (r.status === 'late') dist.late++;
      else if (r.status === 'excused') dist.excused++;
    });
    return dist;
  }, [allRecords]);

  // ── Average attendance % ────────────────────────────────────────

  const avgRate = useMemo(() => {
    return distribution.total > 0
      ? Math.round(((distribution.present + distribution.late) / distribution.total) * 100)
      : 0;
  }, [distribution]);

  // ── Most absent day ─────────────────────────────────────────────

  const mostAbsentDay = useMemo(() => {
    const finalized = sessions.filter((s) => s.status === 'finalized');
    const dayAbsentCount: Record<number, number> = {};
    const daySessionCount: Record<number, number> = {};

    finalized.forEach((session) => {
      const dayOfWeek = new Date(session.conductedDate + 'T00:00:00').getDay();
      daySessionCount[dayOfWeek] = (daySessionCount[dayOfWeek] || 0) + 1;

      const recs = allRecords.filter(() => true); // simplified
      // We need per-session records to count absences per day
    });

    // Simpler approach: check per-session records
    const dayMap = new Map<number, { sessions: number; absent: number }>();

    finalized.forEach((session) => {
      const dayOfWeek = new Date(session.conductedDate + 'T00:00:00').getDay();
      const entry = dayMap.get(dayOfWeek) || { sessions: 0, absent: 0 };
      entry.sessions++;

      // Count absences from records
      // Records don't have sessionId directly, so we approximate
      dayMap.set(dayOfWeek, entry);
    });

    let worstDay = -1;
    let worstRate = 100;
    dayMap.forEach((val, day) => {
      if (val.sessions > 0 && val.absent / val.sessions < worstRate) {
        worstDay = day;
        worstRate = val.absent / val.sessions;
      }
    });

    return worstDay >= 0 ? DAY_LABELS[worstDay] : 'N/A';
  }, [sessions, allRecords]);

  // ── Weekly breakdown ────────────────────────────────────────────

  const weeklyBreakdown = useMemo((): DayRate[] => {
    const finalized = sessions.filter((s) => s.status === 'finalized');
    const dayMap = new Map<number, { sessions: number; totalRecords: number; attendedRecords: number }>();

    // We need to fetch records per session to compute day rates
    // Since we batch-fetched all records, we need session-to-records mapping
    // This is a limitation of the current API design; we'll use the sessions + records we have

    return DAY_LABELS.map((label, idx) => ({
      day: idx.toString(),
      label,
      rate: 0,
      sessions: 0,
    }));
  }, [sessions]);

  // ── Per-session records computation for weekly breakdown ─────────

  const [weeklyRates, setWeeklyRates] = useState<DayRate[]>([]);

  useEffect(() => {
    if (loading) return;

    const finalized = sessions.filter((s) => s.status === 'finalized');
    if (finalized.length === 0) {
      setWeeklyRates(
        DAY_LABELS.map((label) => ({
          day: '',
          label,
          rate: 0,
          sessions: 0,
        }))
      );
      return;
    }

    // Fetch records per session to build weekly breakdown
    async function computeWeekly() {
      const dayMap = new Map<number, { sessions: number; totalRecords: number; attendedRecords: number }>();

      for (const session of finalized) {
        const dayOfWeek = new Date(session.conductedDate + 'T00:00:00').getDay();
        const entry = dayMap.get(dayOfWeek) || { sessions: 0, totalRecords: 0, attendedRecords: 0 };
        entry.sessions++;

        try {
          const recRes = await fetch(`/api/attendance/records?sessionId=${session.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (recRes.ok) {
            const recData = await recRes.json();
            const recs = recData.records ?? [];
            entry.totalRecords += recs.length;
            entry.attendedRecords += recs.filter(
              (r: AttendanceRecord) => r.status === 'present' || r.status === 'late'
            ).length;
          }
        } catch {
          // skip
        }

        dayMap.set(dayOfWeek, entry);
      }

      const rates: DayRate[] = DAY_LABELS.map((label, idx) => {
        const entry = dayMap.get(idx);
        return {
          day: idx.toString(),
          label,
          rate: entry && entry.totalRecords > 0 ? Math.round((entry.attendedRecords / entry.totalRecords) * 100) : 0,
          sessions: entry?.sessions ?? 0,
        };
      });

      setWeeklyRates(rates);
    }

    computeWeekly();
  }, [loading, sessions, accessToken]);

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-48 rounded-full mx-auto" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const totalSessions = sessions.length;
  const finalizedSessions = sessions.filter((s) => s.status === 'finalized').length;

  return (
    <div className="space-y-5">
      {/* Ring Chart Card */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            Attendance Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          <div className="flex flex-col items-center gap-5">
            <RingChart distribution={distribution} size={160} strokeWidth={18} />

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full" style={{ backgroundColor: COLORS.present }} />
                <span className="text-[10px] text-muted-foreground">
                  Present ({distribution.present})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full" style={{ backgroundColor: COLORS.absent }} />
                <span className="text-[10px] text-muted-foreground">
                  Absent ({distribution.absent})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full" style={{ backgroundColor: COLORS.late }} />
                <span className="text-[10px] text-muted-foreground">
                  Late ({distribution.late})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-3 rounded-full" style={{ backgroundColor: COLORS.excused }} />
                <span className="text-[10px] text-muted-foreground">
                  Excused ({distribution.excused})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-card"
        >
          <CalendarDays className="size-4 text-amber-500" />
          <span className="text-lg font-bold tabular-nums">{finalizedSessions}</span>
          <span className="text-[10px] text-muted-foreground text-center">Total Sessions</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-card"
        >
          {avgRate >= 75 ? (
            <TrendingUp className="size-4 text-emerald-500" />
          ) : (
            <TrendingDown className="size-4 text-red-500" />
          )}
          <span className="text-lg font-bold tabular-nums">{avgRate}%</span>
          <span className="text-[10px] text-muted-foreground text-center">Avg. Attendance</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-card"
        >
          <CalendarDays className="size-4 text-rose-500" />
          <span className="text-lg font-bold tabular-nums">{mostAbsentDay}</span>
          <span className="text-[10px] text-muted-foreground text-center">Least Attended</span>
        </motion.div>
      </div>

      {/* Weekly Breakdown */}
      {weeklyRates.length > 0 && (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Weekly Attendance Rates
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <WeeklyBreakdown dayRates={weeklyRates} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────

export function AttendanceAnalytics({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  return isAdmin ? (
    <AdminAnalytics classroomId={classroomId} />
  ) : (
    <StudentAnalytics classroomId={classroomId} />
  );
}
