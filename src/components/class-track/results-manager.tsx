'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import {
  Plus,
  Upload,
  Eye,
  Trash2,
  Send,
  Loader2,
  FileSpreadsheet,
  BarChart3,
  AlertTriangle,
  Search,
  BookOpen,
  CalendarDays,
  Download,
  CloudUpload,
  Trophy,
  AlertCircle,
  Megaphone,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

type AssessmentType = 'mid_term' | 'quiz' | 'assignment' | 'sessional';

interface Subject {
  id: string;
  name: string;
  code: string;
  creditHours: number;
}

interface Assessment {
  id: string;
  name: string;
  type: AssessmentType;
  totalMarks: number;
  dateConducted: string | null;
  isPublished: boolean;
  _count: {
    results: number;
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
}

interface ResultEntry {
  rollNumber: string;
  name: string;
  marksObtained: number;
  grade: string | null;
  remarks: string | null;
}

interface UploadPreviewRow {
  rollNumber: string;
  marksObtained: number;
}

const ASSESSMENT_TYPE_CONFIG: Record<AssessmentType, { label: string; color: string }> = {
  mid_term: { label: 'Mid Term', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
  quiz: { label: 'Quiz', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  assignment: { label: 'Assignment', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  sessional: { label: 'Sessional', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

// ── Props ──────────────────────────────────────────────────────────

interface ResultsManagerProps {
  classroomId: string;
  isAdmin: boolean;
}

// ── Component ──────────────────────────────────────────────────────

export function ResultsManager({ classroomId, isAdmin }: ResultsManagerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // ── Admin state ──────────────────────────────────────────────────
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create assessment dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    type: 'quiz' as AssessmentType,
    subjectId: '',
    totalMarks: 50,
    conductedDate: '',
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadAssessment, setUploadAssessment] = useState<Assessment | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<UploadPreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAssessmentRef = useRef(uploadAssessment);
  uploadAssessmentRef.current = uploadAssessment;

  // Publish dialog
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishAssessment, setPublishAssessment] = useState<Assessment | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAssessment, setDeleteAssessment] = useState<Assessment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // View results dialog
  const [viewOpen, setViewOpen] = useState(false);
  const [viewAssessment, setViewAssessment] = useState<Assessment | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // ── Student state ────────────────────────────────────────────────
  const [studentFilter, setStudentFilter] = useState('all');

  // ── Fetch data ───────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [assessRes, subRes] = await Promise.all([
        fetch(`/api/results/assessments?classroomId=${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`/api/subjects?classroomId=${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);

      if (assessRes.ok) {
        const data = await assessRes.json();
        setAssessments(isAdmin ? (data.assessments ?? []) : (data.assessments ?? []).filter((a: Assessment) => a.isPublished));
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubjects(data.subjects ?? []);
      }
    } catch {
      toast.error('Could not load results data.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filter ───────────────────────────────────────────────────────

  const filteredAssessments = assessments.filter((a) => {
    if (!isAdmin && !a.isPublished) return false;
    if ((!studentFilter || studentFilter === 'all') && !searchQuery.trim()) return true;
    const q = ((studentFilter !== 'all' ? studentFilter : '') || searchQuery).toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.subject.name.toLowerCase().includes(q) ||
      a.subject.code.toLowerCase().includes(q) ||
      a.type.toLowerCase().includes(q)
    );
  });

  // ── Create assessment ────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!accessToken) return;
    if (!createForm.name.trim()) {
      toast.error('Assessment name is required.');
      return;
    }
    if (!createForm.subjectId) {
      toast.error('Please select a subject.');
      return;
    }
    if (createForm.totalMarks < 1) {
      toast.error('Total marks must be at least 1.');
      return;
    }
    if (!createForm.conductedDate) {
      toast.error('Please select a date.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/results/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          subjectId: createForm.subjectId,
          type: createForm.type,
          name: createForm.name,
          totalMarks: createForm.totalMarks,
          dateConducted: createForm.conductedDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to create assessment.');
        return;
      }

      toast.success('Assessment created successfully!');
      setCreateOpen(false);
      setCreateForm({ name: '', type: 'quiz', subjectId: '', totalMarks: 50, conductedDate: '' });
      fetchData();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  }, [accessToken, createForm, classroomId, fetchData]);

  // ── Upload results ───────────────────────────────────────────────

  const parseUploadFile = useCallback((file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setUploadFile(file);
    const parsedWarnings: string[] = [];
    const rows: UploadPreviewRow[] = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (jsonData.length === 0) {
          toast.error('The file appears to be empty.');
          setUploadFile(null);
          return;
        }

        const headerKeys = Object.keys(jsonData[0]);
        const rollKey = headerKeys.find((k) => k.toLowerCase().includes('roll')) || headerKeys[0];
        const marksKey = headerKeys.find((k) => k.toLowerCase().includes('marks') || k.toLowerCase().includes('obtained')) || headerKeys[1];

        if (!rollKey || !marksKey) {
          toast.error('Could not find "Roll Number" and "Marks Obtained" columns.');
          setUploadFile(null);
          return;
        }

        const totalMarks = uploadAssessment?.totalMarks ?? 100;

        jsonData.forEach((row, idx) => {
          const rawRoll = String(row[rollKey] ?? '').trim();
          const rawMarks = Number(row[marksKey]);

          const rollNum = rawRoll.padStart(3, '0');

          if (!rollNum) {
            parsedWarnings.push(`Row ${idx + 1}: Missing roll number, skipped.`);
            return;
          }
          if (isNaN(rawMarks) || rawMarks < 0) {
            parsedWarnings.push(`Row ${idx + 1}: Invalid marks "${row[marksKey]}", skipped.`);
            return;
          }
          if (rawMarks > totalMarks) {
            parsedWarnings.push(`Row ${idx + 1}: Marks ${rawMarks} exceed total ${totalMarks}.`);
          }

          rows.push({ rollNumber: rollNum, marksObtained: rawMarks });
        });

        if (rows.length === 0) {
          toast.error('No valid entries found in the file.');
          setUploadFile(null);
          return;
        }

        setPreviewRows(rows);
        setWarnings(parsedWarnings);
      } catch {
        toast.error('Failed to parse file. Please check the format.');
        setUploadFile(null);
      }
    };

    reader.readAsArrayBuffer(file);
  }, [uploadAssessment]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseUploadFile(file);
    },
    [parseUploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) parseUploadFile(file);
    },
    [parseUploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !accessToken) return;
    const assessment = uploadAssessmentRef.current;
    if (!assessment) {
      toast.error('Assessment context lost. Please try again.');
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('assessmentId', assessment.id);

      const res = await fetch('/api/results/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to upload results.');
        return;
      }

      toast.success(`Results uploaded for "${assessment.name}"!`);
      setUploadOpen(false);
      setUploadFile(null);
      setPreviewRows([]);
      setWarnings([]);
      setUploadAssessment(null);
      fetchData();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  }, [uploadFile, accessToken, fetchData]);

  const resetUploadState = useCallback(() => {
    setUploadFile(null);
    setPreviewRows([]);
    setWarnings([]);
    // Note: do NOT reset uploadAssessment here — it must remain set for handleUpload
    setIsDragOver(false);
  }, []);

  // ── Download upload template ─────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    try {
      const totalMarks = uploadAssessment?.totalMarks ?? 50;
      const templateData = [
        { 'Roll Number': '001', 'Marks Obtained': 0 },
        { 'Roll Number': '002', 'Marks Obtained': 0 },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 15 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      const name = (uploadAssessment?.name ?? 'assessment').replace(/\s+/g, '_');
      XLSX.writeFile(wb, `${name}_template.xlsx`);
      toast.success('Template downloaded!');
    } catch {
      toast.error('Failed to download template.');
    }
  }, [uploadAssessment]);

  // ── Publish assessment ───────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    if (!publishAssessment || !accessToken) return;

    setPublishLoading(true);
    try {
      const res = await fetch('/api/results/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ assessmentId: publishAssessment.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to publish results.');
        return;
      }

      toast.success('Results published! Students can now view them.');
      setPublishOpen(false);
      setPublishAssessment(null);
      fetchData();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPublishLoading(false);
    }
  }, [publishAssessment, accessToken, fetchData]);

  // ── Delete assessment ────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteAssessment || !accessToken) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/results/${deleteAssessment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete assessment.');
        return;
      }

      toast.success('Assessment deleted successfully.');
      setDeleteOpen(false);
      setDeleteAssessment(null);
      fetchData();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteAssessment, accessToken, fetchData]);

  // ── View results ─────────────────────────────────────────────────

  const handleViewResults = useCallback(
    async (assessment: Assessment) => {
      setViewAssessment(assessment);
      setViewOpen(true);
      setResultsLoading(true);

      try {
        const res = await fetch(`/api/results/${assessment.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
        } else {
          toast.error('Failed to load results.');
          setResults([]);
        }
      } catch {
        toast.error('Network error.');
        setResults([]);
      } finally {
        setResultsLoading(false);
      }
    },
    [accessToken]
  );

  // ── Render: Student View ─────────────────────────────────────────

  if (!isAdmin) {
    return (
      <StudentResultsView
        assessments={filteredAssessments}
        subjects={subjects}
        loading={loading}
        filter={studentFilter}
        onFilterChange={setStudentFilter}
        onViewResults={handleViewResults}
      />
    );
  }

  // ── Render: Admin View ───────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Header Actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Create Assessment
        </Button>
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search assessments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-muted/30 focus:bg-card border-muted-foreground/20 focus:border-amber-400/50 dark:focus:border-amber-600/40 transition-all duration-200"
        />
      </div>

      {/* ── Assessment List ──────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="relative mb-4">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-100 via-orange-100/80 to-teal-100/60 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-teal-950/30 shadow-lg shadow-amber-500/10">
              <BarChart3 className="size-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex items-center justify-center size-6 rounded-full bg-background shadow-md border">
              <Trophy className="size-3 text-amber-500" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">
            {searchQuery ? 'No assessments match your search' : 'No assessments yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first assessment to start tracking results'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssessments.map((assessment) => {
            const typeConfig = ASSESSMENT_TYPE_CONFIG[assessment.type];
            return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
              <Card className={`py-0 gap-0 overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-sm ${
                assessment.isPublished
                  ? 'border-t-[3px] border-t-emerald-500 bg-gradient-to-r from-emerald-50/30 via-card to-card dark:from-emerald-950/10 dark:via-card dark:to-card'
                  : 'border-t-[3px] border-t-amber-400 bg-gradient-to-r from-amber-50/20 via-card to-card dark:from-amber-950/10 dark:via-card dark:to-card'
              }`}>
                {/* Subtle gradient overlay for published state */}
                {assessment.isPublished && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/3 via-transparent to-transparent pointer-events-none" />
                )}
                <CardContent className="p-4 relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {/* Status dot indicator */}
                        <div className={`size-2 rounded-full shrink-0 ${assessment.isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                        <span className="font-semibold text-sm truncate">
                          {assessment.name}
                        </span>
                        <Badge className={`gap-1 text-[10px] border-0 ${typeConfig.color}`}>
                          {typeConfig.label}
                        </Badge>
                        {assessment.isPublished ? (
                          <Badge className="gap-1 text-[10px] border-0 bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 dark:from-emerald-900/40 dark:to-emerald-900/20 dark:text-emerald-300 font-medium">
                            <Check className="size-2.5" />
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] border-amber-300/60 border-dashed text-amber-700 dark:border-amber-700/60 dark:text-amber-300">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="size-3" />
                          {assessment.subject.name} ({assessment.subject.code})
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="size-3" />
                          {assessment.totalMarks} marks
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          {assessment.dateConducted ? format(new Date(assessment.dateConducted + 'T00:00:00'), 'MMM d, yyyy') : 'No date'}
                        </span>
                        <span className={`flex items-center gap-1 ${assessment._count.results > 0 ? 'text-foreground font-medium' : ''}`}>
                          {assessment._count.results} results
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!assessment.isPublished && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                            onClick={() => {
                              setUploadAssessment(assessment);
                              resetUploadState();
                              setUploadOpen(true);
                            }}
                            aria-label="Upload results"
                          >
                            <Upload className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => {
                              setPublishAssessment(assessment);
                              setPublishOpen(true);
                            }}
                            aria-label="Publish results"
                          >
                            <Megaphone className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeleteAssessment(assessment);
                              setDeleteOpen(true);
                            }}
                            aria-label="Delete assessment"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => handleViewResults(assessment)}
                        aria-label="View results"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create Assessment Dialog ─────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>
              Add a new assessment to this classroom.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="assess-name">Assessment Name</Label>
              <Input
                id="assess-name"
                placeholder="e.g. Quiz 1 - Chapter 3"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Type & Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(val) => setCreateForm((prev) => ({ ...prev, type: val as AssessmentType }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ASSESSMENT_TYPE_CONFIG) as AssessmentType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {ASSESSMENT_TYPE_CONFIG[type].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select
                  value={createForm.subjectId}
                  onValueChange={(val) => setCreateForm((prev) => ({ ...prev, subjectId: val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Total Marks & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="total-marks">Total Marks</Label>
                <Input
                  id="total-marks"
                  type="number"
                  min={1}
                  value={createForm.totalMarks}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, totalMarks: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conduct-date">Date Conducted</Label>
                <Input
                  id="conduct-date"
                  type="date"
                  value={createForm.conductedDate}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, conductedDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Assessment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Upload Results Dialog ────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) {
            setUploadFile(null);
            setPreviewRows([]);
            setWarnings([]);
            setUploadAssessment(null);
            setIsDragOver(false);
          }
          setUploadOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Results</DialogTitle>
            <DialogDescription>
              {uploadAssessment && (
                <>
                  Upload marks for{' '}
                  <span className="font-medium text-foreground">{uploadAssessment.name}</span>
                  {' '}({uploadAssessment.totalMarks} total marks)
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Download template */}
            <Button variant="outline" size="sm" className="gap-1.5 w-fit" onClick={handleDownloadTemplate}>
              <Download className="size-3.5" />
              Download Template
            </Button>

            {/* Drop Zone */}
            {!uploadFile && (
              <motion.div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                animate={isDragOver ? { scale: 1.01, borderColor: 'var(--color-primary)' } : { scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-500 cursor-pointer bg-gradient-to-b from-muted/20 to-muted/5 ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-500/10 scale-[1.02]'
                    : 'border-muted-foreground/25 hover:border-amber-400/60 hover:bg-amber-50/20 dark:hover:bg-amber-950/10 hover:shadow-md hover:shadow-amber-500/5'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`flex items-center justify-center size-16 rounded-2xl mb-4 transition-all duration-300 ${
                  isDragOver
                    ? 'bg-amber-100 dark:bg-amber-900/40 shadow-md shadow-amber-500/20'
                    : 'bg-muted/60'
                }`}>
                  <CloudUpload
                    className={`size-7 transition-all duration-300 ${
                      isDragOver ? 'text-amber-600 dark:text-amber-400 -translate-y-1' : 'text-muted-foreground/50'
                    }`}
                  />
                </div>
                <p className="text-sm font-semibold">
                  {isDragOver ? 'Release to upload' : 'Upload your file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Expects &quot;Roll Number&quot; and &quot;Marks Obtained&quot; columns
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {['.xlsx', '.xls', '.csv'].map((ext) => (
                    <span key={ext} className="text-[10px] text-muted-foreground bg-muted/80 dark:bg-muted/30 px-1.5 py-0.5 rounded font-mono">
                      {ext}
                    </span>
                  ))}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </motion.div>
            )}

            {/* File Info */}
            {uploadFile && (
              <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
                <FileSpreadsheet className="size-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => {
                    setUploadFile(null);
                    setPreviewRows([]);
                    setWarnings([]);
                  }}
                >
                  ✕
                </Button>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Warnings
                  </p>
                </div>
                <ScrollArea className="max-h-24">
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {warnings.slice(0, 10).map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                    {warnings.length > 10 && (
                      <li className="text-amber-600">...and {warnings.length - 10} more</li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Preview — showing first 10 of {previewRows.length} entries
                </p>
                <div className="rounded-md border max-h-52 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Marks Obtained</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{row.rollNumber}</TableCell>
                          <TableCell className="font-medium">{row.marksObtained}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploadLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile || previewRows.length === 0 || uploadLoading}
            >
              {uploadLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="size-4" />
                  Confirm Upload ({previewRows.length} entries)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Publish Confirmation ─────────────────────────────────── */}
      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Results?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the results for{' '}
              <span className="font-medium text-foreground">{publishAssessment?.name}</span>{' '}
              visible to all students in the classroom. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {publishAssessment && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {publishAssessment._count.results} result{publishAssessment._count.results !== 1 ? 's' : ''} will be published
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Once published, results cannot be unpublished.
                  </p>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={publishLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={publishLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
            >
              {publishLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" />
                  Publish Results
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation ──────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteAssessment?.name}</span>?
              All associated results will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── View Results Dialog ──────────────────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>{viewAssessment?.name ?? 'Results'}</DialogTitle>
                <DialogDescription>
                  {viewAssessment && (
                    <>
                      {viewAssessment.subject.name} ({viewAssessment.subject.code}) ·{' '}
                      {viewAssessment.totalMarks} total marks ·{' '}
                      {viewAssessment._count.results} result{viewAssessment._count.results !== 1 ? 's' : ''}
                    </>
                  )}
                </DialogDescription>
              </div>
              {results.length > 0 && viewAssessment && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  onClick={() => {
                    try {
                      const totalMarks = viewAssessment.totalMarks;
                      const exportData = results.map((r, i) => ({
                        '#': i + 1,
                        'Roll Number': r.rollNumber,
                        Name: r.name,
                        'Marks Obtained': r.marksObtained,
                        'Total Marks': totalMarks,
                        Percentage: totalMarks > 0 ? ((r.marksObtained / totalMarks) * 100).toFixed(1) + '%' : '0%',
                        Grade: r.grade ?? '',
                        Remarks: r.remarks ?? '',
                      }));
                      const ws = XLSX.utils.json_to_sheet(exportData);
                      ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 20 }];
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, 'Results');
                      const name = viewAssessment.name.replace(/\s+/g, '_');
                      XLSX.writeFile(wb, `${name}_results.xlsx`);
                      toast.success('Results downloaded!');
                    } catch {
                      toast.error('Failed to download results.');
                    }
                  }}
                >
                  <Download className="size-3.5" />
                  Download
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {resultsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No results recorded yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead className="hidden sm:table-cell">Grade</TableHead>
                      <TableHead className="hidden md:table-cell">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((entry, idx) => {
                      const totalMarks = viewAssessment?.totalMarks ?? 100;
                      const percentage = totalMarks > 0 ? (entry.marksObtained / totalMarks) * 100 : 0;
                      const isHighest = idx === 0 && results.length > 1 && entry.marksObtained === Math.max(...results.map(r => r.marksObtained));
                      const isFailing = percentage < 50;
                      let marksColor = 'text-muted-foreground';
                      let barColor = 'bg-muted-foreground/30';
                      if (percentage >= 80) { marksColor = 'text-emerald-600 dark:text-emerald-400'; barColor = 'bg-emerald-500'; }
                      else if (percentage >= 60) { marksColor = 'text-amber-600 dark:text-amber-400'; barColor = 'bg-amber-500'; }
                      else if (percentage < 40) { marksColor = 'text-red-600 dark:text-red-400'; barColor = 'bg-red-500'; }
                      else { barColor = 'bg-amber-400'; }

                      return (
                        <TableRow key={idx} className="group">
                          <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{entry.rollNumber}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-1.5">
                              {entry.name}
                              {isHighest && <Trophy className="size-3.5 text-amber-500" />}
                              {isFailing && <AlertCircle className="size-3.5 text-red-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="space-y-1">
                              <span className={`font-semibold ${marksColor}`}>
                                {entry.marksObtained} / {totalMarks}
                              </span>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {entry.grade ? (
                              <Badge variant="outline" className="font-mono">{entry.grade}</Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {entry.remarks ?? '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Student Results View ────────────────────────────────────────────

interface StudentResultsViewProps {
  assessments: Assessment[];
  subjects: Subject[];
  loading: boolean;
  filter: string;
  onFilterChange: (val: string) => void;
  onViewResults: (assessment: Assessment) => void;
}

function StudentResultsView({
  assessments,
  subjects,
  loading,
  filter,
  onFilterChange,
  onViewResults,
}: StudentResultsViewProps) {
  return (
    <div className="space-y-5">
      {/* Subject Filter */}
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All subjects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All subjects</SelectItem>
          {subjects.map((sub) => (
            <SelectItem key={sub.id} value={sub.id}>
              <span className="flex items-center gap-2">
                <BookOpen className="size-3.5 text-muted-foreground" />
                {sub.name} ({sub.code})
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assessment Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="size-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No published results yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Results will appear here once published by CR or GR.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {assessments.map((assessment) => {
            const typeConfig = ASSESSMENT_TYPE_CONFIG[assessment.type];
            return (
              <Card
                key={assessment.id}
                className="py-0 gap-0 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                onClick={() => onViewResults(assessment)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{assessment.name}</span>
                      <Badge className={`gap-1 text-[10px] border-0 ${typeConfig.color}`}>
                        {typeConfig.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>{assessment.subject.name} ({assessment.subject.code})</p>
                      <p>Total Marks: {assessment.totalMarks}</p>
                      <p>
                        {assessment.conductedDate
                          ? format(new Date(assessment.conductedDate + 'T00:00:00'), 'MMM d, yyyy')
                          : 'No date'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
