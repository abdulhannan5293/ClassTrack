'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Trophy,
  Medal,
  Users,
  TrendingUp,
  Crown,
  Loader2,
  BarChart3,
  Award,
  Flame,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface StudentLeaderboardProps {
  classroomId: string;
  isAdmin: boolean;
}

interface RosterEntry {
  id: string;
  rollNumber: number;
  fullRollDisplay: string;
  name: string;
  userId: string | null;
  claimedAt: string | null;
}

interface LeaderboardStudent {
  rank: number;
  rosterEntryId: string;
  name: string;
  rollNumber: number;
  fullRollDisplay: string;
  userId: string | null;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  attendancePct: number;
}

// ── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAttendanceColor(pct: number) {
  if (pct >= 75) return 'emerald';
  if (pct >= 50) return 'amber';
  return 'red';
}

function getAttendanceBarColor(pct: number) {
  if (pct >= 75)
    return 'bg-emerald-500 dark:bg-emerald-400';
  if (pct >= 50)
    return 'bg-amber-500 dark:bg-amber-400';
  return 'bg-red-500 dark:bg-red-400';
}

function getAttendanceTrackColor(pct: number) {
  if (pct >= 75)
    return 'bg-emerald-100 dark:bg-emerald-950/30';
  if (pct >= 50)
    return 'bg-amber-100 dark:bg-amber-950/30';
  return 'bg-red-100 dark:bg-red-950/30';
}

function getAttendanceTextColor(pct: number) {
  if (pct >= 75)
    return 'text-emerald-700 dark:text-emerald-300';
  if (pct >= 50)
    return 'text-amber-700 dark:text-amber-300';
  return 'text-red-700 dark:text-red-300';
}

// ── Animation Variants ─────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const podiumVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'tween',
      delay: i * 0.12 + 0.1,
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1],
    },
  }),
};

// ── Component ──────────────────────────────────────────────────────

export function StudentLeaderboard({ classroomId, isAdmin }: StudentLeaderboardProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [students, setStudents] = useState<LeaderboardStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch data ──────────────────────────────────────────────────

  const fetchLeaderboard = useCallback(async () => {
    if (!accessToken || !classroomId) return;

    setLoading(true);
    setError('');

    try {
      // 1. Fetch roster
      const rosterRes = await fetch(`/api/classrooms/${classroomId}/roster`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!rosterRes.ok) throw new Error('Failed to fetch roster');
      const rosterData = await rosterRes.json();
      const roster: RosterEntry[] = rosterData.roster ?? [];

      if (roster.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 2. Fetch all finalized sessions
      const sessionsRes = await fetch(
        `/api/attendance/sessions?classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');
      const sessionsData = await sessionsRes.json();
      const allSessions = sessionsData.sessions ?? [];

      // Filter only finalized sessions
      const finalizedSessions = allSessions.filter(
        (s: { status: string }) => s.status === 'finalized'
      );

      if (finalizedSessions.length === 0) {
        // No finalized sessions — all students have 0%
        const mapped: LeaderboardStudent[] = roster
          .filter((entry) => entry.userId !== null)
          .map((entry, idx) => ({
            rank: idx + 1,
            rosterEntryId: entry.id,
            name: entry.name,
            rollNumber: entry.rollNumber,
            fullRollDisplay: entry.fullRollDisplay,
            userId: entry.userId,
            totalSessions: 0,
            presentCount: 0,
            lateCount: 0,
            attendancePct: 0,
          }));
        setStudents(mapped);
        setLoading(false);
        return;
      }

      // 3. For each finalized session, fetch records
      // Batch them in groups of 5 to avoid overwhelming the server
      const attendanceMap = new Map<string, { present: number; late: number; total: number }>();

      // Initialize attendance map from roster
      roster
        .filter((entry) => entry.userId !== null)
        .forEach((entry) => {
          attendanceMap.set(entry.userId!, { present: 0, late: 0, total: 0 });
        });

      // Process sessions in batches of 5
      for (let i = 0; i < finalizedSessions.length; i += 5) {
        const batch = finalizedSessions.slice(i, i + 5);
        const recordResults = await Promise.allSettled(
          batch.map(async (session: { id: string }) => {
            const recRes = await fetch(
              `/api/attendance/records?sessionId=${session.id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!recRes.ok) return [];
            const recData = await recRes.json();
            return recData.records ?? [];
          })
        );

        for (const result of recordResults) {
          if (result.status !== 'fulfilled') continue;
          const records = result.value;
          for (const record of records) {
            const userId = record.userId;
            if (!userId || !attendanceMap.has(userId)) continue;
            const entry = attendanceMap.get(userId)!;
            entry.total += 1;
            if (record.status === 'present') entry.present += 1;
            if (record.status === 'late') entry.late += 1;
          }
        }
      }

      // 4. Build leaderboard
      const leaderboard: LeaderboardStudent[] = roster
        .filter((entry) => entry.userId !== null)
        .map((entry) => {
          const att = attendanceMap.get(entry.userId!) ?? {
            present: 0,
            late: 0,
            total: 0,
          };
          const effectivePresent = att.present + att.late;
          const pct = att.total > 0 ? Math.round((effectivePresent / att.total) * 100) : 0;
          return {
            rank: 0,
            rosterEntryId: entry.id,
            name: entry.name,
            rollNumber: entry.rollNumber,
            fullRollDisplay: entry.fullRollDisplay,
            userId: entry.userId,
            totalSessions: att.total,
            presentCount: att.present,
            lateCount: att.late,
            attendancePct: pct,
          };
        });

      // Sort by attendance percentage descending, then by present count, then by name
      leaderboard.sort((a, b) => {
        if (b.attendancePct !== a.attendancePct)
          return b.attendancePct - a.attendancePct;
        if (b.presentCount + b.lateCount !== a.presentCount + a.lateCount)
          return (b.presentCount + b.lateCount) - (a.presentCount + a.lateCount);
        return a.name.localeCompare(b.name);
      });

      // Assign ranks
      leaderboard.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      // Limit to top 20
      setStudents(leaderboard.slice(0, 20));
    } catch {
      setError('Failed to load leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // ── Computed stats ──────────────────────────────────────────────

  const stats = useMemo(() => {
    if (students.length === 0) {
      return { avgPct: 0, highestName: '—', highestPct: 0, totalTracked: 0 };
    }

    const totalPct = students.reduce((sum, s) => sum + s.attendancePct, 0);
    const avgPct = Math.round(totalPct / students.length);

    const highest = students.reduce((best, s) =>
      s.attendancePct > best.attendancePct ? s : best
    );
    const hasData = students.some((s) => s.totalSessions > 0);

    return {
      avgPct,
      highestName: hasData ? highest.name : '—',
      highestPct: hasData ? highest.attendancePct : 0,
      totalTracked: students.length,
    };
  }, [students]);

  const topThree = students.slice(0, 3);
  const remaining = students.slice(3);

  // ── Loading skeleton ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="py-3 gap-0">
              <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Podium skeleton */}
        <div className="grid grid-cols-3 gap-3 items-end">
          {[1, 0, 2].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className={`h-24 w-full rounded-xl ${i === 1 ? 'h-32' : ''}`} />
            </div>
          ))}
        </div>

        {/* List skeleton */}
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────

  if (error) {
    return (
      <Card className="py-0">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10 mb-3">
            <BarChart3 className="size-6 text-destructive" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────

  if (students.length === 0) {
    return (
      <Card className="py-0">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex items-center justify-center size-16 rounded-full bg-amber-50 dark:bg-amber-950/30 mb-4"
          >
            <Trophy className="size-8 text-amber-500" />
          </motion.div>
          <h3 className="text-sm font-semibold mb-1">No Students Yet</h3>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            Add students to the roster and start marking attendance to see the leaderboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── No attendance data state ────────────────────────────────────

  const hasNoAttendance = students.every((s) => s.totalSessions === 0);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Summary Stats ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-3 gap-3"
      >
        <Card className="py-3 gap-0 overflow-hidden">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <TrendingUp className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xl font-bold tabular-nums">{stats.avgPct}%</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Avg. Attendance</span>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0 overflow-hidden">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Crown className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-bold tabular-nums leading-tight max-w-full truncate px-1">
              {stats.highestName}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {hasNoAttendance ? 'Top Student' : `${stats.highestPct}%`}
            </span>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0 overflow-hidden">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Users className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xl font-bold tabular-nums">{stats.totalTracked}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Tracked</span>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── No Attendance Notice ───────────────────────────────── */}
      {hasNoAttendance && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center"
        >
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Attendance tracking hasn&apos;t started yet. Finalize sessions to see rankings.
          </p>
        </motion.div>
      )}

      {/* ── Top 3 Podium ───────────────────────────────────────── */}
      {!hasNoAttendance && topThree.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="flex items-end justify-center gap-3 pt-2 pb-1"
        >
          {/* Order: #2, #1, #3 for podium layout */}
          {[topThree[1], topThree[0], topThree[2]].map((student, displayIdx) => {
            if (!student) return null;
            const actualRank = student.rank;
            const isFirst = actualRank === 1;
            const isSecond = actualRank === 2;
            const isThird = actualRank === 3;

            const gradientBg = isFirst
              ? 'bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100/50 dark:from-amber-950/60 dark:via-amber-950/30 dark:to-amber-950/10'
              : isSecond
                ? 'bg-gradient-to-b from-gray-200 via-gray-100 to-gray-100/50 dark:from-gray-700/40 dark:via-gray-700/20 dark:to-gray-700/10'
                : 'bg-gradient-to-b from-orange-100 via-orange-50 to-orange-100/50 dark:from-orange-950/50 dark:via-orange-950/25 dark:to-orange-950/10';

            const ringColor = isFirst
              ? 'ring-amber-400 dark:ring-amber-500'
              : isSecond
                ? 'ring-gray-400 dark:ring-gray-500'
                : 'ring-orange-500 dark:ring-orange-400';

            const avatarBg = isFirst
              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
              : isSecond
                ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
                : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white';

            const heightClass = isFirst ? 'h-40 sm:h-44' : isSecond ? 'h-32 sm:h-36' : 'h-28 sm:h-32';
            const avatarSize = isFirst ? 'size-16 sm:size-18' : 'size-12 sm:size-14';
            const badgeIcon = isFirst ? Crown : isSecond ? Medal : Flame;

            return (
              <motion.div
                key={student.rosterEntryId}
                custom={displayIdx}
                variants={podiumVariants}
                className={`flex flex-col items-center ${heightClass} flex-1 max-w-[140px]`}
              >
                {/* Rank Badge with trophy-style icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'tween',
                    delay: displayIdx * 0.12 + 0.3,
                    duration: 0.35,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`mb-2 flex items-center justify-center size-7 rounded-full shadow-md ${
                    isFirst
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30'
                      : isSecond
                        ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-gray-400/20'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/20'
                  }`}
                >
                  {isFirst ? (
                    <Trophy className="size-3.5" />
                  ) : (
                    <Medal className="size-3.5" />
                  )}
                </motion.div>

                {/* Avatar with gradient ring */}
                <Avatar className={`${avatarSize} ring-3 ${ringColor} shadow-lg`}>
                  <AvatarFallback
                    className={`${avatarBg} text-sm font-bold sm:text-base`}
                  >
                    {getInitials(student.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <p className="text-xs font-bold mt-1.5 text-center truncate w-full max-w-[120px]">
                  {student.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono font-medium">
                  {student.fullRollDisplay || student.rollNumber}
                </p>

                {/* Percentage with colored badge */}
                <Badge
                  className={`mt-1.5 text-[10px] font-bold tabular-nums border-0 shadow-sm ${getAttendanceTextColor(student.attendancePct)} ${getAttendanceBarColor(student.attendancePct)}`}
                >
                  {student.attendancePct}%
                </Badge>

                {/* Podium base */}
                <div
                  className={`mt-2 w-full rounded-t-xl ${gradientBg} flex-1 border-t-2 ${
                    isFirst
                      ? 'border-amber-400 dark:border-amber-500'
                      : isSecond
                        ? 'border-gray-400 dark:border-gray-500'
                        : 'border-orange-500 dark:border-orange-600'
                  }`}
                >
                  {/* Rank number centered in podium */}
                  <div className="flex items-center justify-center pt-2">
                    <span className={`text-2xl font-black tabular-nums ${
                      isFirst
                        ? 'text-amber-400/60 dark:text-amber-500/50'
                        : isSecond
                          ? 'text-gray-400/50 dark:text-gray-500/40'
                          : 'text-orange-500/50 dark:text-orange-400/40'
                    }`}>
                      {actualRank}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ── Remaining List ─────────────────────────────────────── */}
      {remaining.length > 0 && (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="size-4 text-muted-foreground" />
              Full Rankings
              {students.length >= 20 && (
                <Badge variant="outline" className="text-[10px] font-normal ml-auto">
                  Top 20
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="divide-y divide-border/50 rounded-lg border overflow-hidden">
              <AnimatePresence>
                {remaining.map((student) => (
                  <motion.div
                    key={student.rosterEntryId}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className={`flex items-center gap-3 px-3 py-2.5 ${
                      student.rank % 2 === 0
                        ? 'bg-muted/30'
                        : 'bg-transparent'
                    }`}
                  >
                    {/* Rank number with color coding */}
                    <div className={`w-7 flex items-center justify-center shrink-0`}>
                      <span className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold tabular-nums ${
                        student.rank <= 5
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : student.rank <= 10
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {student.rank}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="bg-muted text-[10px] font-semibold text-muted-foreground">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name + Roll */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{student.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {student.fullRollDisplay || student.rollNumber}
                      </p>
                    </div>

                    {/* Attendance bar + percentage */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 sm:w-24 hidden sm:block">
                        <div className={`h-2 w-full rounded-full ${getAttendanceTrackColor(student.attendancePct)} overflow-hidden`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(student.attendancePct, 2)}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                            className={`h-full rounded-full ${getAttendanceBarColor(student.attendancePct)}`}
                          />
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold tabular-nums min-w-[36px] text-right ${getAttendanceTextColor(student.attendancePct)}`}
                      >
                        {student.attendancePct}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 border-t mt-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="text-[10px] text-muted-foreground">Good (≥75%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span className="text-[10px] text-muted-foreground">Warning (≥50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500 dark:bg-red-400" />
                <span className="text-[10px] text-muted-foreground">Low (&lt;50%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Only 1-3 students ──────────────────────────────────── */}
      {!hasNoAttendance && topThree.length > 0 && remaining.length === 0 && topThree.length < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-2"
        >
          <p className="text-[10px] text-muted-foreground">
            {topThree.length === 1
              ? 'Only 1 student in the roster.'
              : `${topThree.length} students in the roster.`}
          </p>
        </motion.div>
      )}
    </div>
  );
}
