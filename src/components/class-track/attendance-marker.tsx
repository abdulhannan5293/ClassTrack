'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  Check,
  X,
  Clock,
  Minus,
  Plus,
  Download,
  Save,
  Lock,
  ChevronLeft,
  Loader2,
  CalendarDays,
  ClipboardCheck,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  Users,
  CheckCheck,
  Search,
} from 'lucide-react';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface Subject {
  id: string;
  name: string;
  code: string;
  type: 'THEORY' | 'LAB';
  _count: {
    attendance: number;
  };
}

interface Session {
  id: string;
  conductedDate: string;
  status: 'draft' | 'finalized';
  markerName: string | null;
  markerRole: string;
  _count: {
    records: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface StudentRecord {
  rosterEntryId: string;
  userId: string | null;
  rollNumber: string;
  name: string;
  status: AttendanceStatus;
  recordId?: string;
}

interface StudentAttendanceView {
  session: {
    id: string;
    conductedDate: string;
  };
  subject: {
    name: string;
    code: string;
  };
  status: AttendanceStatus;
}

// ── Status Config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    icon: typeof Check;
    border: string;
    bg: string;
    badgeClass: string;
    iconBg: string;
    iconColor: string;
    ringClass: string;
  }
> = {
  present: {
    label: 'Present',
    icon: Check,
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    badgeClass:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    iconBg: 'bg-emerald-500',
    iconColor: 'text-white',
    ringClass: 'ring-emerald-500/20',
  },
  absent: {
    label: 'Absent',
    icon: X,
    border: 'border-l-red-500',
    bg: 'bg-red-50/80 dark:bg-red-950/20',
    badgeClass:
      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    iconBg: 'bg-red-500',
    iconColor: 'text-white',
    ringClass: 'ring-red-500/20',
  },
  late: {
    label: 'Late',
    icon: Clock,
    border: 'border-l-amber-500',
    bg: 'bg-amber-50/80 dark:bg-amber-950/20',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    iconBg: 'bg-amber-500',
    iconColor: 'text-white',
    ringClass: 'ring-amber-500/20',
  },
  excused: {
    label: 'Excused',
    icon: Minus,
    border: 'border-l-gray-400 dark:border-l-gray-500',
    bg: 'bg-gray-50/80 dark:bg-gray-900/20',
    badgeClass:
      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    iconBg: 'bg-gray-400 dark:bg-gray-500',
    iconColor: 'text-white',
    ringClass: 'ring-gray-400/20',
  },
};

const STATUS_CYCLE: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

// ── Props ──────────────────────────────────────────────────────────

interface AttendanceMarkerProps {
  classroomId: string;
  isAdmin: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function AttendanceMarker({ classroomId, isAdmin }: AttendanceMarkerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  // Common state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Session list
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Marking view
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // New session dialog
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState<Date | undefined>(undefined);
  const [creatingSession, setCreatingSession] = useState(false);

  // Finalize confirmation
  const [finalizeOpen, setFinalizeOpen] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // Student view
  const [studentAttendance, setStudentAttendance] = useState<StudentAttendanceView[]>([]);
  const [loadingStudentView, setLoadingStudentView] = useState(false);

  // ── Fetch subjects ──────────────────────────────────────────────

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    setLoadingSubjects(true);
    try {
      const res = await fetch(`/api/subjects?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch subjects');
      const data = await res.json();
      const subs = data.subjects ?? [];
      setSubjects(subs);
      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0].id);
      }
    } catch {
      toast.error('Could not load subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  }, [accessToken, classroomId, selectedSubjectId]);

  useEffect(() => {
    fetchSubjects();
  }, [accessToken, classroomId]);

  // ── Fetch sessions for admin ─────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!accessToken || !isAdmin) return;
    if (!selectedSubjectId) {
      setSessions([]);
      return;
    }
    setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/attendance/sessions?classroomId=${classroomId}&subjectId=${selectedSubjectId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      toast.error('Could not load sessions.');
    } finally {
      setLoadingSessions(false);
    }
  }, [accessToken, classroomId, selectedSubjectId, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchSessions();
    }
  }, [fetchSessions, isAdmin]);

  // ── Fetch student attendance ─────────────────────────────────────

  const fetchStudentAttendance = useCallback(async () => {
    if (!accessToken || isAdmin) return;
    if (!selectedSubjectId) {
      setStudentAttendance([]);
      return;
    }
    setLoadingStudentView(true);
    try {
      const res = await fetch(
        `/api/attendance/my?classroomId=${classroomId}&subjectId=${selectedSubjectId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setStudentAttendance(data.records ?? []);
    } catch {
      toast.error('Could not load your attendance records.');
    } finally {
      setLoadingStudentView(false);
    }
  }, [accessToken, classroomId, selectedSubjectId, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      fetchStudentAttendance();
    }
  }, [fetchStudentAttendance, isAdmin]);

  // ── Fetch students for marking ───────────────────────────────────

  const fetchStudentsForSession = useCallback(
    async (session: Session) => {
      if (!accessToken) return;
      setLoadingStudents(true);
      try {
        const res = await fetch(
          `/api/attendance/records?sessionId=${session.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) throw new Error('Failed to fetch records');
        const data = await res.json();
        setStudents(
          (data.records ?? []).map((r: Record<string, unknown>) => ({
            rosterEntryId: r.rosterEntryId as string,
            userId: (r.userId as string) ?? null,
            rollNumber: r.rollNumber as string,
            name: r.name as string,
            status: (r.status as AttendanceStatus) ?? 'present',
            recordId: (r.recordId as string) ?? undefined,
          }))
        );
      } catch {
        toast.error('Could not load student list.');
      } finally {
        setLoadingStudents(false);
      }
    },
    [accessToken]
  );

  // ── Toggle student status ────────────────────────────────────────

  // Prevent double-fire: track last toggle time per student
  const lastToggleRef = useRef<Record<string, number>>({});

  const toggleStudentStatus = useCallback(
    (rosterEntryId: string) => {
      if (activeSession?.status === 'finalized') return;

      // Debounce: ignore rapid successive taps on the same student (< 300ms)
      const now = Date.now();
      if (lastToggleRef.current[rosterEntryId] && now - lastToggleRef.current[rosterEntryId] < 300) {
        return;
      }
      lastToggleRef.current[rosterEntryId] = now;

      setStudents((prev) =>
        prev.map((s) => {
          if (s.rosterEntryId !== rosterEntryId) return s;
          const currentIdx = STATUS_CYCLE.indexOf(s.status);
          const nextIdx = (currentIdx + 1) % STATUS_CYCLE.length;
          return { ...s, status: STATUS_CYCLE[nextIdx] };
        })
      );
    },
    [activeSession?.status]
  );

  // ── Mark all present ─────────────────────────────────────────────

  const markAllPresent = useCallback(() => {
    if (activeSession?.status === 'finalized') return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'present' as AttendanceStatus,
      }))
    );
    toast.success('All students marked as present');
  }, [activeSession?.status]);

  // ── Long press for mobile - set to LATE directly ──────────────────

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchingRef = useRef(false);
  const longPressTriggeredRef = useRef(false);

  const handleLongPressStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent, rosterEntryId: string) => {
      if (activeSession?.status === 'finalized') return;
      // Prevent browser from synthesizing a click after touch
      if ('preventDefault' in e && e.cancelable) {
        e.preventDefault();
      }
      isTouchingRef.current = true;
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        if (!isTouchingRef.current) return;
        longPressTriggeredRef.current = true;
        setStudents((prev) =>
          prev.map((s) => {
            if (s.rosterEntryId !== rosterEntryId) return s;
            return { ...s, status: 'late' as AttendanceStatus };
          })
        );
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }, 500);
    },
    [activeSession?.status]
  );

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isTouchingRef.current = false;
  }, []);

  // ── Open session for marking ─────────────────────────────────────

  const openMarkingView = useCallback(
    (session: Session) => {
      setActiveSession(session);
      fetchStudentsForSession(session);
    },
    [fetchStudentsForSession]
  );

  // ── Save draft ───────────────────────────────────────────────────

  // Ref to always have latest state for finalize handler
  const studentsRef = useRef(students);
  studentsRef.current = students;
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;

  const saveDraft = useCallback(async () => {
    if (!accessToken) return;
    const currentSession = activeSessionRef.current;
    const currentStudents = studentsRef.current;
    if (!currentSession) return;
    setSaving(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          records: currentStudents.map((s) => ({
            rosterEntryId: s.rosterEntryId,
            userId: s.userId,
            status: s.status,
            recordId: s.recordId,
          })),
          isFinalized: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to save attendance.');
        return;
      }

      toast.success('Attendance saved as draft!');
      fetchSessions();
      setActiveSession((prev) =>
        prev ? { ...prev, status: 'draft' } : null
      );
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [accessToken, fetchSessions]);

  // ── Finalize attendance ──────────────────────────────────────────

  const finalizeAttendance = useCallback(async () => {
    if (!accessToken) return;
    const currentSession = activeSessionRef.current;
    const currentStudents = studentsRef.current;
    if (!currentSession) return;
    setSaving(true);
    try {
      const res = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          records: currentStudents.map((s) => ({
            rosterEntryId: s.rosterEntryId,
            userId: s.userId,
            status: s.status,
            recordId: s.recordId,
          })),
          isFinalized: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to finalize attendance.');
        return;
      }

      toast.success('Attendance finalized and locked!');
      setFinalizeOpen(false);
      fetchSessions();
      setActiveSession((prev) =>
        prev ? { ...prev, status: 'finalized' } : null
      );
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [accessToken, fetchSessions]);

  // ── Create new session ───────────────────────────────────────────

  const createSession = useCallback(async () => {
    if (!accessToken || !newSessionDate || !selectedSubjectId) return;

    setCreatingSession(true);
    try {
      const res = await fetch('/api/attendance/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          subjectId: selectedSubjectId,
          conductedDate: format(newSessionDate, 'yyyy-MM-dd'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create session.');
        return;
      }

      toast.success('Session created! You can now mark attendance.');
      setNewSessionOpen(false);
      setNewSessionDate(undefined);
      fetchSessions();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setCreatingSession(false);
    }
  }, [accessToken, classroomId, selectedSubjectId, newSessionDate, fetchSessions]);

  // ── Export attendance ────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!accessToken || !selectedSubjectId) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/attendance/export?subjectId=${selectedSubjectId}&classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'Failed to export attendance.');
        return;
      }

      const data = await res.json();
      const exportStudents = data.students ?? [];

      if (!Array.isArray(exportStudents) || exportStudents.length === 0) {
        toast.info('No attendance records to export.');
        return;
      }

      // Build student summary map
      const studentMap = new Map<string, {
        rollNumber: string;
        name: string;
        totalClasses: number;
        presentCount: number;
        percentage: number;
      }>();

      exportStudents.forEach((s: Record<string, unknown>) => {
        const rollNumber = (s.rollNumber as string) || '';
        const name = (s.name as string) || '';
        const totalClasses = (s.totalClasses as number) || 0;
        const presentCount = (s.presentCount as number) || 0;
        const percentage = (s.percentage as number) || 0;

        if (!rollNumber) return;

        if (!studentMap.has(rollNumber)) {
          studentMap.set(rollNumber, { rollNumber, name, totalClasses, presentCount, percentage });
        }
      });

      const students = Array.from(studentMap.values());

      // Build header row
      const header: string[] = ['Roll Number', 'Name', 'Total Classes', 'Present', 'Percentage'];

      // Build data rows
      const rows: string[][] = students.map((student) => {
        return [
          student.rollNumber,
          student.name,
          String(student.totalClasses),
          String(student.presentCount),
          (student.percentage).toFixed(1) + '%',
        ];
      });

      // Create worksheet
      const wsData = [header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Roll Number
        { wch: 30 }, // Name
        { wch: 15 }, // Total Classes
        { wch: 10 }, // Present
        { wch: 12 }, // Percentage
      ];
      ws['!cols'] = colWidths;

      // Add footer row
      const footerRow = students.length + 2;
      XLSX.utils.sheet_add_aoa(
        ws,
        [['Generated by ClassTrack', '', '', '', '']],
        { origin: `A${footerRow + 1}` }
      );

      // Create workbook and download
      const wb = XLSX.utils.book_new();
      const subjectName =
        subjects.find((s) => s.id === selectedSubjectId)?.name ?? 'Attendance';
      XLSX.utils.book_append_sheet(wb, ws, subjectName.substring(0, 31));

      // Generate file as blob for download
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${subjectName}_attendance.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Attendance exported successfully!');
    } catch {
      toast.error('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [accessToken, classroomId, selectedSubjectId, subjects]);

  // ── Count indicators ─────────────────────────────────────────────

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, excused: 0 };
    students.forEach((s) => c[s.status]++);
    return c;
  }, [students]);

  const hasUnsavedChanges = useMemo(() => {
    // Simple heuristic: if we have students loaded and session is draft, consider unsaved
    return students.length > 0 && activeSession?.status === 'draft';
  }, [students, activeSession]);

  // ── Student view summary ─────────────────────────────────────────

  const studentSummary = useMemo(() => {
    const total = studentAttendance.length;
    const present = studentAttendance.filter(
      (r) => r.status === 'present' || r.status === 'late'
    ).length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    return { total, present, percentage };
  }, [studentAttendance]);

  // ── Selected subject info ────────────────────────────────────────

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId),
    [subjects, selectedSubjectId]
  );

  // ── Render: Student View ─────────────────────────────────────────

  if (!isAdmin) {
    return (
      <StudentAttendanceViewComponent
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
        onSubjectChange={setSelectedSubjectId}
        loading={loadingStudentView}
        attendance={studentAttendance}
        summary={studentSummary}
        loadingSubjects={loadingSubjects}
      />
    );
  }

  // ── Render: Admin View ───────────────────────────────────────────

  // If in marking view, show the marking interface
  if (activeSession) {
    return (
      <>
        <MarkingView
          session={activeSession}
          students={students}
          loading={loadingStudents}
          saving={saving}
          counts={counts}
          selectedSubject={selectedSubject}
          onToggleStatus={toggleStudentStatus}
          onSetLate={(rosterEntryId: string) => {
            setStudents((prev) =>
              prev.map((s) => {
                if (s.rosterEntryId !== rosterEntryId) return s;
                return { ...s, status: 'late' as AttendanceStatus };
              })
            );
          }}
          onLongPressStart={handleLongPressStart}
          onLongPressEnd={handleLongPressEnd}
          onLongPressTriggered={longPressTriggeredRef}
          onSaveDraft={saveDraft}
          onFinalize={() => setFinalizeOpen(true)}
          onMarkAllPresent={markAllPresent}
          onBack={() => setActiveSession(null)}
          hasUnsaved={hasUnsavedChanges}
        />

        {/* ── Finalize Confirmation (rendered here so it's visible in marking view) ── */}
        <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize Attendance?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will lock all attendance records for this session. You won&apos;t be
                able to make any changes afterward. Make sure all records are correct.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {counts.present} Present
                    {' · '}
                    {counts.absent} Absent
                    {' · '}
                    {counts.late} Late
                    {' · '}
                    {counts.excused} Excused
                  </p>
                </div>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={finalizeAttendance}
                disabled={saving}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Finalize &amp; Lock
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Top Section ──────────────────────────────────────────── */}
      {/* Subject Selector + Actions */}
      <div className="space-y-3">
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-full bg-card/80 backdrop-blur-sm border-amber-200/50 dark:border-amber-800/30 focus:ring-amber-500/20 hover:border-amber-300/60 dark:hover:border-amber-700/50 transition-all duration-200">
            <SelectValue placeholder={loadingSubjects ? 'Loading subjects...' : 'Select subject'} />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                <span className="flex items-center gap-2">
                  <BookOpen className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{subject.name}</span>
                  <span className="text-muted-foreground text-xs font-mono">
                    {subject.code}
                  </span>
                  <Badge variant="outline" className="text-[9px] ml-1">
                    {subject.type}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 gap-1.5 hover-glow-amber"
            onClick={() => setNewSessionOpen(true)}
            disabled={!selectedSubjectId}
          >
            <Plus className="size-3.5" />
            New Session
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleExport}
            disabled={!selectedSubjectId || exporting}
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* ── Session List ─────────────────────────────────────────── */}
      {loadingSessions ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !selectedSubjectId ? (
        <EmptyState
          icon={BookOpen}
          title="Select a Subject"
          description="Choose a subject from the dropdown to view attendance sessions."
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Sessions Yet"
          description="Create your first attendance session for this subject."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            <span className="h-px flex-1 bg-border" />
          </p>
          <ScrollArea className="max-h-[calc(100vh-340px)]">
            <div className="space-y-2 pr-2">
              {sessions.map((session, idx) => (
                <motion.button
                  key={session.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  onClick={() => openMarkingView(session)}
                  className="w-full text-left rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center justify-center size-7 rounded-lg bg-amber-50 dark:bg-amber-950/30 group-hover:bg-amber-100 dark:group-hover:bg-amber-950/50 transition-colors">
                          <CalendarDays className="size-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-bold">
                          {format(new Date(session.conductedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground ml-9">
                        <span>
                          by {session.markerName || 'Unknown'}
                        </span>
                        <span className="text-muted-foreground/40">|</span>
                        <span>{session._count.records} records</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {session.status === 'finalized' ? (
                        <Badge className="gap-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0">
                          <ShieldCheck className="size-2.5" />
                          Finalized
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                          <Clock className="size-2.5" />
                          Draft
                        </Badge>
                      )}
                      <ChevronLeft className="size-3.5 text-muted-foreground -rotate-180" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* ── New Session Dialog ───────────────────────────────────── */}
      <Dialog open={newSessionOpen} onOpenChange={setNewSessionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Attendance Session</DialogTitle>
            <DialogDescription>
              Select the date for the attendance session.
              {selectedSubject && (
                <span className="block mt-1 font-medium text-foreground">
                  Subject: {selectedSubject.name} ({selectedSubject.code})
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-left font-normal"
                >
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {newSessionDate ? (
                    format(newSessionDate, 'EEEE, MMMM d, yyyy')
                  ) : (
                    <span className="text-muted-foreground">Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={newSessionDate}
                  onSelect={setNewSessionDate}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewSessionOpen(false);
                setNewSessionDate(undefined);
              }}
              disabled={creatingSession}
            >
              Cancel
            </Button>
            <Button
              onClick={createSession}
              disabled={!newSessionDate || creatingSession}
            >
              {creatingSession ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Session
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ── Marking View ───────────────────────────────────────────────────

interface MarkingViewProps {
  session: Session;
  students: StudentRecord[];
  loading: boolean;
  saving: boolean;
  counts: Record<AttendanceStatus, number>;
  selectedSubject?: Subject;
  onToggleStatus: (rosterEntryId: string) => void;
  onSetLate: (rosterEntryId: string) => void;
  onLongPressStart: (e: React.TouchEvent | React.MouseEvent, rosterEntryId: string) => void;
  onLongPressEnd: () => void;
  onLongPressTriggered: React.MutableRefObject<boolean>;
  onSaveDraft: () => void;
  onFinalize: () => void;
  onMarkAllPresent: () => void;
  onBack: () => void;
  hasUnsaved: boolean;
}

function MarkingView({
  session,
  students,
  loading,
  saving,
  counts,
  selectedSubject,
  onToggleStatus,
  onSetLate,
  onLongPressStart,
  onLongPressEnd,
  onLongPressTriggered,
  onSaveDraft,
  onFinalize,
  onMarkAllPresent,
  onBack,
  hasUnsaved,
}: MarkingViewProps) {
  const isFinalized = session.status === 'finalized';
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="flex flex-col -mx-4 -mb-5 min-h-[calc(100vh-200px)]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={onBack}
            aria-label="Back to sessions"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold leading-tight truncate">
              {selectedSubject?.name ?? 'Attendance'}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(session.conductedDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
            </p>
          </div>
          {isFinalized ? (
            <Badge className="gap-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 shrink-0">
              <ShieldCheck className="size-2.5" />
              Locked
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 shrink-0">
              <Clock className="size-2.5" />
              Draft
            </Badge>
          )}
        </div>

        {/* Count indicators as pill badges */}
        <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2.5 py-1 font-semibold">
            <Check className="size-3" />
            {counts.present}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2.5 py-1 font-semibold">
            <X className="size-3" />
            {counts.absent}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2.5 py-1 font-semibold">
            <Clock className="size-3" />
            {counts.late}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-2.5 py-1 font-semibold">
            <Minus className="size-3" />
            {counts.excused}
          </span>
          <span className="ml-auto text-muted-foreground font-medium">
            {students.length} total
          </span>
        </div>

        {/* Quick action: Mark All Present */}
        {!isFinalized && counts.present < students.length && students.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2"
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
              onClick={onMarkAllPresent}
            >
              <CheckCheck className="size-3.5" />
              Mark All Present
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── Student List ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[56px] w-full rounded-lg" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Users className="size-10 text-muted-foreground mb-3 animate-float" />
            <p className="text-sm font-medium text-muted-foreground">No students found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add students to the roster first.
            </p>
          </div>
        ) : (
          <>
            {/* ── Search Bar with floating label effect ──────────── */}
            <div className="px-4 pt-3 pb-1">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground group-focus-within:text-amber-500 dark:group-focus-within:text-amber-400 transition-colors duration-200" />
                <Input
                  type="text"
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/30 focus:bg-card border-muted-foreground/20 focus:border-amber-400/50 dark:focus:border-amber-600/40 focus:ring-amber-500/10 transition-all duration-200 input-glow"
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className="text-[11px] text-muted-foreground">
                  {searchQuery.trim()
                    ? `Showing ${filteredStudents.length} of ${students.length} students`
                    : `${students.length} student${students.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-420px)] pb-20">
              <div className="space-y-1.5 p-4 pt-2 pb-48">
                {filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="size-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No matches found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const config = STATUS_CONFIG[student.status];
                    const StatusIcon = config.icon;
                    const globalIdx = students.indexOf(student) + 1;

                    return (
                      <motion.div
                        key={`${student.rosterEntryId}-${student.status}`}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                        className={`
                          flex items-center gap-3 rounded-xl border-l-4 transition-all duration-300 ease-out px-3.5 py-3 attendance-card ${student.status}
                          ${config.border} ${config.bg}
                          ${!isFinalized ? 'cursor-pointer active:scale-[0.98] hover:shadow-md hover:brightness-[1.02]' : 'opacity-75'}
                        `}
                        style={{ minHeight: 64 }}
                        onClick={() => {
                          // Skip click if long-press was triggered
                          if (onLongPressTriggered.current) {
                            onLongPressTriggered.current = false;
                            return;
                          }
                          onToggleStatus(student.rosterEntryId);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onSetLate(student.rosterEntryId);
                        }}
                        onTouchStart={(e) => onLongPressStart(e, student.rosterEntryId)}
                        onTouchEnd={() => onLongPressEnd()}
                        onMouseDown={(e) => onLongPressStart(e, student.rosterEntryId)}
                        onMouseUp={() => onLongPressEnd()}
                        onMouseLeave={() => onLongPressEnd()}
                        role={isFinalized ? undefined : 'button'}
                        tabIndex={isFinalized ? undefined : 0}
                        aria-label={`${student.name || student.rollNumber}, ${config.label}. Tap to change.`}
                      >
                        {/* Status icon circle */}
                        <motion.div
                          layout
                          className={`flex items-center justify-center size-8 rounded-full shrink-0 ${config.iconBg} ${config.iconColor} shadow-sm ring-2 ${config.ringClass}`}
                          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                        >
                          <StatusIcon className="size-4" strokeWidth={2.5} />
                        </motion.div>

                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold truncate leading-tight">{student.name || student.rollNumber}</p>
                          <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                            {student.rollNumber}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <motion.div
                          layout
                          className={`
                            flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold
                            shrink-0 shadow-sm
                            ${config.badgeClass}
                          `}
                          transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                        >
                          <StatusIcon className="size-3" />
                          <span className="hidden sm:inline">{config.label}</span>
                        </motion.div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      {/* ── Floating Action Bar ─────────────────────────────────── */}
      {!isFinalized && (
        <div className="sticky-bottom-bar">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
          <div className="mx-auto max-w-2xl flex items-center gap-2 p-3">
            <Button
              variant="outline"
              className="flex-1 gap-1.5 h-11"
              onClick={onSaveDraft}
              disabled={saving || students.length === 0}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save Draft
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-1.5 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/20 font-semibold"
              onClick={onFinalize}
              disabled={saving || students.length === 0}
            >
              <Lock className="size-4" />
              Finalize
            </Button>
          </div>
        </div>
      )}

      {/* ── Finalized read-only indicator ────────────────────────── */}
      {isFinalized && (
        <div className="sticky-bottom-bar bg-emerald-50 dark:bg-emerald-950/20">
          <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <div className="mx-auto max-w-2xl flex items-center justify-center gap-2 p-3">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              This session is finalized and locked
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Attendance View ────────────────────────────────────────

interface StudentViewProps {
  subjects: Subject[];
  selectedSubjectId: string;
  onSubjectChange: (id: string) => void;
  loading: boolean;
  attendance: StudentAttendanceView[];
  summary: { total: number; present: number; percentage: string };
  loadingSubjects: boolean;
}

function StudentAttendanceViewComponent({
  subjects,
  selectedSubjectId,
  onSubjectChange,
  loading,
  attendance,
  summary,
  loadingSubjects,
}: StudentViewProps) {
  return (
    <div className="space-y-5">
      {/* Subject Selector */}
      <Select value={selectedSubjectId} onValueChange={onSubjectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loadingSubjects ? 'Loading...' : 'Select subject'} />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              <span className="flex items-center gap-2">
                <BookOpen className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{subject.name}</span>
                <span className="text-muted-foreground text-xs font-mono">
                  {subject.code}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary Card */}
      {!loading && attendance.length > 0 && (
        <Card className="py-0 gap-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="text-2xl font-bold mt-1">
                  {summary.percentage}
                  <span className="text-sm text-muted-foreground font-normal ml-1">%</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {summary.present}/{summary.total}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  classes attended
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  parseFloat(summary.percentage) >= 75
                    ? 'bg-emerald-500'
                    : parseFloat(summary.percentage) >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(parseFloat(summary.percentage), 100)}%` }}
              />
            </div>
            {parseFloat(summary.percentage) < 75 && (
              <p className="text-[11px] text-red-600 dark:text-red-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Below 75% minimum attendance requirement
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attendance List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : !selectedSubjectId ? (
        <EmptyState
          icon={BookOpen}
          title="Select a Subject"
          description="Choose a subject to view your attendance records."
        />
      ) : attendance.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No Records Yet"
          description="Attendance records will appear here once sessions are conducted."
        />
      ) : (
        <ScrollArea className="max-h-[calc(100vh-360px)]">
          <div className="space-y-2">
            {attendance.map((record, idx) => {
              const config = STATUS_CONFIG[record.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={record.session.id}
                  className={`flex items-center gap-3 rounded-lg border border-l-4 px-4 transition-all ${config.border} ${config.bg}`}
                  style={{ minHeight: 56 }}
                >
                  <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(record.session.conductedDate + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {record.subject.name} ({record.subject.code})
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shrink-0 ${config.badgeClass}`}
                  >
                    <StatusIcon className="size-3" />
                    {config.label}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
        <Icon className="size-7 text-muted-foreground animate-float" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}
