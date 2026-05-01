'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Megaphone,
  Pin,
  PinOff,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertTriangle,
  Clock,
  Loader2,
  ImagePlus,
  X,
  ZoomIn,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  classroomId: string;
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  postedById: string;
  posterRole: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  postedBy: { id: string; name: string; email: string };
  imageUrl?: string | null;
}

interface AnnouncementsBoardProps {
  classroomId: string;
  isAdmin: boolean;
}

interface FormData {
  title: string;
  content: string;
  priority: 'normal' | 'important' | 'urgent';
  isPinned: boolean;
  imageUrl: string | null;
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  priority: 'normal',
  isPinned: false,
  imageUrl: null,
};

// ── Priority helpers ───────────────────────────────────────────────

const priorityConfig = {
  normal: {
    label: 'Normal',
    border: 'border-l-border',
    bg: '',
    badgeClass: 'bg-muted text-muted-foreground hover:bg-muted',
    iconClass: 'text-muted-foreground',
  },
  important: {
    label: 'Important',
    border: 'border-l-amber-400 dark:border-l-amber-500',
    bg: 'bg-amber-50/60 dark:bg-amber-950/25',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40',
    iconClass: 'text-amber-500',
  },
  urgent: {
    label: 'Urgent',
    border: 'border-l-red-500 dark:border-l-red-400',
    bg: 'bg-red-50/60 dark:bg-red-950/25',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40',
    iconClass: 'text-red-500',
  },
};

// ── Animation variants ─────────────────────────────────────────────

const listItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'tween' as const, duration: 0.3, ease: 'easeOut' as const },
  },
  exit: { opacity: 0, x: -20, transition: { type: 'tween' as const, duration: 0.2 } },
};

// ── Component ──────────────────────────────────────────────────────

export function AnnouncementsBoard({ classroomId, isAdmin }: AnnouncementsBoardProps) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // ── State ────────────────────────────────────────────────────────

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormData>(EMPTY_FORM);
  const [createLoading, setCreateLoading] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pin toggle loading
  const [pinLoadingId, setPinLoadingId] = useState<string | null>(null);

  // Lightbox dialog
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // File input refs
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch announcements ──────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    if (!accessToken || !classroomId) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/announcements?classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch announcements');
      }

      const data = await res.json();
      setAnnouncements(data.announcements ?? []);
    } catch {
      toast.error('Could not load announcements');
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Filtered announcements ───────────────────────────────────────

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return announcements;
    return announcements.filter((a) =>
      a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)
    );
  }, [announcements, searchQuery]);

  // ── Create announcement ──────────────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          classroomId,
          title: createForm.title.trim(),
          content: createForm.content.trim(),
          priority: createForm.priority,
          isPinned: createForm.isPinned,
          imageUrl: createForm.imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create announcement');
      }

      toast.success('Announcement posted!');
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit announcement ────────────────────────────────────────────

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setEditForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      imageUrl: announcement.imageUrl ?? null,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingAnnouncement || !editForm.title.trim() || !editForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    setEditLoading(true);
    try {
      const res = await fetch(`/api/announcements/${editingAnnouncement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          content: editForm.content.trim(),
          priority: editForm.priority,
          isPinned: editForm.isPinned,
          imageUrl: editForm.imageUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update announcement');
      }

      toast.success('Announcement updated!');
      setEditOpen(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete announcement ──────────────────────────────────────────

  const openDelete = (announcement: Announcement) => {
    setDeletingAnnouncement(announcement);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAnnouncement) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/announcements/${deletingAnnouncement.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete announcement');
      }

      toast.success('Announcement deleted');
      setDeleteOpen(false);
      setDeletingAnnouncement(null);
      fetchAnnouncements();
    } catch {
      toast.error('Failed to delete announcement');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Pin toggle ───────────────────────────────────────────────────

  const handleTogglePin = async (announcement: Announcement) => {
    setPinLoadingId(announcement.id);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ isPinned: !announcement.isPinned }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle pin');
      }

      toast.success(announcement.isPinned ? 'Announcement unpinned' : 'Announcement pinned');
      fetchAnnouncements();
    } catch {
      toast.error('Failed to update announcement');
    } finally {
      setPinLoadingId(null);
    }
  };

  // ── Image handler ───────────────────────────────────────────────

  const handleImageSelect = useCallback(
    (file: File, formSetter: React.Dispatch<React.SetStateAction<FormData>>) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be smaller than 2 MB');
        return;
      }

      // Compress/resize image before base64 encoding
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const MAX_WIDTH = 1200;
          let { width, height } = img;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            toast.error('Failed to process image');
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          formSetter((prev) => ({ ...prev, imageUrl: dataUrl }));
        };
        img.onerror = () => {
          toast.error('Failed to load image');
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const openLightbox = useCallback((src: string) => {
    setLightboxSrc(src);
    setLightboxOpen(true);
  }, []);

  // ── Render helpers ───────────────────────────────────────────────

  const renderRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // ── Loading state ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="size-4 text-muted-foreground" />
          Announcements
          {announcements.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {announcements.length}
            </Badge>
          )}
        </h2>

        {isAdmin && (
          <Button
            size="sm"
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Post Announcement
          </Button>
        )}
      </div>

      {/* Search */}
      {announcements.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-muted mb-4">
            <Megaphone className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold mb-1">No Announcements Yet</h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            {isAdmin
              ? 'Post your first announcement to keep everyone informed.'
              : 'There are no announcements from your CR or GR yet.'}
          </p>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => {
                setCreateForm(EMPTY_FORM);
                setCreateOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Post Announcement
            </Button>
          )}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        /* No search results */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center size-10 rounded-full bg-muted mb-3">
            <Search className="size-5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            No announcements matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        /* Announcement cards */
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((announcement, idx) => (
              <motion.div
                key={announcement.id}
                variants={listItemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
                transition={{ delay: idx * 0.04 }}
              >
                <Card
                  className={`border-l-4 overflow-hidden transition-all duration-200 ${priorityConfig[announcement.priority].border} ${
                    announcement.isPinned
                      ? `${priorityConfig[announcement.priority].bg} ring-1 ring-inset ring-amber-300/40 dark:ring-amber-700/30 shadow-sm`
                      : ''
                  } ${announcement.priority === 'urgent' && !announcement.isPinned ? 'shadow-sm shadow-red-500/5' : ''}`}
                >
                  <CardContent className="p-4">
                    {/* Top row: priority badge + pin + title */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {announcement.priority !== 'normal' && (
                            <Badge
                              className={`text-[10px] px-1.5 py-0 font-semibold border-0 gap-1 ${priorityConfig[announcement.priority].badgeClass}`}
                            >
                              <AlertTriangle className={`size-3 ${priorityConfig[announcement.priority].iconClass}`} />
                              {priorityConfig[announcement.priority].label}
                            </Badge>
                          )}
                          {announcement.isPinned && (
                            <Badge
                              className="text-[10px] px-1.5 py-0 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-0 font-semibold"
                            >
                              <Pin className="size-2.5" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-sm font-bold leading-snug">
                          {announcement.title}
                        </h3>
                      </div>

                      {/* Admin actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleTogglePin(announcement)}
                            disabled={pinLoadingId === announcement.id}
                            aria-label={announcement.isPinned ? 'Unpin announcement' : 'Pin announcement'}
                          >
                            {pinLoadingId === announcement.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : announcement.isPinned ? (
                              <PinOff className="size-3.5 text-amber-500" />
                            ) : (
                              <Pin className="size-3.5 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(announcement)}
                            aria-label="Edit announcement"
                          >
                            <Edit className="size-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => openDelete(announcement)}
                            aria-label="Delete announcement"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Attached Image */}
                    {announcement.imageUrl && (
                      <motion.div
                        className="mt-3 relative group cursor-pointer"
                        onClick={() => openLightbox(announcement.imageUrl!)}
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'tween', duration: 0.3 }}
                      >
                        <img
                          src={announcement.imageUrl}
                          alt={announcement.title}
                          className="rounded-lg max-h-64 w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white rounded-full p-2">
                            <ZoomIn className="size-5" />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Content */}
                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                      {announcement.content}
                    </p>

                    {/* Footer: poster info + timestamp */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/60">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {announcement.postedBy.name || announcement.postedBy.email.split('@')[0]}
                      </span>
                      {announcement.posterRole && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                          {announcement.posterRole}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground/70 ml-auto tabular-nums">
                        {renderRelativeTime(announcement.createdAt)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Create Dialog ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        if (!open) setCreateForm(EMPTY_FORM);
        setCreateOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="size-4" />
              Post Announcement
            </DialogTitle>
            <DialogDescription>
              Share an announcement with your classroom members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="create-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-title"
                placeholder="e.g., Midterm Exam Schedule Update"
                value={createForm.title}
                onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="create-content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="create-content"
                placeholder="Write the announcement details here..."
                value={createForm.content}
                onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Attach Image */}
            <div className="space-y-1.5">
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file, setCreateForm);
                  e.target.value = '';
                }}
              />
              {!createForm.imageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground border-dashed"
                  onClick={() => createFileInputRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  Attach Image
                </Button>
              ) : (
                <motion.div
                  className="relative rounded-lg overflow-hidden border"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'tween', duration: 0.25 }}
                >
                  <img
                    src={createForm.imageUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 size-7 rounded-full shadow-md"
                    onClick={() => setCreateForm((f) => ({ ...f, imageUrl: null }))}
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={createForm.priority}
                onValueChange={(val) =>
                  setCreateForm((f) => ({
                    ...f,
                    priority: val as 'normal' | 'important' | 'urgent',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pin toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Pin this announcement</Label>
                <p className="text-[11px] text-muted-foreground">
                  Pinned announcements stay at the top of the list.
                </p>
              </div>
              <Switch
                checked={createForm.isPinned}
                onCheckedChange={(checked) =>
                  setCreateForm((f) => ({ ...f, isPinned: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateForm(EMPTY_FORM);
                setCreateOpen(false);
              }}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createLoading || !createForm.title.trim() || !createForm.content.trim()}
            >
              {createLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingAnnouncement(null);
          setEditForm(EMPTY_FORM);
        }
        setEditOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-4" />
              Edit Announcement
            </DialogTitle>
            <DialogDescription>
              Update the announcement details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={200}
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Attach Image */}
            <div className="space-y-1.5">
              <input
                ref={editFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file, setEditForm);
                  e.target.value = '';
                }}
              />
              {!editForm.imageUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-muted-foreground border-dashed"
                  onClick={() => editFileInputRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  Attach Image
                </Button>
              ) : (
                <motion.div
                  className="relative rounded-lg overflow-hidden border"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'tween', duration: 0.25 }}
                >
                  <img
                    src={editForm.imageUrl}
                    alt="Preview"
                    className="w-full max-h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 size-7 rounded-full shadow-md"
                    onClick={() => setEditForm((f) => ({ ...f, imageUrl: null }))}
                    aria-label="Remove image"
                  >
                    <X className="size-3.5" />
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(val) =>
                  setEditForm((f) => ({
                    ...f,
                    priority: val as 'normal' | 'important' | 'urgent',
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pin toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Pin this announcement</Label>
                <p className="text-[11px] text-muted-foreground">
                  Pinned announcements stay at the top of the list.
                </p>
              </div>
              <Switch
                checked={editForm.isPinned}
                onCheckedChange={(checked) =>
                  setEditForm((f) => ({ ...f, isPinned: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditingAnnouncement(null);
                setEditForm(EMPTY_FORM);
              }}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={editLoading || !editForm.title.trim() || !editForm.content.trim()}
            >
              {editLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => {
        if (!open) setDeletingAnnouncement(null);
        setDeleteOpen(open);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingAnnouncement?.title}&rdquo;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Image Lightbox Dialog ──────────────────────────────────── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative">
            {lightboxSrc && (
              <motion.img
                src={lightboxSrc}
                alt="Full size"
                className="w-full max-h-[80vh] object-contain"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'tween', duration: 0.2 }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
