'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

// ── Constants ──────────────────────────────────────────────────────

const STORAGE_KEY = 'classtrack-quick-notes';
const MAX_CHARS = 500;
const DEBOUNCE_MS = 500;
const PREVIEW_LENGTH = 50;

// ── Component ──────────────────────────────────────────────────────

export function QuickNotes() {
  const [notes, setNotes] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save to localStorage with debounce ──────────────────────────

  const saveNotes = useCallback((value: string) => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage unavailable
    }
    // Brief saving indicator
    setTimeout(() => setIsSaving(false), 300);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, MAX_CHARS);
      setNotes(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveNotes(value);
      }, DEBOUNCE_MS);
    },
    [saveNotes]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Clear notes ─────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    setNotes('');
    saveNotes('');
    setClearConfirm(false);
    setIsExpanded(false);
  }, [clearConfirm, saveNotes]);

  // ── Computed ────────────────────────────────────────────────────

  const hasNotes = notes.length > 0;
  const preview = notes.length > PREVIEW_LENGTH
    ? `${notes.slice(0, PREVIEW_LENGTH)}...`
    : notes || 'No notes yet';
  const charPercentage = (notes.length / MAX_CHARS) * 100;

  return (
    <Card className="overflow-hidden border-amber-200/40 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/40 via-card to-orange-50/20 dark:from-amber-950/20 dark:via-card dark:to-orange-950/10 backdrop-blur-sm">
      {/* Amber accent bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-400" />

      <CardHeader
        className="pb-2 pt-3 px-4 cursor-pointer select-none"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-7 rounded-lg bg-amber-100 dark:bg-amber-950/40">
              <StickyNote className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-sm font-semibold">Quick Notes</CardTitle>
            {isSaving && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="size-3 text-amber-500 animate-spin" />
              </motion.span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.div>
        </div>
      </CardHeader>

      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="px-4 pb-3 pt-0">
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[2rem]">
                {preview}
              </p>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <CardContent className="px-4 pb-3 pt-0 space-y-2">
              <Textarea
                value={notes}
                onChange={handleChange}
                placeholder="Jot down quick thoughts, reminders, or ideas..."
                className="min-h-[100px] resize-none text-sm bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 focus-visible:ring-amber-500/30 focus-visible:border-amber-400"
                aria-label="Quick notes"
              />

              {/* Character count + Clear */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] tabular-nums transition-colors ${
                    charPercentage >= 90
                      ? 'text-red-500 font-semibold'
                      : charPercentage >= 75
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                  }`}
                >
                  {notes.length}/{MAX_CHARS}
                </span>
                {hasNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-7 text-[11px] gap-1 px-2 ${
                      clearConfirm
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={handleClear}
                  >
                    <Trash2 className="size-3" />
                    {clearConfirm ? 'Confirm Clear?' : 'Clear'}
                  </Button>
                )}
              </div>

              {/* Character usage bar */}
              {hasNotes && (
                <div className="h-1 w-full rounded-full bg-amber-100 dark:bg-amber-900/30 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${charPercentage}%` }}
                    className={`h-full rounded-full transition-colors ${
                      charPercentage >= 90
                        ? 'bg-red-500'
                        : charPercentage >= 75
                          ? 'bg-amber-500'
                          : 'bg-amber-400'
                    }`}
                  />
                </div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
