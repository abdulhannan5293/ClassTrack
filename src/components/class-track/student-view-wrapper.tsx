'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  GraduationCap,
  ClipboardCheck,
  BarChart3,
  FileText,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore } from '@/stores/nav-store';
import { AttendanceMarker } from './attendance-marker';
import { ResultsManager } from './results-manager';
import { StudentReportCard } from './student-report-card';

// ── Types ──────────────────────────────────────────────────────────

interface ClassroomOption {
  id: string;
  name: string;
}

type StudentViewMode = 'attendance' | 'results' | 'report';

// ── Component ──────────────────────────────────────────────────────

export function StudentViewWrapper({ mode }: { mode: StudentViewMode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const goBack = useNavStore((s) => s.goBack);

  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Fetch classrooms ────────────────────────────────────────────

  useEffect(() => {
    const fetchClassrooms = async () => {
      if (!accessToken) return;
      setLoading(true);
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
        setLoading(false);
      }
    };
    fetchClassrooms();
  }, [accessToken]);

  // ── Title and icon ──────────────────────────────────────────────

  const title = mode === 'attendance' ? 'My Attendance' : mode === 'results' ? 'My Results' : 'Report Card';
  const Icon = mode === 'attendance' ? ClipboardCheck : mode === 'results' ? BarChart3 : FileText;

  // ── Render: No classrooms ───────────────────────────────────────

  if (!loading && classrooms.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
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
              <Icon className="size-4 text-primary shrink-0" />
              <h1 className="text-sm font-bold truncate">{title}</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <GraduationCap className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No classrooms yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Join a classroom first to view your {mode}.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ── Render: Select classroom ────────────────────────────────────

  if (!selectedClassroomId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
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
              <Icon className="size-4 text-primary shrink-0" />
              <h1 className="text-sm font-bold truncate">{title}</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <GraduationCap className="size-3.5 text-muted-foreground" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </main>
      </div>
    );
  }

  // ── Render: Classroom selected, show content ────────────────────

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
            <Icon className="size-4 text-primary shrink-0" />
            <h1 className="text-sm font-bold truncate">{title}</h1>
          </div>
        </div>
      </header>

      {/* ── Classroom Selector ───────────────────────────────────── */}
      <div className="sticky top-[3rem] z-20 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-2xl px-4 py-2">
          <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
            <SelectTrigger className="w-full h-8 text-sm">
              <SelectValue placeholder="Select classroom" />
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <GraduationCap className="size-3.5 text-muted-foreground" />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5">
        {mode === 'report' ? (
          <StudentReportCard />
        ) : mode === 'attendance' ? (
          <AttendanceMarker classroomId={selectedClassroomId} isAdmin={false} />
        ) : (
          <ResultsManager classroomId={selectedClassroomId} isAdmin={false} />
        )}
      </main>
    </div>
  );
}
