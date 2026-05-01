'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket,
  School,
  Users,
  KeyRound,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Eye,
  Calculator,
  Shield,
  Megaphone,
  MessageSquare,
  StickyNote,
  FileText,
  CalendarDays,
  Settings,
  Search,
  BookMarked,
  Lightbulb,
  AlertTriangle,
  Info,
  ChevronRight,
  X,
  CheckCircle2,
  Circle,
  Sparkles,
  Hand,
  FileSpreadsheet,
  Upload,
  Download,
  Lock,
  Unlock,
  Timer,
  Trophy,
  Target,
  Clock,
  UserPlus,
  Star,
  Bell,
  Vote,
  PenLine,
  Trash2,
  Copy,
  RotateCcw,
  Palette,
  ArrowRight,
  Plus,
  Save,
  TrendingUp,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// ── Types ──────────────────────────────────────────────────────────

interface UserGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Guide Section Data ─────────────────────────────────────────────

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  color: string; // tailwind color classes for icon bg + text
  content: React.ReactNode;
}

// ── Callout Box Component ──────────────────────────────────────────

function CalloutBox({
  type = 'tip',
  children,
}: {
  type?: 'tip' | 'warning' | 'info';
  children: React.ReactNode;
}) {
  const configs = {
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'Pro Tip',
      labelColor: 'text-amber-700 dark:text-amber-300',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: 'Important',
      labelColor: 'text-orange-700 dark:text-orange-300',
    },
    info: {
      icon: Info,
      bg: 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
      label: 'Note',
      labelColor: 'text-teal-700 dark:text-teal-300',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={`flex gap-3 rounded-lg border p-3 my-3 ${config.bg}`}>
      <Icon className={`size-4 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="text-sm leading-relaxed">
        <span className={`font-semibold ${config.labelColor}`}>{config.label}: </span>
        <span className="text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

// ── Step Component ─────────────────────────────────────────────────

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 my-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center size-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-bold shrink-0 shadow-sm shadow-amber-500/20">
          {number}
        </div>
        {number < 16 && <div className="w-px flex-1 bg-border mt-1 min-h-4" />}
      </div>
      <div className="flex-1 pb-1">
        <p className="font-medium text-sm mb-1">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ── Action Tag Component ───────────────────────────────────────────

function ActionTag({ children, color = 'amber' }: { children: React.ReactNode; color?: 'amber' | 'teal' | 'emerald' | 'orange' }) {
  const colorMap = {
    amber: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    teal: 'bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
    orange: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${colorMap[color]}`}>
      {children}
    </span>
  );
}

// ── Section Content Builders ───────────────────────────────────────

function GettingStartedContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Open ClassTrack & Sign Up">
        Launch the app and you&apos;ll see the login screen. Enter your university email address to get started.
      </Step>
      <Step number={2} title="Use Your Roll Number in the Email">
        Your email must be in the format: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">rollnumber@university.edu</code>.
        The part before <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">@</code> is your roll number,
        which will be padded to 3 digits automatically (e.g., &quot;5&quot; becomes &quot;005&quot;).
      </Step>
      <Step number={3} title="Verify with OTP">
        A 6-digit OTP will be generated and displayed. Enter it to verify your identity.
        <div className="flex gap-2 mt-2">
          <ActionTag color="teal"><Clock className="size-3" /> OTP expires after a few minutes</ActionTag>
          <ActionTag color="amber"><Sparkles className="size-3" /> Demo: OTP shown in response</ActionTag>
        </div>
      </Step>
      <Step number={4} title="You&apos;re In!">
        After verification, you&apos;ll land on the Dashboard. By default, you&apos;re a <ActionTag color="orange">Student</ActionTag> role.
        If you create a classroom, you become its <ActionTag color="amber">CR</ActionTag> (Class Representative).
      </Step>
      <CalloutBox type="info">
        No password needed! ClassTrack uses email-based OTP authentication. Just enter your email, verify, and you&apos;re ready to go.
      </CalloutBox>
    </div>
  );
}

function CreatingClassroomContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Tap &quot;Create Classroom&quot;">
        On the Dashboard, find the <ActionTag color="amber"><Plus className="size-3" /> Create Classroom</ActionTag> button
        below the greeting banner. Tap it to open the creation dialog.
      </Step>
      <Step number={2} title="Fill in Details">
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong>Classroom Name</strong> — e.g., &quot;Section A&quot;, &quot;Morning Batch&quot;</li>
          <li><strong>Department</strong> — Choose from <ActionTag color="orange">CE</ActionTag> (Civil Engineering) or <ActionTag color="teal">CS</ActionTag> (Computer Science)</li>
          <li><strong>Session Year</strong> — e.g., &quot;2023-2024&quot;</li>
        </ul>
      </Step>
      <Step number={3} title="Create & Get Invite Code">
        Tap &quot;Create Classroom&quot;. You&apos;ll automatically become the <ActionTag color="amber">CR</ActionTag> with full admin privileges.
        An invite code is generated for sharing with students.
      </Step>
      <CalloutBox type="tip">
        You can create multiple classrooms if you&apos;re CR for different sections. Each classroom gets its own invite code, roster, subjects, and attendance records.
      </CalloutBox>
      <CalloutBox type="warning">
        The classroom name can be edited later from Settings, but the department and session year cannot be changed after creation.
      </CalloutBox>
    </div>
  );
}

function ManagingRosterContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Navigate to Roster Tab">
        Open your classroom and go to the <ActionTag color="teal"><Users className="size-3" /> Roster</ActionTag> tab.
        This is only visible if you&apos;re a CR or GR.
      </Step>
      <Step number={2} title="Upload via Excel">
        <div className="mt-1">
          <p className="mb-2">Prepare an Excel file (.xlsx) with the following columns:</p>
          <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs border overflow-x-auto">
            <div className="text-muted-foreground mb-1">Required format:</div>
            <div><span className="text-amber-700 dark:text-amber-300 font-semibold">Roll Number</span> | <span className="text-teal-700 dark:text-teal-300 font-semibold">Name</span></div>
            <div className="text-muted-foreground mt-1">Example:</div>
            <div>001 | Ali Ahmed</div>
            <div>002 | Sara Khan</div>
            <div>015 | Usman Tariq</div>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <ActionTag color="amber"><Download className="size-3" /> Download template first</ActionTag>
          <ActionTag color="emerald"><Upload className="size-3" /> Max 5MB file size</ActionTag>
        </div>
      </Step>
      <Step number={3} title="Add Single Student">
        Tap the <ActionTag color="orange"><UserPlus className="size-3" /> Add Student</ActionTag> button to manually add one student at a time.
        Enter the roll number and full name. Roll numbers are auto-padded to 3 digits.
      </Step>
      <Step number={4} title="Review & Confirm">
        After upload, preview the parsed students before confirming. Duplicate roll numbers are skipped with a warning.
      </Step>
      <CalloutBox type="tip">
        Download the template from the Roster tab to get the exact column format. This prevents parsing errors and ensures all students are imported correctly.
      </CalloutBox>
      <CalloutBox type="warning">
        If a student already exists in the roster, they will be skipped during upload. Remove duplicates before uploading for a clean import.
      </CalloutBox>
    </div>
  );
}

function InviteCodeContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Find Your Invite Code">
        The invite code is shown on the classroom card on the Dashboard and also in the classroom Settings tab.
        Tap the code to copy it to your clipboard.
      </Step>
      <Step number={2} title="Share with Students">
        Share the code via WhatsApp, email, or any messaging platform. The code is case-insensitive —
        &quot;ABC123&quot; and &quot;abc123&quot; both work.
      </Step>
      <Step number={3} title="Students Join">
        Students open ClassTrack, tap <ActionTag color="teal"><UserPlus className="size-3" /> Join Classroom</ActionTag> on the Dashboard,
        and enter the code. They&apos;re instantly added as <ActionTag color="orange">Student</ActionTag> role.
      </Step>
      <Step number={4} title="Regenerate if Needed">
        As CR, go to Settings → Invite Code Management → <ActionTag color="amber"><RotateCcw className="size-3" /> Regenerate Code</ActionTag>.
        The old code becomes invalid immediately.
      </Step>
      <CalloutBox type="info">
        Students who join automatically get matched to their roster entry using their email&apos;s roll number prefix. If their roll number isn&apos;t in the roster, they join as unclaimed members.
      </CalloutBox>
      <CalloutBox type="warning">
        Regenerating the invite code invalidates the old one. Make sure all students have already joined before regenerating, or share the new code promptly.
      </CalloutBox>
    </div>
  );
}

function ManagingSubjectsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Go to Subjects Tab">
        Open your classroom and select the <ActionTag color="teal"><BookOpen className="size-3" /> Subjects</ActionTag> tab (admin only).
      </Step>
      <Step number={2} title="Add a New Subject">
        Tap <ActionTag color="amber"><Plus className="size-3" /> Add Subject</ActionTag> and fill in:
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong>Subject Name</strong> — e.g., &quot;Data Structures&quot;</li>
          <li><strong>Subject Code</strong> — e.g., &quot;CS-201&quot;</li>
          <li><strong>Credit Hours</strong> — typically 3 or 4</li>
          <li><strong>Type</strong> — <ActionTag color="teal">Theory</ActionTag> or <ActionTag color="amber">Lab</ActionTag></li>
          <li><strong>Schedule Days</strong> — select which days of the week (M, T, W, Th, F, Sa, Su)</li>
          <li><strong>Start/End Time</strong> — optional, for the schedule widget</li>
        </ul>
      </Step>
      <Step number={3} title="Edit or Delete">
        Use the edit button on any subject card to modify details. Delete removes the subject and all related attendance sessions.
      </Step>
      <CalloutBox type="tip">
        Schedule days affect the &quot;Today&apos;s Schedule&quot; widget on the Dashboard. Set accurate days and times so students can see their daily timetable at a glance.
      </CalloutBox>
    </div>
  );
}

function TakingAttendanceContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Open Attendance Tab">
        Go to <ActionTag color="teal"><ClipboardCheck className="size-3" /> Attendance</ActionTag> in your classroom. This is the core attendance feature.
      </Step>
      <Step number={2} title="Create a New Session">
        Tap <ActionTag color="amber"><Plus className="size-3" /> New Session</ActionTag>. Select a subject, choose the date, and start marking.
      </Step>
      <Step number={3} title="Exception-Based Marking">
        ClassTrack uses an <strong>exception-based</strong> system — all students start as <ActionTag color="emerald"><CheckCircle2 className="size-3" /> Present</ActionTag>.
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20">Default</Badge>
            <span>All students = Present</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20"><X className="size-3" /> Tap</Badge>
            <span>Mark as Absent</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"><Hand className="size-3" /> Long Press</Badge>
            <span>Mark as Late</span>
          </div>
        </div>
      </Step>
      <Step number={4} title="Save Draft">
        Tap <ActionTag color="amber"><Save className="size-3" /> Save Draft</ActionTag> to save progress without finalizing.
        You can reopen and continue marking later. Drafts are not visible to students.
      </Step>
      <Step number={5} title="Finalize & Lock">
        When done, tap <ActionTag color="orange"><Lock className="size-3" /> Finalize</ActionTag>. This locks the session permanently —
        no further changes can be made. Finalized sessions appear in students&apos; attendance records and the heatmap calendar.
      </Step>
      <CalloutBox type="warning">
        Finalization is irreversible! Double-check all markings before finalizing. Once locked, even the CR cannot edit attendance records for that session.
      </CalloutBox>
      <CalloutBox type="tip">
        Use the search bar during marking to quickly find a student by name or roll number. This is especially helpful in large classrooms.
      </CalloutBox>
    </div>
  );
}

function ManagingResultsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Go to Results Tab">
        Open your classroom and navigate to <ActionTag color="teal"><BarChart3 className="size-3" /> Results</ActionTag> (admin only).
      </Step>
      <Step number={2} title="Create an Assessment">
        Tap <ActionTag color="amber"><Plus className="size-3" /> New Assessment</ActionTag>. Enter:
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><strong>Title</strong> — e.g., &quot;Midterm Exam&quot;, &quot;Quiz 3&quot;</li>
          <li><strong>Total Marks</strong> — maximum possible score</li>
        </ul>
      </Step>
      <Step number={3} title="Upload Marks via Excel">
        Prepare an Excel file with columns: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Roll Number</code> and <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Marks</code>.
        Upload to auto-fill student marks. Negative marks are clamped to 0, and marks exceeding the total are capped.
      </Step>
      <Step number={4} title="Publish Results">
        Once marks are uploaded, tap <ActionTag color="emerald"><Eye className="size-3" /> Publish</ActionTag> to make results visible to students.
        Unpublished results remain as drafts only visible to admins.
      </Step>
      <CalloutBox type="info">
        You can create multiple assessments per subject (quizzes, assignments, midterms, finals). Each is published independently so you control when students see their marks.
      </CalloutBox>
    </div>
  );
}

function ViewingResultsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Check Published Results">
        As a student, go to <ActionTag color="teal"><BarChart3 className="size-3" /> Results</ActionTag> in the classroom.
        Only <ActionTag color="emerald">published</ActionTag> assessments are visible.
      </Step>
      <Step number={2} title="View Your Marks">
        Each assessment shows your obtained marks, total marks, and a percentage badge.
        Color-coded grades help you quickly identify performance:
        <div className="flex gap-2 mt-2 flex-wrap">
          <ActionTag color="emerald">Excellent (80%+)</ActionTag>
          <ActionTag color="teal">Good (60-79%)</ActionTag>
          <ActionTag color="amber">Average (40-59%)</ActionTag>
          <ActionTag color="orange">Below Avg (&lt;40%)</ActionTag>
        </div>
      </Step>
      <Step number={3} title="Report Card">
        Access your comprehensive <ActionTag color="amber"><FileText className="size-3" /> Report Card</ActionTag> from the Dashboard quick actions.
        It includes all classrooms, attendance rates, and assessment results in one view.
      </Step>
      <CalloutBox type="tip">
        Check the Report Card regularly to track your academic progress across all enrolled classrooms at once.
      </CalloutBox>
    </div>
  );
}

function GpaCalculatorContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Configure Grade Points">
        Go to <ActionTag color="teal"><Calculator className="size-3" /> GPA Calculator</ActionTag> from the bottom navigation.
        The CR can configure grade-to-point mapping (e.g., A=4.0, B=3.0, etc.) in the GPA Config tab of the classroom.
      </Step>
      <Step number={2} title="Calculate Semester GPA">
        Enter your grades for each subject along with credit hours. The calculator computes your weighted GPA for the current semester.
      </Step>
      <Step number={3} title="Cumulative GPA">
        If you have previous semester data, enter those GPAs to calculate your cumulative GPA across all semesters.
      </Step>
      <CalloutBox type="info">
        GPA configuration is classroom-specific. Each classroom&apos;s CR sets up the grading scale. Contact your CR if the grade points don&apos;t match your university&apos;s system.
      </CalloutBox>
      <CalloutBox type="tip">
        The GPA Calculator works as a self-service tool — your calculations are stored locally. Use it whenever you receive new results to keep your GPA up to date.
      </CalloutBox>
    </div>
  );
}

function GrContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="What is a GR?">
        A <ActionTag color="teal">GR</ActionTag> (Girls' Representative) is a student assigned by the CR to help manage the classroom.
        GRs have limited admin privileges — they can take attendance, manage subjects, and post announcements, but cannot delete the classroom.
      </Step>
      <Step number={2} title="Assigning a GR">
        Only the CR can assign a GR. Go to <ActionTag color="amber"><Shield className="size-3" /> GR Manager</ActionTag> tab in the classroom,
        select a student from the roster, and assign them. Only one GR can be active at a time.
      </Step>
      <Step number={3} title="GR Permissions">
        <div className="bg-muted/50 rounded-lg p-3 mt-2 border space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Take attendance & create sessions</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Add/edit subjects</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Post announcements</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>Manage results & publish</span>
          </div>
          <Separator className="my-1" />
          <div className="flex items-center gap-2 text-sm">
            <X className="size-4 text-red-400" />
            <span className="text-muted-foreground">Cannot delete classroom</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <X className="size-4 text-red-400" />
            <span className="text-muted-foreground">Cannot assign/remove other GRs</span>
          </div>
        </div>
      </Step>
      <CalloutBox type="warning">
        When a new GR is assigned, the previous GR is automatically demoted back to a regular Student. Make sure to communicate changes to your team.
      </CalloutBox>
    </div>
  );
}

function AnnouncementsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Post an Announcement">
        Go to the <ActionTag color="teal"><Megaphone className="size-3" /> Notices</ActionTag> tab in the classroom.
        Tap &quot;Post Announcement&quot; and fill in the title, content, and priority level.
      </Step>
      <Step number={2} title="Set Priority">
        Choose from three levels:
        <div className="flex gap-2 mt-2 flex-wrap">
          <ActionTag color="teal">Normal</ActionTag>
          <ActionTag color="amber">Important</ActionTag>
          <ActionTag color="orange">Urgent</ActionTag>
        </div>
        Urgent announcements get highlighted with a red accent border.
      </Step>
      <Step number={3} title="Pin Important Posts">
        Toggle the <ActionTag color="amber"><Star className="size-3" /> Pin</ActionTag> switch to keep critical announcements at the top of the list.
        Pinned posts have a distinct amber background.
      </Step>
      <Step number={4} title="Edit or Delete">
        Edit or remove any announcement you&apos;ve posted. Use the search bar to filter through past announcements.
      </Step>
      <CalloutBox type="tip">
        Use the pin feature for ongoing announcements like &quot;Midterm Schedule&quot; or &quot;Project Deadline&quot;. Students will always see pinned posts first.
      </CalloutBox>
    </div>
  );
}

function PollsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Create a Poll">
        In the <ActionTag color="teal"><Vote className="size-3" /> Polls</ActionTag> tab, create polls to gather student opinions.
        Add options and set a deadline if needed.
      </Step>
      <Step number={2} title="Discussion Threads">
        Each poll can have an attached discussion thread where students and admins can post comments and replies.
        Great for collaborative decision-making.
      </Step>
      <Step number={3} title="View Results">
        After voting closes, see the results with vote counts and percentages. Results update in real-time as votes come in.
      </Step>
      <CalloutBox type="info">
        Polls and discussions help CRs make informed decisions — use them for selecting class timings, activity dates, or gathering feedback on teaching methods.
      </CalloutBox>
    </div>
  );
}

function QuickNotesContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Access Quick Notes">
        The <ActionTag color="teal"><StickyNote className="size-3" /> Quick Notes</ActionTag> widget is available directly on the Dashboard.
        No need to open a classroom — it&apos;s always accessible.
      </Step>
      <Step number={2} title="Create Notes">
        Tap the add button to create a new note. Assign a color tag for visual organization:
        <div className="flex gap-2 mt-2 flex-wrap">
          <ActionTag color="amber"><Palette className="size-3" /> Amber</ActionTag>
          <ActionTag color="teal"><Palette className="size-3" /> Teal</ActionTag>
          <ActionTag color="emerald"><Palette className="size-3" /> Emerald</ActionTag>
          <ActionTag color="orange"><Palette className="size-3" /> Orange</ActionTag>
        </div>
      </Step>
      <Step number={3} title="Organize & Edit">
        Notes are saved locally. Edit, delete, or reorder them as needed. Use color coding to categorize by subject, urgency, or type.
      </Step>
      <CalloutBox type="tip">
        Use Quick Notes for to-do lists, important deadlines, or quick reminders. They persist across sessions so you never lose track of important tasks.
      </CalloutBox>
    </div>
  );
}

function ReportCardContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Access Report Card">
        Tap the <ActionTag color="amber"><FileText className="size-3" /> Report Card</ActionTag> button from the Dashboard quick actions,
        or navigate via the bottom navigation bar.
      </Step>
      <Step number={2} title="Overview Stats">
        The report card shows a 4-panel summary at the top:
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-muted/50 rounded-lg p-2 border text-center">
            <School className="size-4 mx-auto mb-1 text-amber-600 dark:text-amber-400" />
            <div className="text-xs font-medium">Classrooms</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border text-center">
            <Target className="size-4 mx-auto mb-1 text-teal-600 dark:text-teal-400" />
            <div className="text-xs font-medium">Attendance Rate</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border text-center">
            <BarChart3 className="size-4 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
            <div className="text-xs font-medium">Assessments</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border text-center">
            <TrendingUp className="size-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs font-medium">Avg Score</div>
          </div>
        </div>
      </Step>
      <Step number={3} title="Per-Classroom Details">
        Expand any classroom card to see individual assessment results with marks, percentages, and grade badges.
        Each classroom shows a progress bar for attendance rate.
      </Step>
      <CalloutBox type="info">
        The Report Card aggregates data from all your enrolled classrooms. It&apos;s your one-stop view for academic performance tracking.
      </CalloutBox>
    </div>
  );
}

function HeatmapContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Open Calendar Tab">
        In the classroom, go to <ActionTag color="teal"><CalendarDays className="size-3" /> Calendar</ActionTag>.
        This shows the attendance heatmap — a visual calendar of your attendance history.
      </Step>
      <Step number={2} title="Read the Heatmap">
        Each day is color-coded based on your attendance:
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="size-4 rounded bg-emerald-500" />
            <span><strong>Present</strong> — You attended the session</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="size-4 rounded bg-red-500" />
            <span><strong>Absent</strong> — You missed the session</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="size-4 rounded bg-amber-500" />
            <span><strong>Late</strong> — You arrived late</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="size-4 rounded bg-gray-400" />
            <span><strong>Excused</strong> — Excused absence</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="size-4 rounded border" />
            <span><strong>No Session</strong> — No class that day</span>
          </div>
        </div>
      </Step>
      <Step number={3} title="Navigate Months">
        Use the arrow buttons to browse different months. Tap &quot;Today&quot; to jump back to the current month.
      </Step>
      <Step number={4} title="View Day Details">
        Tap any colored day to see a breakdown of which subjects had sessions and your status for each.
        Multi-session days show a count badge.
      </Step>
      <CalloutBox type="tip">
        The heatmap gives you an instant visual overview of your attendance pattern. Green-heavy months mean great attendance; red clusters indicate areas to improve.
      </CalloutBox>
    </div>
  );
}

function SettingsContent() {
  return (
    <div className="space-y-1">
      <Step number={1} title="Open Settings Tab">
        Go to <ActionTag color="teal"><Settings className="size-3" /> Settings</ActionTag> in your classroom (CR only).
      </Step>
      <Step number={2} title="Edit Classroom Name">
        Tap the pencil icon next to the classroom name to rename it. Press Enter to save or Escape to cancel.
      </Step>
      <Step number={3} title="Manage Invite Code">
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li><Copy className="size-3 inline" /> <strong>Copy</strong> — Copy the current invite code</li>
          <li><RotateCcw className="size-3 inline" /> <strong>Regenerate</strong> — Create a new code (old one expires)</li>
        </ul>
      </Step>
      <Step number={4} title="Roles & Permissions">
        View the permission matrix for all roles:
        <div className="space-y-2 mt-2">
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2 border border-amber-200 dark:border-amber-800/40">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
              <Shield className="size-4" /> CR (Class Representative)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Full admin access — everything</p>
          </div>
          <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg p-2 border border-teal-200 dark:border-teal-800/40">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300">
              <UserPlus className="size-4" /> GR (Girls' Representative)
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Limited admin — no deletion</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 border">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" /> Student
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Read-only — view attendance & results</p>
          </div>
        </div>
      </Step>
      <Step number={5} title="Danger Zone">
        The <ActionTag color="orange"><Trash2 className="size-3" /> Delete Classroom</ActionTag> action permanently removes the classroom,
        all roster entries, subjects, attendance records, results, and announcements. This action cannot be undone.
      </Step>
      <CalloutBox type="warning">
        Deleting a classroom is permanent and irreversible. All data — roster, subjects, attendance, results, announcements — will be permanently erased. Use with extreme caution.
      </CalloutBox>
    </div>
  );
}

// ── Build All Sections ─────────────────────────────────────────────

function buildSections(): GuideSection[] {
  return [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Rocket,
      description: 'Sign up, verify email with OTP, and understand roles',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
      content: <GettingStartedContent />,
    },
    {
      id: 'creating-classroom',
      title: 'Creating a Classroom',
      icon: School,
      description: 'Set up a new classroom as CR with department & session',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
      content: <CreatingClassroomContent />,
    },
    {
      id: 'managing-roster',
      title: 'Managing Roster',
      icon: Users,
      description: 'Upload Excel roster, add students, download template',
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
      content: <ManagingRosterContent />,
    },
    {
      id: 'invite-code',
      title: 'Invite Code',
      icon: KeyRound,
      description: 'Share code with students, joining process, regeneration',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
      content: <InviteCodeContent />,
    },
    {
      id: 'managing-subjects',
      title: 'Managing Subjects',
      icon: BookOpen,
      description: 'Add/edit subjects, schedule days, credit hours',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
      content: <ManagingSubjectsContent />,
    },
    {
      id: 'taking-attendance',
      title: 'Taking Attendance',
      icon: ClipboardCheck,
      description: 'Exception-based marking, draft saving, finalizing',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
      content: <TakingAttendanceContent />,
    },
    {
      id: 'managing-results',
      title: 'Managing Results',
      icon: BarChart3,
      description: 'Create assessments, upload marks, publish to students',
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
      content: <ManagingResultsContent />,
    },
    {
      id: 'viewing-results',
      title: 'Viewing Results (Students)',
      icon: Eye,
      description: 'See published assessments, check own marks & grades',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
      content: <ViewingResultsContent />,
    },
    {
      id: 'gpa-calculator',
      title: 'GPA Calculator',
      icon: Calculator,
      description: 'Configure grade points, calculate semester & cumulative GPA',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
      content: <GpaCalculatorContent />,
    },
    {
      id: 'gr',
      title: "GR (Girls' Representative)",
      icon: Shield,
      description: 'GR role, permissions, assignment by CR',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
      content: <GrContent />,
    },
    {
      id: 'announcements',
      title: 'Announcements & Messages',
      icon: Megaphone,
      description: 'Post announcements, priority levels, pinning',
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
      content: <AnnouncementsContent />,
    },
    {
      id: 'polls',
      title: 'Polls & Discussion',
      icon: MessageSquare,
      description: 'Create polls, discussion threads, vote & view results',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
      content: <PollsContent />,
    },
    {
      id: 'quick-notes',
      title: 'Quick Notes',
      icon: StickyNote,
      description: 'Dashboard notes with color tags & organization',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40',
      content: <QuickNotesContent />,
    },
    {
      id: 'report-card',
      title: 'Student Report Card',
      icon: FileText,
      description: 'Comprehensive academic report with stats & grades',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40',
      content: <ReportCardContent />,
    },
    {
      id: 'heatmap',
      title: 'Attendance Heatmap',
      icon: CalendarDays,
      description: 'Visual calendar with color-coded attendance history',
      color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800/40',
      content: <HeatmapContent />,
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      description: 'Edit classroom, manage invite code, danger zone',
      color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40',
      content: <SettingsContent />,
    },
  ];
}

// ── Container Animation Variants ───────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// ── Main Component ─────────────────────────────────────────────────

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [readSections, setReadSections] = useState<Set<string>>(new Set());
  const [activeSections, setActiveSections] = useState<string[]>([]);

  const allSections = useMemo(() => buildSections(), []);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return allSections;
    const q = searchQuery.toLowerCase();
    return allSections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    );
  }, [allSections, searchQuery]);

  const handleSectionOpen = useCallback((sectionId: string) => {
    setActiveSections((prev) => {
      if (prev.includes(sectionId)) return prev;
      return [...prev, sectionId];
    });
    setReadSections((prev) => {
      if (prev.has(sectionId)) return prev;
      const next = new Set(prev);
      next.add(sectionId);
      return next;
    });
  }, []);

  const progressPercent = Math.round((readSections.size / allSections.length) * 100);

  // Reset search when dialog closes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSearchQuery('');
        setActiveSections([]);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden p-0 [&>button]:hidden">
        {/* ── Header ──────────────────────────────────────────── */}
        <DialogHeader className="p-5 pb-0 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10">
              <BookMarked className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight">User Guide</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Everything you need to know about ClassTrack
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg shrink-0"
              onClick={() => handleOpenChange(false)}
              aria-label="Close guide"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Guide Progress</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                {readSections.size}/{allSections.length} sections read
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-1.5"
            />
            {progressPercent === 100 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <Sparkles className="size-3" />
                <span className="font-medium">You&apos;ve read the entire guide! 🎉</span>
              </motion.div>
            )}
          </div>

          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 rounded-lg bg-muted/50 border-muted-foreground/10 focus-visible:ring-amber-500/30 focus-visible:border-amber-300 dark:focus-visible:border-amber-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-md flex items-center justify-center hover:bg-accent transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </DialogHeader>

        <Separator className="mt-3" />

        {/* ── Scrollable Content ──────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-4 py-2 pb-6">
            <AnimatePresence mode="wait">
              {filteredSections.length === 0 ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="flex items-center justify-center size-12 rounded-full bg-muted mb-3">
                    <Search className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No sections found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Try a different search term</p>
                </motion.div>
              ) : (
                <motion.div
                  key="sections-list"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Accordion
                    type="multiple"
                    defaultValue={[]}
                    className="space-y-0"
                  >
                    {filteredSections.map((section) => {
                      const isRead = readSections.has(section.id);
                      const Icon = section.icon;

                      return (
                        <motion.div key={section.id} variants={itemVariants}>
                          <AccordionItem
                            value={section.id}
                            className="border-b last:border-b-0 data-[state=open]:bg-muted/20 rounded-lg px-1 transition-colors duration-200"
                          >
                            <AccordionTrigger
                              onClick={() => handleSectionOpen(section.id)}
                              className="hover:no-underline py-3 gap-3"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`flex items-center justify-center size-8 rounded-lg border shrink-0 ${section.color}`}>
                                  <Icon className="size-4" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{section.title}</span>
                                    {isRead && (
                                      <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                      >
                                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                                      </motion.span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                    {section.description}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-1 text-sm">
                              {section.content}
                            </AccordionContent>
                          </AccordionItem>
                        </motion.div>
                      );
                    })}
                  </Accordion>

                  {/* Search results count */}
                  {searchQuery.trim() && filteredSections.length > 0 && (
                    <div className="text-center mt-4">
                      <span className="text-xs text-muted-foreground">
                        Showing {filteredSections.length} of {allSections.length} sections
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
