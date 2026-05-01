'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  RotateCcw,
  Settings,
  AlertTriangle,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface GradeConfig {
  id: string;
  gradeLetter: string;
  gradePoint: number;
}

// ── Default grades ─────────────────────────────────────────────────

const DEFAULT_GRADES: { gradeLetter: string; gradePoint: number }[] = [
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
];

// ── Props ──────────────────────────────────────────────────────────

interface GPAConfigProps {
  classroomId: string;
}

// ── Component ──────────────────────────────────────────────────────

export function GPAConfig({ classroomId }: GPAConfigProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Config state
  const [grades, setGrades] = useState<GradeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable rows — local copy
  const [editedGrades, setEditedGrades] = useState<GradeConfig[]>([]);

  // Reset confirmation
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // [saveSuccess, setSaveSuccess] state for checkmark animation
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Fetch config ────────────────────────────────────────────────

  const fetchConfig = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gpa/config/${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        // The API returns a flat gradeConfig object like { "A": 4.0, "A-": 3.7, ... }
        // Convert it to the array format used by the UI
        const config = data.gradeConfig;
        if (config && typeof config === 'object' && !Array.isArray(config)) {
          const gradesArray = Object.entries(config).map(([letter, point], idx) => ({
            id: `config-${idx}`,
            gradeLetter: letter,
            gradePoint: point as number,
          }));
          setGrades(gradesArray);
          setEditedGrades(gradesArray.map((g) => ({ ...g })));
        } else {
          // Fallback: use defaults
          const defaults = DEFAULT_GRADES.map((g, idx) => ({
            id: `default-${idx}`,
            ...g,
          }));
          setGrades(defaults);
          setEditedGrades(defaults.map((g) => ({ ...g })));
        }
      } else {
        // No config yet — use defaults
        const defaults = DEFAULT_GRADES.map((g, idx) => ({
          id: `default-${idx}`,
          ...g,
        }));
        setGrades(defaults);
        setEditedGrades(defaults.map((g) => ({ ...g })));
      }
    } catch {
      toast.error('Could not load GPA configuration.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ── Helpers ─────────────────────────────────────────────────────

  const updateGradeLetter = useCallback((id: string, value: string) => {
    setEditedGrades((prev) =>
      prev.map((g) => (g.id === id ? { ...g, gradeLetter: value } : g))
    );
  }, []);

  const updateGradePoint = useCallback((id: string, value: string) => {
    const num = parseFloat(value);
    setEditedGrades((prev) =>
      prev.map((g) => (g.id === id ? { ...g, gradePoint: isNaN(num) ? 0 : num } : g))
    );
  }, []);

  const addGrade = useCallback(() => {
    setEditedGrades((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        gradeLetter: '',
        gradePoint: 0.0,
      },
    ]);
  }, []);

  const removeGrade = useCallback((id: string) => {
    setEditedGrades((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── Save ────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!accessToken) return;

    // Validate
    const emptyLetter = editedGrades.find((g) => !g.gradeLetter.trim());
    if (emptyLetter) {
      toast.error('All grade letters must be filled in.');
      return;
    }

    const duplicates = editedGrades
      .map((g) => g.gradeLetter.trim())
      .filter((l, i, arr) => arr.indexOf(l) !== i);
    if (duplicates.length > 0) {
      toast.error(`Duplicate grade letter: "${duplicates[0]}". Each grade must be unique.`);
      return;
    }

    setSaving(true);
    try {
      // Convert the array format to the flat object format expected by the API
      const gradeConfig: Record<string, number> = {};
      for (const g of editedGrades) {
        gradeConfig[g.gradeLetter.trim()] = g.gradePoint;
      }

      const res = await fetch(`/api/gpa/config/${classroomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ gradeConfig }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration.');
        return;
      }

      toast.success('GPA configuration saved!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      fetchConfig();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [accessToken, classroomId, editedGrades, fetchConfig]);

  // ── Reset ───────────────────────────────────────────────────────

  const handleReset = useCallback(async () => {
    if (!accessToken) return;

    setResetting(true);
    try {
      // Convert default grades to flat object format
      const gradeConfig: Record<string, number> = {};
      for (const g of DEFAULT_GRADES) {
        gradeConfig[g.gradeLetter] = g.gradePoint;
      }

      const res = await fetch(`/api/gpa/config/${classroomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ gradeConfig }),
      });

      if (res.ok) {
        toast.success('Configuration reset to defaults!');
        setResetOpen(false);
        fetchConfig();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to reset configuration.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setResetting(false);
    }
  }, [accessToken, classroomId, fetchConfig]);

  // ── Has changes ─────────────────────────────────────────────────

  const hasChanges = JSON.stringify(grades) !== JSON.stringify(editedGrades);

  // ── Max grade point for reference ───────────────────────────────

  const maxGP = Math.max(...editedGrades.map((g) => g.gradePoint), 4.0);

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
        <div className="rounded-lg border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Grade Point Mapping</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define how letter grades map to grade points for GPA calculation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Unsaved changes
            </span>
          )}
        </div>
      </div>

      {/* ── Grade Table ─────────────────────────────────────────── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Grade Letter</TableHead>
                  <TableHead className="w-36">Grade Point</TableHead>
                  <TableHead className="w-16 text-center">Scale</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedGrades.map((grade, idx) => {
                  const percentage = maxGP > 0 ? (grade.gradePoint / maxGP) * 100 : 0;
                  // Color gradient: green for high, amber for mid, red for low
                  let rowBg = '';
                  let dotColor = 'bg-gray-400';
                  if (percentage >= 80) { rowBg = 'bg-emerald-50/50 dark:bg-emerald-950/20'; dotColor = 'bg-emerald-500'; }
                  else if (percentage >= 60) { rowBg = 'bg-teal-50/50 dark:bg-teal-950/20'; dotColor = 'bg-teal-500'; }
                  else if (percentage >= 40) { rowBg = 'bg-amber-50/50 dark:bg-amber-950/20'; dotColor = 'bg-amber-500'; }
                  else { rowBg = 'bg-red-50/50 dark:bg-red-950/20'; dotColor = 'bg-red-500'; }

                  return (
                    <TableRow key={grade.id} className={`${rowBg} ${idx % 2 === 1 && percentage >= 60 ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                      <TableCell className="text-xs text-muted-foreground py-3.5">{idx + 1}</TableCell>
                      <TableCell className="py-3.5">
                        <Input
                          value={grade.gradeLetter}
                          onChange={(e) => updateGradeLetter(grade.id, e.target.value)}
                          placeholder="e.g. A+"
                          className="h-9 w-28 font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Input
                          type="number"
                          step={0.1}
                          min={0}
                          max={5}
                          value={grade.gradePoint}
                          onChange={(e) => updateGradePoint(grade.id, e.target.value)}
                          className="h-9 w-28 font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`size-2 rounded-full shrink-0 ${dotColor}`} />
                          <span className="text-xs text-muted-foreground font-mono">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeGrade(grade.id)}
                          disabled={editedGrades.length <= 1}
                          aria-label="Remove grade"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={addGrade}
        >
          <Plus className="size-3.5" />
          Add Grade
        </Button>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setResetOpen(true)}
          disabled={resetting}
        >
          {resetting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Reset to Default
        </Button>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleSave}
          disabled={saving || editedGrades.length === 0}
        >
          {saveSuccess ? (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="inline-flex items-center gap-1.5"
            >
              <Check className="size-3.5 text-emerald-500" />
              Saved!
            </motion.span>
          ) : saving ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              Save Configuration
            </>
          )}
        </Button>
      </div>

      {/* ── Visual Scale ────────────────────────────────────────── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Grade Point Scale</p>
          <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500">
            {/* Scale markers */}
            <div className="absolute inset-0 flex">
              {editedGrades.map((g, i) => {
                const pos = maxGP > 0 ? (g.gradePoint / maxGP) * 100 : 0;
                return (
                  <div
                    key={g.id}
                    className="absolute top-0 h-full flex flex-col items-center"
                    style={{ left: `${pos}%` }}
                    title={`${g.gradeLetter}: ${g.gradePoint}`}
                  >
                    <div className="w-px h-full bg-black/20 dark:bg-white/30" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0.0</span>
            <span className="text-[10px] text-muted-foreground">{maxGP.toFixed(1)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Info Card ───────────────────────────────────────────── */}
      <Card className="py-0 gap-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0">
              <Settings className="size-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">How GPA is calculated</p>
              <p className="text-xs text-muted-foreground">
                GPA = Sum of (Grade Point × Credit Hours) / Total Credit Hours.
                Configure the grade scale above to match your institution&apos;s grading policy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Reset Confirmation ──────────────────────────────────── */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all grade configurations with the standard 4.0 scale:
              A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D=1.0, F=0.0.
              Any custom grades will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This action will overwrite your current configuration.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={resetting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {resetting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="size-4" />
                  Reset to Default
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
