'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  Minus,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface AttendanceRecord {
  session: {
    id: string;
    conductedDate: string;
  };
  subject: {
    name: string;
    code: string;
  };
  status: 'present' | 'absent' | 'late' | 'excused';
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// ── Props ──────────────────────────────────────────────────────────

interface AttendanceHeatmapProps {
  classroomId: string;
  isAdmin: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { color: string; bg: string; darkBg: string; border: string; icon: typeof Check; label: string }
> = {
  present: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-100',
    darkBg: 'dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
    icon: Check,
    label: 'Present',
  },
  absent: {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100',
    darkBg: 'dark:bg-red-950/40',
    border: 'border-red-300 dark:border-red-700',
    icon: X,
    label: 'Absent',
  },
  late: {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100',
    darkBg: 'dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
    icon: Clock,
    label: 'Late',
  },
  excused: {
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100',
    darkBg: 'dark:bg-gray-800/40',
    border: 'border-gray-300 dark:border-gray-600',
    icon: Minus,
    label: 'Excused',
  },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Component ──────────────────────────────────────────────────────

export function AttendanceHeatmap({ classroomId, isAdmin }: AttendanceHeatmapProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Current viewed month
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Attendance data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected day detail
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Fetch attendance records ─────────────────────────────────────

  const fetchRecords = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/attendance/my?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch attendance');

      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      toast.error('Could not load attendance data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // ── Build day → records map ──────────────────────────────────────

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    records.forEach((record) => {
      const dateKey = record.session.conductedDate;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(record);
    });
    return map;
  }, [records]);

  // ── Calendar grid computation ────────────────────────────────────

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // ── Summary stats ────────────────────────────────────────────────

  const summaryStats = useMemo(() => {
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const late = records.filter((r) => r.status === 'late').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const total = records.length;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return { present, absent, late, excused, total, attendanceRate };
  }, [records]);

  // ── Get primary status for a day (for color coding) ─────────────

  const getDayStatus = useCallback(
    (day: Date): AttendanceStatus | null => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayRecords = recordsByDate.get(dateKey);
      if (!dayRecords || dayRecords.length === 0) return null;

      // Priority: absent > late > excused > present
      if (dayRecords.some((r) => r.status === 'absent')) return 'absent';
      if (dayRecords.some((r) => r.status === 'late')) return 'late';
      if (dayRecords.some((r) => r.status === 'excused')) return 'excused';
      return 'present';
    },
    [recordsByDate]
  );

  // ── Navigation handlers ──────────────────────────────────────────

  const goToPrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentMonth(startOfMonth(new Date()));

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">
            {isAdmin ? 'Class Attendance' : 'My Attendance'}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-7" onClick={goToPrevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium min-w-[120px]"
            onClick={goToToday}
          >
            {format(currentMonth, 'MMMM yyyy')}
          </Button>
          <Button variant="ghost" size="icon" className="size-7" onClick={goToNextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────── */}
      {!isAdmin && (
        <div className="grid grid-cols-5 gap-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
            className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-center"
          >
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {summaryStats.present}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">
              Present
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 text-center"
          >
            <div className="text-lg font-bold text-red-700 dark:text-red-400 tabular-nums">
              {summaryStats.absent}
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-500 font-medium">
              Absent
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-center"
          >
            <div className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {summaryStats.late}
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
              Late
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-lg bg-gray-100 dark:bg-gray-800/40 p-2.5 text-center"
          >
            <div className="text-lg font-bold text-gray-600 dark:text-gray-400 tabular-nums">
              {summaryStats.excused}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">
              Excused
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg bg-primary/5 dark:bg-primary/10 p-2.5 text-center"
          >
            <div className="text-lg font-bold text-primary tabular-nums">
              {summaryStats.attendanceRate}%
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">Rate</div>
          </motion.div>
        </div>
      )}

      {/* ── Calendar Grid ────────────────────────────────────────── */}
      <motion.div
        key={format(currentMonth, 'yyyy-MM')}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b bg-muted/30">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dayStatus = getDayStatus(day);
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayRecords = recordsByDate.get(dateKey);

                // Compact admin view — smaller cells
                if (isAdmin) {
                  return (
                    <motion.button
                      key={dateKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.005, duration: 0.15 }}
                      onClick={() => {
                        if (dayRecords && dayRecords.length > 0) {
                          setSelectedDay(isSelected ? null : day);
                        }
                      }}
                      disabled={!dayRecords || dayRecords.length === 0}
                      className={`
                        relative flex flex-col items-center justify-center
                        aspect-square p-0.5 text-[10px] sm:text-xs
                        border-b border-r last:border-r-0
                        transition-all duration-150
                        ${!inMonth ? 'text-muted-foreground/30 bg-muted/10' : ''}
                        ${today ? 'ring-2 ring-primary/30 ring-inset' : ''}
                        ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}
                        ${dayRecords && dayRecords.length > 0 ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'}
                      `}
                    >
                      <span
                        className={`font-medium tabular-nums leading-none ${
                          !inMonth ? 'opacity-30' : today ? 'text-primary font-bold' : ''
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayRecords && dayRecords.length > 0 && (
                        <div className="flex gap-px mt-0.5">
                          {dayRecords.slice(0, 3).map((record, rIdx) => {
                            const cfg = STATUS_CONFIG[record.status];
                            return (
                              <span
                                key={rIdx}
                                className={`size-1.5 sm:size-2 rounded-full ${cfg.bg} ${cfg.darkBg} ${cfg.border} border`}
                              />
                            );
                          })}
                          {dayRecords.length > 3 && (
                            <span className="text-[8px] text-muted-foreground leading-none ml-px">
                              +{dayRecords.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </motion.button>
                  );
                }

                // Student personal view — full cells
                return (
                  <motion.button
                    key={dateKey}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.008, duration: 0.2 }}
                    onClick={() => {
                      if (dayRecords && dayRecords.length > 0) {
                        setSelectedDay(isSelected ? null : day);
                      }
                    }}
                    disabled={!dayRecords || dayRecords.length === 0}
                    className={`
                      relative flex flex-col items-center justify-center
                      min-h-[44px] sm:min-h-[52px] p-1 sm:p-2
                      border-b border-r last:border-r-0
                      transition-all duration-150
                      ${!inMonth ? 'text-muted-foreground/30 bg-muted/10' : ''}
                      ${today ? 'ring-2 ring-primary/30 ring-inset' : ''}
                      ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}
                      ${dayRecords && dayRecords.length > 0 ? 'cursor-pointer hover:bg-accent/50' : 'cursor-default'}
                    `}
                  >
                    <span
                      className={`text-xs sm:text-sm font-medium tabular-nums leading-none ${
                        !inMonth ? 'opacity-30' : today ? 'text-primary font-bold' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayStatus && inMonth && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: idx * 0.008 + 0.1, duration: 0.2, ease: 'easeOut' }}
                        className="mt-1"
                      >
                        {(() => {
                          const cfg = STATUS_CONFIG[dayStatus];
                          const Icon = cfg.icon;
                          return (
                            <div
                              className={`flex items-center justify-center size-5 sm:size-6 rounded-full ${cfg.bg} ${cfg.darkBg} border ${cfg.border}`}
                            >
                              <Icon className={`size-3 sm:size-3.5 ${cfg.color}`} />
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                    {/* Multi-session indicator for student view */}
                    {dayRecords && dayRecords.length > 1 && inMonth && (
                      <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary text-[7px] text-primary-foreground flex items-center justify-center font-bold">
                        {dayRecords.length}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Selected Day Detail ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (() => {
          const dateKey = format(selectedDay, 'yyyy-MM-dd');
          const dayRecords = recordsByDate.get(dateKey);
          if (!dayRecords || dayRecords.length === 0) return null;

          return (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-semibold">
                      {format(selectedDay, 'EEEE, MMMM d, yyyy')}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setSelectedDay(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1.5">
                  {dayRecords.map((record, idx) => {
                    const cfg = STATUS_CONFIG[record.status];
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={record.session.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.15 }}
                        className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                      >
                        <div
                          className={`flex items-center justify-center size-7 rounded-full ${cfg.bg} ${cfg.darkBg} border ${cfg.border} shrink-0`}
                        >
                          <Icon className={`size-3.5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{record.subject.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {record.subject.code}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${cfg.color} ${cfg.border}`}
                        >
                          {cfg.label}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Legend ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
        {(Object.entries(STATUS_CONFIG) as [AttendanceStatus, typeof STATUS_CONFIG[AttendanceStatus]][]).map(
          ([status, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center justify-center size-5 rounded-full ${cfg.bg} ${cfg.darkBg} border ${cfg.border}`}
                >
                  <Icon className={`size-3 ${cfg.color}`} />
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                  {cfg.label}
                </span>
              </div>
            );
          }
        )}
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-full border border-dashed border-muted-foreground/30" />
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            No Session
          </span>
        </div>
      </div>
    </div>
  );
}
