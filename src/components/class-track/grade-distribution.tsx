'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  AlertCircle,
  Minus,
  ChevronDown,
} from 'lucide-react';

// ── Animation variants (tween, not spring!) ──────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

// ── Types ────────────────────────────────────────────────────────

interface Assessment {
  id: string;
  name: string;
  type: string;
  subject: { name: string; code: string };
  totalMarks: number;
  isPublished: boolean;
  _count?: { results: number };
}

interface ResultEntry {
  id: string;
  marksObtained: number;
  student: {
    name: string | null;
    rollNumber: string | null;
  };
}

interface GradeRange {
  label: string;
  range: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  textColor: string;
}

const GRADE_RANGES: GradeRange[] = [
  { label: 'A+', range: '90-100', min: 90, max: 100, color: 'bg-emerald-500 dark:bg-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-950/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
  { label: 'A', range: '80-89', min: 80, max: 89, color: 'bg-teal-500 dark:bg-teal-400', bgColor: 'bg-teal-100 dark:bg-teal-950/30', textColor: 'text-teal-700 dark:text-teal-300' },
  { label: 'B+', range: '70-79', min: 70, max: 79, color: 'bg-amber-500 dark:bg-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-950/30', textColor: 'text-amber-700 dark:text-amber-300' },
  { label: 'B', range: '60-69', min: 60, max: 69, color: 'bg-orange-500 dark:bg-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-950/30', textColor: 'text-orange-700 dark:text-orange-300' },
  { label: 'C', range: '50-59', min: 50, max: 59, color: 'bg-rose-500 dark:bg-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-950/30', textColor: 'text-rose-700 dark:text-rose-300' },
  { label: 'F', range: '0-49', min: 0, max: 49, color: 'bg-red-500 dark:bg-red-400', bgColor: 'bg-red-100 dark:bg-red-950/30', textColor: 'text-red-700 dark:text-red-300' },
];

// ── Component ────────────────────────────────────────────────────

export function GradeDistribution({ classroomId, assessmentId: propAssessmentId }: { classroomId: string; assessmentId?: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(propAssessmentId || '');
  const [allMarks, setAllMarks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);

  // ── Fetch assessments ─────────────────────────────────────────

  const fetchAssessments = useCallback(async () => {
    if (!accessToken || !classroomId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/results/assessments?classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch assessments');
      const data = await res.json();
      const list: Assessment[] = data.assessments ?? [];
      setAssessments(list);
      // Auto-select the first published assessment if no prop provided
      if (!propAssessmentId && list.length > 0) {
        const firstPublished = list.find((a) => a.isPublished);
        setSelectedAssessmentId(firstPublished?.id || list[0].id);
      }
    } catch {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId, propAssessmentId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // ── Fetch results for selected assessment ─────────────────────

  const fetchResults = useCallback(async (aid: string) => {
    if (!accessToken || !aid) return;
    setResultsLoading(true);
    try {
      const res = await fetch(
        `/api/results/${aid}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch results');
      const data = await res.json();
      const results: ResultEntry[] = data.results ?? [];
      const marks = results
        .map((r) => r.marksObtained)
        .filter((m) => m !== null && m !== undefined);
      setAllMarks(marks);
    } catch {
      toast.error('Failed to load results');
      setAllMarks([]);
    } finally {
      setResultsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (selectedAssessmentId) {
      fetchResults(selectedAssessmentId);
    }
  }, [selectedAssessmentId, fetchResults]);

  // ── Computed values ───────────────────────────────────────────

  const totalStudents = allMarks.length;
  const highest = totalStudents > 0 ? Math.max(...allMarks) : 0;
  const lowest = totalStudents > 0 ? Math.min(...allMarks) : 0;
  const average = totalStudents > 0 ? Math.round((allMarks.reduce((a, b) => a + b, 0) / totalStudents) * 10) / 10 : 0;

  const distribution = GRADE_RANGES.map((grade) => {
    const count = allMarks.filter((m) => m >= grade.min && m <= grade.max).length;
    const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
    return { ...grade, count, percentage };
  });

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  const selectedAssessment = assessments.find((a) => a.id === selectedAssessmentId);

  // ── Average line position ─────────────────────────────────────
  // Map average (0-100) to bar chart width position
  const avgBarWidth = totalStudents > 0 ? Math.max((average / 100) * 100, 0) : 0;

  // ── Loading skeleton ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-7 w-full rounded-full" />
              </div>
            ))}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────

  if (assessments.length === 0) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 mb-4">
            <BarChart3 className="size-8 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">No assessments yet</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
            Publish assessment results to see grade distributions here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Header card with assessment selector */}
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                <BarChart3 className="size-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Grade Distribution</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  {selectedAssessment
                    ? `${selectedAssessment.subject.name} — ${selectedAssessment.name}`
                    : 'Select an assessment to view distribution'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Assessment selector */}
          {assessments.length > 1 && (
            <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
              <SelectTrigger className="h-9 text-xs w-full">
                <SelectValue placeholder="Select assessment" />
              </SelectTrigger>
              <SelectContent>
                {assessments.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span>{a.subject.code}</span>
                      <span className="text-muted-foreground">—</span>
                      <span>{a.name}</span>
                      {a.isPublished ? (
                        <span className="text-emerald-500 text-[10px]">Published</span>
                      ) : (
                        <span className="text-amber-500 text-[10px]">Draft</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Results loading */}
          {resultsLoading && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading results...</span>
              </div>
            </div>
          )}

          {/* No results state */}
          {!resultsLoading && selectedAssessmentId && totalStudents === 0 && (
            <div className="mt-4 flex flex-col items-center justify-center py-10 text-center">
              <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-2">
                <AlertCircle className="size-6 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">No results uploaded yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Upload student results to see the grade distribution.
              </p>
            </div>
          )}

          {/* Chart */}
          {!resultsLoading && totalStudents > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="mt-4 space-y-3"
            >
              {/* Distribution bars */}
              <div className="relative space-y-2.5">
                {/* Average indicator line */}
                <div
                  className="absolute top-0 bottom-0 z-10 pointer-events-none"
                  style={{ left: `${avgBarWidth}%` }}
                >
                  <div className="relative h-full flex flex-col items-center">
                    <div className="text-[9px] font-bold text-rose-500 dark:text-rose-400 bg-background px-1 rounded whitespace-nowrap">
                      Avg: {average}
                    </div>
                    <div className="w-px flex-1 bg-rose-400/60 dark:bg-rose-400/40 border-dashed" />
                  </div>
                </div>

                {distribution.map((grade, idx) => (
                  <motion.div
                    key={grade.label}
                    variants={itemVariants}
                    className="space-y-1 group/row"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 font-semibold border-0 ${grade.bgColor} ${grade.textColor}`}
                        >
                          {grade.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{grade.range}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {grade.count} student{grade.count !== 1 ? 's' : ''}
                        </span>
                        <span className={`text-xs font-bold tabular-nums ${grade.textColor}`}>
                          {grade.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className={`h-6 w-full rounded-full ${grade.bgColor} overflow-hidden transition-all duration-200 group-hover/row:shadow-md group-hover/row:shadow-black/5 dark:group-hover/row:shadow-black/20`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(grade.count / maxCount) * 100}%` }}
                        transition={{
                          delay: idx * 0.08 + 0.2,
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={`h-full rounded-full ${grade.color} relative`}
                      >
                        {/* Count label inside bar */}
                        {grade.count > 0 && (grade.count / maxCount) * 100 > 15 && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-white drop-shadow-sm">
                            {grade.count}
                          </span>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-gradient-to-b from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-950/15">
                  <div className="flex items-center justify-center size-6 rounded-md bg-emerald-500/10">
                    <Users className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{totalStudents}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">Total</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-gradient-to-b from-teal-50 to-teal-100/50 dark:from-teal-950/30 dark:to-teal-950/15">
                  <div className="flex items-center justify-center size-6 rounded-md bg-teal-500/10">
                    <Trophy className="size-3 text-teal-600 dark:text-teal-400" />
                  </div>
                  <span className="text-base font-bold tabular-nums text-teal-700 dark:text-teal-300">{highest}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">Highest</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-gradient-to-b from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-950/15">
                  <div className="flex items-center justify-center size-6 rounded-md bg-rose-500/10">
                    <TrendingDown className="size-3 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span className="text-base font-bold tabular-nums text-rose-700 dark:text-rose-300">{lowest}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">Lowest</span>
                </motion.div>
                <motion.div variants={itemVariants} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-950/15">
                  <div className="flex items-center justify-center size-6 rounded-md bg-amber-500/10">
                    <TrendingUp className="size-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">{average}</span>
                  <span className="text-[9px] text-muted-foreground leading-tight text-center">Average</span>
                </motion.div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t">
                <div className="flex items-center gap-1">
                  <div className="w-px h-3 bg-rose-400/60 border-dashed" />
                  <span className="text-[9px] text-muted-foreground">Class Average ({average})</span>
                </div>
                {GRADE_RANGES.map((grade) => (
                  <div key={grade.label} className="flex items-center gap-1">
                    <div className={`size-2 rounded-full ${grade.color}`} />
                    <span className="text-[9px] text-muted-foreground">{grade.label} ({grade.range})</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
