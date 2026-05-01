'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  School,
  ClipboardCheck,
  BarChart3,
  GraduationCap,
  Loader2,
  TrendingUp,
  Check,
  X,
  Clock,
  Minus,
  ChevronDown,
  ChevronUp,
  BookOpen,
  User,
  Mail,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

// ── Types ──────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface ClassroomInfo {
  id: string;
  name: string;
  department: string;
  sessionYear: string;
  semester: string;
}

interface AttendanceRecord {
  session: { id: string; conductedDate: string };
  subject: { name: string; code: string };
  status: AttendanceStatus;
}

interface AssessmentInfo {
  id: string;
  name: string;
  type: string;
  totalMarks: number;
  conductedDate: string;
  subject: { name: string; code: string };
}

interface StudentScore {
  assessmentId: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string | null;
}

interface ClassroomReport {
  classroom: ClassroomInfo;
  attendance: AttendanceRecord[];
  publishedAssessments: AssessmentInfo[];
  studentScores: StudentScore[];
  loadingResults: boolean;
}

// ── Status Config ──────────────────────────────────────────────────

const STATUS_COLORS: Record<AttendanceStatus, { bg: string; ring: string; label: string }> = {
  present: {
    bg: 'bg-emerald-500',
    ring: 'ring-emerald-500/20',
    label: 'Present',
  },
  absent: {
    bg: 'bg-red-500',
    ring: 'ring-red-500/20',
    label: 'Absent',
  },
  late: {
    bg: 'bg-amber-500',
    ring: 'ring-amber-500/20',
    label: 'Late',
  },
  excused: {
    bg: 'bg-gray-400',
    ring: 'ring-gray-400/20',
    label: 'Excused',
  },
};

// ── Animated Counter ──────────────────────────────────────────────

function AnimatedStat({ value, label, icon: Icon, color, delay = 0 }: {
  value: string | number;
  label: string;
  icon: typeof School;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-card p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center size-10 rounded-xl ${color}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums leading-none mb-1">{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </motion.div>
  );
}

// ── Progress Ring ──────────────────────────────────────────────────

function ProgressRing({ percentage, size = 64, strokeWidth = 5, color = '#f59e0b' }: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 75) return '#10b981';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color === '#f59e0b' ? getColor() : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ strokeDasharray: circumference }}
      />
    </svg>
  );
}

// ── Attendance Bar ─────────────────────────────────────────────────

function AttendanceBar({ percentage }: { percentage: number }) {
  const barColor =
    percentage >= 75
      ? 'bg-emerald-500'
      : percentage >= 50
        ? 'bg-amber-500'
        : 'bg-red-500';

  const textColor =
    percentage >= 75
      ? 'text-emerald-600 dark:text-emerald-400'
      : percentage >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Attendance</span>
        <span className={`text-sm font-bold tabular-nums ${textColor}`}>
          {(percentage ?? 0).toFixed(1)}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="h-48 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10">
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <Skeleton className="h-8 w-8 rounded-lg mb-4" />
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-56 mb-1" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 py-5 space-y-4 -mt-6">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────

function EmptyReportState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-4">
        <motion.div
          animate={{ rotate: [0, 3, -3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30"
        >
          <FileText className="size-8 text-amber-600 dark:text-amber-400" />
        </motion.div>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No Report Data</p>
      <p className="text-xs text-muted-foreground max-w-[240px]">
        Join a classroom and attend some sessions to see your report card here.
      </p>
    </div>
  );
}

// ── Classroom Card ─────────────────────────────────────────────────

function ClassroomReportCard({ report, index }: { report: ClassroomReport; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const attendanceCounts = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    report.attendance.forEach((r) => counts[r.status]++);
    return counts;
  }, [report.attendance]);

  const totalSessions = report.attendance.length;
  const attendedCount = attendanceCounts.present + attendanceCounts.late;
  const attendancePercentage = totalSessions > 0 ? (attendedCount / totalSessions) * 100 : 0;

  const avgScore = useMemo(() => {
    if (report.studentScores.length === 0) return null;
    const sum = report.studentScores.reduce((s, r) => s + r.percentage, 0);
    return sum / report.studentScores.length;
  }, [report.studentScores]);

  const deptBorder = report.classroom.department === 'CE'
    ? 'border-l-orange-400'
    : report.classroom.department === 'CS'
      ? 'border-l-teal-400'
      : 'border-l-gray-400';

  const deptBg = report.classroom.department === 'CE'
    ? 'bg-orange-50 dark:bg-orange-950/20'
    : report.classroom.department === 'CS'
      ? 'bg-teal-50 dark:bg-teal-950/20'
      : 'bg-gray-50 dark:bg-gray-900/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={`overflow-hidden border-l-4 ${deptBorder}`}>
        <CardContent className="p-0">
          {/* Header row - always visible */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
            aria-expanded={expanded}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm truncate">{report.classroom.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {report.classroom.department}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {report.classroom.sessionYear}
                  </Badge>
                  {report.classroom.semester && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300/60 text-amber-700 dark:border-amber-700/60 dark:text-amber-300">
                      {report.classroom.semester}
                    </Badge>
                  )}
                </div>

                {/* Quick stats row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {totalSessions} session{totalSessions !== 1 ? 's' : ''}
                  </span>
                  <span className={`flex items-center gap-1 font-medium ${
                    attendancePercentage >= 75
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : attendancePercentage >= 50
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                  }`}>
                    <ClipboardCheck className="size-3" />
                    {(attendancePercentage ?? 0).toFixed(0)}% attendance
                  </span>
                  {report.studentScores.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Award className="size-3" />
                      {report.studentScores.length} result{report.studentScores.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 mt-1"
              >
                <ChevronDown className="size-4 text-muted-foreground" />
              </motion.div>
            </div>
          </button>

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t px-4 py-4 space-y-4">
                  {/* Attendance breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Attendance Breakdown
                    </h4>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                        <div
                          key={status}
                          className={`flex flex-col items-center gap-1 rounded-xl p-2 ${STATUS_COLORS[status].bg.replace('500', '50').replace('400', '50')} dark:bg-opacity-10`}
                        >
                          <div className={`size-6 rounded-full ${STATUS_COLORS[status].bg} flex items-center justify-center`}>
                            {status === 'present' ? (
                              <Check className="size-3 text-white" />
                            ) : status === 'absent' ? (
                              <X className="size-3 text-white" />
                            ) : status === 'late' ? (
                              <Clock className="size-3 text-white" />
                            ) : (
                              <Minus className="size-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-bold tabular-nums">{attendanceCounts[status]}</span>
                          <span className="text-[10px] text-muted-foreground">{STATUS_COLORS[status].label}</span>
                        </div>
                      ))}
                    </div>
                    <AttendanceBar percentage={attendancePercentage} />
                  </div>

                  <Separator />

                  {/* Results */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Assessment Results
                    </h4>
                    {report.studentScores.length === 0 ? (
                      <div className="flex flex-col items-center py-4 text-center">
                        <AlertCircle className="size-6 text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {report.publishedAssessments.length === 0
                            ? 'No published assessments yet'
                            : 'No results found for your roll number'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {report.studentScores.map((score) => {
                          const assessment = report.publishedAssessments.find(
                            (a) => a.id === score.assessmentId
                          );
                          return (
                            <div
                              key={score.assessmentId}
                              className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2.5"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">
                                  {assessment?.name ?? 'Assessment'}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {assessment?.subject.name ?? ''} {assessment ? `(${assessment.totalMarks} marks)` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <span className="text-sm font-bold tabular-nums">
                                  {score.marksObtained}/{score.totalMarks}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${
                                    score.percentage >= 75
                                      ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                                      : score.percentage >= 50
                                        ? 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                                        : 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300'
                                  }`}
                                >
                                  {(score.percentage ?? 0).toFixed(0)}%
                                </Badge>
                                {score.grade && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0">
                                    {score.grade}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {avgScore !== null && (
                          <div className="flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 px-3 py-2.5 mt-2">
                            <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                              Average Score
                            </span>
                            <span className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">
                              {(avgScore ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function StudentReportCard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const goBack = useNavStore((s) => s.goBack);

  const [loading, setLoading] = useState(true);
  const [classroomReports, setClassroomReports] = useState<ClassroomReport[]>([]);

  // ── Fetch all data ───────────────────────────────────────────────

  const fetchAllData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);

    try {
      // 1. Fetch all classrooms
      const classRes = await fetch('/api/classrooms', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!classRes.ok) throw new Error('Failed to fetch classrooms');
      const classData = await classRes.json();
      const classrooms: ClassroomInfo[] = (classData.classrooms ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        department: c.department as string,
        sessionYear: c.sessionYear as string,
        semester: (c.semester as string) || '1st',
      }));

      if (classrooms.length === 0) {
        setClassroomReports([]);
        return;
      }

      // 2. For each classroom, fetch attendance + assessments in parallel
      const reports: ClassroomReport[] = classrooms.map((c) => ({
        classroom: c,
        attendance: [],
        publishedAssessments: [],
        studentScores: [],
        loadingResults: true,
      }));

      // Fetch attendance and assessments for each classroom
      const fetchPromises = classrooms.map(async (c, idx) => {
        try {
          const [attRes, assessRes] = await Promise.all([
            fetch(`/api/attendance/my?classroomId=${c.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch(`/api/results/assessments?classroomId=${c.id}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            }),
          ]);

          if (attRes.ok) {
            const attData = await attRes.json();
            reports[idx].attendance = (attData.records ?? []) as AttendanceRecord[];
          }

          if (assessRes.ok) {
            const assessData = await assessRes.json();
            const allAssessments = (assessData.assessments ?? []) as AssessmentInfo[];
            reports[idx].publishedAssessments = allAssessments.filter(
              (a) => (a as Record<string, unknown>).published === true
            );
          }
        } catch {
          // Silently skip failed classroom fetches
        }
      });

      await Promise.all(fetchPromises);
      setClassroomReports(reports);

      // 3. For each published assessment, fetch results to get student's score
      const rollNumber = user?.emailPatternExtracted?.rollNumber;
      const allAssessmentsToFetch: { reportIdx: number; assessmentId: string; totalMarks: number }[] = [];

      reports.forEach((report, idx) => {
        report.publishedAssessments.forEach((assessment) => {
          allAssessmentsToFetch.push({
            reportIdx: idx,
            assessmentId: assessment.id,
            totalMarks: assessment.totalMarks,
          });
        });
      });

      // Fetch results for each assessment in batches of 5 to avoid overwhelming the server
      const BATCH_SIZE = 5;
      for (let i = 0; i < allAssessmentsToFetch.length; i += BATCH_SIZE) {
        const batch = allAssessmentsToFetch.slice(i, i + BATCH_SIZE);
        const resultsPromises = batch.map(async ({ reportIdx, assessmentId, totalMarks }) => {
          try {
            const resRes = await fetch(`/api/results/view?assessmentId=${assessmentId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (resRes.ok) {
              const resData = await resRes.json();
              const results = resData.results ?? [];
              const studentResult = results.find(
                (r: Record<string, unknown>) =>
                  String(r.rollNumber).padStart(3, '0') === (rollNumber?.padStart(3, '0') ?? '') ||
                  String(r.rollNumber) === (rollNumber ?? '')
              );
              if (studentResult) {
                const marks = Number(studentResult.marksObtained) || 0;
                reports[reportIdx].studentScores.push({
                  assessmentId,
                  marksObtained: marks,
                  totalMarks,
                  percentage: totalMarks > 0 ? (marks / totalMarks) * 100 : 0,
                  grade: (studentResult.grade as string) ?? null,
                });
              }
            }
          } catch {
            // Silently skip failed result fetches
          }
        });
        await Promise.all(resultsPromises);
      }

      // Mark loading complete
      reports.forEach((r) => { r.loadingResults = false; });
      setClassroomReports([...reports]);
    } catch {
      toast.error('Could not load report card data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, user?.emailPatternExtracted?.rollNumber]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Compute aggregates ───────────────────────────────────────────

  const aggregates = useMemo(() => {
    let totalSessions = 0;
    let totalAttended = 0;
    let totalAssessments = 0;
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    classroomReports.forEach((report) => {
      report.attendance.forEach((r) => {
        totalSessions++;
        if (r.status === 'present' || r.status === 'late') totalAttended++;
      });
      totalAssessments += report.studentScores.length;
      report.studentScores.forEach((s) => {
        totalScoreSum += s.percentage;
        totalScoreCount++;
      });
    });

    const overallAttendance = totalSessions > 0 ? (totalAttended / totalSessions) * 100 : 0;
    const averageScore = totalScoreCount > 0 ? totalScoreSum / totalScoreCount : 0;

    return {
      classroomCount: classroomReports.length,
      overallAttendance,
      totalAssessments,
      averageScore,
      totalSessions,
    };
  }, [classroomReports]);

  // ── Recent attendance trend (last 10 sessions) ───────────────────

  const recentAttendance = useMemo(() => {
    const allRecords: { status: AttendanceStatus; date: string; subject: string }[] = [];
    classroomReports.forEach((report) => {
      report.attendance.forEach((r) => {
        allRecords.push({
          status: r.status,
          date: r.session.conductedDate,
          subject: r.subject.name,
        });
      });
    });
    // Sort by date descending
    allRecords.sort((a, b) => b.date.localeCompare(a.date));
    return allRecords.slice(0, 10).reverse();
  }, [classroomReports]);

  // ── Loading State ────────────────────────────────────────────────

  if (loading) {
    return <ReportSkeleton />;
  }

  // ── Student info ─────────────────────────────────────────────────

  const studentName = user?.name ?? user?.email?.split('@')[0] ?? 'Student';
  const studentEmail = user?.email ?? '';
  const studentRoll = user?.emailPatternExtracted?.rollNumber ?? '';
  const studentDept = user?.emailPatternExtracted?.department ?? '';
  const studentSession = user?.emailPatternExtracted?.session ?? '';

  // ── Attendance color helper ──────────────────────────────────────

  const attendanceColor = aggregates.overallAttendance >= 75
    ? 'text-emerald-600 dark:text-emerald-400'
    : aggregates.overallAttendance >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  const attendanceBg = aggregates.overallAttendance >= 75
    ? 'bg-emerald-50 dark:bg-emerald-950/30'
    : aggregates.overallAttendance >= 50
      ? 'bg-amber-50 dark:bg-amber-950/30'
      : 'bg-red-50 dark:bg-red-950/30';

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Gradient Header ──────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-amber-50 via-orange-50/80 to-rose-50/50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/15">
        {/* Decorative shapes */}
        <div className="absolute top-0 right-0 w-40 h-32 bg-gradient-to-bl from-amber-200/20 to-transparent rounded-bl-[4rem] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-20 bg-gradient-to-tr from-rose-200/15 to-transparent rounded-tr-[3rem] pointer-events-none" />

        {/* Top bar */}
        <div className="mx-auto max-w-2xl px-4 pt-4 relative">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </Button>
        </div>

        {/* Student Info */}
        <div className="mx-auto max-w-2xl px-4 pt-2 pb-6 relative">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 shrink-0">
              <FileText className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight">
                Academic Report Card
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground">
                  {studentName}
                </span>
                {studentRoll && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    Roll #{studentRoll}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="size-3" />
                  {studentEmail}
                </span>
              </div>
              {(studentDept || studentSession) && (
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {studentDept && (
                    <span className="flex items-center gap-1">
                      <School className="size-3" />
                      {studentDept}
                    </span>
                  )}
                  {studentSession && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      Session {studentSession}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 -mt-3 relative z-10 space-y-5">
        {classroomReports.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EmptyReportState />
          </motion.div>
        ) : (
          <>
            {/* ── Summary Cards (2x2) ─────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatedStat
                value={aggregates.classroomCount}
                label="Classrooms"
                icon={School}
                color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                delay={0.1}
              />

              {/* Attendance with Progress Ring */}
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className={`flex items-center justify-center size-10 rounded-xl ${attendanceBg}`}>
                    <ClipboardCheck className={`size-5 ${attendanceColor}`} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <ProgressRing percentage={aggregates.overallAttendance} size={48} strokeWidth={4} />
                  <div>
                    <p className={`text-2xl font-bold tabular-nums leading-none ${attendanceColor}`}>
                      {(aggregates.overallAttendance ?? 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Attendance</p>
                  </div>
                </div>
              </motion.div>

              <AnimatedStat
                value={aggregates.totalAssessments}
                label="Assessments Taken"
                icon={BarChart3}
                color="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
                delay={0.2}
              />

              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-2xl border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center justify-center size-10 rounded-xl bg-rose-100 dark:bg-rose-900/40">
                    <TrendingUp className="size-5 text-rose-600 dark:text-rose-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold tabular-nums leading-none mt-3">
                  {aggregates.averageScore > 0 ? (
                    <span className={
                      aggregates.averageScore >= 75
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : aggregates.averageScore >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                    }>
                      {(aggregates.averageScore ?? 0).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">--</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground font-medium">Average Score</p>
              </motion.div>
            </div>

            {/* ── Attendance Trend ────────────────────────────────── */}
            {recentAttendance.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.35 }}
              >
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="size-3.5" />
                      Recent Attendance Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                      {recentAttendance.map((record, i) => {
                        const cfg = STATUS_COLORS[record.status];
                        return (
                          <div key={`${record.date}-${record.subject}-${i}`} className="flex flex-col items-center gap-1 shrink-0">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                delay: 0.4 + i * 0.06,
                                duration: 0.2,
                                ease: 'easeOut',
                              }}
                              className={`size-8 rounded-full ${cfg.bg} ring-2 ${cfg.ring} flex items-center justify-center`}
                              title={`${record.subject}: ${cfg.label} (${record.date})`}
                            >
                              {record.status === 'present' ? (
                                <Check className="size-3.5 text-white" />
                              ) : record.status === 'absent' ? (
                                <X className="size-3.5 text-white" />
                              ) : record.status === 'late' ? (
                                <Clock className="size-3.5 text-white" />
                              ) : (
                                <Minus className="size-3.5 text-white" />
                              )}
                            </motion.div>
                            <span className="text-[9px] text-muted-foreground font-mono tabular-nums max-w-[3rem] truncate text-center">
                              {record.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t">
                      {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map((status) => (
                        <div key={status} className="flex items-center gap-1">
                          <div className={`size-2 rounded-full ${STATUS_COLORS[status].bg}`} />
                          <span className="text-[10px] text-muted-foreground">{STATUS_COLORS[status].label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ── Per-Classroom Breakdown ─────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold">Classroom Breakdown</h2>
                  <div className="h-px w-10 bg-gradient-to-r from-amber-500 to-transparent rounded-full mt-1" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {classroomReports.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {classroomReports.map((report, i) => (
                  <ClassroomReportCard key={report.classroom.id} report={report} index={i} />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
