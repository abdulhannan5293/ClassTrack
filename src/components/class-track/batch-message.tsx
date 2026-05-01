'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// ── Types ──────────────────────────────────────────────────────────

interface StoredMessage {
  id: string;
  text: string;
  timestamp: string;
  recipientCount: number;
  senderRole: string;
  classroomId: string;
}

// ── Constants ──────────────────────────────────────────────────────

const MAX_CHARS = 300;
const MAX_HISTORY = 20;

const QUICK_TEMPLATES = [
  { label: 'Submit assignment', text: 'Reminder: Please submit your assignment before the deadline.', icon: BookOpen },
  { label: 'Class tomorrow', text: 'Reminder: We have a class tomorrow. Please be on time.', icon: Clock },
  { label: 'Class cancelled', text: 'Important: Today\'s class has been cancelled. Will share updates soon.', icon: XCircle },
  { label: 'Exam schedule', text: 'Important: Exam schedule has been announced. Please check the details.', icon: AlertTriangle },
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

export function BatchMessage({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [rosterCount, setRosterCount] = useState<number | null>(null);
  const [rosterLoading, setRosterLoading] = useState(true);

  // ── Load messages ───────────────────────────────────────────────

  useEffect(() => {
    setMessages(loadMessages(classroomId));
  }, [classroomId]);

  // ── Fetch roster count ──────────────────────────────────────────

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
          setRosterCount(data.roster?.length ?? 0);
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
      rosterCount={rosterCount}
      rosterLoading={rosterLoading}
    />
  );
}

// ── Admin View ─────────────────────────────────────────────────────

function AdminMessageView({
  classroomId,
  messages,
  setMessages,
  rosterCount,
  rosterLoading,
}: {
  classroomId: string;
  messages: StoredMessage[];
  setMessages: React.Dispatch<React.SetStateAction<StoredMessage[]>>;
  rosterCount: number | null;
  rosterLoading: boolean;
}) {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // ── Send message ────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!messageText.trim()) {
      toast.error('Please write a message before sending.');
      return;
    }

    setSending(true);

    // Simulate brief delay for UX
    setTimeout(() => {
      const newMessage: StoredMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text: messageText.trim(),
        timestamp: new Date().toISOString(),
        recipientCount: rosterCount ?? 0,
        senderRole: 'CR',
        classroomId,
      };

      const updated = [newMessage, ...messages].slice(0, MAX_HISTORY);
      setMessages(updated);
      saveMessages(classroomId, updated);
      setMessageText('');
      setSending(false);

      toast.success(`Reminder sent to ${rosterCount ?? 0} students`);
    }, 300);
  }, [messageText, messages, rosterCount, classroomId, setMessages]);

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

  const charPct = (messageText.length / MAX_CHARS) * 100;
  const recipientDisplay = rosterLoading ? (
    <Skeleton className="h-4 w-16 inline-block" />
  ) : rosterCount !== null ? (
    <span className="text-xs text-muted-foreground">{rosterCount} student{rosterCount !== 1 ? 's' : ''}</span>
  ) : null;

  return (
    <div className="space-y-5">
      {/* Compose Area */}
      <Card className="py-0 gap-0 overflow-hidden border-amber-200/40 dark:border-amber-800/30">
        {/* Amber accent */}
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Send className="size-4 text-amber-500" />
              Send Reminder
            </CardTitle>
            {recipientDisplay}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {/* Textarea */}
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Write a reminder for your class..."
            className="min-h-[80px] resize-none text-sm bg-amber-50/30 dark:bg-amber-950/10 border-amber-200/40 dark:border-amber-800/20 focus-visible:ring-amber-500/30"
            aria-label="Message content"
          />

          {/* Character count + Send */}
          <div className="flex items-center justify-between">
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
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
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

          {/* Quick templates */}
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
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/15 px-2.5 py-1 text-[10px] text-amber-700 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <template.icon className="size-3" />
                  {template.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Section */}
      <Card className="py-0 gap-0 overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-muted-foreground" />
              Sent Messages
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
                  Use the compose area above to send reminders
                </p>
              </motion.div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                    layout
                    className="group"
                  >
                    {/* Sent message bubble — right-aligned, amber tint */}
                    <div className="flex justify-end gap-2">
                      <div className="max-w-[80%]">
                        <div className="rounded-2xl rounded-tr-sm bg-amber-50 dark:bg-amber-950/25 border border-amber-200/30 dark:border-amber-800/20 px-3.5 py-2.5">
                          <p className="text-xs leading-relaxed">{msg.text}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-muted-foreground">
                              {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              to {msg.recipientCount} students
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

  useEffect(() => {
    setMessages(loadMessages(classroomId));
  }, [classroomId]);

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
                Messages from your CR/GR will appear here
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  layout
                >
                  {/* Received message bubble — left-aligned, gray tint */}
                  <div className="flex justify-start gap-2">
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl rounded-tl-sm bg-muted/80 border border-border/50 px-3.5 py-2.5">
                        {/* Sender badge */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 text-amber-600 dark:text-amber-400 border-amber-300/50 dark:border-amber-700/50"
                          >
                            {msg.senderRole}
                          </Badge>
                          <span className="text-[9px] text-muted-foreground">
                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
