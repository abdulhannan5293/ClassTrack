'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  LogOut,
  Mail,
  Building2,
  CalendarDays,
  Users,
  ShieldCheck,
  GraduationCap,
  Loader2,
  BarChart3,
  BookOpen,
  Trophy,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  Fingerprint,
  Info,
  TrendingUp,
  Hash,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
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

// ── Types ──────────────────────────────────────────────────────────

interface ClassroomCount {
  id: string;
  name: string;
  userRole: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getRoleVariant(role: string) {
  if (role === 'CR') return 'default' as const;
  if (role === 'GR') return 'secondary' as const;
  return 'outline' as const;
}

function getAvatarGradient(department: string): string {
  if (department === 'CE') return 'bg-gradient-to-br from-orange-500 to-amber-400 text-white';
  if (department === 'CS') return 'bg-gradient-to-br from-teal-500 to-emerald-400 text-white';
  return 'bg-gradient-to-br from-gray-500 to-gray-400 text-white';
}

function getRingGradient(department: string): string {
  if (department === 'CE') return 'from-orange-400 via-amber-400 to-orange-500';
  if (department === 'CS') return 'from-teal-400 via-emerald-400 to-teal-500';
  return 'from-gray-400 via-gray-300 to-gray-500';
}

function getHeaderGradient(department: string): string {
  if (department === 'CE') return 'from-orange-500/80 via-amber-400/60 to-orange-300/40';
  if (department === 'CS') return 'from-teal-500/80 via-emerald-400/60 to-teal-300/40';
  return 'from-amber-500/80 via-orange-400/60 to-teal-400/50';
}

function getDeptColor(department: string): { text: string; bg: string; badge: string; border: string } {
  if (department === 'CE') return {
    text: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
    border: 'border-orange-200 dark:border-orange-800/30',
  };
  if (department === 'CS') return {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800/40',
    border: 'border-teal-200 dark:border-teal-800/30',
  };
  return {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300 border-gray-200 dark:border-gray-800/40',
    border: 'border-gray-200 dark:border-gray-800/30',
  };
}

// ── Animated Count-Up ────────────────────────────────────────────────

function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const motionVal = useMotionValue(0);
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(motionVal, value, {
      duration,
      ease: 'easeOut',
      onUpdate(latest) {
        if (displayRef.current) {
          displayRef.current.textContent = String(Math.round(latest));
        }
      },
    });
    return controls.stop;
  }, [motionVal, value, duration]);

  return <span ref={displayRef} className="tabular-nums">0</span>;
}

// ── Component ──────────────────────────────────────────────────────

export function StudentProfile() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavStore((s) => s.navigate);
  const goBack = useNavStore((s) => s.goBack);

  const [classrooms, setClassrooms] = useState<ClassroomCount[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch classrooms for count ──────────────────────────────────

  const fetchClassrooms = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/classrooms', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setClassrooms(data.classrooms ?? []);
    } catch {
      // Silently fail — count will show 0
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  // ── Derived info ─────────────────────────────────────────────────

  const email = user?.email ?? '';
  const name = user?.name ?? email.split('@')[0] ?? 'User';
  const department = user?.emailPatternExtracted?.department ?? '';
  const session = user?.emailPatternExtracted?.session ?? '';
  const role = user?.role ?? 'Student';

  const rollNumber = user?.emailPatternExtracted?.rollNumber ?? '';
  const initials = getInitials(user?.name ?? null, email);
  const avatarGradient = getAvatarGradient(department);
  const ringGradient = getRingGradient(department);
  const headerGradient = getHeaderGradient(department);
  const deptColor = getDeptColor(department);

  // ── Handle Logout ───────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    logout();
    navigate('auth');
    toast.success('Logged out successfully');
  }, [logout, navigate]);

  // ── Stats data (mock for visual display) ─────────────────────────

  const adminCount = classrooms.filter((c) => c.userRole === 'CR' || c.userRole === 'GR').length;

  const profileStats: { label: string; value: number | string; icon: typeof GraduationCap; color: string; bgGradient: string; trend: 'up' | null }[] = [
    {
      label: 'Classrooms',
      value: classrooms.length,
      icon: GraduationCap,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30',
      bgGradient: 'bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10',
      trend: classrooms.length > 0 ? 'up' : null,
    },
    {
      label: 'As Admin',
      value: adminCount,
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
      bgGradient: 'bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10',
      trend: adminCount > 0 ? 'up' : null,
    },
    {
      label: 'Department',
      value: department || '—',
      icon: Building2,
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30',
      bgGradient: 'bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/10',
      trend: null,
    },
  ];

  // ── Settings items ──────────────────────────────────────────────

  const settingsItems = [
    { icon: Bell, label: 'Notifications', description: 'Manage push notifications', badge: null },
    { icon: Moon, label: 'Appearance', description: 'Dark mode, theme settings', badge: 'Auto' },
    { icon: Fingerprint, label: 'Security', description: 'Password, 2FA settings', badge: null },
    { icon: Info, label: 'About ClassTrack', description: 'Version, credits', badge: null },
  ];

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-lg"
            onClick={goBack}
            aria-label="Go back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-sm font-bold">My Profile</h1>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5"
        >
          {/* ── Profile Card ─────────────────────────────────────── */}
          <Card className="py-0 gap-0 overflow-hidden">
            {/* Gradient top band — department-colored, 120px tall with depth */}
            <div className={`h-[120px] bg-gradient-to-br ${headerGradient} relative overflow-hidden`}>
              {/* Decorative SVG geometric pattern */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="profile-hex" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="14" cy="14" r="8" fill="none" stroke="white" strokeWidth="0.8" />
                    <circle cx="14" cy="14" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#profile-hex)" />
              </svg>
              {/* Decorative shapes with depth */}
              <div className="absolute inset-0">
                <div className="absolute top-2 left-6 w-16 h-16 rounded-full bg-white/20 blur-xl" />
                <div className="absolute bottom-0 right-8 w-24 h-12 rounded-full bg-white/15 blur-xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
              </div>
              {/* Radial depth glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,0.15)_0%,transparent_70%)]" />
              <div className="absolute -bottom-9 left-5">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
                  className="relative"
                >
                  {/* Animated gradient ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className={`absolute -inset-1 rounded-full bg-gradient-to-tr ${ringGradient} opacity-60 blur-[2px]`}
                  />
                  <Avatar className="relative size-[4.5rem] border-[3px] border-background shadow-2xl shadow-black/20 dark:shadow-black/40 animate-float">
                    <AvatarFallback className={`text-xl font-bold ${avatarGradient} ring-2 ring-white/30 shadow-inner`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 size-4 rounded-full bg-emerald-500 border-[3px] border-background" />
                </motion.div>
              </div>
            </div>
            <CardContent className="pt-12 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <h2 className="text-xl font-bold leading-tight">{name}</h2>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <Mail className="size-3" />
                    <span>{email}</span>
                  </div>
                </div>
                <Badge variant={getRoleVariant(role)} className="text-[10px] px-2.5 py-0.5 shrink-0 gap-1 rounded-full">
                  <ShieldCheck className="size-3" />
                  {role}
                </Badge>
              </div>

              {/* Email pattern extracted info badges */}
              {(department || session || rollNumber) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {session && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40">
                      <CalendarDays className="size-2.5 mr-1" />
                      Session {session}
                    </Badge>
                  )}
                  {department && (
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${deptColor.badge}`}>
                      <Building2 className="size-2.5 mr-1" />
                      {department}
                    </Badge>
                  )}
                  {rollNumber && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      <Hash className="size-2.5 mr-1" />
                      {rollNumber}
                    </Badge>
                  )}
                </div>
              )}

              <Separator />

              {/* ── Stats Section ────────────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                {profileStats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 relative overflow-hidden glass-chip ${stat.bgGradient}`}
                  >
                    <div className={`flex items-center justify-center size-8 rounded-lg ${stat.color}`}>
                      <stat.icon className="size-4" />
                    </div>
                    <div className="flex items-center gap-1">
                      {typeof stat.value === 'number' ? (
                        <span className="text-sm font-bold"><CountUp value={stat.value} duration={0.6 + i * 0.1} /></span>
                      ) : (
                        <span className="text-sm font-bold tabular-nums">{stat.value}</span>
                      )}
                      {stat.trend && (
                        <TrendingUp className="size-3 text-emerald-500" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── My Department Card ────────────────────────────────── */}
          {department && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
            >
              <Card className={`py-0 gap-0 ${deptColor.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-10 rounded-xl ${deptColor.bg}`}>
                      <Building2 className={`size-5 ${deptColor.text}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground font-medium">My Department</p>
                      <p className="text-sm font-bold">{department === 'CE' ? 'Civil Engineering' : department === 'CS' ? 'Computer Science' : department}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${deptColor.badge}`}>
                      {department}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Info Card ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
          >
            <Card className="py-0 gap-0">
              <CardContent className="p-4 space-y-0">
                {session && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                      <CalendarDays className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-muted-foreground">Session</p>
                      <p className="text-sm font-semibold">{session}</p>
                    </div>
                  </div>
                )}
                {rollNumber && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex items-center justify-center size-9 rounded-xl bg-orange-50 dark:bg-orange-950/30">
                        <Hash className="size-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[11px] text-muted-foreground">Roll Number</p>
                        <p className="text-sm font-semibold font-mono">{rollNumber}</p>
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center gap-3 py-3">
                  <div className="flex items-center justify-center size-9 rounded-xl bg-teal-50 dark:bg-teal-950/30">
                    <Users className="size-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground">Joined Classrooms</p>
                    {loading ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      <p className="text-sm font-semibold tabular-nums">
                        {classrooms.length} classroom{classrooms.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Classrooms List ──────────────────────────────────── */}
          {!loading && classrooms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.35 }}
            >
              <Card className="py-0 gap-0">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="flex items-center justify-center size-6 rounded-md bg-amber-50 dark:bg-amber-950/30">
                      <GraduationCap className="size-3.5 text-amber-600 dark:text-amber-400" />
                    </div>
                    Your Classrooms
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {classrooms.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05, duration: 0.25 }}
                        className="flex items-center justify-between rounded-xl border px-3.5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center justify-center size-8 rounded-lg bg-muted">
                            <BookOpen className="size-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium">{c.name}</span>
                        </div>
                        <Badge variant={getRoleVariant(c.userRole)} className="text-[10px] px-2 py-0 shrink-0 rounded-full">
                          {c.userRole}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Settings Section ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
          >
            <Card className="py-0 gap-0 hover:shadow-md hover:shadow-amber-500/5 transition-all duration-300">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Settings</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-0">
                  {settingsItems.map((item, i) => (
                    <div key={item.label} className="group/setting">
                      <button className="flex items-center gap-3 w-full py-3 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-transparent dark:hover:from-amber-950/20 dark:hover:to-transparent rounded-lg px-2 -mx-2 transition-all duration-300">
                        <div className={`flex items-center justify-center size-8 rounded-lg bg-muted group-hover/setting:bg-gradient-to-br group-hover/setting:from-amber-50 group-hover/setting:to-orange-50 dark:group-hover/setting:from-amber-950/30 dark:group-hover/setting:to-orange-950/20 transition-all duration-300 shadow-sm group-hover/setting:shadow-amber-500/10 dark:group-hover/setting:shadow-amber-400/5`}>
                          <item.icon className={`size-4 text-muted-foreground group-hover/setting:text-amber-600 dark:group-hover/setting:text-amber-400 transition-colors duration-300`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground">{item.description}</p>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                            {item.badge}
                          </span>
                        )}
                        <motion.div
                          className="text-muted-foreground/40 group-hover/setting:text-muted-foreground transition-colors duration-200"
                          whileHover={{ x: 3 }}
                        >
                          <ChevronRight className="size-4" />
                        </motion.div>
                      </button>
                      {i < settingsItems.length - 1 && <Separator className="ml-13" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Logout Section ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.35 }}
          >
            <Card className="py-0 gap-0 border-destructive/20 bg-gradient-to-br from-destructive/5 via-transparent to-destructive/10 dark:from-destructive/10 dark:via-transparent dark:to-destructive/15 shadow-sm hover:shadow-md hover:shadow-destructive/5 transition-all duration-300">
              {/* Danger gradient border accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-destructive/30 to-transparent" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2.5 mb-3 px-1">
                  <div className="flex items-center justify-center size-7 rounded-lg bg-destructive/10">
                    <LogOut className="size-3.5 text-destructive" />
                  </div>
                  <span className="text-xs text-muted-foreground">Account</span>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/15 border-destructive/30 h-11 rounded-xl font-medium transition-all duration-200 hover:border-destructive/50 hover:shadow-lg hover:shadow-destructive/10"
                    >
                      <LogOut className="size-4" />
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10 mx-auto mb-3">
                        <LogOut className="size-6 text-destructive" />
                      </div>
                      <AlertDialogTitle className="text-center">Sign Out?</AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        You will be logged out of your ClassTrack account. You can sign back in
                        anytime with your university email.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                      <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-destructive text-white hover:bg-destructive/90 w-full h-11 rounded-xl font-medium"
                      >
                        <LogOut className="size-4 mr-2" />
                        Sign Out
                      </AlertDialogAction>
                      <AlertDialogCancel className="w-full h-11 rounded-xl">
                        Cancel
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-[10px] text-muted-foreground/60 text-center mt-3">
                  ClassTrack v1.0 &middot; &copy; {new Date().getFullYear()}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
