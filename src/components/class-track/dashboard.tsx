'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap,
  LogOut,
  Plus,
  UserPlus,
  FileText,
  Copy,
  Check,
  Users,
  Loader2,
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  Calculator,
  X,
  UserCircle,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  School,
  Search,
  CalendarDays,
  CircleHelp,
  Rocket,
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
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useAuthStore } from '@/stores/auth-store';
import { useNavStore, type ViewType } from '@/stores/nav-store';
import { authFetch } from '@/lib/api-client';
import { ThemeToggle } from './theme-toggle';
import { PwaInstallPrompt } from './pwa-install-prompt';
import { NotificationPermission } from './notification-permission';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { TodaySchedule } from './today-schedule';
import { ClassroomSearch } from './classroom-search';
import { StatsOverview } from './stats-overview';
import { QuickNotes } from './quick-notes';
import { StudyTimer } from './study-timer';
import { QuickStatsWidget } from './quick-stats-widget';
import { DashboardAttendanceSummary } from './dashboard-attendance-summary';
import { UserGuide } from './user-guide';

// ── Types ──────────────────────────────────────────────────────────

interface Classroom {
  id: string;
  name: string;
  department: string;
  sessionYear: string;
  semester: string;
  semesterOrder: number;
  inviteCode: string;
  studentCount: number;
  claimedCount: number;
  userRole: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  if (hour < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Good Night', emoji: '🌙' };
}

// ── Animated Counter ──────────────────────────────────────────────

function AnimatedCounter({ value, duration = 0.8 }: { value: number; duration?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="tabular-nums"
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration }}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

// ── Bottom Navigation ──────────────────────────────────────────────

const NAV_ITEMS: { label: string; icon: typeof LayoutDashboard; view: ViewType }[] = [
  { label: 'Home', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Attendance', icon: ClipboardCheck, view: 'my-attendance' },
  { label: 'Results', icon: BarChart3, view: 'my-results' },
  { label: 'GPA', icon: Calculator, view: 'gpa-calculator' },
];

function BottomNav({ activeView }: { activeView: ViewType }) {
  const navigate = useNavStore((s) => s.navigate);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 frosted-nav glass-sidebar safe-bottom">
      {/* Gradient divider line above nav */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      <div className="mx-auto flex h-16 max-w-lg items-center px-2" style={{ justifyContent: 'space-around' }}>
        {NAV_ITEMS.map(({ label, icon: Icon, view }) => {
          const isActive = activeView === view;
          return (
            <button
              key={view}
              onClick={() => navigate(view)}
              className={`group relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-4 py-1.5 min-w-[4rem] h-14 transition-all duration-200 tap-feedback ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-bg-pill"
                  className="absolute inset-x-1 bottom-0.5 h-7 rounded-xl bg-gradient-to-t from-amber-100/80 to-amber-50/60 dark:from-amber-950/30 dark:to-amber-950/10 shadow-sm shadow-amber-500/20 dark:shadow-amber-400/10"
                  transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                transition={isActive ? { type: 'tween', duration: 0.35, ease: [0.22, 1, 0.36, 1] } : {}}
                className="relative"
              >
                <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={isActive ? 2.5 : 1.8} />
                {/* Unread indicator dot — small amber dot for notifications */}
                {view === 'my-attendance' && (
                  <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 ring-[2.5px] ring-background animate-badge-pulse" />
                )}
              </motion.div>
              <span className={`text-[10px] font-medium leading-tight transition-all duration-200 ${isActive ? 'font-semibold' : 'group-hover:font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ── Classroom Card ─────────────────────────────────────────────────

function ClassroomCard({ classroom, onClick }: { classroom: Classroom; onClick: () => void }) {
  const [copied, setCopied] = useState(false);

  // Department color mapping for card accents
  const deptConfig: Record<string, { border: string; gradient: string; bg: string; glow: string }> = {
    CE: {
      border: 'border-t-orange-400',
      gradient: 'from-orange-500/5 via-transparent to-transparent',
      bg: 'group-hover:from-orange-50 dark:group-hover:from-orange-950/20',
      glow: 'hover:shadow-orange-500/15 dark:hover:shadow-orange-500/10',
    },
    CS: {
      border: 'border-t-teal-400',
      gradient: 'from-teal-500/5 via-transparent to-transparent',
      bg: 'group-hover:from-teal-50 dark:group-hover:from-teal-950/20',
      glow: 'hover:shadow-teal-500/15 dark:hover:shadow-teal-500/10',
    },
  };
  const dept = deptConfig[classroom.department] || {
    border: 'border-t-gray-400',
    gradient: 'from-gray-500/5 via-transparent to-transparent',
    bg: '',
    glow: '',
  };

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(classroom.inviteCode);
        setCopied(true);
        toast.success('Invite code copied!');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy invite code');
      }
    },
    [classroom.inviteCode]
  );

  const roleUpper = classroom.userRole?.toUpperCase() ?? '';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`group cursor-pointer transition-all duration-300 py-4 gap-3 border-t-2 ${dept.border} overflow-hidden relative hover:shadow-2xl hover:shadow-black/5 dark:hover:shadow-black/30 hover:-translate-y-1 active:scale-[0.99] ${dept.glow} backdrop-blur-sm bg-card/80 hover:bg-card/95`}
        onClick={onClick}
      >
        {/* Shimmer on department-colored top border on hover */}
        <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <motion.div
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
          />
        </div>
        {/* Subtle gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-r ${dept.gradient} ${dept.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg`} />
        {/* Glass border effect on hover */}
        <div className="absolute inset-0 rounded-lg border border-white/0 group-hover:border-white/10 dark:group-hover:border-white/5 transition-colors duration-300 pointer-events-none" />
        <CardHeader className="pb-0 pt-0 gap-1 px-4 relative">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
              {classroom.name}
            </CardTitle>
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 badge-gradient" aria-label={`Role: ${roleUpper}`}>
              {roleUpper}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {classroom.department} &middot; Session {classroom.sessionYear}
          </CardDescription>
          {classroom.semester && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 border-amber-300/60 text-amber-700 dark:border-amber-700/60 dark:text-amber-300">
              {classroom.semester}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="px-4 pt-0 pb-0 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>{classroom.studentCount} student{classroom.studentCount !== 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-lg hover:bg-accent"
              aria-label="Copy invite code"
            >
              {copied ? (
                <motion.span
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-emerald-500"
                >
                  <Check className="size-3" />
                  <span className="text-emerald-500">Copied</span>
                </motion.span>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span className="font-mono">{classroom.inviteCode}</span>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Loading Skeleton Grid ──────────────────────────────────────────

function ClassroomSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="py-4 gap-3">
          <CardHeader className="pb-0 pt-0 gap-1 px-4">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-8 rounded-md" />
            </div>
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent className="px-4 pt-0 pb-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Stats Summary Bar ──────────────────────────────────────────────

function StatsBar({ classrooms }: { classrooms: Classroom[] }) {
  const totalStudents = classrooms.reduce((sum, c) => sum + c.studentCount, 0);
  const uniqueDepts = new Set(classrooms.map((c) => c.department)).size;
  const adminCount = classrooms.filter((c) => {
    const role = c.userRole?.toUpperCase();
    return role === 'CR' || role === 'GR';
  }).length;

  const stats = [
    { label: 'Classrooms', value: classrooms.length, icon: School, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Students', value: totalStudents, icon: Users, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30' },
    { label: 'Departments', value: uniqueDepts, icon: BookOpen, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30' },
    { label: 'As Admin', value: adminCount, icon: TrendingUp, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3, boxShadow: '0 8px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -6px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }}
          className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2.5 sm:p-3 cursor-default hover:border-amber-300/50 dark:hover:border-amber-700/50 transition-colors duration-200"
        >
          <div className={`flex items-center justify-center size-7 rounded-lg ${stat.color}`}>
            <stat.icon className="size-3.5" />
          </div>
          <span className="text-base sm:text-lg font-bold tabular-nums">
            <AnimatedCounter value={stat.value} duration={0.6 + i * 0.1} />
          </span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium text-center leading-tight">
            {stat.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// ── Semester Progress Widget ─────────────────────────────────────────

function SemesterProgress({ classrooms }: { classrooms: Classroom[] }) {
  // Get the most common semester label, or the first classroom's semester
  const semesterCounts = new Map<string, number>();
  classrooms.forEach((c) => {
    const label = c.semester || '1st';
    semesterCounts.set(label, (semesterCounts.get(label) || 0) + 1);
  });

  // Find the most common semester
  let currentSemester = '1st';
  let maxCount = 0;
  semesterCounts.forEach((count, label) => {
    if (count > maxCount) {
      maxCount = count;
      currentSemester = label;
    }
  });

  // Get unique departments
  const uniqueDepts = new Set(classrooms.map((c) => c.department));

  // Compute a rough progress estimate based on semester order
  const avgSemesterOrder = classrooms.reduce((sum, c) => sum + (c.semesterOrder || 1), 0) / classrooms.length;
  const progressPercent = Math.min(100, Math.round((avgSemesterOrder / 8) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="overflow-hidden relative">
        {/* Decorative gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-teal-50/50 dark:from-amber-950/15 dark:via-orange-950/10 dark:to-teal-950/10 pointer-events-none" />
        <CardHeader className="pb-2 pt-4 px-4 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-amber-100 dark:bg-amber-950/30">
                <CalendarDays className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              Semester Progress
            </CardTitle>
            <Badge variant="outline" className="text-[10px] px-2 py-0 border-amber-300/60 text-amber-700 dark:border-amber-700/60 dark:text-amber-300 font-semibold">
              {currentSemester}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 relative">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{classrooms.length}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Courses</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{uniqueDepts.size}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Department{uniqueDepts.size !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tabular-nums">{semesterCounts.size}</p>
              <p className="text-[10px] text-muted-foreground font-medium">Semester{semesterCounts.size !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Overall Progress</span>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">{progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavStore((s) => s.navigate);
  const openClassroom = useNavStore((s) => s.openClassroom);
  const view = useNavStore((s) => s.view);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search dialog
  const [searchOpen, setSearchOpen] = useState(false);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  // User guide
  const [guideOpen, setGuideOpen] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Create form
  const [className, setClassName] = useState('');
  const [department, setDepartment] = useState('');
  const [sessionYear, setSessionYear] = useState('');

  // Custom departments
  const [customDepts, setCustomDepts] = useState<{ abbr: string; name: string }[]>([]);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptAbbr, setNewDeptAbbr] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  // Built-in departments
  const BUILTIN_DEPTS: { abbr: string; name: string }[] = [
    { abbr: 'CE', name: 'Civil Engineering' },
    { abbr: 'CS', name: 'Computer Science' },
  ];

  // All departments = built-in + custom
  const allDepts = [...BUILTIN_DEPTS, ...customDepts];

  // Load custom departments from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('classtrack-custom-departments');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomDepts(parsed);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Join form
  const [inviteCode, setInviteCode] = useState('');

  // ── Fetch Classrooms ────────────────────────────────────────────

  const fetchClassrooms = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');

    try {
      const res = await authFetch('/api/classrooms');

      if (!res.ok) {
        throw new Error('Failed to fetch classrooms');
      }

      const data = await res.json();
      setClassrooms(data.classrooms ?? []);
    } catch {
      // If authFetch logged the user out (expired session), redirect happens automatically
      const { isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        setError('Could not load classrooms. Pull down to retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // ── Handle Logout ───────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    logout();
    navigate('auth');
    toast.success('Logged out successfully');
  }, [logout, navigate]);

  // ── Handle Create Classroom ─────────────────────────────────────

  const handleCreateClassroom = useCallback(async () => {
    setError('');

    if (!className.trim()) {
      toast.error('Please enter a classroom name.');
      return;
    }
    if (!department) {
      toast.error('Please select a department.');
      return;
    }
    if (!sessionYear) {
      toast.error('Please enter a session year.');
      return;
    }

    setCreateClassLoading(true);

    try {
      const res = await authFetch('/api/classrooms', {
        method: 'POST',
        body: JSON.stringify({
          name: className.trim(),
          department,
          sessionYear,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create classroom.');
        return;
      }

      toast.success('Classroom created successfully!');
      setCreateOpen(false);
      setClassName('');
      setDepartment('');
      setSessionYear('');

      // Refresh list and open the new classroom
      await fetchClassrooms();
      openClassroom(data.classroom.id);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setCreateClassLoading(false);
    }
  }, [className, department, sessionYear, accessToken, fetchClassrooms, openClassroom]);

  // ── Handle Join Classroom ───────────────────────────────────────

  const handleJoinClassroom = useCallback(async () => {
    setError('');

    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code.');
      return;
    }

    setJoinLoading(true);

    try {
      const res = await authFetch('/api/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to join classroom.');
        return;
      }

      toast.success(data.message || 'Joined classroom successfully!');
      setJoinOpen(false);
      setInviteCode('');

      await fetchClassrooms();
      openClassroom(data.classroom.id);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  }, [inviteCode, accessToken, fetchClassrooms, openClassroom]);

  // ── Derived user info ───────────────────────────────────────────

  const userFirstName = user?.name || user?.email?.split('@')[0] || 'User';
  const userRole = user?.role || 'Student';
  const greeting = getGreeting();

  // ── Push notifications (polling) ───────────────────────────────
  usePushNotifications();

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* ── Animated Gradient Mesh Background ──────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-gradient-to-br from-amber-300/15 via-orange-300/10 to-transparent blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-24 size-[400px] rounded-full bg-gradient-to-bl from-teal-300/12 via-emerald-300/8 to-transparent blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute -bottom-20 left-1/4 size-[350px] rounded-full bg-gradient-to-tr from-orange-200/10 via-amber-200/8 to-transparent blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
        <div className="dark:hidden absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.06)_0%,transparent_50%)]" />
        <div className="hidden dark:block absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.04)_0%,transparent_50%)]" />
      </div>

      {/* ── Decorative Header Background ─────────────────────────── */}
      <div className="relative">
        {/* Gradient accent bar */}
        <div className="gradient-accent-bar" />
        {/* Department-colored accent shapes */}
        <div className="absolute top-0 left-0 w-40 h-32 bg-gradient-to-br from-orange-400/8 to-transparent rounded-br-[4rem] pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-24 bg-gradient-to-bl from-teal-400/8 to-transparent rounded-bl-[3rem] pointer-events-none" />

        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 relative transition-shadow duration-300 group/header">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10">
                <GraduationCap className="size-5 text-amber-600 dark:text-amber-400" />
                <div className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-tight">ClassTrack</span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {greeting.text}, {userFirstName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 badge-gradient">
                {userRole}
              </Badge>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 focus-visible:ring-amber-500/30"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 focus-visible:ring-amber-500/30"
                onClick={() => setGuideOpen(true)}
                aria-label="Help & user guide"
              >
                <CircleHelp className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-950/30 focus-visible:ring-emerald-500/30"
                onClick={() => navigate('deploy')}
                aria-label="Deployment guide"
              >
                <Rocket className="size-4" />
              </Button>

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-950/30 focus-visible:ring-teal-500/30"
                onClick={() => navigate('profile')}
                aria-label="My profile"
              >
                <UserCircle className="size-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/30 focus-visible:ring-rose-500/30"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-5 pb-24 mx-auto w-full max-w-2xl relative">
        {/* Subtle dot grid + noise grain texture for main content */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.025 }}>
            <defs>
              <pattern id="bg-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bg-grid)" />
          </svg>
          {/* Noise grain overlay */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />
        </div>
        {/* PWA Install Prompt */}
        <div className="mb-4">
          <PwaInstallPrompt />
        </div>
        {/* Notification Permission Prompt */}
        <div className="mb-4">
          <NotificationPermission />
        </div>
        {/* Greeting Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-teal-100 dark:from-amber-950/30 dark:via-orange-950/15 dark:to-teal-950/25 border border-amber-200/40 dark:border-amber-800/30 p-5 backdrop-blur-sm shadow-md shadow-amber-500/5">
            {/* Decorative SVG dot pattern background */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08] dark:opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="banner-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.2" fill="currentColor" className="text-amber-700 dark:text-amber-300" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#banner-dots)" />
            </svg>
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-300/25 to-transparent rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-teal-300/20 to-transparent rounded-tr-full pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-gradient-to-br from-orange-200/15 to-transparent rounded-full pointer-events-none blur-sm" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{greeting.emoji}</span>
                <h1 className="text-lg font-bold text-gradient-warm">{greeting.text}</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'Loading your dashboard...'
                  : classrooms.length === 0
                    ? 'Get started by creating or joining a classroom.'
                    : `You have ${classrooms.length} classroom${classrooms.length !== 1 ? 's' : ''} today.`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Bar */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <StatsBar classrooms={classrooms} />
          </div>
        )}

        {/* Stats Overview Widget */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <StatsOverview classrooms={classrooms} />
          </div>
        )}

        {/* Dashboard Attendance Summary */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <DashboardAttendanceSummary />
          </div>
        )}

        {/* Today's Schedule Widget */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <TodaySchedule classrooms={classrooms} />
          </div>
        )}

        {/* Semester Progress Widget */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <SemesterProgress classrooms={classrooms} />
          </div>
        )}

        {/* Pull-to-refresh visual hint */}
        {!loading && (
          <div className="flex items-center justify-center mb-3">
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50"
            >
              <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1v7M3 4l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Pull down to refresh
            </motion.div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-5">
          {/* User Guide Dialog */}
          <UserGuide open={guideOpen} onOpenChange={setGuideOpen} />

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-md shadow-amber-500/20 rounded-xl h-10 font-medium transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25">
                <Plus className="size-4" />
                Create Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Classroom</DialogTitle>
                <DialogDescription>
                  Set up a new classroom for your department and session.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="class-name">Classroom Name</Label>
                  <Input
                    id="class-name"
                    placeholder="e.g. Section A"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={department}
                    onValueChange={(val) => {
                      if (val === '__add_custom__') {
                        setShowAddDept(true);
                      } else {
                        setDepartment(val);
                        setShowAddDept(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {allDepts.map((dept) => (
                        <SelectItem key={dept.abbr} value={dept.abbr}>
                          {dept.abbr} — {dept.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__add_custom__" className="text-amber-600 dark:text-amber-400 font-medium">
                        + Add custom department...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {showAddDept && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2 mt-2">
                      <p className="text-xs font-medium text-muted-foreground">New Department</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="dept-abbr" className="text-xs">Abbreviation</Label>
                          <Input
                            id="dept-abbr"
                            placeholder="e.g. EE"
                            value={newDeptAbbr}
                            onChange={(e) => setNewDeptAbbr(e.target.value.toUpperCase())}
                            maxLength={5}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="dept-name" className="text-xs">Full Name</Label>
                          <Input
                            id="dept-name"
                            placeholder="e.g. Electrical Engineering"
                            value={newDeptName}
                            onChange={(e) => setNewDeptName(e.target.value)}
                            maxLength={50}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={!newDeptAbbr.trim() || !newDeptName.trim()}
                          onClick={() => {
                            const abbr = newDeptAbbr.trim().toUpperCase();
                            if (!abbr || !newDeptName.trim()) return;
                            if (allDepts.some((d) => d.abbr === abbr)) {
                              toast.error(`Department "${abbr}" already exists.`);
                              return;
                            }
                            const updated = [...customDepts, { abbr, name: newDeptName.trim() }];
                            setCustomDepts(updated);
                            localStorage.setItem('classtrack-custom-departments', JSON.stringify(updated));
                            setDepartment(abbr);
                            setNewDeptAbbr('');
                            setNewDeptName('');
                            setShowAddDept(false);
                          }}
                        >
                          <Check className="size-3" />
                          Add
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setShowAddDept(false);
                            setNewDeptAbbr('');
                            setNewDeptName('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-year">Session Year</Label>
                  <Input
                    id="session-year"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 2023-2024"
                    value={sessionYear}
                    onChange={(e) => setSessionYear(e.target.value)}
                    maxLength={9}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createClassLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateClassroom} disabled={createClassLoading}>
                  {createClassLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Classroom'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none rounded-xl h-10 font-medium">
                <UserPlus className="size-4" />
                Join Classroom
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Join a Classroom</DialogTitle>
                <DialogDescription>
                  Enter the invite code shared by your class representative.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  placeholder="e.g. ABC123"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center text-lg font-mono tracking-widest"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setJoinOpen(false)}
                  disabled={joinLoading}
                >
                  Cancel
                </Button>
                <Button onClick={handleJoinClassroom} disabled={joinLoading}>
                  {joinLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Actions */}
        {!loading && classrooms.length > 0 && (
          <QuickActions classrooms={classrooms} />
        )}

        {/* Quick Notes Widget */}
        <div className="mb-5">
          <QuickNotes />
        </div>

        {/* Quick Stats Widget */}
        {!loading && classrooms.length > 0 && (
          <div className="mb-5">
            <QuickStatsWidget classrooms={classrooms} />
          </div>
        )}

        {/* Study Timer Widget */}
        <div className="mb-5">
          <StudyTimer />
        </div>

        {/* Classrooms Section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-1">My Classrooms</h2>
          <div className="h-px w-12 bg-gradient-to-r from-amber-500 to-transparent rounded-full mb-1" />
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Loading your classrooms...'
              : classrooms.length === 0
                ? 'No classrooms yet. Create or join one!'
                : `${classrooms.length} classroom${classrooms.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Error Banner */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 border-l-[3px] border-l-destructive bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/15 dark:to-destructive/5 px-4 py-3 text-sm text-destructive">
                <X className="size-4 shrink-0" />
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-auto p-1 text-destructive hover:text-destructive"
                  onClick={fetchClassrooms}
                >
                  Retry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Classroom Grid */}
        {loading ? (
          <ClassroomSkeletonGrid />
        ) : classrooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="empty-state relative"
          >
            {/* Decorative dot pattern */}
            <div className="empty-state-pattern" />
            {/* Gradient blobs behind icon */}
            <div className="gradient-blob gradient-blob-ce" style={{ width: 120, height: 120, top: '10%', left: '20%' }} />
            <div className="gradient-blob gradient-blob-cs" style={{ width: 100, height: 100, bottom: '20%', right: '15%' }} />
            {/* Composed empty state illustration */}
            <div className="empty-state-icon relative">
              <GraduationCap className="size-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="empty-state-title">
              No classrooms yet
            </p>
            <p className="empty-state-desc">
              Create a new classroom or join one with an invite code to get started
            </p>
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-3.5" />
                Create
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => setJoinOpen(true)}
              >
                <UserPlus className="size-3.5" />
                Join
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {classrooms.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ClassroomCard
                  classroom={c}
                  onClick={() => openClassroom(c.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* ── Classroom Search Overlay ─────────────────────────────── */}
      <ClassroomSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* ── Bottom Navigation ─────────────────────────────────────── */}
      <BottomNav activeView={view} />
    </div>
  );
}

// ── Quick Actions Widget ────────────────────────────────────────────

interface QuickActionItem {
  label: string;
  icon: typeof LayoutDashboard;
  gradient: string;
  iconBg: string;
  onClick: () => void;
  requiresAdmin: boolean;
}

function QuickActions({ classrooms }: { classrooms: Classroom[] }) {
  const navigate = useNavStore((s) => s.navigate);
  const openClassroom = useNavStore((s) => s.openClassroom);
  const setClassroomTab = useNavStore((s) => s.setClassroomTab);

  // Check if user is CR or GR of at least one classroom
  const hasAdminClassroom = classrooms.some((c) => {
    const role = c.userRole?.toUpperCase();
    return role === 'CR' || role === 'GR';
  });

  // Get the first admin classroom for quick navigation
  const firstAdminClassroom = classrooms.find((c) => {
    const role = c.userRole?.toUpperCase();
    return role === 'CR' || role === 'GR';
  });

  const quickActions: QuickActionItem[] = [
    {
      label: 'Take Attendance',
      icon: ClipboardCheck,
      gradient: 'from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/15',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20',
      onClick: () => {
        if (firstAdminClassroom) {
          openClassroom(firstAdminClassroom.id);
          setClassroomTab('attendance');
        }
      },
      requiresAdmin: true,
    },
    {
      label: 'View Results',
      icon: BarChart3,
      gradient: 'from-amber-50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/15',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20',
      onClick: () => navigate('my-results'),
      requiresAdmin: false,
    },
    {
      label: 'Calculate GPA',
      icon: Calculator,
      gradient: 'from-rose-50 to-pink-50/50 dark:from-rose-950/30 dark:to-pink-950/15',
      iconBg: 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/20',
      onClick: () => navigate('gpa-calculator'),
      requiresAdmin: false,
    },
    {
      label: 'Report Card',
      icon: FileText,
      gradient: 'from-pink-50 to-rose-50/50 dark:from-pink-950/30 dark:to-rose-950/15',
      iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-sm shadow-pink-500/20',
      onClick: () => navigate('report'),
      requiresAdmin: false,
    },
    {
      label: 'Manage Subjects',
      icon: BookOpen,
      gradient: 'from-orange-50 to-amber-50/50 dark:from-orange-950/30 dark:to-amber-950/15',
      iconBg: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/20',
      onClick: () => {
        if (firstAdminClassroom) {
          openClassroom(firstAdminClassroom.id);
          setClassroomTab('subjects');
        }
      },
      requiresAdmin: true,
    },
  ];

  const visibleActions = quickActions.filter(
    (action) => !action.requiresAdmin || hasAdminClassroom
  );

  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold mb-1">Quick Actions</h2>
      <div className="h-px w-12 bg-gradient-to-r from-amber-500 to-transparent rounded-full mb-3" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.96 }}
              onClick={action.onClick}
              className={`group relative flex flex-col items-center gap-2.5 rounded-xl border p-4 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 active:scale-[0.97] bg-gradient-to-br ${action.gradient} overflow-hidden`}
            >
              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <motion.div
                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05, transition: { duration: 0.4 } }}
                className={`relative flex items-center justify-center size-11 rounded-xl ${action.iconBg}`}
              >
                <Icon className="size-5" />
              </motion.div>
              <span className="text-xs font-medium text-foreground leading-tight text-center">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
