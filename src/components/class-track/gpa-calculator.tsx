'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Calculator,
  Loader2,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  BarChart3,
  Award,
  Copy,
  Check,
  CalendarDays,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

// ── Types ──────────────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  code: string;
  creditHours: number;
}

interface GradeOption {
  gradeLetter: string;
  gradePoint: number;
}

interface GPALine {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  gradeLetter: string;
  creditHours: number;
  gradePoint: number;
  weightedPoints: number;
}

interface GPAResult {
  gpa: number;
  maxGPA: number;
  totalCreditHours: number;
  totalWeightedPoints: number;
  breakdown: GPALine[];
}

interface Semester {
  key: string;
  label: string;
  order: number;
  sessionYear: string;
  classroomCount: number;
  classrooms: { id: string; name: string; department: string }[];
}

// ── Component ──────────────────────────────────────────────────────

export function GPACalculator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const goBack = useNavStore((s) => s.goBack);

  // Classroom selection
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  // Semester selection
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterKey, setSelectedSemesterKey] = useState<string>('all');
  const [loadingSemesters, setLoadingSemesters] = useState(true);

  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Grade options (from classroom config)
  const [gradeOptions, setGradeOptions] = useState<GradeOption[]>([]);

  // Calculator state
  const [lines, setLines] = useState<GPALine[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<GPAResult | null>(null);

  // ── Fetch semesters ─────────────────────────────────────────────

  useEffect(() => {
    const fetchSemesters = async () => {
      if (!accessToken) return;
      setLoadingSemesters(true);
      try {
        const res = await fetch('/api/semesters', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSemesters(data.semesters ?? []);
        }
      } catch {
        // Silently fail — semesters are optional enhancement
      } finally {
        setLoadingSemesters(false);
      }
    };
    fetchSemesters();
  }, [accessToken]);

  // ── Fetch classrooms ────────────────────────────────────────────

  useEffect(() => {
    const fetchClassrooms = async () => {
      if (!accessToken) return;
      setLoadingClassrooms(true);
      try {
        const res = await fetch('/api/classrooms', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const list = data.classrooms ?? [];
          setClassrooms(list);
          if (list.length > 0) {
            setSelectedClassroomId(list[0].id);
          }
        }
      } catch {
        toast.error('Could not load classrooms.');
      } finally {
        setLoadingClassrooms(false);
      }
    };
    fetchClassrooms();
  }, [accessToken]);

  // ── Filter classrooms based on semester ────────────────────────

  const availableClassrooms = useMemo(() => {
    if (selectedSemesterKey === 'all') return classrooms;
    const semester = semesters.find(s => s.key === selectedSemesterKey);
    if (!semester) return classrooms;
    return classrooms.filter(c => semester.classrooms.some(sc => sc.id === c.id));
  }, [classrooms, semesters, selectedSemesterKey]);

  // Auto-select first classroom when filtered list changes
  useEffect(() => {
    if (availableClassrooms.length > 0 && !availableClassrooms.some(c => c.id === selectedClassroomId)) {
      setSelectedClassroomId(availableClassrooms[0].id);
    }
  }, [availableClassrooms, selectedClassroomId]);

  // ── Fetch subjects and grade config when classroom changes ──────

  useEffect(() => {
    if (!accessToken || !selectedClassroomId) return;

    const fetchData = async () => {
      setLoadingSubjects(true);
      setResult(null);
      setLines([]);

      try {
        const [subRes, gpaRes] = await Promise.all([
          fetch(`/api/subjects?classroomId=${selectedClassroomId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          fetch(`/api/gpa/config/${selectedClassroomId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        ]);

        if (subRes.ok) {
          const data = await subRes.json();
          setSubjects(data.subjects ?? []);
        }

        if (gpaRes.ok) {
          const data = await gpaRes.json();
          const gradeConfig = data.gradeConfig ?? {};
          const configEntries = Object.entries(gradeConfig).map(([letter, point]) => ({
            gradeLetter: letter as string,
            gradePoint: point as number,
          }));
          if (configEntries.length > 0) {
            setGradeOptions(configEntries);
          } else {
            // Default 4.0 scale
            setGradeOptions([
              { gradeLetter: 'A', gradePoint: 4.0 },
              { gradeLetter: 'A-', gradePoint: 3.7 },
              { gradeLetter: 'B+', gradePoint: 3.3 },
              { gradeLetter: 'B', gradePoint: 3.0 },
              { gradeLetter: 'B-', gradePoint: 2.7 },
              { gradeLetter: 'C+', gradePoint: 2.3 },
              { gradeLetter: 'C', gradePoint: 2.0 },
              { gradeLetter: 'C-', gradePoint: 1.7 },
              { gradeLetter: 'D', gradePoint: 1.0 },
              { gradeLetter: 'F', gradePoint: 0.0 },
            ]);
          }
        } else {
          setGradeOptions([
            { gradeLetter: 'A', gradePoint: 4.0 },
            { gradeLetter: 'A-', gradePoint: 3.7 },
            { gradeLetter: 'B+', gradePoint: 3.3 },
            { gradeLetter: 'B', gradePoint: 3.0 },
            { gradeLetter: 'B-', gradePoint: 2.7 },
            { gradeLetter: 'C+', gradePoint: 2.3 },
            { gradeLetter: 'C', gradePoint: 2.0 },
            { gradeLetter: 'C-', gradePoint: 1.7 },
            { gradeLetter: 'D', gradePoint: 1.0 },
            { gradeLetter: 'F', gradePoint: 0.0 },
          ]);
        }
      } catch {
        toast.error('Could not load classroom data.');
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchData();
  }, [accessToken, selectedClassroomId]);

  // ── Determine current classroom's semester ────────────────────

  const currentSemesterKey = useMemo(() => {
    if (!selectedClassroomId || semesters.length === 0) return null;
    const sem = semesters.find(s => s.classrooms.some(c => c.id === selectedClassroomId));
    return sem?.key ?? null;
  }, [selectedClassroomId, semesters]);

  // ── Used subject IDs ────────────────────────────────────────────

  const usedSubjectIds = useMemo(() => new Set(lines.map((l) => l.subjectId)), [lines]);

  // Available subjects to add
  const availableSubjects = useMemo(
    () => subjects.filter((s) => !usedSubjectIds.has(s.id)),
    [subjects, usedSubjectIds]
  );

  // ── Add subject ─────────────────────────────────────────────────

  const addSubject = useCallback(
    (subjectId: string) => {
      const subject = subjects.find((s) => s.id === subjectId);
      if (!subject) return;

      setLines((prev) => [
        ...prev,
        {
          id: `line-${Date.now()}`,
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          gradeLetter: '',
          creditHours: subject.creditHours,
          gradePoint: 0,
          weightedPoints: 0,
        },
      ]);
      setResult(null);
    },
    [subjects]
  );

  // ── Remove subject ──────────────────────────────────────────────

  const removeSubject = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
    setResult(null);
  }, []);

  // ── Update grade ────────────────────────────────────────────────

  const updateGrade = useCallback((lineId: string, gradeLetter: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        const option = gradeOptions.find((g) => g.gradeLetter === gradeLetter);
        const gp = option?.gradePoint ?? 0;
        return {
          ...l,
          gradeLetter,
          gradePoint: gp,
          weightedPoints: gp * l.creditHours,
        };
      })
    );
    setResult(null);
  }, [gradeOptions]);

  // ── Update credit hours ─────────────────────────────────────────

  const updateCreditHours = useCallback((lineId: string, value: string) => {
    const ch = parseInt(value) || 0;
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        return {
          ...l,
          creditHours: ch,
          weightedPoints: l.gradePoint * ch,
        };
      })
    );
    setResult(null);
  }, []);

  // ── Calculate GPA ───────────────────────────────────────────────

  const handleCalculate = useCallback(async () => {
    if (!accessToken || !selectedClassroomId) return;

    // Validate
    if (lines.length === 0) {
      toast.error('Add at least one subject to calculate GPA.');
      return;
    }

    const incompleteLine = lines.find((l) => !l.gradeLetter);
    if (incompleteLine) {
      toast.error(`Please select a grade for "${incompleteLine.subjectName}".`);
      return;
    }

    setCalculating(true);
    try {
      const res = await fetch('/api/gpa/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId: selectedClassroomId,
          grades: lines.map((l) => ({
            subjectId: l.subjectId,
            grade: l.gradeLetter,
            creditHours: l.creditHours,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Map API response to match GPAResult interface
        const maxGPA = Math.max(...Object.values(data.gradeConfig ?? { A: 4.0 }), 4.0);
        const breakdown: GPALine[] = (data.subjects ?? []).map((s: Record<string, unknown>) => ({
          id: `line-${s.subjectId}`,
          subjectId: s.subjectId as string,
          subjectName: (s.subjectName ?? 'Unknown') as string,
          subjectCode: (s.subjectCode ?? '') as string,
          gradeLetter: (s.grade ?? '') as string,
          creditHours: (s.creditHours ?? 3) as number,
          gradePoint: (s.gradePoint ?? 0) as number,
          weightedPoints: ((s.gradePoint ?? 0) as number) * ((s.creditHours ?? 3) as number),
        }));
        setResult({
          gpa: data.gpa ?? 0,
          maxGPA,
          totalCreditHours: data.totalCreditHours ?? 0,
          totalWeightedPoints: data.totalWeightedPoints ?? 0,
          breakdown,
        });
        toast.success('GPA calculated!');
      } else {
        // Fallback: calculate locally
        const totalWeighted = lines.reduce((sum, l) => sum + l.weightedPoints, 0);
        const totalCredits = lines.reduce((sum, l) => sum + l.creditHours, 0);
        const gpa = totalCredits > 0 ? totalWeighted / totalCredits : 0;
        const maxGPA = Math.max(...gradeOptions.map((g) => g.gradePoint), 4.0);

        setResult({
          gpa,
          maxGPA,
          totalCreditHours: totalCredits,
          totalWeightedPoints: totalWeighted,
          breakdown: lines,
        });
        toast.success('GPA calculated!');
      }
    } catch {
      // Fallback local calculation
      const totalWeighted = lines.reduce((sum, l) => sum + l.weightedPoints, 0);
      const totalCredits = lines.reduce((sum, l) => sum + l.creditHours, 0);
      const gpa = totalCredits > 0 ? totalWeighted / totalCredits : 0;
      const maxGPA = Math.max(...gradeOptions.map((g) => g.gradePoint), 4.0);

      setResult({
        gpa,
        maxGPA,
        totalCreditHours: totalCredits,
        totalWeightedPoints: totalWeighted,
        breakdown: lines,
      });
      toast.success('GPA calculated!');
    } finally {
      setCalculating(false);
    }
  }, [accessToken, selectedClassroomId, lines, gradeOptions]);

  // ── Share GPA ─────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);
  const shareGPA = useCallback(() => {
    if (!result) return;
    const text = `GPA: ${result.gpa.toFixed(2)} / ${result.maxGPA.toFixed(1)}\nCredit Hours: ${result.totalCreditHours}\nWeighted Points: ${result.totalWeightedPoints.toFixed(2)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('GPA copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  }, [result]);

  // ── Animated GPA value ──────────────────────────────────────────
  const [displayGPA, setDisplayGPA] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!result) {
      setDisplayGPA(0);
      return;
    }
    const target = result.gpa;
    const start = displayGPA;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (target - start) * eased;
      setDisplayGPA(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [result?.gpa]);

  const gpaPercentage = result
    ? Math.min((result.gpa / result.maxGPA) * 100, 100)
    : 0;

  // ── GPA color based on value ────────────────────────────────────

  const getGPAColorClass = (gpa: number) => {
    if (gpa >= 3.0) return 'text-emerald-600 dark:text-emerald-400';
    if (gpa >= 2.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getGPABgRingClass = (gpa: number) => {
    if (gpa >= 3.0) return 'stroke-emerald-500';
    if (gpa >= 2.0) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const getGPAIndicatorBg = (gpa: number) => {
    if (gpa >= 3.0) return 'bg-emerald-500/10 dark:bg-emerald-500/20';
    if (gpa >= 2.0) return 'bg-amber-500/10 dark:bg-amber-500/20';
    return 'bg-red-500/10 dark:bg-red-500/20';
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calculator className="size-4 text-primary shrink-0" />
            <h1 className="text-sm font-bold truncate">GPA Calculator</h1>
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5 space-y-5">
        {/* ── Semester Selector ───────────────────────────────────── */}
        {loadingSemesters ? (
          <Skeleton className="h-[72px] w-full rounded-lg" />
        ) : semesters.length > 0 ? (
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
                  <CalendarDays className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Semester</p>
                  <Select value={selectedSemesterKey} onValueChange={setSelectedSemesterKey}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Semesters (Cumulative)</SelectItem>
                      {semesters.map(s => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label} Semester ({s.sessionYear}) — {s.classroomCount} course{s.classroomCount !== 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* ── Classroom Selector ─────────────────────────────────── */}
        {loadingClassrooms ? (
          <Skeleton className="h-10 w-full rounded-md" />
        ) : availableClassrooms.length > 0 ? (
          <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
            <SelectTrigger className="w-full" disabled={availableClassrooms.length === 1}>
              <SelectValue placeholder="Select classroom" />
            </SelectTrigger>
            <SelectContent>
              {availableClassrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-3.5 text-muted-foreground" />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : !loadingSemesters && !loadingClassrooms && classrooms.length > 0 && availableClassrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarDays className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No courses in this semester</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try selecting a different semester or &quot;All Semesters&quot;.
            </p>
          </div>
        ) : null}

        {/* ── Grade Scale Reference ──────────────────────────────── */}
        {gradeOptions.length > 0 && (
          <Card className="py-0 gap-0">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
                  <Award className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">Grade Scale</p>
                  <div className="flex flex-wrap gap-1.5">
                    {gradeOptions.map((g) => (
                      <Badge key={g.gradeLetter} variant="outline" className="font-mono text-[10px] gap-1">
                        {g.gradeLetter} = {g.gradePoint.toFixed(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Subject Lines ──────────────────────────────────────── */}
        {loadingSubjects ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {lines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No subjects added</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add subjects from the dropdown below to calculate your GPA.
                </p>
              </div>
            )}

            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
              <Card className="py-0 gap-0">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Subject info with code badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                          {line.subjectCode}
                        </Badge>
                        <p className="text-sm font-semibold truncate">{line.subjectName}</p>
                      </div>

                      {/* Grade & Credit Hours */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Grade</Label>
                          <Select
                            value={line.gradeLetter || undefined}
                            onValueChange={(val) => updateGrade(line.id, val)}
                          >
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {gradeOptions.map((g) => (
                                <SelectItem key={g.gradeLetter} value={g.gradeLetter}>
                                  <span className="flex items-center justify-between gap-3 w-full">
                                    <span className="font-mono font-semibold">{g.gradeLetter}</span>
                                    <span className="text-muted-foreground text-xs">{g.gradePoint.toFixed(1)} pts</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Credit Hours</Label>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={line.creditHours}
                            onChange={(e) => updateCreditHours(line.id, e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => removeSubject(line.id)}
                      aria-label="Remove subject"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Add Subject Button ─────────────────────────────────── */}
        {availableSubjects.length > 0 && !loadingSubjects && (
          <Select onValueChange={(val) => addSubject(val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a subject..." />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  <span className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">{sub.name}</span>
                    <span className="text-muted-foreground text-xs font-mono">{sub.code}</span>
                    <span className="text-muted-foreground text-xs">{sub.creditHours} cr</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* ── Calculate Button ───────────────────────────────────── */}
        {lines.length > 0 && (
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleCalculate}
            disabled={calculating || lines.length === 0}
          >
            {calculating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="size-4" />
                Calculate GPA
              </>
            )}
          </Button>
        )}

        {/* ── Result Display ─────────────────────────────────────── */}
        <AnimatePresence>
        {result && (
          <motion.div
            className="space-y-5"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'tween', duration: 0.4, ease: 'easeOut' }}
          >
            {/* GPA Display Card with Circular Gauge */}
            <Card className="py-0 gap-0 overflow-hidden shadow-lg">
              <CardContent className="p-0">
                {/* GPA Circular Gauge */}
                <div className="p-8 pb-6 flex flex-col items-center">
                  <div className={`relative flex items-center justify-center size-36 sm:size-40 rounded-full ${getGPAIndicatorBg(result.gpa)}`}>
                    {/* Outer decorative ring */}
                    <div className={`absolute inset-0 rounded-full border-2 ${
                      result.gpa >= 3.0
                        ? 'border-emerald-200 dark:border-emerald-800/40'
                        : result.gpa >= 2.0
                          ? 'border-amber-200 dark:border-amber-800/40'
                          : 'border-red-200 dark:border-red-800/40'
                    }`} />
                    <svg className="absolute -rotate-90 size-36 sm:size-40" viewBox="0 0 128 128">
                      {/* Background track */}
                      <circle cx="64" cy="64" r="54" fill="none" className="stroke-muted/20" strokeWidth="7" />
                      {/* Animated progress arc */}
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="54"
                        fill="none"
                        className={getGPABgRingClass(result.gpa)}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 54}
                        initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - gpaPercentage / 100) }}
                        transition={{ type: 'tween', duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                      />
                    </svg>
                    <div className="relative z-10 text-center">
                      <p className={`text-4xl sm:text-5xl font-extrabold tabular-nums tracking-tight ${getGPAColorClass(result.gpa)}`}>
                        {displayGPA.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                        out of {result.maxGPA.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-4">
                    Your GPA
                  </p>
                </div>

                {/* Share GPA Button */}
                <div className="px-6 pb-5 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs rounded-full px-4"
                    onClick={shareGPA}
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        Share GPA
                      </>
                    )}
                  </Button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-px bg-border">
                  <div className="bg-card p-4 text-center">
                    <p className="text-[11px] text-muted-foreground font-medium">Credit Hours</p>
                    <p className="text-xl font-bold mt-1 tabular-nums">{result.totalCreditHours}</p>
                  </div>
                  <div className="bg-card p-4 text-center">
                    <p className="text-[11px] text-muted-foreground font-medium">Weighted Points</p>
                    <p className="text-xl font-bold mt-1 tabular-nums">{result.totalWeightedPoints.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Table */}
            <Card className="py-0 gap-0">
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead className="hidden sm:table-cell text-center">Grade Point</TableHead>
                        <TableHead className="text-center">Credits</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Weighted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.breakdown.map((line, idx) => (
                        <TableRow key={idx} className={idx % 2 === 1 ? 'bg-muted/20' : ''}>
                          <TableCell>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="font-mono text-[10px] shrink-0">{line.subjectCode}</Badge>
                                <p className="text-sm font-medium truncate">{line.subjectName}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              {line.gradeLetter}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center font-mono text-sm">
                            {line.gradePoint.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {line.creditHours}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-right font-mono text-sm font-medium">
                            {line.weightedPoints.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>

        {/* ── Semester Breakdown Card ────────────────────────────── */}
        <AnimatePresence>
        {result && semesters.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="py-0 gap-0">
              <CardHeader className="px-4 pb-0 pt-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  Semester Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                {/* Cumulative GPA header */}
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Cumulative GPA</span>
                  </div>
                  <span className={`text-lg font-bold tabular-nums ${getGPAColorClass(result.gpa)}`}>
                    {result.gpa.toFixed(2)}
                  </span>
                </div>

                {/* Per-semester rows */}
                <div className="divide-y rounded-lg border overflow-hidden">
                  {semesters.map((sem) => {
                    const isCurrentSem = currentSemesterKey === sem.key;
                    return (
                      <div
                        key={sem.key}
                        className={`flex items-center justify-between px-3 py-2.5 ${
                          isCurrentSem ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`size-2 rounded-full shrink-0 ${
                            isCurrentSem ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              isCurrentSem ? 'text-primary' : ''
                            }`}>
                              {sem.label} Semester
                              <span className="text-xs text-muted-foreground ml-1.5">({sem.sessionYear})</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sem.classroomCount} course{sem.classroomCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 ml-3">
                          {isCurrentSem ? (
                            <Badge variant="outline" className={`font-mono font-bold ${getGPAColorClass(result.gpa)}`}>
                              {result.gpa.toFixed(2)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
