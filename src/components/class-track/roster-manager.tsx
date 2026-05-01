'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Download,
  Search,
  Loader2,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  CloudUpload,
  X,
  UserPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface RosterEntry {
  id: string;
  rollNumber: string;
  name: string;
  userId: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface UploadPreviewRow {
  rollNumber: string;
  name: string;
}

// ── Props ──────────────────────────────────────────────────────────

interface RosterManagerProps {
  classroomId: string;
}

// ── Component ──────────────────────────────────────────────────────

export function RosterManager({ classroomId }: RosterManagerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Roster data
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add student dialog
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addRollNumber, setAddRollNumber] = useState('');
  const [addName, setAddName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addErrors, setAddErrors] = useState<{ rollNumber?: string; name?: string }>({});

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<UploadPreviewRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch roster ────────────────────────────────────────────────

  const fetchRoster = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/roster`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch roster');

      const data = await res.json();
      setRoster(data.roster ?? []);
    } catch {
      toast.error('Could not load roster.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // ── Stats ───────────────────────────────────────────────────────

  const totalStudents = roster.length;
  const claimedCount = roster.filter((r) => r.userId).length;
  const unclaimedCount = totalStudents - claimedCount;

  // ── Filter ──────────────────────────────────────────────────────

  const filteredRoster = roster.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.rollNumber.toLowerCase().includes(q) ||
      (entry.user?.email ?? '').toLowerCase().includes(q)
    );
  });

  // ── Download template ───────────────────────────────────────────

  const handleDownloadTemplate = useCallback(() => {
    try {
      const templateData = [
        { 'Roll Number': '001', Name: 'Student Name' },
        { 'Roll Number': '002', Name: 'Another Student' },
      ];
      const ws = XLSX.utils.json_to_sheet(templateData);
      ws['!cols'] = [{ wch: 15 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Roster');
      XLSX.writeFile(wb, 'roster_template.xlsx');
      toast.success('Template downloaded!');
    } catch {
      toast.error('Failed to download template.');
    }
  }, []);

  // ── File handling ───────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      toast.error('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    setUploadFile(file);
    const warnings: string[] = [];
    const rows: UploadPreviewRow[] = [];

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (jsonData.length === 0) {
          toast.error('The file appears to be empty.');
          setUploadFile(null);
          return;
        }

        const headerKeys = Object.keys(jsonData[0]);
        const rollKey = headerKeys.find((k) =>
          k.toLowerCase().includes('roll')
        ) || headerKeys[0];
        const nameKey = headerKeys.find((k) =>
          k.toLowerCase().includes('name')
        ) || headerKeys[1];

        if (!rollKey || !nameKey) {
          toast.error('Could not find "Roll Number" and "Name" columns.');
          setUploadFile(null);
          return;
        }

        jsonData.forEach((row, idx) => {
          const rawRoll = String(row[rollKey] ?? '').trim();
          const rawName = String(row[nameKey] ?? '').trim();

          // Normalize roll number
          const rollNum = rawRoll.padStart(3, '0');
          // Normalize name
          const name = rawName
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');

          if (!rollNum || !name) {
            warnings.push(`Row ${idx + 1}: Missing data, skipped.`);
            return;
          }

          if (rollNum !== rawRoll) {
            warnings.push(
              `Row ${idx + 1}: Roll number normalized from "${rawRoll}" to "${rollNum}"`
            );
          }

          if (name !== rawName) {
            warnings.push(
              `Row ${idx + 1}: Name normalized from "${rawName}" to "${name}"`
            );
          }

          rows.push({ rollNumber: rollNum, name });
        });

        if (rows.length === 0) {
          toast.error('No valid entries found in the file.');
          setUploadFile(null);
          return;
        }

        setPreviewRows(rows);
        setWarnings(warnings);
      } catch {
        toast.error('Failed to parse file. Please check the format.');
        setUploadFile(null);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ── Upload ──────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!uploadFile || !accessToken) return;

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const res = await fetch(`/api/classrooms/${classroomId}/roster/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to upload roster.');
        return;
      }

      toast.success(
        `Roster uploaded! ${data.added ?? 0} added, ${data.updated ?? 0} updated.`
      );
      setUploadOpen(false);
      setUploadFile(null);
      setPreviewRows([]);
      setWarnings([]);
      fetchRoster();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setUploadLoading(false);
    }
  }, [uploadFile, accessToken, classroomId, fetchRoster]);

  // ── Add single student ─────────────────────────────────────────

  const validateAddForm = useCallback(() => {
    const errors: { rollNumber?: string; name?: string } = {};
    if (!addRollNumber.trim()) {
      errors.rollNumber = 'Roll number is required.';
    }
    if (!addName.trim()) {
      errors.name = 'Name is required.';
    } else if (addName.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }
    setAddErrors(errors);
    return Object.keys(errors).length === 0;
  }, [addRollNumber, addName]);

  const handleAddStudent = useCallback(async () => {
    if (!validateAddForm() || !accessToken) return;

    setAddLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/roster/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rollNumber: addRollNumber.trim(),
          name: addName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to add student.');
        return;
      }

      toast.success(`${addName.trim()} (${addRollNumber.trim().padStart(3, '0')}) added to roster!`);
      setAddStudentOpen(false);
      setAddRollNumber('');
      setAddName('');
      setAddErrors({});
      fetchRoster();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setAddLoading(false);
    }
  }, [validateAddForm, accessToken, classroomId, addRollNumber, addName, fetchRoster]);

  const resetAddStudentState = useCallback(() => {
    setAddRollNumber('');
    setAddName('');
    setAddErrors({});
  }, []);

  // ── Reset upload state ──────────────────────────────────────────

  const resetUploadState = useCallback(() => {
    setUploadFile(null);
    setPreviewRows([]);
    setWarnings([]);
    setSearchQuery('');
  }, []);

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-4 gap-2">
          <CardHeader className="pb-0 pt-0 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-muted-foreground/40" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-0">
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-xl font-bold compact-stat-badge">{loading ? '—' : totalStudents}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-2">
          <CardHeader className="pb-0 pt-0 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Claimed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-0">
            <div className="flex items-center gap-1.5">
              <UserCheck className="size-4 text-emerald-500" />
              <span className="text-xl font-bold text-emerald-600">{loading ? '—' : claimedCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4 gap-2">
          <CardHeader className="pb-0 pt-0 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-gray-400" />
              Unclaimed
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-0">
            <div className="flex items-center gap-1.5">
              <UserX className="size-4 text-amber-500" />
              <span className="text-xl font-bold text-amber-600">{loading ? '—' : unclaimedCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Actions ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleDownloadTemplate}
        >
          <Download className="size-3.5" />
          Download Template
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-dashed"
          onClick={() => {
            resetAddStudentState();
            setAddStudentOpen(true);
          }}
        >
          <UserPlus className="size-3.5" />
          Add Student
        </Button>

        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => {
            resetUploadState();
            setUploadOpen(true);
          }}
        >
          <Upload className="size-3.5" />
          Upload Roster
        </Button>
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name, roll number, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 glass-input-enhanced"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* ── Roster Table ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filteredRoster.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Users className="size-7" />
          </div>
          <h3 className="empty-state-title">
            {searchQuery ? 'No students match your search' : 'No students in roster'}
          </h3>
          <p className="empty-state-desc">
            {searchQuery
              ? 'Try a different search term'
              : 'Upload a roster file or add students manually to get started.'}
          </p>
          {!searchQuery && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Upload className="size-2.5" />
                Upload Excel
              </Badge>
              <span className="text-muted-foreground/40">or</span>
              <Badge variant="outline" className="text-[10px] gap-1">
                <UserPlus className="size-2.5" />
                Add Manually
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-20">#</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoster.map((entry, idx) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className={`border-b transition-colors hover:bg-muted/50 ${
                      idx % 2 === 0 ? 'row-even' : 'row-odd'
                    } ${
                      entry.userId
                        ? 'border-l-[3px] border-l-emerald-500'
                        : 'border-l-[3px] border-l-gray-300 dark:border-l-gray-600'
                    }`}
                  >
                    <td className="text-muted-foreground text-xs py-3 px-4">
                      {idx + 1}
                    </td>
                    <td className="font-mono text-sm py-3 px-4">
                      {entry.rollNumber}
                    </td>
                    <td className="font-medium py-3 px-4">{entry.name}</td>
                    <td className="hidden sm:table-cell py-3 px-4">
                      {entry.userId ? (
                        <Badge variant="default" className="gap-1 text-[10px] bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="size-2.5" />
                          Claimed
                        </Badge>
                      ) : (
                        <Badge className="gap-1 text-[10px] bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 dark:from-amber-900/40 dark:to-orange-900/30 dark:text-amber-300 border-0">
                          <XCircle className="size-2.5" />
                          Unclaimed
                        </Badge>
                      )}
                    </td>
                    <td className="hidden md:table-cell text-xs text-muted-foreground py-3 px-4">
                      {entry.user?.email ?? '—'}
                    </td>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Upload Dialog ────────────────────────────────────────── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (!open) resetUploadState();
          setUploadOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Upload Roster</DialogTitle>
            <DialogDescription>
              Upload an Excel or CSV file with &quot;Roll Number&quot; and &quot;Name&quot; columns.
              Existing entries will be updated.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Drop Zone */}
            {!uploadFile && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-200 cursor-pointer ${
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <CloudUpload
                  className={`size-10 mb-3 transition-colors ${
                    isDragOver ? 'text-primary' : 'text-muted-foreground/60'
                  }`}
                />
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .xlsx, .xls, .csv files
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
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
                    Normalization Changes
                  </p>
                </div>
                <ScrollArea className="max-h-24">
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                    {warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
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
                        <TableHead>Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {row.rollNumber}
                          </TableCell>
                          <TableCell className="font-medium">{row.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploadLoading}
            >
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

      {/* ── Add Student Dialog ────────────────────────────────────── */}
      <Dialog
        open={addStudentOpen}
        onOpenChange={(open) => {
          if (!open) resetAddStudentState();
          setAddStudentOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Add Student
            </DialogTitle>
            <DialogDescription>
              Manually add a single student to the roster. The roll number will be auto-padded to 3 digits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Roll Number */}
            <div className="space-y-2">
              <Label htmlFor="add-roll-number" className="text-xs font-medium">
                Roll Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-roll-number"
                placeholder="e.g. 001, 42, 123"
                value={addRollNumber}
                onChange={(e) => {
                  setAddRollNumber(e.target.value);
                  if (addErrors.rollNumber) {
                    setAddErrors((prev) => ({ ...prev, rollNumber: undefined }));
                  }
                }}
                className={addErrors.rollNumber ? 'border-destructive focus-visible:ring-destructive' : ''}
                maxLength={10}
              />
              {addErrors.rollNumber && (
                <p className="text-xs text-destructive">{addErrors.rollNumber}</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="add-name" className="text-xs font-medium">
                Student Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-name"
                placeholder="e.g. John Doe"
                value={addName}
                onChange={(e) => {
                  setAddName(e.target.value);
                  if (addErrors.name) {
                    setAddErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                className={addErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}
                maxLength={100}
              />
              {addErrors.name && (
                <p className="text-xs text-destructive">{addErrors.name}</p>
              )}
            </div>

            {/* Preview */}
            {(addRollNumber.trim() || addName.trim()) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border bg-muted/30 px-4 py-3"
              >
                <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wider">
                  Preview
                </p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-muted-foreground">
                    {addRollNumber.trim().padStart(3, '0') || '___'}
                  </span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-sm font-medium">
                    {addName.trim() || 'Student Name'}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddStudentOpen(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={addLoading}
            >
              {addLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" />
                  Add Student
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
