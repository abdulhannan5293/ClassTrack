'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Copy,
  Check,
  GraduationCap,
  ShieldCheck,
  Users,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Settings,
  LayoutDashboard,
  Loader2,
  X,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  FileCheck,
  BarChart2,
  Megaphone,
  CalendarRange,
  Cog,
  Trophy,
  StickyNote,
  MessageSquare,
  Timer,
  BarChart2 as ChartLine,
  BarChart2 as GradeDistIcon,
  MessageSquarePlus,
  Library,
  CalendarClock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore, type ClassroomTab } from '@/stores/nav-store';

import { GRManager } from './gr-manager';
import { RosterManager } from './roster-manager';
import { SubjectManager } from './subject-manager';
import { AttendanceMarker } from './attendance-marker';
import { ResultsManager } from './results-manager';
import { GPAConfig } from './gpa-config';
import { AnnouncementsBoard } from './announcements-board';
import { AttendanceHeatmap } from './attendance-heatmap';
import { ClassroomSettings } from './classroom-settings';
import { StudentLeaderboard } from './student-leaderboard';
import { ClassroomNotes } from './classroom-notes';
import { AttendanceAnalytics } from './attendance-analytics';
import { ClassroomMessages } from './classroom-messages';
import { ThemeToggle } from './theme-toggle';
import { ClassroomPolls } from './classroom-polls';
import { DiscussionThread } from './discussion-thread';
import { AttendanceTrendChart } from './attendance-trend-chart';
import { GradeDistribution } from './grade-distribution';
import { SessionFeedback } from './session-feedback';
import { ResourceLibrary } from './resource-library';
import { AttendanceSummaryWidget } from './attendance-summary-widget';
import { DeadlineTracker } from './deadline-tracker';
import { QuickActionsPanel } from './quick-actions-panel';

// ── Types ──────────────────────────────────────────────────────────

interface ClassroomData {
  id: string;
  name: string;
  department: string;
  sessionYear: string;
  semester: string;
  semesterOrder: number;
  inviteCode: string;
  crId: string;
  crName: string | null;
  grId: string | null;
  grName: string | null;
  studentCount: number;
  claimedCount: number;
  subjects: number;
  userRole: string;
}

// ── Tab Definitions ───────────────────────────────────────────────

const ADMIN_TABS: { value: ClassroomTab; label: string; icon: typeof LayoutDashboard }[] = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'announcements', label: 'Notices', icon: Megaphone },
  { value: 'roster', label: 'Roster', icon: Users },
  { value: 'subjects', label: 'Subjects', icon: BookOpen },
  { value: 'attendance', label: 'Attendance', icon: ClipboardCheck },
  { value: 'heatmap', label: 'Calendar', icon: CalendarRange },
  { value: 'trend', label: 'Trend', icon: TrendingUp },
  { value: 'grades', label: 'Grades', icon: GradeDistIcon },
  { value: 'results', label: 'Results', icon: BarChart3 },
  { value: 'gpa-config', label: 'GPA', icon: Settings },
  { value: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { value: 'feedback', label: 'Feedback', icon: MessageSquarePlus },
  { value: 'resources', label: 'Resources', icon: Library },
  { value: 'polls', label: 'Polls', icon: BarChart3 },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'notes', label: 'Notes', icon: StickyNote },
  { value: 'deadlines', label: 'Deadlines', icon: CalendarClock },
  { value: 'settings', label: 'Settings', icon: Cog },
];

const STUDENT_TABS: { value: ClassroomTab; label: string; icon: typeof LayoutDashboard }[] = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'announcements', label: 'Notices', icon: Megaphone },
  { value: 'attendance', label: 'My Attendance', icon: ClipboardCheck },
  { value: 'heatmap', label: 'Calendar', icon: CalendarRange },
  { value: 'trend', label: 'Trend', icon: TrendingUp },
  { value: 'grades', label: 'Grades', icon: GradeDistIcon },
  { value: 'feedback', label: 'Feedback', icon: MessageSquarePlus },
  { value: 'resources', label: 'Resources', icon: Library },
  { value: 'polls', label: 'Polls', icon: BarChart3 },
  { value: 'discussion', label: 'Discussion', icon: MessageSquare },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'messages', label: 'Messages', icon: MessageSquare },
  { value: 'deadlines', label: 'Deadlines', icon: CalendarClock },
  { value: 'notes', label: 'Notes', icon: StickyNote },
];

// ── Component ──────────────────────────────────────────────────────

export function ClassroomDetail() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const classroomId = useNavStore((s) => s.classroomId);
  const classroomTab = useNavStore((s) => s.classroomTab);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);
  const goBack = useNavStore((s) => s.goBack);

  // Classroom data
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Invite code copy
  const [copied, setCopied] = useState(false);

  // ── Fetch classroom ─────────────────────────────────────────────

  const fetchClassroom = useCallback(async () => {
    if (!accessToken || !classroomId) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/classrooms/${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch classroom');
      }

      const data = await res.json();
      const raw = data.classroom ?? data;
      // Map API response to component format
      const mapped: ClassroomData = {
        id: raw.id,
        name: raw.name,
        department: raw.department,
        sessionYear: raw.sessionYear,
        semester: raw.semester ?? '1st',
        semesterOrder: raw.semesterOrder ?? 1,
        inviteCode: raw.inviteCode,
        crId: raw.crId,
        crName: raw.crName ?? null,
        grId: raw.grId ?? null,
        grName: raw.grName ?? null,
        studentCount: raw.studentCount ?? 0,
        claimedCount: raw.claimedCount ?? 0,
        subjects: raw.subjects ?? raw._count?.subjects ?? 0,
        userRole: raw.userRole ?? 'student',
      };
      setClassroom(mapped);
    } catch {
      setError('Could not load classroom details.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchClassroom();
  }, [fetchClassroom]);

  // ── Derived state ───────────────────────────────────────────────

  const isAdmin = classroom?.userRole === 'cr' || classroom?.userRole === 'CR' || classroom?.userRole === 'gr' || classroom?.userRole === 'GR';
  const isCR = classroom?.userRole === 'cr' || classroom?.userRole === 'CR';
  const tabs = isAdmin ? ADMIN_TABS : STUDENT_TABS;

  // ── Copy invite code ────────────────────────────────────────────

  const handleCopyCode = useCallback(async () => {
    if (!classroom) return;
    try {
      await navigator.clipboard.writeText(classroom.inviteCode);
      setCopied(true);
      toast.success('Invite code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy invite code');
    }
  }, [classroom]);

  // ── GR change callback ──────────────────────────────────────────

  const handleGRChange = useCallback(() => {
    fetchClassroom();
  }, [fetchClassroom]);

  // ── Role badge variant ──────────────────────────────────────────

  const getRoleVariant = (role: string) => {
    if (role === 'CR') return 'default' as const;
    if (role === 'GR') return 'secondary' as const;
    return 'outline' as const;
  };

  // ── Loading state ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-5">
          <div className="space-y-6">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={goBack}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="text-sm font-semibold">Classroom</span>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="size-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {error || 'Classroom not found'}
            </p>
            <Button variant="outline" size="sm" onClick={goBack}>
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────

  // Department color mapping
  const deptGradients: Record<string, string> = {
    CE: 'from-orange-500/10 via-amber-500/5 to-transparent',
    CS: 'from-teal-500/10 via-emerald-500/5 to-transparent',
  };
  const deptBorderColors: Record<string, string> = {
    CE: 'border-l-orange-400',
    CS: 'border-l-teal-400',
  };
  const headerGradient = deptGradients[classroom.department] || 'from-gray-500/10 to-transparent';
  const headerBorderAccent = deptBorderColors[classroom.department] || 'border-l-gray-400';

  return (
    <Tabs value={classroomTab} onValueChange={(val) => setClassroomTab(val as ClassroomTab)}>
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 border-l-4 ${headerBorderAccent}`}>
        {/* Gradient mesh header background with parallax depth */}
        <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-r ${headerGradient} pointer-events-none`} />
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.06)_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.04)_0%,transparent_50%)] pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.04)_0%,transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(20,184,166,0.03)_0%,transparent_50%)] pointer-events-none" />
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
          {/* Top row: back + name + role */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={goBack}
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate text-gradient-amber">
                {classroom.name}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {classroom.department}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  Session {classroom.sessionYear}
                </span>
              </div>
            </div>

            <Badge
              variant={getRoleVariant(classroom.userRole)}
              className="text-[10px] px-1.5 py-0 shrink-0"
            >
              {classroom.userRole}
            </Badge>

            <ThemeToggle />
          </div>

          {/* CR & GR info row */}
          <div className="flex items-center gap-2 flex-wrap pl-11">
            {/* CR Info */}
            {classroom.crName && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">CR:</span>
                <span className="text-[11px] font-medium">
                  {classroom.crName}
                </span>
                <Badge variant={getRoleVariant('CR')} className="text-[9px] px-1 py-0">
                  CR
                </Badge>
              </div>
            )}

            {classroom.crName && classroom.grName && (
              <span className="text-muted-foreground text-[10px]">|</span>
            )}

            {/* GR Info */}
            {classroom.grName && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">GR:</span>
                <span className="text-[11px] font-medium">
                  {classroom.grName}
                </span>
                <Badge variant={getRoleVariant('GR')} className="text-[9px] px-1 py-0">
                  GR
                </Badge>
              </div>
            )}

            {/* Assign GR (CR only) */}
            {isCR && (
              <>
                <span className="text-muted-foreground text-[10px]">|</span>
                <GRManager
                  classroomId={classroom.id}
                  currentGR={classroom.grId && classroom.grName ? { id: classroom.grId, name: classroom.grName, email: '' } : null}
                  onGRChange={handleGRChange}
                />
              </>
            )}

            {/* Invite Code (CR or GR) */}
            {isAdmin && (
              <>
                <span className="text-muted-foreground text-[10px]">|</span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-accent"
                  aria-label="Copy invite code"
                >
                  {copied ? (
                    <>
                      <Check className="size-3 text-emerald-500" />
                      <span className="text-emerald-500 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" />
                      <span className="font-mono font-medium">{classroom.inviteCode}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ───────────────────────────────────────── */}
      <div className="sticky top-[calc(3rem+3.25rem)] z-20 border-b bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 relative">
        {/* Tab scroll gradient indicators */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
        {/* Animated gradient underline bar */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />
        <div className="mx-auto max-w-2xl px-4">
          <TabsList className="w-full overflow-x-auto flex-nowrap no-scrollbar gap-1">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex-1 min-w-0 gap-1 text-xs data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-[0_1px_0_0_rgba(245,158,11,0.3)] data-[state=active]:bg-amber-50 dark:data-[state=active]:bg-amber-950/30 data-[state=active]:scale-[1.03] transition-all duration-200"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
        </div>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-5">
          {/* Overview Tab */}
          <TabsContent value="overview">
            <OverviewTab classroom={classroom} />
            <div className="mt-5">
              <AttendanceSummaryWidget classroomId={classroom.id} />
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <AnnouncementsBoard classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Roster Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="roster">
              <RosterManager classroomId={classroom.id} />
            </TabsContent>
          )}

          {/* Subjects Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="subjects">
              <SubjectManager classroomId={classroom.id} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AttendanceMarker classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <GradeDistribution classroomId={classroom.id} />
          </TabsContent>

          {/* Results Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="results">
              <ResultsManager classroomId={classroom.id} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* GPA Config Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="gpa-config">
              <GPAConfig classroomId={classroom.id} />
            </TabsContent>
          )}

          {/* Leaderboard Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="leaderboard">
              <StudentLeaderboard classroomId={classroom.id} isAdmin={isAdmin} />
            </TabsContent>
          )}

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AttendanceAnalytics classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ClassroomMessages classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <ClassroomNotes classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Attendance Heatmap Tab */}
          <TabsContent value="heatmap">
            <AttendanceHeatmap classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Attendance Trend Chart Tab */}
          <TabsContent value="trend">
            <AttendanceTrendChart classroomId={classroom.id} />
          </TabsContent>

          {/* Polls Tab */}
          <TabsContent value="polls">
            <ClassroomPolls classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion">
            <DiscussionThread classroomId={classroom.id} />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            <SessionFeedback classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <ResourceLibrary classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines">
            <DeadlineTracker classroomId={classroom.id} isAdmin={isAdmin} />
          </TabsContent>

          {/* Settings Tab — Admin only */}
          {isAdmin && (
            <TabsContent value="settings">
              <ClassroomSettings
                classroomId={classroom.id}
                classroomName={classroom.name}
                department={classroom.department}
                sessionYear={classroom.sessionYear}
                semester={classroom.semester}
                inviteCode={classroom.inviteCode}
                onClassroomUpdate={fetchClassroom}
              />
            </TabsContent>
          )}
      </main>

      {/* ── Quick Actions FAB ──────────────────────────────────────── */}
      <QuickActionsPanel classroomId={classroom.id} isAdmin={isAdmin} />
    </div>
    </Tabs>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────

interface RecentSession {
  id: string;
  conductedDate: string;
  status: string;
  subject: {
    name: string;
    code: string;
  };
  _count: {
    records: number;
  };
}

interface SubjectAttendance {
  subjectName: string;
  subjectCode: string;
  totalSessions: number;
  presentCount: number;
  percentage: number;
}

function OverviewTab({ classroom }: { classroom: ClassroomData }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [publishedAssessments, setPublishedAssessments] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendance[]>([]);
  const [attendanceStatsLoading, setAttendanceStatsLoading] = useState(true);

  // ── Fetch stats data ──────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    async function fetchStats() {
      setStatsLoading(true);
      try {
        // Fetch recent attendance sessions
        const sessionsRes = await fetch(
          `/api/attendance/sessions?classroomId=${classroom.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (sessionsRes.ok) {
          const sessionsData = await sessionsRes.json();
          const allSessions = sessionsData.sessions ?? [];
          setTotalSessions(allSessions.length);
          setRecentSessions(allSessions.slice(0, 5));
        }

        // Fetch assessments for published count
        const assessmentsRes = await fetch(
          `/api/results/assessments?classroomId=${classroom.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (assessmentsRes.ok) {
          const assessmentsData = await assessmentsRes.json();
          const allAssessments = assessmentsData.assessments ?? [];
          setPublishedAssessments(allAssessments.filter((a: { isPublished: boolean }) => a.isPublished).length);
        }
      } catch {
        // Silently fail — stats will show placeholders
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [accessToken, classroom.id]);

  // ── Fetch per-subject attendance stats ───────────────────────

  useEffect(() => {
    if (!accessToken) return;

    async function fetchAttendanceStats() {
      setAttendanceStatsLoading(true);
      try {
        // Fetch all sessions for this classroom (no subject filter)
        const res = await fetch(
          `/api/attendance/sessions?classroomId=${classroom.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) return;

        const data = await res.json();
        const allSessions: RecentSession[] = data.sessions ?? [];

        // Group sessions by subject and compute average attendance per subject
        // We fetch attendance records for each finalized session to get real percentages
        const subjectMap = new Map<string, {
          name: string;
          code: string;
          sessions: RecentSession[];
        }>();

        allSessions.forEach((session) => {
          const key = session.subject.name;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              name: session.subject.name,
              code: session.subject.code,
              sessions: [],
            });
          }
          subjectMap.get(key)!.sessions.push(session);
        });

        // For each subject, compute attendance percentage from sessions
        const stats: SubjectAttendance[] = await Promise.all(
          Array.from(subjectMap.values()).map(async (subject) => {
            const finalizedSessions = subject.sessions.filter(
              (s) => s.status === 'finalized'
            );
            const totalSess = finalizedSessions.length;

            if (totalSess === 0) {
              return {
                subjectName: subject.name,
                subjectCode: subject.code,
                totalSessions: subject.sessions.length,
                presentCount: 0,
                percentage: 0,
              };
            }

            // Fetch attendance records for each session to compute real percentages
            let totalRecords = 0;
            let totalPresent = 0;

            await Promise.all(
              finalizedSessions.map(async (session) => {
                try {
                  const recordsRes = await fetch(
                    `/api/attendance/records?sessionId=${session.id}`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  );
                  if (!recordsRes.ok) return;
                  const recordsData = await recordsRes.json();
                  const records = recordsData.records ?? [];
                  totalRecords += records.length;
                  totalPresent += records.filter(
                    (r: { status: string }) =>
                      r.status === 'present' || r.status === 'late'
                  ).length;
                } catch {
                  // Skip failed session fetches
                }
              })
            );

            const percentage = totalRecords > 0
              ? Math.round((totalPresent / totalRecords) * 100)
              : 0;

            return {
              subjectName: subject.name,
              subjectCode: subject.code,
              totalSessions: subject.sessions.length,
              presentCount: totalPresent,
              percentage,
            };
          })
        );

        setSubjectAttendance(stats);
      } catch {
        // Silently fail
      } finally {
        setAttendanceStatsLoading(false);
      }
    }

    fetchAttendanceStats();
  }, [accessToken, classroom.id]);

  // ── Compute average attendance rate ──────────────────────────

  const avgAttendanceRate = useMemo(() => {
    if (subjectAttendance.length === 0) return 0;
    // Compute weighted average across subjects
    const totalWeighted = subjectAttendance.reduce((sum, sub) => sum + (sub.percentage * sub.totalSessions), 0);
    const totalSessionsCount = subjectAttendance.reduce((sum, sub) => sum + sub.totalSessions, 0);
    return totalSessionsCount > 0 ? Math.round(totalWeighted / totalSessionsCount) : 0;
  }, [subjectAttendance]);

  const deptStatColors: Record<string, { students: string; subjects: string; sessions: string; rate: string; assessments: string }> = {
    CE: {
      students: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
      subjects: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
      sessions: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
      rate: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
      assessments: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400',
    },
    CS: {
      students: 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400',
      subjects: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
      sessions: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400',
      rate: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
      assessments: 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400',
    },
  };
  const colors = deptStatColors[classroom.department] || {
    students: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    subjects: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    sessions: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    rate: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
    assessments: 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
  };
  const deptBandColors: Record<string, string> = {
    CE: 'from-orange-400 to-amber-300',
    CS: 'from-teal-400 to-emerald-300',
  };
  const bandColor = deptBandColors[classroom.department] || 'from-gray-400 to-gray-300';

  return (
    <div className="space-y-5">
      {/* Section divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-amber-500/20 via-border to-transparent" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="py-4 gap-2 overflow-hidden relative hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-sm bg-card/90 hover-glow-amber">
          <CardContent className="px-4 pt-0 pb-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center size-9 rounded-xl ${colors.students}`}>
                <Users className="size-4.5" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Students</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{classroom.studentCount}</span>
          </CardContent>
        </Card>
        <Card className="py-4 gap-2 overflow-hidden relative hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-sm bg-card/90 hover-glow-teal">
          <CardContent className="px-4 pt-0 pb-0 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center size-9 rounded-xl ${colors.subjects}`}>
                <BookOpen className="size-4.5" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Subjects</span>
            </div>
            <span className="text-2xl font-bold tabular-nums">{classroom.subjects}</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Enhanced Quick Stats Row ────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-3 gap-0 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 hover-glow-amber">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className={`flex items-center justify-center size-8 rounded-lg ${colors.sessions}`}>
              <ClipboardCheck className="size-4" />
            </div>
            <span className="text-xl font-bold tabular-nums">
              {statsLoading ? (
                <Skeleton className="h-6 w-8 inline-block" />
              ) : (
                totalSessions
              )}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">Total Sessions</span>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className={`flex items-center justify-center size-8 rounded-lg ${colors.rate}`}>
              <TrendingUp className="size-4" />
            </div>
            <span className="text-xl font-bold tabular-nums">
              {statsLoading ? (
                <Skeleton className="h-6 w-10 inline-block" />
              ) : (
                `${avgAttendanceRate}%`
              )}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">Avg. Attendance</span>
          </CardContent>
        </Card>
        <Card className="py-3 gap-0 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="px-3 pt-0 pb-0 flex flex-col items-center gap-1.5 text-center">
            <div className={`flex items-center justify-center size-8 rounded-lg ${colors.assessments}`}>
              <FileCheck className="size-4" />
            </div>
            <span className="text-xl font-bold tabular-nums">
              {statsLoading ? (
                <Skeleton className="h-6 w-6 inline-block" />
              ) : (
                publishedAssessments
              )}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">Published Results</span>
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity ─────────────────────────────────────── */}
      {!statsLoading && recentSessions.length > 0 && (
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {recentSessions.map((session, idx) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 shrink-0">
                    <CalendarDays className="size-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{session.subject.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(session.conductedDate + 'T00:00:00'), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{session._count.records} records</span>
                    {session.status === 'finalized' ? (
                      <ShieldCheck className="size-3 text-emerald-500" />
                    ) : (
                      <span className="size-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Attendance Statistics Chart ─────────────────────────── */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 className="size-4 text-muted-foreground" />
            Attendance by Subject
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {attendanceStatsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : subjectAttendance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                <BarChart2 className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                No attendance data yet
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Start taking attendance to see statistics here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectAttendance.map((subject, idx) => {
                const pct = subject.percentage;
                const barColor =
                  pct >= 75
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : pct >= 50
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : 'bg-red-500 dark:bg-red-400';
                const bgColor =
                  pct >= 75
                    ? 'bg-emerald-100 dark:bg-emerald-950/30'
                    : pct >= 50
                      ? 'bg-amber-100 dark:bg-amber-950/30'
                      : 'bg-red-100 dark:bg-red-950/30';
                const textColor =
                  pct >= 75
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : pct >= 50
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-red-700 dark:text-red-300';

                return (
                  <motion.div
                    key={subject.subjectName}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium truncate">
                          {subject.subjectName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {subject.subjectCode}
                        </span>
                      </div>
                      <span className={`text-xs font-bold tabular-nums shrink-0 ${textColor}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className={`h-2.5 w-full rounded-full ${bgColor} overflow-hidden`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ delay: idx * 0.08 + 0.2, duration: 0.5, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {subject.totalSessions} session{subject.totalSessions !== 1 ? 's' : ''}
                    </p>
                  </motion.div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center gap-4 pt-2 border-t mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  <span className="text-[10px] text-muted-foreground">Good (≥75%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                  <span className="text-[10px] text-muted-foreground">Warning (≥50%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500 dark:bg-red-400" />
                  <span className="text-[10px] text-muted-foreground">Low (&lt;50%)</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classroom Info */}
      <Card className="py-0 gap-0 overflow-hidden relative">
        {/* Decorative department color band */}
        <div className={`h-1 w-full bg-gradient-to-r ${bandColor} absolute top-0 left-0`} />
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Classroom Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{classroom.department}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Session</span>
              <span className="font-medium">{classroom.sessionYear}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your Role</span>
              <Badge
                variant={
                  classroom.userRole === 'CR'
                    ? 'default'
                    : classroom.userRole === 'GR'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {classroom.userRole}
              </Badge>
            </div>
            {classroom.crName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">CR</span>
                <span className="font-medium">
                  {classroom.crName}
                </span>
              </div>
            )}
            {classroom.grName && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">GR</span>
                <span className="font-medium">
                  {classroom.grName}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Placeholder Tab ────────────────────────────────────────────────

function PlaceholderTab({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof LayoutDashboard;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
        <Icon className="size-7 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}
