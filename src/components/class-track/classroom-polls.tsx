'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart3,
  Plus,
  Loader2,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface PollOption {
  label: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  type: string;
  deadline: string | null;
  isClosed: boolean;
  createdById: string;
  creatorRole: string;
  createdAt: string;
  createdBy: { id: string; name: string; email: string };
  _count: { votes: number };
  userVote: string | null;
}

interface PollResults {
  pollId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isClosed: boolean;
  deadline: string | null;
  type: string;
  userVoted: boolean;
  userSelection: number[];
}

// ── Constants ──────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;

const BAR_COLORS = [
  'bg-amber-500 dark:bg-amber-400',
  'bg-teal-500 dark:bg-teal-400',
  'bg-orange-500 dark:bg-orange-400',
  'bg-emerald-500 dark:bg-emerald-400',
  'bg-rose-500 dark:bg-rose-400',
  'bg-cyan-500 dark:bg-cyan-400',
  'bg-yellow-500 dark:bg-yellow-400',
  'bg-lime-500 dark:bg-lime-400',
];

const BAR_BG_COLORS = [
  'bg-amber-100 dark:bg-amber-950/40',
  'bg-teal-100 dark:bg-teal-950/40',
  'bg-orange-100 dark:bg-orange-950/40',
  'bg-emerald-100 dark:bg-emerald-950/40',
  'bg-rose-100 dark:bg-rose-950/40',
  'bg-cyan-100 dark:bg-cyan-950/40',
  'bg-yellow-100 dark:bg-yellow-950/40',
  'bg-lime-100 dark:bg-lime-950/40',
];

// ── Helpers ────────────────────────────────────────────────────────

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) return 'Expired';
  if (diffHours < 1) return `${Math.floor(diffMs / (1000 * 60))}m left`;
  if (diffHours < 24) return `${diffHours}h left`;
  return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h left`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Poll Card ──────────────────────────────────────────────────────

function PollCard({
  poll,
  accessToken,
  onVoteSuccess,
}: {
  poll: Poll;
  accessToken: string | null;
  onVoteSuccess: () => void;
}) {
  const [results, setResults] = useState<PollResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [voting, setVoting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasVoted = !!poll.userVote;
  const isExpired = poll.isClosed || (poll.deadline && new Date(poll.deadline) < new Date());

  // If user already voted, load results
  useEffect(() => {
    if (hasVoted && !results) {
      fetchResults();
    }
  }, [hasVoted]);

  const fetchResults = async () => {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/polls/${poll.id}/results`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } catch {
      // Silently fail
    } finally {
      setResultsLoading(false);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error('Please select at least one option');
      return;
    }

    setVoting(true);
    try {
      const payload = poll.type === 'multiple' ? selectedOptions : selectedOptions[0];
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ selectedOption: payload }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to vote');
        return;
      }

      toast.success('Vote submitted!');
      onVoteSuccess();
      fetchResults();
    } catch {
      toast.error('Network error');
    } finally {
      setVoting(false);
    }
  };

  const toggleOption = (idx: number) => {
    if (isExpired) return;
    setSelectedOptions((prev) => {
      if (poll.type === 'single') return [idx];
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      return [...prev, idx];
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
    >
      <Card className="py-0 gap-0 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400" />
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold leading-snug">{poll.question}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-muted-foreground">
                  by {poll.createdBy.name} · {formatDate(poll.createdAt)}
                </p>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 text-emerald-700 dark:text-emerald-400 border-0">
                  <Users className="size-2.5 mr-0.5" />
                  {poll._count.votes} participant{poll._count.votes !== 1 ? 's' : ''}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {poll.type === 'multiple' && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  Multiple
                </Badge>
              )}
              {isExpired ? (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400">
                  <Lock className="size-2.5 mr-0.5" />
                  Closed
                </Badge>
              ) : poll.deadline ? (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                  <Clock className="size-2.5 mr-0.5" />
                  {formatDeadline(poll.deadline)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  Active
                </Badge>
              )}
            </div>
          </div>

          {/* Options */}
          {hasVoted || resultsLoading ? (
            // Show results
            resultsLoading ? (
              <div className="space-y-2">
                {poll.options.map((_, idx) => (
                  <div key={idx} className="h-10 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : results ? (
              <div className="space-y-2">
                {results.options.map((opt, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.2 }}
                    className="relative"
                  >
                    <div className={`h-9 rounded-full ${BAR_BG_COLORS[idx % BAR_BG_COLORS.length]} overflow-hidden`}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(opt.percentage, 2)}%` }}
                        transition={{ delay: idx * 0.08 + 0.1, duration: 0.5, ease: 'easeOut', type: 'tween' }}
                        className={`h-full rounded-full bg-gradient-to-r ${idx % 2 === 0 ? 'from-amber-400 to-orange-400' : 'from-teal-400 to-emerald-400'} opacity-90`}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-xs font-medium truncate">{opt.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold tabular-nums">{opt.percentage}%</span>
                        <span className="text-[10px] text-muted-foreground">({opt.votes})</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                  <Users className="size-3" />
                  <span>{results.totalVotes} vote{results.totalVotes !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ) : null
          ) : (
            // Show voting options
            <div className="space-y-2">
              {poll.options.map((opt, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => toggleOption(idx)}
                  disabled={isExpired}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                    selectedOptions.includes(idx)
                      ? 'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                      : 'border-border hover:border-amber-300/50 hover:bg-amber-50/50 dark:hover:border-amber-700/50 dark:hover:bg-amber-950/15'
                  } ${isExpired ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`flex items-center justify-center size-4 rounded border-2 shrink-0 ${
                    selectedOptions.includes(idx)
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-muted-foreground/30'
                  }`}>
                    {selectedOptions.includes(idx) && (
                      <CheckCircle2 className="size-2.5 text-white" />
                    )}
                  </div>
                  {opt}
                </motion.button>
              ))}
              {!isExpired && (
                <Button
                  className="w-full mt-1 h-9 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white"
                  onClick={handleVote}
                  disabled={selectedOptions.length === 0 || voting}
                >
                  {voting ? (
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                  ) : null}
                  {voting ? 'Submitting...' : `Vote${poll.type === 'multiple' ? ' (multi-select)' : ''}`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Create Poll Dialog ─────────────────────────────────────────────

function CreatePollDialog({
  classroomId,
  accessToken,
  onSuccess,
}: {
  classroomId: string;
  accessToken: string | null;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [type, setType] = useState('single');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  const addOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleCreate = async () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if (validOptions.length < 2) {
      toast.error('Please provide at least 2 options');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          question: question.trim(),
          options: validOptions,
          type,
          deadline: deadline || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to create poll');
        return;
      }

      toast.success('Poll created!');
      setOpen(false);
      setQuestion('');
      setOptions(['', '']);
      setType('single');
      setDeadline('');
      onSuccess();
    } catch {
      toast.error('Network error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-sm shadow-amber-500/20 rounded-lg h-8 text-xs font-medium">
          <Plus className="size-3.5 mr-1" />
          New Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 -mx-6 -mt-6 mb-4 rounded-t-lg" />
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500">
              <BarChart3 className="size-3.5 text-white" />
            </div>
            Create Poll
          </DialogTitle>
          <DialogDescription>
            Ask a question and let students vote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              placeholder="What would you like to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Options</Label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx] = e.target.value;
                      setOptions(newOpts);
                    }}
                    className="flex-1 h-9 text-xs"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(idx)}
                    >
                      <XCircle className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 8 && (
              <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addOption}>
                <Plus className="size-3 mr-1" />
                Add Option
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-3 text-xs"
              >
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            Create Poll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function ClassroomPolls({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolls = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/polls?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPolls(data.polls ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-400">
            <BarChart3 className="size-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold">Classroom Polls</h2>
          {!loading && polls.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {polls.length}
            </Badge>
          )}
        </div>
        {isAdmin && (
          <CreatePollDialog
            classroomId={classroomId}
            accessToken={accessToken}
            onSuccess={fetchPolls}
          />
        )}
      </div>

      {/* Polls List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="py-0 gap-0">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
                <div className="space-y-2">
                  <div className="h-9 bg-muted rounded-lg animate-pulse" />
                  <div className="h-9 bg-muted rounded-lg animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-950/40 dark:to-emerald-950/40 mb-4">
            <BarChart3 className="size-8 text-teal-500 dark:text-teal-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">No polls yet</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
            {isAdmin
              ? 'Create a poll to gather student feedback.'
              : 'Polls will appear here when created.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                accessToken={accessToken}
                onVoteSuccess={fetchPolls}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
