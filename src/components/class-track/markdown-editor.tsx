'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Eye,
  EyeOff,
  Type,
  Quote,
  Pilcrow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// ── Types ──────────────────────────────────────────────────────────

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// ── Simple Markdown → HTML Renderer ────────────────────────────────

function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (``` ... ```)
    .replace(/```([\s\S]*?)```/g, '<pre class="rounded-lg bg-muted p-3 text-xs overflow-x-auto my-2 border"><code>$1</code></pre>')
    // Inline code (` ... `)
    .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">$1</code>')
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Blockquote
    .replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-2 border-amber-400 pl-3 my-1 text-muted-foreground italic">$1</blockquote>')
    // Unordered list
    .replace(/^[*-] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Ordered list
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-600 dark:text-amber-400 underline hover:text-amber-700 dark:hover:text-amber-300" target="_blank" rel="noopener noreferrer">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-3 border-border" />')
    // Paragraphs — double newline
    .replace(/\n\n/g, '</p><p class="my-2">')
    // Single newline — line break
    .replace(/\n/g, '<br />');

  return `<p class="my-2">${html}</p>`;
}

// ── Toolbar Button ─────────────────────────────────────────────────

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ icon: Icon, label, onClick, active, disabled }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`size-8 rounded-md ${active ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-muted-foreground hover:text-foreground hover:bg-accent'} transition-colors disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start writing in Markdown...',
  minHeight = 'min-h-[200px]',
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync value prop → textarea (controlled)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      // Only update if different to avoid cursor jump
    }
  }, [value]);

  // ── Insert markdown syntax ──────────────────────────────────────

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || placeholder;
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = `${before}${prefix}${selectedText}${suffix}${after}`;

      onChange(newValue);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorStart = start + prefix.length;
        const cursorEnd = cursorStart + selectedText.length;
        textarea.setSelectionRange(
          selectedText === placeholder ? cursorStart : cursorEnd,
          cursorEnd
        );
      });
    },
    [value, onChange]
  );

  // ── Toolbar actions ─────────────────────────────────────────────

  const handleBold = useCallback(() => insertMarkdown('**', '**', 'bold text'), [insertMarkdown]);
  const handleItalic = useCallback(() => insertMarkdown('*', '*', 'italic text'), [insertMarkdown]);
  const handleH1 = useCallback(() => insertMarkdown('# ', '', 'Heading 1'), [insertMarkdown]);
  const handleH2 = useCallback(() => insertMarkdown('## ', '', 'Heading 2'), [insertMarkdown]);
  const handleH3 = useCallback(() => insertMarkdown('### ', '', 'Heading 3'), [insertMarkdown]);
  const handleUnorderedList = useCallback(() => insertMarkdown('- ', '', 'List item'), [insertMarkdown]);
  const handleOrderedList = useCallback(() => insertMarkdown('1. ', '', 'List item'), [insertMarkdown]);
  const handleCode = useCallback(() => insertMarkdown('`', '`', 'code'), [insertMarkdown]);
  const handleCodeBlock = useCallback(() => insertMarkdown('```\n', '\n```', 'code block'), [insertMarkdown]);
  const handleLink = useCallback(() => insertMarkdown('[', '](url)', 'link text'), [insertMarkdown]);
  const handleQuote = useCallback(() => insertMarkdown('> ', '', 'Quote'), [insertMarkdown]);
  const handleHR = useCallback(() => insertMarkdown('\n---\n', '', ''), [insertMarkdown]);

  // ── Keyboard shortcuts ──────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd+B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleBold();
      }
      // Ctrl/Cmd+I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        handleItalic();
      }
      // Ctrl/Cmd+K for link
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleLink();
      }
    },
    [handleBold, handleItalic, handleLink]
  );

  // ── Character count ─────────────────────────────────────────────

  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value ? value.split('\n').length : 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30 overflow-x-auto no-scrollbar">
        {/* Formatting group */}
        <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" onClick={handleBold} />
        <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" onClick={handleItalic} />
        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Headings group */}
        <ToolbarButton icon={Heading1} label="Heading 1" onClick={handleH1} />
        <ToolbarButton icon={Heading2} label="Heading 2" onClick={handleH2} />
        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* List group */}
        <ToolbarButton icon={List} label="Bullet List" onClick={handleUnorderedList} />
        <ToolbarButton icon={ListOrdered} label="Numbered List" onClick={handleOrderedList} />
        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Code group */}
        <ToolbarButton icon={Code} label="Inline Code" onClick={handleCode} />
        <Separator orientation="vertical" className="mx-1 h-5" />

        {/* Other */}
        <ToolbarButton icon={Link} label="Link (Ctrl+K)" onClick={handleLink} />
        <ToolbarButton icon={Quote} label="Blockquote" onClick={handleQuote} />
        <ToolbarButton icon={Pilcrow} label="Horizontal Rule" onClick={handleHR} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Preview toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 gap-1.5 text-[11px] px-2 rounded-md ${showPreview ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="size-3" />
              <span className="hidden sm:inline">Edit</span>
            </>
          ) : (
            <>
              <Eye className="size-3" />
              <span className="hidden sm:inline">Preview</span>
            </>
          )}
        </Button>
      </div>

      {/* ── Editor / Preview Area ────────────────────────────────── */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {!showPreview ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, type: 'tween' }}
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`w-full ${minHeight} resize-y px-4 py-3 text-sm leading-relaxed bg-transparent border-0 outline-none placeholder:text-muted-foreground/50 font-mono`}
                aria-label="Markdown editor"
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, type: 'tween' }}
              className={`${minHeight} px-4 py-3 text-sm leading-relaxed prose-sm max-w-none overflow-y-auto`}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          )}
        </AnimatePresence>

        {/* Empty preview state */}
        {showPreview && !value.trim() && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Type className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/40">Nothing to preview</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer Stats ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground tabular-nums">
        <div className="flex items-center gap-3">
          <span>{charCount} char{charCount !== 1 ? 's' : ''}</span>
          <span>{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
          <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
        </div>
        <span className="text-muted-foreground/60">Markdown supported</span>
      </div>
    </div>
  );
}
