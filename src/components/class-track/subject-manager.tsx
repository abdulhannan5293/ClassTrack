'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  FlaskConical,
  Search,
  AlertTriangle,
  CalendarDays,
  Clock,
  GraduationCap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ── Types ──────────────────────────────────────────────────────────

interface Subject {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  type: 'THEORY' | 'LAB';
  teacherName: string | null;
  scheduleDays: (string | number)[];
  attendanceSessionCount: number;
  assessmentCount: number;
}

type SubjectFormData = {
  name: string;
  code: string;
  creditHours: number;
  type: 'THEORY' | 'LAB';
  teacherName: string;
  scheduleDays: string[];
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Map number (1=Mon..7=Sun) to short day name
const DAY_NUM_TO_NAME: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
};

// Map day name to number (1=Mon..7=Sun)
const DAY_NAME_TO_NUM: Record<string, number> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};

/** Convert scheduleDays from API (numbers or strings) to canonical day name strings */
function normalizeScheduleDays(days: unknown): string[] {
  if (!Array.isArray(days)) {
    try {
      const parsed = JSON.parse(String(days));
      if (Array.isArray(parsed)) days = parsed;
      else return [];
    } catch {
      return [];
    }
  }
  return (days as (string | number)[]).map((d) => {
    if (typeof d === 'number') return DAY_NUM_TO_NAME[d] ?? String(d);
    const strD = String(d);
    return DAY_NAME_TO_NUM[strD] ? strD : strD;
  }).filter(Boolean);
}

/** Convert frontend day names to numbers for API submission */
function scheduleDaysToNumbers(days: string[]): number[] {
  return days.map((d) => DAY_NAME_TO_NUM[d]).filter(Boolean);
}


const EMPTY_FORM: SubjectFormData = {
  name: '',
  code: '',
  creditHours: 3,
  type: 'THEORY',
  teacherName: '',
  scheduleDays: [],
};

// ── Props ──────────────────────────────────────────────────────────

interface SubjectManagerProps {
  classroomId: string;
  isAdmin: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function SubjectManager({ classroomId, isAdmin }: SubjectManagerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Subject data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch subjects ──────────────────────────────────────────────

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/subjects?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch subjects');

      const data = await res.json();
      setSubjects(data.subjects ?? []);
    } catch {
      toast.error('Could not load subjects.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // ── Filter ──────────────────────────────────────────────────────

  const filteredSubjects = subjects.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.teacherName ?? '').toLowerCase().includes(q)
    );
  });

  // ── Open add dialog ─────────────────────────────────────────────

  const handleOpenAdd = useCallback(() => {
    setEditingSubject(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  // ── Open edit dialog ────────────────────────────────────────────

  const handleOpenEdit = useCallback((subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      creditHours: subject.creditHours,
      type: subject.type,
      teacherName: subject.teacherName ?? '',
      scheduleDays: normalizeScheduleDays(subject.scheduleDays),
    });
    setFormOpen(true);
  }, []);

  // ── Toggle day ──────────────────────────────────────────────────

  const toggleDay = useCallback((day: string) => {
    setFormData((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(day)
        ? prev.scheduleDays.filter((d) => d !== day)
        : [...prev.scheduleDays, day],
    }));
  }, []);

  // ── Save (add or edit) ──────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!accessToken) return;

    // Validate
    if (!formData.name.trim()) {
      toast.error('Subject name is required.');
      return;
    }
    if (!formData.code.trim()) {
      toast.error('Subject code is required.');
      return;
    }
    if (formData.creditHours < 1 || formData.creditHours > 10) {
      toast.error('Credit hours must be between 1 and 10.');
      return;
    }

    setFormLoading(true);

    try {
      const isEditing = !!editingSubject;
      const url = isEditing
        ? `/api/subjects/${editingSubject.id}`
        : '/api/subjects';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...formData,
          scheduleDays: scheduleDaysToNumbers(formData.scheduleDays),
          classroomId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `Failed to ${isEditing ? 'update' : 'create'} subject.`);
        return;
      }

      toast.success(
        `Subject ${isEditing ? 'updated' : 'created'} successfully!`
      );
      setFormOpen(false);
      fetchSubjects();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }, [formData, editingSubject, accessToken, classroomId, fetchSubjects]);

  // ── Open delete dialog ──────────────────────────────────────────

  const handleOpenDelete = useCallback((subject: Subject) => {
    setDeletingSubject(subject);
    setDeleteOpen(true);
  }, []);

  // ── Delete subject ──────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deletingSubject || !accessToken) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/subjects/${deletingSubject.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete subject.');
        return;
      }

      toast.success('Subject deleted successfully.');
      setDeleteOpen(false);
      setDeletingSubject(null);
      fetchSubjects();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deletingSubject, accessToken, fetchSubjects]);

  // ── Render ──────────────────────────────────────────────────────

  const hasData = deletingSubject
    ? (deletingSubject.attendanceSessionCount > 0 || deletingSubject.assessmentCount > 0)
    : false;

  return (
    <div className="space-y-5">
      {/* ── Header Actions ───────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={handleOpenAdd}>
            <Plus className="size-3.5" />
            Add Subject
          </Button>
        </div>
      )}

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, or teacher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* ── Subject List / Table ─────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="relative mb-4">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-orange-100 to-teal-100 dark:from-orange-950/30 dark:to-teal-950/30">
              <BookOpen className="size-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center size-6 rounded-full bg-background shadow-md border">
              <FlaskConical className="size-3 text-teal-500" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {searchQuery ? 'No subjects match your search' : 'No subjects yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px]">
            {searchQuery
              ? 'Try a different search term'
              : isAdmin
                ? 'Add your first subject to get started'
                : 'Subjects will appear here once added by CR or GR'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubjects.map((subject) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className={`py-0 gap-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group overflow-hidden ${
                subject.type === 'THEORY'
                  ? 'border-l-[3px] border-l-orange-500'
                  : 'border-l-[3px] border-l-teal-500'
              }`}>
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r pointer-events-none ${
                  subject.type === 'THEORY'
                    ? 'from-orange-500/3 via-transparent to-transparent group-hover:from-orange-500/5'
                    : 'from-teal-500/3 via-transparent to-transparent group-hover:from-teal-500/5'
                }`} />
                <CardContent className="p-4 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-semibold text-sm truncate group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                          {subject.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-[10px] shrink-0 bg-muted/50">
                          {subject.code}
                        </Badge>
                        <Badge
                          variant={subject.type === 'LAB' ? 'secondary' : 'default'}
                          className={`gap-1 text-[10px] shrink-0 ${
                            subject.type === 'THEORY'
                              ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 hover:from-orange-100 hover:to-orange-50 dark:from-orange-900/40 dark:to-orange-900/20 dark:text-orange-300'
                              : 'bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 hover:from-teal-100 hover:to-teal-50 dark:from-teal-900/40 dark:to-teal-900/20 dark:text-teal-300'
                          }`}
                        >
                          {subject.type === 'LAB' ? (
                            <FlaskConical className="size-2.5" />
                          ) : (
                            <BookOpen className="size-2.5" />
                          )}
                          {subject.type}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="size-3" />
                          {subject.creditHours} cr. hr{subject.creditHours !== 1 ? 's' : ''}
                        </span>
                        {subject.teacherName && (
                          <span className="truncate max-w-[140px]">{subject.teacherName}</span>
                        )}
                        {subject.scheduleDays.length > 0 && (
                          <span className="flex items-center gap-1.5 flex-wrap">
                            {normalizeScheduleDays(subject.scheduleDays).map((day) => (
                              <span
                                key={day}
                                className={`inline-flex items-center justify-center size-5 rounded text-[9px] font-semibold ${
                                  day === 'Mon' || day === 'Wed' || day === 'Fri'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                    : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                }`}
                              >
                                {day.slice(0, 2)}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0"
                          onClick={() => handleOpenEdit(subject)}
                          aria-label={`Edit ${subject.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleOpenDelete(subject)}
                          aria-label={`Delete ${subject.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Desktop table view */}
      {!loading && filteredSubjects.length > 0 && (
        <div className="hidden lg:block rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Credit Hrs</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Schedule</TableHead>
                {isAdmin && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-mono text-sm">
                    {subject.code}
                  </TableCell>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={subject.type === 'LAB' ? 'secondary' : 'default'}
                      className="gap-1 text-[10px]"
                    >
                      {subject.type === 'LAB' ? (
                        <FlaskConical className="size-2.5" />
                      ) : (
                        <BookOpen className="size-2.5" />
                      )}
                      {subject.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{subject.creditHours}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {subject.teacherName ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {subject.scheduleDays.length > 0
                      ? normalizeScheduleDays(subject.scheduleDays).join(', ')
                      : '—'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          onClick={() => handleOpenEdit(subject)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleOpenDelete(subject)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Add/Edit Dialog ──────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <div className={`flex items-center justify-center size-7 rounded-lg ${
                  editingSubject
                    ? 'bg-amber-100 dark:bg-amber-900/30'
                    : 'bg-emerald-100 dark:bg-emerald-900/30'
                }`}>
                  {editingSubject ? (
                    <Pencil className="size-3.5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Plus className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </span>
            </DialogTitle>
            <DialogDescription>
              {editingSubject
                ? 'Update the subject details below.'
                : 'Add a new subject to this classroom.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* ── Basic Info Section ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</p>
              <div className="h-px bg-border" />

              <div className="space-y-2">
                <Label htmlFor="subject-name">Subject Name</Label>
              <Input
                id="subject-name"
                placeholder="e.g. Data Structures"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            {/* Code */}
            <div className="space-y-2">
              <Label htmlFor="subject-code">Subject Code</Label>
              <Input
                id="subject-code"
                placeholder="e.g. CS201"
                value={formData.code}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                }
                className="font-mono"
              />
            </div>
            </div>

            {/* ── Schedule & Credits Section ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule & Credits</p>
              <div className="h-px bg-border" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: val as 'THEORY' | 'LAB',
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THEORY">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="size-3.5" />
                        Theory
                      </span>
                    </SelectItem>
                    <SelectItem value="LAB">
                      <span className="flex items-center gap-1.5">
                        <FlaskConical className="size-3.5" />
                        Lab
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit-hours">Credit Hours</Label>
                <Input
                  id="credit-hours"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.creditHours}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      creditHours: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            </div>

            {/* ── Teacher Section ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</p>
              <div className="h-px bg-border" />

              <div className="space-y-2">
              <Label htmlFor="teacher-name">Teacher Name</Label>
              <Input
                id="teacher-name"
                placeholder="e.g. Dr. Smith"
                value={formData.teacherName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    teacherName: e.target.value,
                  }))
                }
              />
            </div>
            </div>

            {/* ── Schedule Days Section ── */}
            <div className="space-y-2">
              <Label>Schedule Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = formData.scheduleDays.includes(day);
                  return (
                    <label
                      key={day}
                      className={`flex items-center gap-1.5 cursor-pointer rounded-lg border px-3 py-2 transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 dark:bg-primary/20'
                          : 'hover:bg-muted/50 border-transparent'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDay(day)}
                        className="size-3.5"
                      />
                      <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {day}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {editingSubject ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingSubject
                  ? 'Save Changes'
                  : 'Add Subject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ───────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {deletingSubject?.name}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          {deletingSubject && (deletingSubject.attendanceSessionCount > 0 || deletingSubject.assessmentCount > 0) && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">This subject has linked data</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {deletingSubject.attendanceSessionCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium">
                        <CalendarDays className="size-3" />
                        {deletingSubject.attendanceSessionCount} attendance session{deletingSubject.attendanceSessionCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {deletingSubject.assessmentCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-medium">
                        <BookOpen className="size-3" />
                        {deletingSubject.assessmentCount} assessment{deletingSubject.assessmentCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-1.5 opacity-80">
                    Deleting this subject will permanently remove all related data.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete Subject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
