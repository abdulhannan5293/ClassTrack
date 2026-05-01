'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  StickyNote,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

// ── Types ──────────────────────────────────────────────────────────

interface ClassroomNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function getStorageKey(classroomId: string) {
  return `classtrack-classroom-notes-${classroomId}`;
}

function loadNotes(classroomId: string): ClassroomNote[] {
  try {
    const raw = localStorage.getItem(getStorageKey(classroomId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(classroomId: string, notes: ClassroomNote[]) {
  try {
    localStorage.setItem(getStorageKey(classroomId), JSON.stringify(notes));
  } catch {
    // localStorage unavailable
  }
}

// ── Main Component ─────────────────────────────────────────────────

export function ClassroomNotes({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const [notes, setNotes] = useState<ClassroomNote[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load notes ──────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    // Use setTimeout to avoid synchronous setState in effect body
    const timer = setTimeout(() => {
      if (!cancelled) {
        setNotes(loadNotes(classroomId));
        setLoading(false);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [classroomId]);

  // ── Handlers ────────────────────────────────────────────────────

  const handleAddNote = useCallback(
    (title: string, content: string) => {
      const newNote: ClassroomNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [newNote, ...notes];
      setNotes(updated);
      saveNotes(classroomId, updated);
      toast.success('Note added');
    },
    [notes, classroomId]
  );

  const handleUpdateNote = useCallback(
    (id: string, title: string, content: string) => {
      const updated = notes.map((n) =>
        n.id === id
          ? { ...n, title: title.trim(), content: content.trim(), updatedAt: new Date().toISOString() }
          : n
      );
      setNotes(updated);
      saveNotes(classroomId, updated);
      toast.success('Note updated');
    },
    [notes, classroomId]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      const updated = notes.filter((n) => n.id !== id);
      setNotes(updated);
      saveNotes(classroomId, updated);
      toast.success('Note deleted');
    },
    [notes, classroomId]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Note Form — Admin only */}
      {isAdmin && <NoteForm onSave={handleAddNote} />}

      {/* Notes List */}
      <AnimatePresence mode="popLayout">
        {notes.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 mb-3">
              <StickyNote className="size-6 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAdmin
                ? 'Create your first note using the form above'
                : 'Notes shared by your CR/GR will appear here'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notes.map((note, idx) => (
              <NoteCard
                key={note.id}
                note={note}
                isAdmin={isAdmin}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                index={idx}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Note Form ──────────────────────────────────────────────────────

function NoteForm({ onSave }: { onSave: (title: string, content: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(() => {
    if (!title.trim()) {
      toast.error('Please enter a title.');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      onSave(title, content);
      setTitle('');
      setContent('');
      setIsOpen(false);
      setSaving(false);
    }, 200);
  }, [title, content, onSave]);

  return (
    <Card className="py-0 gap-0 overflow-hidden border-amber-200/40 dark:border-amber-800/30">
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="size-4 text-amber-500" />
            {isOpen ? 'New Note' : 'Notes'}
          </CardTitle>
          {!isOpen && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 rounded-lg"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="size-3" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="note-title" className="text-xs">
                  Title
                </Label>
                <Input
                  id="note-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="text-sm h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-content" className="text-xs">
                  Content
                </Label>
                <Textarea
                  id="note-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note..."
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setIsOpen(false);
                    setTitle('');
                    setContent('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  onClick={handleSave}
                  disabled={!title.trim() || saving}
                >
                  {saving ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  Save
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Note Card ──────────────────────────────────────────────────────

function NoteCard({
  note,
  isAdmin,
  onUpdate,
  onDelete,
  index,
}: {
  note: ClassroomNote;
  isAdmin: boolean;
  onUpdate: (id: string, title: string, content: string) => void;
  onDelete: (id: string) => void;
  index: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.content);

  const handleSave = useCallback(() => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty.');
      return;
    }
    onUpdate(note.id, editTitle, editContent);
    setIsEditing(false);
  }, [note.id, editTitle, editContent, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
  }, [note.title, note.content]);

  const formattedDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      <Card className="py-0 gap-0 overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-sm h-8 font-medium"
              />
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] resize-none text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  onClick={handleSave}
                >
                  <Check className="size-3" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold truncate">{note.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formattedDate}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit note"
                    >
                      <Edit3 className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => onDelete(note.id)}
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
              {note.content && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
