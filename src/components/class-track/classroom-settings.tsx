'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Shield,
  UserCog,
  Info,
  AlertTriangle,
  KeyRound,
  Users,
  BookOpen,
  GraduationCap,
  Pencil,
  Save,
  X,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';

// ── Props ──────────────────────────────────────────────────────────

interface ClassroomSettingsProps {
  classroomId: string;
  classroomName: string;
  department: string;
  sessionYear: string;
  semester: string;
  inviteCode: string;
  onClassroomUpdate: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export function ClassroomSettings({
  classroomId,
  classroomName,
  department,
  sessionYear,
  semester: initialSemester,
  inviteCode,
  onClassroomUpdate,
}: ClassroomSettingsProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const goBack = useNavStore((s) => s.goBack);

  // Editable name state (CR only)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(classroomName);
  const [savingName, setSavingName] = useState(false);

  // Editable semester state (CR only)
  const [isEditingSemester, setIsEditingSemester] = useState(false);
  const [editSemester, setEditSemester] = useState(initialSemester);
  const [savingSemester, setSavingSemester] = useState(false);

  // Invite code state
   const [codeCopied, setCodeCopied] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [currentCode, setCurrentCode] = useState(inviteCode);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // ── Save classroom name ──────────────────────────────────────────

  const handleSaveName = useCallback(async () => {
    if (!editName.trim() || editName.trim() === classroomName) {
      setIsEditingName(false);
      setEditName(classroomName);
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update classroom name.');
        return;
      }

      toast.success('Classroom name updated successfully!');
      setIsEditingName(false);
      onClassroomUpdate();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingName(false);
    }
  }, [editName, classroomName, classroomId, accessToken, onClassroomUpdate]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditName(classroomName);
  }, [classroomName]);

  // ── Save semester label ───────────────────────────────────────────

  const handleSaveSemester = useCallback(async () => {
    if (!editSemester.trim() || editSemester.trim() === initialSemester) {
      setIsEditingSemester(false);
      setEditSemester(initialSemester);
      return;
    }

    setSavingSemester(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ semester: editSemester.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update semester label.');
        return;
      }

      toast.success('Semester label updated successfully!');
      setIsEditingSemester(false);
      onClassroomUpdate();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingSemester(false);
    }
  }, [editSemester, initialSemester, classroomId, accessToken, onClassroomUpdate]);

  const handleCancelEditSemester = useCallback(() => {
    setIsEditingSemester(false);
    setEditSemester(initialSemester);
  }, [initialSemester]);

  // ── Copy invite code ─────────────────────────────────────────────

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCodeCopied(true);
      toast.success('Invite code copied to clipboard!');
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error('Failed to copy invite code.');
    }
  }, [currentCode]);

  // ── Regenerate invite code (real API) ──────────────────────────

  const handleRegenerateCode = useCallback(async () => {
    setRegeneratingCode(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ regenerateInviteCode: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to regenerate invite code.');
        return;
      }

      const newCode = data.classroom?.inviteCode;
      setCurrentCode(newCode);
      toast.success(`New invite code: ${newCode}`, {
        description: 'Share this code with students to join.',
      });

      try {
        await navigator.clipboard.writeText(newCode);
      } catch {
        // Clipboard may fail silently
      }

      onClassroomUpdate();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setRegeneratingCode(false);
    }
  }, [classroomId, accessToken, onClassroomUpdate]);

  // ── Delete classroom (real API) ──────────────────────────────

  const handleDeleteClassroom = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete classroom.');
        return;
      }

      toast.success('Classroom deleted successfully.');
      goBack();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [classroomId, accessToken, goBack]);

  return (
    <div className="space-y-5">
      {/* ── Classroom Information ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
              <Info className="size-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">Classroom Information</CardTitle>
              <CardDescription className="text-xs">
                View and manage classroom details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Classroom Name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">Classroom Name</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => setIsEditingName(true)}
                disabled={isEditingName}
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {isEditingName ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-sm"
                    maxLength={100}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    <Save className="size-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={handleCancelEditName}
                    disabled={savingName}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </motion.div>
              ) : (
                <motion.p
                  key="display"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-semibold"
                >
                  {classroomName}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <Separator className="my-2" />

          {/* Semester Label */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground font-medium">Semester</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => setIsEditingSemester(true)}
                disabled={isEditingSemester}
              >
                <Pencil className="size-3" />
                Edit
              </Button>
            </div>

            <AnimatePresence mode="wait">
              {isEditingSemester ? (
                <motion.div
                  key="edit-semester"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={editSemester}
                    onChange={(e) => setEditSemester(e.target.value)}
                    className="text-sm"
                    maxLength={50}
                    placeholder="e.g. 1st, Fall 2024"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSemester();
                      if (e.key === 'Escape') handleCancelEditSemester();
                    }}
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={handleSaveSemester}
                    disabled={savingSemester}
                  >
                    <Save className="size-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0"
                    onClick={handleCancelEditSemester}
                    disabled={savingSemester}
                  >
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="display-semester"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2"
                >
                  <Badge variant="outline" className="text-xs border-amber-300/60 text-amber-700 dark:border-amber-700/60 dark:text-amber-300 font-medium">
                    {initialSemester || '1st'}
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="my-2" />

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Department</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {department}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground font-medium">Session Year</Label>
              <p className="text-sm font-medium">{sessionYear}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground font-medium">Classroom ID</Label>
            <p className="text-xs font-mono text-muted-foreground bg-muted/50 rounded px-2 py-1.5 select-all break-all">
              {classroomId}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Invite Code Management ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-950/30">
              <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-sm">Invite Code</CardTitle>
              <CardDescription className="text-xs">
                Share this code with students to join the classroom
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4">
          {/* Current code display */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 shrink-0">
              <KeyRound className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                Current Code
              </p>
              <p className="text-lg font-bold font-mono tracking-widest">{currentCode}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleCopyCode}
            >
              {codeCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Regenerate button */}
          <div className="flex items-center justify-between rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <RotateCcw className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Regenerate Invite Code
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  The old code will no longer work
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/30"
              onClick={handleRegenerateCode}
              disabled={regeneratingCode}
            >
              {regeneratingCode ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >
                  <RotateCcw className="size-3.5" />
                </motion.div>
              ) : (
                <RotateCcw className="size-3.5" />
              )}
              Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Roles & Permissions Info ──────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-violet-100 dark:bg-violet-950/30">
              <Shield className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-sm">Roles & Permissions</CardTitle>
              <CardDescription className="text-xs">
                Information about classroom roles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {/* CR Role */}
          <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 shrink-0 mt-0.5">
              <UserCog className="size-3.5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">Class Representative (CR)</p>
                <Badge variant="default" className="text-[9px] px-1.5 py-0">
                  CR
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Full admin access. Can manage roster, subjects, attendance, results, GPA config, assign GR,
                edit classroom name, regenerate invite code, and delete classroom.
              </p>
            </div>
          </div>

          {/* GR Role */}
          <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex items-center justify-center size-7 rounded-lg bg-secondary/50 shrink-0 mt-0.5">
              <Users className="size-3.5 text-secondary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">Girls' Representative (GR)</p>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                  GR
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Limited admin access. Can manage roster, subjects, attendance, and results.
                Cannot edit classroom name, regenerate invite code, or delete classroom.
              </p>
            </div>
          </div>

          {/* Student Role */}
          <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex items-center justify-center size-7 rounded-lg bg-muted/50 shrink-0 mt-0.5">
              <GraduationCap className="size-3.5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">Student</p>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  Student
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Can view their own attendance, published results, and calculate GPA.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Danger Zone ───────────────────────────────────────────── */}
      <Card className="overflow-hidden border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-destructive/10">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-sm text-destructive">Danger Zone</CardTitle>
              <CardDescription className="text-xs">
                Irreversible and destructive actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <Trash2 className="size-5 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-destructive">Delete Classroom</p>
                <p className="text-[10px] text-muted-foreground">
                  Permanently delete this classroom, all roster entries, attendance records, and results.
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 shrink-0"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-destructive" />
                    Delete Classroom
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        Are you sure you want to delete <strong>{classroomName}</strong>?
                      </p>
                      <p className="text-destructive font-medium">
                        This action cannot be undone. All of the following will be permanently deleted:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-destructive/80">
                        <li>All roster entries ({/* placeholder */})</li>
                        <li>All attendance sessions and records</li>
                        <li>All subjects and assessments</li>
                        <li>All published results</li>
                        <li>GPA configuration</li>
                      </ul>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                    onClick={handleDeleteClassroom}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="size-4 mr-1.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4 mr-1.5" />
                        Delete Classroom
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
