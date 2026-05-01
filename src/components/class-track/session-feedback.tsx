'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquarePlus,
  Star,
  Loader2,
  MessageCircle,
  MessageSquare,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  BookOpenCheck,
  Gauge,
  ThumbsUp,
  User,
  CalendarDays,
  AlertCircle,
} from 'lucide-react';

// ── Animation variants (tween, not spring!) ──────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

// ── Types ────────────────────────────────────────────────────────

interface SessionInfo {
  id: string;
  conductedDate: string;
  subject: { name: string; code: string };
  status: string;
  _count?: { records: number };
}

interface FeedbackEntry {
  id: string;
  userId: string;
  userName: string;
  understanding: number;
  pace: number;
  overall: number;
  comment: string;
  submittedAt: string;
}

// ── Star Rating Component ────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 'md',
  readonly = false,
}: {
  value: number;
  onChange?: (val: number) => void;
  size?: 'sm' | 'md';
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === 'sm' ? 'size-3.5' : 'size-5';
  const starColor = size === 'sm' ? 'text-amber-500' : 'text-amber-400';
  const filledIconSize = size === 'sm' ? 'size-4' : 'size-[22px]';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform duration-150`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          <Star
            className={`${
              star <= (hovered || value)
                ? filledIconSize
                : iconSize
            } ${
              star <= (hovered || value)
                ? starColor
                : 'text-muted-foreground/30'
            } transition-all duration-150`}
            fill={star <= (hovered || value) ? 'currentColor' : 'none'}
          />
        </button>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export function SessionFeedback({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const userName = useAuthStore((s) => s.user?.name || s.user?.email || 'Anonymous');

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Student feedback form state
  const [feedbackForms, setFeedbackForms] = useState<Record<string, { understanding: number; pace: number; overall: number; comment: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  // ── Fetch sessions ────────────────────────────────────────────

  const fetchSessions = useCallback(async () => {
    if (!accessToken || !classroomId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/sessions?classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      const list: SessionInfo[] = data.sessions ?? [];
      setSessions(list.filter((s) => s.status === 'finalized'));
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // ── LocalStorage helpers ──────────────────────────────────────

  const getFeedbackKey = (sessionId: string) =>
    `classtrack-feedback-${sessionId}-${userId || 'anonymous'}`;

  const getFeedbackForSession = (sessionId: string): FeedbackEntry[] => {
    try {
      const raw = localStorage.getItem(`classtrack-feedback-${sessionId}`);
      if (!raw) return [];
      const all: FeedbackEntry[] = JSON.parse(raw);
      return all;
    } catch {
      return [];
    }
  };

  const getUserFeedback = (sessionId: string): FeedbackEntry | null => {
    try {
      const raw = localStorage.getItem(getFeedbackKey(sessionId));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const saveFeedbackForSession = (sessionId: string, entry: FeedbackEntry) => {
    try {
      const allFeedback = getFeedbackForSession(sessionId);
      // Replace existing entry by userId
      const idx = allFeedback.findIndex((f) => f.userId === userId);
      if (idx >= 0) {
        allFeedback[idx] = entry;
      } else {
        allFeedback.push(entry);
      }
      localStorage.setItem(`classtrack-feedback-${sessionId}`, JSON.stringify(allFeedback));
      localStorage.setItem(getFeedbackKey(sessionId), JSON.stringify(entry));
    } catch {
      // Storage full or unavailable
    }
  };

  const hasSubmittedToday = (sessionId: string): boolean => {
    const userFeedback = getUserFeedback(sessionId);
    if (!userFeedback) return false;
    const submittedDate = new Date(userFeedback.submittedAt).toDateString();
    return submittedDate === new Date().toDateString();
  };

  // ── Submit feedback ───────────────────────────────────────────

  const handleSubmitFeedback = async (sessionId: string) => {
    if (!userId) {
      toast.error('Please log in to submit feedback');
      return;
    }

    const form = feedbackForms[sessionId];
    if (!form || form.overall === 0) {
      toast.error('Please provide at least an overall rating');
      return;
    }

    setSubmitting(sessionId);
    // Simulate network delay for UX
    await new Promise((r) => setTimeout(r, 600));

    try {
      const entry: FeedbackEntry = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        userName,
        understanding: form.understanding,
        pace: form.pace,
        overall: form.overall,
        comment: form.comment.trim(),
        submittedAt: new Date().toISOString(),
      };

      saveFeedbackForSession(sessionId, entry);
      setFeedbackForms((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      toast.success('Feedback submitted successfully!');
    } catch {
      toast.error('Failed to save feedback');
    } finally {
      setSubmitting(null);
    }
  };

  // ── Compute averages for a session ────────────────────────────

  const getSessionAverages = (sessionId: string) => {
    const all = getFeedbackForSession(sessionId);
    if (all.length === 0) return null;
    const avg = (field: keyof FeedbackEntry) => {
      const vals = all.map((f) => f[field]).filter((v) => typeof v === 'number');
      return vals.length > 0 ? Math.round((vals.reduce((a, b) => a + (b as number), 0) / vals.length) * 10) / 10 : 0;
    };
    return {
      understanding: avg('understanding'),
      pace: avg('pace'),
      overall: avg('overall'),
      count: all.length,
    };
  };

  // ── Loading skeleton ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="py-0 gap-0 overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────

  if (sessions.length === 0) {
    return (
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400" />
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/40 dark:to-emerald-950/40 mb-4 animate-float">
            <MessageSquare className="size-8 text-teal-500 dark:text-teal-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">No sessions available</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {isAdmin
              ? 'Finalized sessions will appear here for feedback review.'
              : 'Completed sessions will appear here for feedback.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
              <MessageSquarePlus className="size-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {isAdmin ? 'Session Feedback' : 'Share Feedback'}
              </CardTitle>
              <CardDescription className="text-[10px] text-muted-foreground">
                {isAdmin
                  ? 'View student feedback for past sessions'
                  : 'Rate and provide feedback on today\'s sessions'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <motion.div variants={containerVariants} className="space-y-3">
            <AnimatePresence mode="sync">
              {sessions.map((session) => {
                const averages = getSessionAverages(session.id);
                const allFeedback = getFeedbackForSession(session.id);
                const isExpanded = expandedSession === session.id;
                const userSubmitted = hasSubmittedToday(session.id);
                const form = feedbackForms[session.id];

                return (
                  <motion.div
                    key={session.id}
                    variants={itemVariants}
                    layout
                    className="rounded-lg border overflow-hidden"
                  >
                    {/* Session header */}
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    >
                      <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 shrink-0">
                        <CalendarDays className="size-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{session.subject.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {session.subject.code}
                          </span>
                          <span className="text-muted-foreground text-[10px]">•</span>
                          <span className="text-[10px] text-muted-foreground">
                            {session.conductedDate}
                          </span>
                        </div>
                      </div>

                      {/* Admin: quick rating summary */}
                      {isAdmin && averages && (
                        <div className="flex items-center gap-1 shrink-0">
                          <StarRating value={Math.round(averages.overall)} readonly size="sm" />
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({averages.count})
                          </span>
                        </div>
                      )}

                      {/* Student: submitted indicator */}
                      {!isAdmin && userSubmitted && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0">
                          Submitted
                        </Badge>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </div>

                    {/* Expanded content */}
                    <AnimatePresence mode="sync">
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t px-3 py-3 space-y-3 bg-muted/30">
                            {/* ADMIN VIEW: Rating breakdown + feedback list */}
                            {isAdmin && (
                              <>
                                {/* Average ratings breakdown */}
                                {averages ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-background border">
                                      <BookOpenCheck className="size-3.5 text-teal-500" />
                                      <StarRating value={Math.round(averages.understanding)} readonly size="sm" />
                                      <span className="text-[9px] text-muted-foreground">Understanding</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-background border">
                                      <Gauge className="size-3.5 text-amber-500" />
                                      <StarRating value={Math.round(averages.pace)} readonly size="sm" />
                                      <span className="text-[9px] text-muted-foreground">Pace</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-background border">
                                      <ThumbsUp className="size-3.5 text-emerald-500" />
                                      <StarRating value={Math.round(averages.overall)} readonly size="sm" />
                                      <span className="text-[9px] text-muted-foreground">Overall</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center text-center py-4">
                                    <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 mb-2 animate-float">
                                      <MessageSquare className="size-5 text-amber-500 dark:text-amber-400" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      No feedback submitted yet.
                                    </p>
                                  </div>
                                )}

                                {/* Individual responses */}
                                {allFeedback.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                      Individual Responses ({allFeedback.length})
                                    </p>
                                    {allFeedback.map((fb) => {
                                      const ratingBorder = fb.overall >= 4 ? 'border-l-emerald-400' : fb.overall >= 3 ? 'border-l-amber-400' : 'border-l-rose-400';
                                      return (
                                      <div
                                        key={fb.id}
                                        className={`rounded-lg border border-l-[3px] ${ratingBorder} bg-background p-2.5 space-y-1.5 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <div className="flex items-center justify-center size-5 rounded-full bg-amber-100 dark:bg-amber-950/30">
                                              <User className="size-2.5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <span className="text-xs font-medium">{fb.userName}</span>
                                          </div>
                                          <span className="text-[9px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(fb.submittedAt), { addSuffix: true })}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1">
                                            <BookOpenCheck className="size-2.5 text-teal-500" />
                                            <span className="text-[10px] text-muted-foreground">{fb.understanding}/5</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Gauge className="size-2.5 text-amber-500" />
                                            <span className="text-[10px] text-muted-foreground">{fb.pace}/5</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <ThumbsUp className="size-2.5 text-emerald-500" />
                                            <span className="text-[10px] text-muted-foreground">{fb.overall}/5</span>
                                          </div>
                                        </div>
                                        {fb.comment && (
                                          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
                                            &quot;{fb.comment}&quot;
                                          </p>
                                        )}
                                      </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </>
                            )}

                            {/* STUDENT VIEW: Feedback form */}
                            {!isAdmin && (
                              <>
                                {userSubmitted ? (
                                  <div className="flex flex-col items-center text-center py-3">
                                    <div className="flex items-center justify-center size-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 mb-2">
                                      <ThumbsUp className="size-4 text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                      Thank you for your feedback!
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      You&apos;ve already submitted feedback for this session today.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {/* Understanding */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <BookOpenCheck className="size-3 text-teal-500" />
                                        <span className="text-[11px] font-medium">Understanding</span>
                                      </div>
                                      <StarRating
                                        value={form?.understanding || 0}
                                        onChange={(val) =>
                                          setFeedbackForms((prev) => ({
                                            ...prev,
                                            [session.id]: {
                                              understanding: val,
                                              pace: prev[session.id]?.pace || 0,
                                              overall: prev[session.id]?.overall || 0,
                                              comment: prev[session.id]?.comment || '',
                                            },
                                          }))
                                        }
                                      />
                                    </div>

                                    {/* Pace */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <Gauge className="size-3 text-amber-500" />
                                        <span className="text-[11px] font-medium">Pace</span>
                                      </div>
                                      <StarRating
                                        value={form?.pace || 0}
                                        onChange={(val) =>
                                          setFeedbackForms((prev) => ({
                                            ...prev,
                                            [session.id]: {
                                              understanding: prev[session.id]?.understanding || 0,
                                              pace: val,
                                              overall: prev[session.id]?.overall || 0,
                                              comment: prev[session.id]?.comment || '',
                                            },
                                          }))
                                        }
                                      />
                                    </div>

                                    {/* Overall */}
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5">
                                        <ThumbsUp className="size-3 text-emerald-500" />
                                        <span className="text-[11px] font-medium">Overall</span>
                                        <span className="text-[9px] text-rose-500">*</span>
                                      </div>
                                      <StarRating
                                        value={form?.overall || 0}
                                        onChange={(val) =>
                                          setFeedbackForms((prev) => ({
                                            ...prev,
                                            [session.id]: {
                                              understanding: prev[session.id]?.understanding || 0,
                                              pace: prev[session.id]?.pace || 0,
                                              overall: val,
                                              comment: prev[session.id]?.comment || '',
                                            },
                                          }))
                                        }
                                      />
                                    </div>

                                    {/* Comment */}
                                    <div className="space-y-1">
                                      <span className="text-[11px] font-medium">Comment (optional)</span>
                                      <Textarea
                                        placeholder="Any additional thoughts about this session..."
                                        value={form?.comment || ''}
                                        onChange={(e) =>
                                          setFeedbackForms((prev) => ({
                                            ...prev,
                                            [session.id]: {
                                              understanding: prev[session.id]?.understanding || 0,
                                              pace: prev[session.id]?.pace || 0,
                                              overall: prev[session.id]?.overall || 0,
                                              comment: e.target.value,
                                            },
                                          }))
                                        }
                                        className="text-xs min-h-[60px] resize-none"
                                      />
                                    </div>

                                    {/* Submit */}
                                    <Button
                                      size="sm"
                                      className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                                      onClick={() => handleSubmitFeedback(session.id)}
                                      disabled={submitting === session.id}
                                    >
                                      {submitting === session.id ? (
                                        <>
                                          <Loader2 className="size-3.5 animate-spin mr-1.5" />
                                          Submitting...
                                        </>
                                      ) : (
                                        <>
                                          <Send className="size-3.5 mr-1.5" />
                                          Submit Feedback
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
