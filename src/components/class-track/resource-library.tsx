'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  FolderOpen,
  Plus,
  Search,
  FileText,
  ClipboardList,
  BookOpen,
  ExternalLink,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Link as LinkIcon,
  X,
  Filter,
  Library,
  Paperclip,
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

type ResourceType = 'lecture-notes' | 'assignment' | 'tutorial' | 'reference' | 'other';

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  description: string;
  addedBy: string;
  addedAt: string;
  department: string;
  subjectId?: string;
  subjectName?: string;
  fileName?: string;
  fileData?: string;
  fileType?: string;
}

const RESOURCE_TYPES: { value: ResourceType; label: string; icon: typeof FileText; color: string; bgColor: string }[] = [
  { value: 'lecture-notes', label: 'Lecture Notes', icon: FileText, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30' },
  { value: 'assignment', label: 'Assignment', icon: ClipboardList, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-950/30' },
  { value: 'tutorial', label: 'Tutorial', icon: BookOpen, color: 'text-teal-600 dark:text-teal-400', bgColor: 'bg-teal-50 dark:bg-teal-950/30' },
  { value: 'reference', label: 'Reference', icon: ExternalLink, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-950/30' },
];

const TYPE_ICONS: Record<ResourceType, typeof FileText> = {
  'lecture-notes': FileText,
  assignment: ClipboardList,
  tutorial: BookOpen,
  reference: ExternalLink,
  other: MoreHorizontal,
};

const TYPE_BADGE_COLORS: Record<ResourceType, string> = {
  'lecture-notes': 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  assignment: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  tutorial: 'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  reference: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  other: 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
};

const DEPT_BORDER_COLORS: Record<string, string> = {
  CE: 'border-l-orange-400',
  CS: 'border-l-teal-400',
};

const SUBJECT_BADGE_COLORS = [
  'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400',
  'bg-lime-100 text-lime-700 dark:bg-lime-950/30 dark:text-lime-400',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400',
];

const getSubjectBadgeColor = (subjectId: string, index: number) => {
  // Simple hash to get consistent color per subject
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_BADGE_COLORS[Math.abs(hash) % SUBJECT_BADGE_COLORS.length];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'text-rose-600 dark:text-rose-400',
  doc: 'text-orange-600 dark:text-orange-400',
  docx: 'text-orange-600 dark:text-orange-400',
  ppt: 'text-amber-600 dark:text-amber-400',
  pptx: 'text-amber-600 dark:text-amber-400',
  xls: 'text-emerald-600 dark:text-emerald-400',
  xlsx: 'text-emerald-600 dark:text-emerald-400',
  txt: 'text-gray-600 dark:text-gray-400',
  image: 'text-teal-600 dark:text-teal-400',
};

const getFileTypeColor = (fileType?: string) => {
  if (!fileType) return 'text-muted-foreground';
  const ext = fileType.split('/').pop()?.toLowerCase() || '';
  if (ext === 'jpeg' || ext === 'jpg' || ext === 'png' || ext === 'gif' || ext === 'webp' || ext === 'svg+xml') {
    return FILE_TYPE_ICONS['image'];
  }
  return FILE_TYPE_ICONS[ext] || 'text-muted-foreground';
};

const getFileExtension = (fileType?: string) => {
  if (!fileType) return '';
  const ext = fileType.split('/').pop()?.toUpperCase() || 'FILE';
  if (['jpeg', 'jpg', 'png', 'gif', 'webp', 'svg+xml'].includes(ext.toLowerCase())) return 'IMG';
  return ext;
};

// ── Main Component ───────────────────────────────────────────────

export function ResourceLibrary({ classroomId, isAdmin }: { classroomId: string; isAdmin: boolean }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const userName = useAuthStore((s) => s.user?.name || s.user?.email || 'Anonymous');

  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<ResourceType>('lecture-notes');
  const [formDescription, setFormDescription] = useState('');
  const [formSubjectId, setFormSubjectId] = useState<string>('');
  const [formFileName, setFormFileName] = useState<string>('');
  const [formFileData, setFormFileData] = useState<string>('');
  const [formFileType, setFormFileType] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Department (for colored border)
  const [department, setDepartment] = useState('CE');

  // ── localStorage helpers ──────────────────────────────────────

  const getStorageKey = () => `classtrack-resources-${classroomId}`;

  const loadResources = useCallback(() => {
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (raw) {
        const parsed: Resource[] = JSON.parse(raw);
        setResources(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const saveResources = useCallback(
    (items: Resource[]) => {
      try {
        const json = JSON.stringify(items);
        localStorage.setItem(getStorageKey(), json);
        setResources(items);
      } catch (err) {
        console.error('Failed to save resources:', err);
        // If quota exceeded, try saving without file data
        const stripped = items.map(r => ({ ...r, fileData: undefined }));
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(stripped));
          setResources(stripped);
          toast.warning('Storage full — file attachments were removed. Try deleting some resources.');
        } catch {
          toast.error('Storage full. Please delete some resources to add more.');
        }
      }
    },
    []
  );

  // ── Fetch department info (for colored borders) ───────────────

  useEffect(() => {
    async function fetchDept() {
      if (!accessToken || !classroomId) return;
      try {
        const res = await fetch(`/api/classrooms/${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          const raw = data.classroom ?? data;
          setDepartment(raw.department || 'CE');
        }
      } catch {
        // ignore
      }
    }
    fetchDept();
  }, [accessToken, classroomId]);

  // ── Fetch subjects ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchSubjects() {
      if (!accessToken || !classroomId) return;
      try {
        const res = await fetch(`/api/subjects?classroomId=${classroomId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubjects(data.subjects ?? []);
        }
      } catch {
        // ignore
      }
    }
    fetchSubjects();
  }, [accessToken, classroomId]);

  // ── Load resources on mount ───────────────────────────────────

  useEffect(() => {
    setLoading(true);
    // Simulate a tiny delay for loading UX
    setTimeout(() => {
      loadResources();
      setLoading(false);
    }, 400);
  }, [loadResources]);

  // ── Validation ────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = 'Title is required';
    if (!formFileData && !formUrl.trim()) errors.url = 'URL or file attachment is required';
    if (formUrl.trim() && !formUrl.match(/^https?:\/\/.+/i)) errors.url = 'Enter a valid URL (http:// or https://)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Reset form ────────────────────────────────────────────────

  const resetForm = () => {
    setFormTitle('');
    setFormUrl('');
    setFormType('lecture-notes');
    setFormDescription('');
    setFormSubjectId('');
    setFormFileName('');
    setFormFileData('');
    setFormFileType('');
    setFormErrors({});
    setEditMode(false);
    setEditingId(null);
  };

  // ── Open dialog for add ───────────────────────────────────────

  const handleOpenAdd = () => {
    resetForm();
    setEditMode(false);
    setDialogOpen(true);
  };

  // ── Open dialog for edit ──────────────────────────────────────

  const handleOpenEdit = (resource: Resource) => {
    setFormTitle(resource.title);
    setFormUrl(resource.url);
    setFormType(resource.type);
    setFormDescription(resource.description);
    setFormSubjectId(resource.subjectId || '');
    setFormFileName(resource.fileName || '');
    setFormFileData(resource.fileData || '');
    setFormFileType(resource.fileType || '');
    setFormErrors({});
    setEditMode(true);
    setEditingId(resource.id);
    setDialogOpen(true);
  };

  // ── File handling ──────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormFileData(reader.result as string);
      setFormFileName(file.name);
      setFormFileType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormFileName('');
    setFormFileData('');
    setFormFileType('');
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    await new Promise((r) => setTimeout(r, 400)); // UX delay

    try {
      const selectedSubject = subjects.find((s) => s.id === formSubjectId);
      const resolvedSubjectId = formSubjectId && formSubjectId !== '__none__' ? formSubjectId : undefined;

      if (editMode && editingId) {
        const updated = resources.map((r) =>
          r.id === editingId
            ? {
                ...r,
                title: formTitle.trim(),
                url: formFileData ? r.url : formUrl.trim(),
                type: formType,
                description: formDescription.trim(),
                subjectId: resolvedSubjectId,
                subjectName: selectedSubject?.name || undefined,
                fileName: formFileName || undefined,
                fileData: formFileData || undefined,
                fileType: formFileType || undefined,
              }
            : r
        );
        saveResources(updated);
        toast.success('Resource updated');
      } else {
        const newResource: Resource = {
          id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: formTitle.trim(),
          url: formUrl.trim(),
          type: formType,
          description: formDescription.trim(),
          addedBy: userName,
          addedAt: new Date().toISOString(),
          department,
          subjectId: resolvedSubjectId,
          subjectName: selectedSubject?.name || undefined,
          fileName: formFileName || undefined,
          fileData: formFileData || undefined,
          fileType: formFileType || undefined,
        };
        saveResources([newResource, ...resources]);
        toast.success('Resource added');
      }
      resetForm();
      setDialogOpen(false);
    } catch {
      toast.error('Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete resource ───────────────────────────────────────────

  const handleDelete = (id: string) => {
    const filtered = resources.filter((r) => r.id !== id);
    saveResources(filtered);
    toast.success('Resource deleted');
  };

  // ── Filtered resources ────────────────────────────────────────

  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesSubject = subjectFilter === 'all' || r.subjectId === subjectFilter;
    return matchesSearch && matchesType && matchesSubject;
  });

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
            <Skeleton className="h-9 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
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
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
                <Library className="size-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Resource Library</CardTitle>
                <CardDescription className="text-[10px] text-muted-foreground">
                  {resources.length} resource{resources.length !== 1 ? 's' : ''} shared
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white" onClick={handleOpenAdd}>
                    <Plus className="size-3.5 mr-1" />
                    Add Resource
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 -mx-6 -mt-6 mb-4 rounded-t-lg" />
                  <DialogHeader>
                    <DialogTitle className="text-sm">
                      {editMode ? 'Edit Resource' : 'Add Resource'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    {/* Title */}
                    <div className="space-y-1">
                      <Label className="text-xs">Title</Label>
                      <Input
                        placeholder="e.g., Chapter 5 Notes"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="text-xs h-9"
                      />
                      {formErrors.title && (
                        <p className="text-[10px] text-rose-500">{formErrors.title}</p>
                      )}
                    </div>

                    {/* URL */}
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        placeholder="https://example.com/resource"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        className="text-xs h-9"
                      />
                      {formErrors.url && (
                        <p className="text-[10px] text-rose-500">{formErrors.url}</p>
                      )}
                    </div>

                    {/* Type */}
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={formType} onValueChange={(val) => setFormType(val as ResourceType)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESOURCE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-xs">
                              <span className="flex items-center gap-2">
                                <t.icon className={t.color} />
                                {t.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        placeholder="Brief description of the resource..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="text-xs min-h-[70px] resize-none"
                      />
                    </div>

                    {/* Subject */}
                    {subjects.length > 0 && (
                      <div className="space-y-1">
                        <Label className="text-xs">Subject</Label>
                        <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select a subject (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">No Subject</SelectItem>
                            {subjects.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.name} ({s.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* File Attachment */}
                    <div className="space-y-1">
                      <Label className="text-xs">Attachment</Label>
                      {formFileName ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'tween', duration: 0.2 }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30"
                        >
                          <FileText className={`size-4 shrink-0 ${getFileTypeColor(formFileType)}`} />
                          <span className="text-xs text-foreground truncate flex-1">{formFileName}</span>
                          <button
                            onClick={handleRemoveFile}
                            className="inline-flex items-center justify-center size-5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-950/30 text-muted-foreground hover:text-rose-600 transition-colors"
                            aria-label="Remove file"
                          >
                            <X className="size-3" />
                          </button>
                        </motion.div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            id="resource-file-input"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs w-full border-dashed"
                            onClick={() => document.getElementById('resource-file-input')?.click()}
                          >
                            <Paperclip className="size-3.5 mr-1.5" />
                            Attach File
                          </Button>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            PDF, DOC, PPT, XLS, TXT, images · Max 5MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <DialogClose asChild>
                      <Button variant="outline" size="sm" className="text-xs">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      size="sm"
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1" />
                          Saving...
                        </>
                      ) : editMode ? (
                        'Update'
                      ) : (
                        'Add Resource'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {/* Search + filter bar */}
          {resources.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="size-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <Filter className="size-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  {RESOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {subjects.length > 0 && (
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <BookOpen className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Empty state */}
          {resources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40 mb-4">
                <FolderOpen className="size-8 text-amber-500 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-foreground">No resources yet</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px]">
                {isAdmin
                  ? 'Add useful links, notes, and references for your classroom.'
                  : 'Resources shared by CR/GR will appear here.'}
              </p>
            </div>
          )}

          {/* No search results */}
          {resources.length > 0 && filteredResources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="size-6 text-muted-foreground mb-2" />
              <p className="text-xs font-medium text-muted-foreground">No matching resources</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Try adjusting your search or filter.
              </p>
            </div>
          )}

          {/* Resource list */}
          <motion.div variants={containerVariants} className="space-y-2">
            <AnimatePresence mode="sync">
              {filteredResources.map((resource) => {
                const TypeIcon = TYPE_ICONS[resource.type] || MoreHorizontal;
                const badgeColor = TYPE_BADGE_COLORS[resource.type] || '';
                const resourceDeptBorder = DEPT_BORDER_COLORS[resource.department] || 'border-l-gray-400';
                const typeInfo = RESOURCE_TYPES.find((t) => t.value === resource.type);

                return (
                  <motion.div
                    key={resource.id}
                    variants={itemVariants}
                    layout
                    className={`rounded-lg border border-l-4 ${resourceDeptBorder} overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-200`}
                  >
                    <div className="p-3 space-y-2">
                      {/* Top row: type icon + title + actions */}
                      <div className="flex items-start gap-2.5">
                        <div className={`flex items-center justify-center size-9 rounded-full shrink-0 bg-gradient-to-br ${resource.type === 'lecture-notes' ? 'from-amber-400 to-amber-600' : resource.type === 'assignment' ? 'from-orange-400 to-orange-600' : resource.type === 'tutorial' ? 'from-teal-400 to-teal-600' : resource.type === 'reference' ? 'from-emerald-400 to-emerald-600' : 'from-rose-400 to-rose-600'} shadow-sm`}>
                          <TypeIcon className={`size-4 text-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold truncate">{resource.title}</h4>
                          {resource.description && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                        </div>
                        {/* Admin actions */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handleOpenEdit(resource)}
                              aria-label="Edit resource"
                            >
                              <Edit className="size-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  aria-label="Delete resource"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-sm">Delete Resource</AlertDialogTitle>
                                  <AlertDialogDescription className="text-xs">
                                    Are you sure you want to delete &quot;{resource.title}&quot;? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="text-xs bg-rose-600 hover:bg-rose-700"
                                    onClick={() => handleDelete(resource.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>

                      {/* Bottom row: badges + timestamp + actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 border-0 ${badgeColor} font-medium`}
                          >
                            {typeInfo?.label || resource.type}
                          </Badge>
                          {resource.subjectName && resource.subjectId && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 border-0 ${getSubjectBadgeColor(resource.subjectId, subjects.findIndex((s) => s.id === resource.subjectId))} font-medium`}
                            >
                              {resource.subjectName}
                            </Badge>
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            {formatDistanceToNow(new Date(resource.addedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {resource.fileData && resource.fileName && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                try {
                                  // Create a blob from base64 data
                                  const dataUrl = resource.fileData!;
                                  const commaIdx = dataUrl.indexOf(',');
                                  if (commaIdx === -1) {
                                    toast.error('Invalid file data');
                                    return;
                                  }
                                  const byteString = atob(dataUrl.slice(commaIdx + 1));
                                  const mimeType = dataUrl.slice(0, commaIdx).split(':')[1]?.split(';')[0] || 'application/octet-stream';
                                  const ab = new ArrayBuffer(byteString.length);
                                  const ia = new Uint8Array(ab);
                                  for (let i = 0; i < byteString.length; i++) {
                                    ia[i] = byteString.charCodeAt(i);
                                  }
                                  const blob = new Blob([ab], { type: mimeType });
                                  const url = URL.createObjectURL(blob);

                                  // For images and PDFs, open in new tab. For others, download.
                                  if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                                    window.open(url, '_blank');
                                  } else {
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = resource.fileName || 'download';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }
                                  // Clean up the blob URL after a delay
                                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                                } catch (err) {
                                  console.error('Failed to process file:', err);
                                  toast.error('Failed to open file. It may be corrupted or too large.');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              <FileText className={`size-3 ${getFileTypeColor(resource.fileType)}`} />
                              {resource.fileType?.startsWith('image/') || resource.fileType === 'application/pdf' ? 'View' : 'Download'}
                            </button>
                          )}
                          {resource.url && !resource.fileData && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 dark:text-teal-400 hover:underline"
                            >
                              <LinkIcon className="size-3" />
                              Open
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
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
