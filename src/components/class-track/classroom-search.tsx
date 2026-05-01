'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, GraduationCap, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavStore } from '@/stores/nav-store';
import { useAuthStore } from '@/stores/auth-store';

interface Classroom {
  id: string;
  name: string;
  department: string;
  userRole: string;
}

interface ClassroomSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClassroomSearch({ open, onOpenChange }: ClassroomSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const openClassroom = useNavStore((s) => s.openClassroom);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim() || !accessToken) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/classrooms', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const classrooms: Classroom[] = (data.classrooms ?? []).filter(
          (c: Classroom) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.department.toLowerCase().includes(query.toLowerCase())
        );
        setResults(classrooms);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open, accessToken]);

  const handleSelect = (classroom: Classroom) => {
    openClassroom(classroom.id);
    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-card rounded-2xl border shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search classrooms by name or department..."
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto no-scrollbar">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="size-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <GraduationCap className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No classrooms found</p>
                </div>
              )}
              {!loading &&
                results.map((classroom) => (
                  <button
                    key={classroom.id}
                    onClick={() => handleSelect(classroom)}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-accent transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="flex items-center justify-center size-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 shrink-0">
                      <GraduationCap className="size-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{classroom.name}</p>
                      <p className="text-[10px] text-muted-foreground">{classroom.department}</p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
