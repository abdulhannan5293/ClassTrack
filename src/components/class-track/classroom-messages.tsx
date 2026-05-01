'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  Send,
  Clock,
  Trash2,
  MessageSquare,
  Zap,
  BookOpen,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// ── Types ──────────────────────────────────────────────────────────

interface RosterStudent {
  userId: string;
  rollNumber: string;
  name: string;
}

interface StoredMessage {
  id: string;
  text: string;
  timestamp: string;
  recipientCount: number;
  recipientType: 'all' | 'department' | 'custom';
  recipientLabel: string;
  senderName: string;
  senderRole: string;
  classroomId: string;
}

// ── Constants ──────────────────────────────────────────────────────

const MAX_CHARS = 500;
const MAX_HISTORY = 20;
const PAGE_SIZE = 10;

const QUICK_TEMPLATES = [
  { label: 'Class Cancelled', text: 'Important: Today\'s class has been cancelled. Will share updates soon.', icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/30' },
  { label: 'Room Changed', text: 'Notice: The classroom has been changed. Please check the updated venue for today\'s class.', icon: Building2, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30' },
  { label: 'Assignment Due', text: 'Reminder: The assignment is due tomorrow. Please submit it before the deadline.', icon: BookOpen, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200/50 dark:border-teal-800/30' },
  { label: 'Exam Reminder', text: 'Important: Exam is scheduled for next week. Please prepare accordingly. All the best!', icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 border-orange-200/50 dark:border-orange-800/30' },
  { label: 'Extra Lecture', text: 'Notice: An extra lecture has been scheduled. Please make sure to attend.', icon: Clock, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30' },
];

// ── Helpers ────────────────────────────────────────────────────────

function getStorageKey(classroomId: string) {
  return `classtrack-messages-${classroomId}`;
}

function loadMessages(classroomId: string): StoredMessage[] {
  try {
    const raw = localStorage.getItem(getStorageKey(classroomId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(classroomId: string, messages: StoredMessage[]) {
  try {
    localStorage.setItem(getStorageKey(classroomId), JSON.stringify(messages));
  } catch {
    // localStorage unavailable
  }
}

// ── Main Component ─────────────────────────────────────────────────

export function ClassroomMessages({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userName = useAuthStore((s) => s.user?.name ?? s.user?.email?.split('@')[0] ?? 'Admin');
  const userRole = useAuthStore((s) => s.user?.role ?? 'CR');
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(true);

  // ── Load messages ───────────────────────────────────────────────

  useEffect(() => {
    setMessages(loadMessages(classroomId));
  }, [classroomId]);

  // ── Fetch roster ────────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    async function fetchRoster() {
      setRosterLoading(true);
      try {
        const res = await fetch(`/api/classrooms/${classroomId}/roster`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setRoster(data.roster ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setRosterLoading(false);
      }
    }

    fetchRoster();
  }, [accessToken, classroomId]);

  // ── Student read-only view ──────────────────────────────────────

  if (!isAdmin) {
    return <StudentMessageView classroomId={classroomId} />;
  }

  return (
    <AdminMessageView
      classroomId={classroomId}
      messages={messages}
      setMessages={setMessages}
      roster={roster}
      rosterLoading={rosterLoading}
      senderName={userName}
      senderRole={userRole}
    />
  );
}

// ── Admin View ─────────────────────────────────────────────────────

function AdminMessageView({
  classroomId,
  messages,
  setMessages,
  roster,
  rosterLoading,
  senderName,
  senderRole,
}: {
  classroomId: string;
  messages: StoredMessage[];
  setMessages: React.Dispatch<React.SetStateAction<StoredMessage[]>>;
  roster: RosterStudent[];
  rosterLoading: boolean;
  senderName: string;
  senderRole: string;
}) {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [recipientType, setRecipientType] = useState<'all' | 'department' | 'custom'>('all');
  const [showCustomSelect, setShowCustomSelect] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  // ── Compute departments from roster ─────────────────────────────

  const departments = useMemo(() => {
    // Infer department from roll number pattern (first 2 chars before dash)
    const deptSet = new Set<string>();
    roster.forEach((student) => {
      const parts = student.rollNumber.split('-');
      if (parts.length > 1) deptSet.add(parts[0]);
    });
    return Array.from(deptSet).sort();
  }, [roster]);

  // ── Compute recipient count ─────────────────────────────────────

  const recipientCount = useMemo(() => {
    if (recipientType === 'all') return roster.length;
    if (recipientType === 'custom') return selectedStudents.size;
    // department - count matching students
    return roster.length; // fallback
  }, [recipientType, roster.length, selectedStudents.size]);

  // ── Recipient label ─────────────────────────────────────────────

  const recipientLabel = useMemo(() => {
    if (recipientType === 'all') return `All ${roster.length} students`;
    if (recipientType === 'custom') return `${selectedStudents.size} student${selectedStudents.size !== 1 ? 's' : ''} selected`;
    return 'By Department';
  }, [recipientType, roster.length, selectedStudents.size]);

  // ── Toggle student selection ────────────────────────────────────

  const toggleStudent = useCallback((userId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedStudents(new Set(roster.map((s) => s.userId)));
  }, [roster]);

  const selectNone = useCallback(() => {
    setSelectedStudents(new Set());
  }, []);

  // ── Send message ────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!messageText.trim()) {
      toast.error('Please write a message before sending.');
      return;
    }

    if (recipientType === 'custom' && selectedStudents.size === 0) {
      toast.error('Please select at least one student.');
      return;
    }

    setSending(true);

    // Simulate brief delay for UX
    setTimeout(() => {
      const roleLabel = (senderRole?.toUpperCase() ?? 'CR');
      const newMessage: StoredMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
        recipientCount,
        recipientType,
        recipientLabel,
        senderName,
        senderRole: roleLabel,
        classroomId,
      };

      const updated = [newMessage, ...messages].slice(0, MAX_HISTORY);
      setMessages(updated);
      saveMessages(classroomId, updated);
      setMessageText('');
      setSelectedStudents(new Set());
      setSending(false);

      toast.success(`Message sent to ${recipientLabel}`);
    }, 300);
  }, [messageText, messages, recipientType, recipientCount, recipientLabel, senderName, senderRole, classroomId, selectedStudents.size, setMessages]);

  // ── Apply template ──────────────────────────────────────────────

  const applyTemplate = useCallback((text: string) => {
    if (text.length > MAX_CHARS) {
      setMessageText(text.slice(0, MAX_CHARS));
      toast.error('Template text was truncated to fit the character limit.');
    } else {
      setMessageText(text);
    }
  }, []);

  // ── Delete message ──────────────────────────────────────────────

  const handleDelete = useCallback(
    (id: string) => {
      const updated = messages.filter((m) => m.id !== id);
      setMessages(updated);
      saveMessages(classroomId, updated);
      toast.success('Message deleted');
    },
    [messages, classroomId, setMessages]
  );

  // ── Clear all ───────────────────────────────────────────────────

  const handleClearAll = useCallback(() => {
    setMessages([]);
    saveMessages(classroomId, []);
    toast.success('All messages cleared');
  }, [classroomId, setMessages]);

  // ── Pagination ──────────────────────────────────────────────────

  const [showAll, setShowAll] = useState(false);
  const visibleMessages = showAll ? messages : messages.slice(0, PAGE_SIZE);
  const hasMore = messages.length > PAGE_SIZE;

  const charPct = (messageText.length / MAX_CHARS) * 100;

  return (
    <div className="space-y-5">
      {/* ── Compose Area ──────────────────────────────────────────── */}
      <Card className="py-0 gap-0 overflow-hidden border-amber-200/40 dark:border-amber-800/30">
        {/* Amber accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="size-4 text-amber-500" />
              Send Announcement
            </CardTitle>
            {rosterLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <span className="text-xs text-muted-foreground">{roster.length} student{roster.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* ── Recipient Selector ─────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3" />
              Recipients
            </Label>
            <Select
              value={recipientType}
              onValueChange={(val) => {
                setRecipientType(val as 'all' | 'department' | 'custom');
                setShowCustomSelect(val === 'custom');
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select recipients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="size-3 text-muted-foreground" />
                    <span>All Students ({roster.length})</span>
                  </div>
                </SelectItem>
                <SelectItem value="department">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-3 text-muted-foreground" />
                    <span>By Department</span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-3 text-muted-foreground" />
                    <span>Custom Selection</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Custom student selection (expandable) */}
            <AnimatePresence>
              {showCustomSelect && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, type: 'tween' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Select students ({selectedStudents.size} selected)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={selectAll}
                          className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          Select all
                        </button>
                        <span className="text-muted-foreground text-[10px]">|</span>
                        <button
                          onClick={selectNone}
                          className="text-[10px] text-red-500 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto no-scrollbar space-y-1">
                      {roster.map((student) => (
                        <label
                          key={student.userId ?? student.rollNumber}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedStudents.has(student.userId)}
                            onCheckedChange={() => toggleStudent(student.userId)}
                            className="size-3.5"
                          />
                          <span className="text-xs truncate flex-1">{student.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {student.rollNumber}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Separator className="my-1" />

          {/* ── Message Textarea ───────────────────────────────────── */}
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Write your announcement..."
            className="min-h-[80px] resize-none text-sm bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-800/20 focus-visible:ring-amber-500/30"
            aria-label="Message content"
          />

          {/* ── Character count + Send ─────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                To: {recipientLabel}
              </Badge>
              <span
                className={`text-[10px] tabular-nums ${
                  charPct >= 90
                    ? 'text-red-500 font-semibold'
                    : charPct >= 75
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground'
                }`}
              >
                {messageText.length}/{MAX_CHARS}
              </span>
            </div>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!messageText.trim() || sending || (recipientType === 'custom' && selectedStudents.size === 0)}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg h-8 gap-1.5 text-xs font-medium"
            >
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Send
            </Button>
          </div>

          {/* ── Quick Templates ────────────────────────────────────── */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <Zap className="size-3" />
              Quick Templates
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  onClick={() => applyTemplate(template.text)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] transition-colors ${template.color}`}
                >
                  <template.icon className="size-3" />
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Message History ───────────────────────────────────────── */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              Message History
              {messages.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {messages.length}
                </Badge>
              )}
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={handleClearAll}
              >
                <Trash2 className="size-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                  <MessageSquare className="size-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">No messages sent yet</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Use the compose area above to send announcements
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                {visibleMessages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2, type: 'tween' }}
                    layout
                    className="group"
                  >
                    {/* Sent message bubble — right-aligned, amber tint */}
                    <div className="flex justify-end gap-2">
                      <div className="max-w-[85%]">
                        <div className="rounded-2xl rounded-tr-sm bg-amber-50 dark:bg-amber-950/25 border border-amber-200/30 dark:border-amber-800/20 px-3.5 py-2.5">
                          {/* Sender info */}
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 text-amber-700 dark:text-amber-300 border-amber-300/50 dark:border-amber-700/50"
                            >
                              {msg.senderRole}
                            </Badge>
                            <span className="text-[9px] font-medium text-foreground/80">
                              {msg.senderName}
                            </span>
                          </div>

                          <p className="text-xs leading-relaxed">{msg.text}</p>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="size-2.5" />
                              {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                            </span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Users className="size-2.5" />
                              {msg.recipientLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end mt-0.5">
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-red-500 p-1"
                            aria-label="Delete message"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Pagination toggle */}
                {hasMore && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center pt-2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                      onClick={() => setShowAll(!showAll)}
                    >
                      {showAll ? (
                        <>
                          <ChevronUp className="size-3" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3" />
                          Show {messages.length - PAGE_SIZE} More
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Student View ───────────────────────────────────────────────────

function StudentMessageView({ classroomId }: { classroomId: string }) {
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setMessages(loadMessages(classroomId));
  }, [classroomId]);

  const visibleMessages = showAll ? messages : messages.slice(0, PAGE_SIZE);
  const hasMore = messages.length > PAGE_SIZE;

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          Class Messages
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {messages.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-2">
                <MessageSquare className="size-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">No messages yet</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Announcements from your CR/GR will appear here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
              {visibleMessages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2, type: 'tween' }}
                  layout
                >
                  {/* Received message bubble — left-aligned, neutral tint */}
                  <div className="flex justify-start gap-2">
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-tl-sm bg-muted/80 border border-border/50 px-3.5 py-2.5">
                        {/* Sender info */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 text-amber-600 dark:text-amber-400 border-amber-300/50 dark:border-amber-700/50"
                          >
                            {msg.senderRole}
                          </Badge>
                          <span className="text-[9px] font-medium text-foreground/80">
                            {msg.senderName}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                        {/* Recipient info */}
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle2 className="size-2.5 text-muted-foreground/50" />
                          <span className="text-[9px] text-muted-foreground/60">
                            {msg.recipientLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Pagination toggle */}
              {hasMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center pt-2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="size-3" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3" />
                        Show {messages.length - PAGE_SIZE} More
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
