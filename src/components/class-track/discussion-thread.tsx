'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Send,
  CornerDownRight,
  Loader2,
  User,
  MessageCircle,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

interface CommentReply {
  id: string;
  content: string;
  createdAt: string;
  createdBy: CommentAuthor;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  createdBy: CommentAuthor;
  replies: CommentReply[];
  _count?: { replies: number };
}

// ── Constants ──────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;

// ── Helpers ────────────────────────────────────────────────────────

function formatMarkdown(text: string): string {
  return text
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* -> <em>text</em>
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Single Comment ─────────────────────────────────────────────────

function CommentItem({
  comment,
  accessToken,
  classroomId,
  onReplySuccess,
  currentUserId,
}: {
  comment: CommentData;
  accessToken: string | null;
  classroomId: string;
  onReplySuccess: () => void;
  currentUserId: string | undefined;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setReplying(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          content: replyContent.trim(),
          parentId: comment.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to reply');
        return;
      }

      toast.success('Reply posted!');
      setReplyContent('');
      setShowReplyInput(false);
      onReplySuccess();
    } catch {
      toast.error('Network error');
    } finally {
      setReplying(false);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const visibleReplies = expanded ? comment.replies : comment.replies?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="group"
    >
      <div className="flex gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/30 transition-colors duration-200">
        {/* Avatar */}
        <div className={`flex items-center justify-center size-8 rounded-full shrink-0 text-xs font-bold ${getAvatarColor(comment.createdBy.id)}`}>
          {getInitials(comment.createdBy.name)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold">
              {comment.createdBy.name}
            </span>
            {currentUserId === comment.createdBy.id && (
              <span className="text-[9px] px-1 py-0 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                You
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div
            className="text-sm text-foreground/90 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(comment.content) }}
          />

          {/* Reply button */}
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground mt-1.5 px-1 py-0.5 rounded-md hover:bg-accent transition-colors"
          >
            <CornerDownRight className="size-3" />
            Reply
            {hasReplies && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-0.5">
                {comment.replies.length}
              </Badge>
            )}
          </button>

          {/* Reply Input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease }}
                className="mt-2 overflow-hidden"
              >
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a reply... (*bold*, *italic*)"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px] text-xs flex-1 resize-none bg-background/60 backdrop-blur-sm border-border/60 focus:border-amber-400/50 focus:ring-amber-400/20"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg"
                    onClick={handleReply}
                    disabled={!replyContent.trim() || replying}
                  >
                    {replying ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
                    Reply
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowReplyInput(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Replies */}
          {hasReplies && (
            <div className="mt-3 ml-2 pl-3 border-l-2 border-border/50 space-y-3">
              {visibleReplies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <div className={`flex items-center justify-center size-6 rounded-full shrink-0 text-[9px] font-bold ${getAvatarColor(reply.createdBy.id)}`}>
                    {getInitials(reply.createdBy.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold">
                        {reply.createdBy.name}
                      </span>
                      {currentUserId === reply.createdBy.id && (
                        <span className="text-[9px] px-1 py-0 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium">
                          You
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div
                      className="text-xs text-foreground/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(reply.content) }}
                    />
                  </div>
                </div>
              ))}

              {/* Show more replies button */}
              {!expanded && comment.replies.length > 2 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  View {comment.replies.length - 2} more repl{comment.replies.length - 2 !== 1 ? 'ies' : 'y'}
                </button>
              )}
              {expanded && comment.replies.length > 2 && (
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  Show less
                </button>
              )}
            </div>
          )}
          <div className="h-px bg-border/40 mt-3 mx-2" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function DiscussionThread({ classroomId }: { classroomId: string }) {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [comments, setComments] = useState<CommentData[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?classroomId=${classroomId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
        setTotalComments(data.totalComments ?? 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          content: newComment.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to post comment');
        return;
      }

      toast.success('Comment posted!');
      setNewComment('');
      fetchComments();
    } catch {
      toast.error('Network error');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
            <MessageSquare className="size-4 text-white" />
          </div>
          <h2 className="text-sm font-semibold">Discussion</h2>
          {!loading && totalComments > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {totalComments}
            </Badge>
          )}
        </div>
      </div>

      {/* New Comment */}
      <div className="space-y-2">
        <Textarea
          placeholder="Start a discussion... (*bold*, *italic*)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] text-sm resize-none bg-background/60 backdrop-blur-sm border-border/60 focus:border-amber-400/50 focus:ring-amber-400/20"
          rows={3}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            *bold* for bold, *italic* for italic
          </p>
          <Button
            className="h-8 text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white rounded-lg"
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
          >
            {posting ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Send className="size-3.5 mr-1" />
            )}
            Post
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-full bg-muted rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 mb-4 animate-float">
            <MessageCircle className="size-8 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-sm font-semibold text-foreground">No discussions yet</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Be the first to start a discussion with your classmates!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                accessToken={accessToken}
                classroomId={classroomId}
                onReplySuccess={fetchComments}
                currentUserId={user?.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
