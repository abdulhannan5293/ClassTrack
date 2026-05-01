'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  UserCog,
  ShieldCheck,
  Trash2,
  Search,
  Loader2,
  UserX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface GRUser {
  id: string;
  name: string | null;
  email: string;
  rollNumber?: string;
}

interface RosterStudent {
  id: string;
  rollNumber: string;
  name: string;
  userId: string | null;
  user?: GRUser;
}

// ── Props ──────────────────────────────────────────────────────────

interface GRManagerProps {
  classroomId: string;
  currentGR: GRUser | null;
  onGRChange: () => void;
}

// ── Component ──────────────────────────────────────────────────────

export function GRManager({ classroomId, currentGR, onGRChange }: GRManagerProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);

  // Dialog states
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  // Student list
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Action loading
  const [assignLoading, setAssignLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  // ── Fetch claimed students ──────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    if (!accessToken) return;

    setStudentsLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/roster`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('Failed to fetch roster');

      const data = await res.json();
      // Only show claimed students, exclude the CR themselves
      const claimed = (data.roster ?? []).filter(
        (s: RosterStudent) =>
          s.userId && s.user?.id !== currentUser?.id
      );
      setStudents(claimed);
    } catch {
      toast.error('Could not load student list.');
    } finally {
      setStudentsLoading(false);
    }
  }, [accessToken, classroomId, currentUser?.id]);

  useEffect(() => {
    if (assignOpen) {
      fetchStudents();
      setSearchQuery('');
      setSelectedStudent(null);
    }
  }, [assignOpen, fetchStudents]);

  // ── Filter students ────────────────────────────────────────────

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      (s.user?.email ?? '').toLowerCase().includes(q)
    );
  });

  // ── Assign GR ──────────────────────────────────────────────────

  const handleAssignGR = useCallback(async () => {
    if (!selectedStudent || !accessToken) return;

    setAssignLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/assign-gr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ studentUserId: selectedStudent }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to assign GR.');
        return;
      }

      toast.success('GR assigned successfully!');
      setAssignOpen(false);
      onGRChange();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setAssignLoading(false);
    }
  }, [selectedStudent, accessToken, classroomId, onGRChange]);

  // ── Remove GR ──────────────────────────────────────────────────

  const handleRemoveGR = useCallback(async () => {
    if (!accessToken) return;

    setRemoveLoading(true);
    try {
      const res = await fetch(`/api/classrooms/${classroomId}/assign-gr`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to remove GR.');
        return;
      }

      toast.success('GR removed successfully.');
      setRemoveOpen(false);
      onGRChange();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setRemoveLoading(false);
    }
  }, [accessToken, classroomId, onGRChange]);

  // ── Render ──────────────────────────────────────────────────────

  const selectedStudentData = students.find((s) => s.userId === selectedStudent);

  return (
    <>
      {/* Current GR Display */}
      {currentGR ? (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <ShieldCheck className="size-3" />
            GR: {currentGR.name || currentGR.email.split('@')[0]}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setRemoveOpen(true)}
            aria-label="Remove GR"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAssignOpen(true)}
        >
          <UserCog className="size-3.5" />
          Assign GR
        </Button>
      )}

      {/* ── Assign GR Dialog ─────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Girls' Representative</DialogTitle>
            <DialogDescription>
              Select a claimed student to assign as GR. They will gain access to
              attendance and result management.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 flex-1 min-h-0 flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Student List */}
            <ScrollArea className="flex-1 min-h-0 max-h-64 rounded-md border">
              <div className="p-2 space-y-1">
                {studentsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <UserX className="size-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? 'No students match your search'
                        : 'No claimed students available'}
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <button
                      key={student.userId}
                      onClick={() => setSelectedStudent(student.userId)}
                      className={`w-full flex items-center gap-3 rounded-lg p-2.5 text-left transition-colors ${
                        selectedStudent === student.userId
                          ? 'bg-primary/10 ring-1 ring-primary/30'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center size-8 rounded-full text-xs font-medium ${
                          selectedStudent === student.userId
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {(student.name || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.rollNumber} &middot; {student.user?.email}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignGR}
              disabled={!selectedStudent || assignLoading}
            >
              {assignLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Assign as GR
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove GR Confirmation Dialog ────────────────────────── */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Girls' Representative</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium text-foreground">
                {currentGR?.name || currentGR?.email.split('@')[0]}
              </span>{' '}
              as GR? They will lose access to management privileges.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            This action will immediately revoke all GR privileges for this user.
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveOpen(false)}
              disabled={removeLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveGR}
              disabled={removeLoading}
            >
              {removeLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Remove GR
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
