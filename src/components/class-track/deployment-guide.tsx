'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Database,
  Cloud,
  Globe,
  Container,
  Rocket,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Info,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Terminal,
  FileText,
  Settings,
  Layers,
  Server,
  KeyRound,
  Package,
  Gauge,
  Zap,
  FolderTree,
  HardDrive,
  Clock,
  Eye,
  ClipboardCheck,
  Lock,
  Unlock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { useNavStore } from '@/stores/nav-store';

// ── Types ──────────────────────────────────────────────────────────

interface Section {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

// ── Code Block ─────────────────────────────────────────────────────

function CodeBlock({
  code,
  language = 'bash',
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [code]);

  return (
    <div className="rounded-xl border bg-zinc-950 dark:bg-zinc-950 overflow-hidden my-3 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/70" />
            <div className="size-2.5 rounded-full bg-amber-500/70" />
            <div className="size-2.5 rounded-full bg-emerald-500/70" />
          </div>
          {filename && (
            <span className="text-xs text-zinc-400 font-mono ml-2">{filename}</span>
          )}
          {!filename && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-400 border-zinc-700 font-mono">
              {language}
            </Badge>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-[13px] leading-relaxed font-mono text-zinc-300">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ── Inline Code ────────────────────────────────────────────────────

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30">
      {children}
    </code>
  );
}

// ── Callout Box ────────────────────────────────────────────────────

function CalloutBox({
  type = 'tip',
  title,
  children,
}: {
  type?: 'tip' | 'warning' | 'info' | 'danger';
  title?: string;
  children: React.ReactNode;
}) {
  const configs = {
    tip: {
      icon: Lightbulb,
      bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: title || 'Pro Tip',
      labelColor: 'text-amber-700 dark:text-amber-300',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: title || 'Important',
      labelColor: 'text-orange-700 dark:text-orange-300',
    },
    info: {
      icon: Info,
      bg: 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40',
      iconColor: 'text-teal-600 dark:text-teal-400',
      label: title || 'Note',
      labelColor: 'text-teal-700 dark:text-teal-300',
    },
    danger: {
      icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40',
      iconColor: 'text-red-600 dark:text-red-400',
      label: title || 'Danger',
      labelColor: 'text-red-700 dark:text-red-300',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 my-3 ${config.bg}`}>
      <Icon className={`size-4 shrink-0 mt-0.5 ${config.iconColor}`} />
      <div className="text-sm leading-relaxed">
        <span className={`font-semibold ${config.labelColor}`}>{config.label}: </span>
        <span className="text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

// ── Step ───────────────────────────────────────────────────────────

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 my-3.5">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center size-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-bold shrink-0 shadow-sm shadow-amber-500/20">
          {number}
        </div>
        <div className="w-px flex-1 bg-border mt-1 min-h-4" />
      </div>
      <div className="flex-1 pb-1">
        <p className="font-medium text-sm mb-1">{title}</p>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ── Action Tag ─────────────────────────────────────────────────────

function ActionTag({
  children,
  color = 'amber',
}: {
  children: React.ReactNode;
  color?: 'amber' | 'teal' | 'emerald' | 'orange';
}) {
  const colorMap = {
    amber: 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
    teal: 'bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/40',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
    orange: 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40',
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md border ${colorMap[color]}`}>
      {children}
    </span>
  );
}

// ── Section Card Wrapper ───────────────────────────────────────────

function SectionCard({
  id,
  number,
  title,
  icon: Icon,
  color,
  description,
  children,
}: {
  id: string;
  number: string;
  title: string;
  icon: React.ElementType;
  color: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-8 scroll-mt-20"
    >
      <Card className="overflow-hidden border-0 shadow-lg shadow-black/5 dark:shadow-black/20">
        <CardHeader className={`relative overflow-hidden ${color}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-white/80 dark:bg-black/20 shadow-sm">
              <Icon className="size-5 text-current" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/50 dark:bg-black/20 border-current/20 font-bold">
                  {number}
                </Badge>
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 pb-6 px-5">
          {children}
        </CardContent>
      </Card>
    </motion.section>
  );
}

// ── Diff Block (for schema changes) ───────────────────────────────

function DiffBlock({ filename, changes }: { filename: string; changes: { before: string; after: string }[] }) {
  return (
    <div className="rounded-xl border bg-zinc-950 overflow-hidden my-3 shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{filename}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-400 border-zinc-700 font-mono">diff</Badge>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-[13px] leading-relaxed font-mono">
          {changes.map((change, i) => (
            <div key={i} className="my-2">
              <div className="text-red-400/80">
                <span className="select-none mr-2">-</span>
                <span className="bg-red-500/10 px-1 rounded">{change.before}</span>
              </div>
              <div className="text-emerald-400/80">
                <span className="select-none mr-2">+</span>
                <span className="bg-emerald-500/10 px-1 rounded">{change.after}</span>
              </div>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}

// ── Table Block ────────────────────────────────────────────────────

function VarTable({
  rows,
}: {
  rows: { name: string; description: string; required?: boolean }[];
}) {
  return (
    <div className="rounded-xl border overflow-hidden my-3">
      <ScrollArea className="max-h-96">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Variable</th>
              <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
              <th className="text-center px-4 py-2.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Required</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5">
                  <code className="text-xs font-mono text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">
                    {row.name}
                  </code>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs leading-relaxed">
                  {row.description}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {row.required !== false && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 border">
                      Yes
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}

// ── Checklist Item ─────────────────────────────────────────────────

function ChecklistItem({ children, defaultChecked = false }: { children: React.ReactNode; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className="flex items-start gap-2.5 w-full text-left py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className={`flex items-center justify-center size-5 rounded-md border-2 mt-0.5 shrink-0 transition-all duration-200 ${
        checked
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'border-muted-foreground/30 group-hover:border-muted-foreground/50'
      }`}>
        {checked && <Check className="size-3" />}
      </div>
      <span className={`text-sm leading-relaxed transition-colors ${checked ? 'line-through text-muted-foreground' : ''}`}>
        {children}
      </span>
    </button>
  );
}

// ── Sections Data ──────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: 'supabase-setup',
    number: '01',
    title: 'Supabase Project Setup',
    icon: Cloud,
    color: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    description: 'Create a Supabase project and obtain your database credentials',
  },
  {
    id: 'alt-database-providers',
    number: '01.5',
    title: 'Alternative Database Providers',
    icon: Server,
    color: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white',
    description: 'Quick setup for Neon, Railway Postgres, Render, or self-hosted PostgreSQL',
  },
  {
    id: 'database-migration',
    number: '02',
    title: 'Database Migration',
    icon: Database,
    color: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white',
    description: 'Migrate your Prisma schema from SQLite to PostgreSQL',
  },
  {
    id: 'environment-variables',
    number: '03',
    title: 'Environment Variables',
    icon: KeyRound,
    color: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
    description: 'Configure all required environment variables for production',
  },
  {
    id: 'deployment-options',
    number: '04',
    title: 'Deployment Options',
    icon: Rocket,
    color: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white',
    description: 'Deploy to Vercel, Docker, Railway, or Fly.io',
  },
  {
    id: 'post-deployment',
    number: '05',
    title: 'Post-Deployment Checklist',
    icon: ClipboardCheck,
    color: 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white',
    description: 'Verify everything is working correctly after deployment',
  },
];

// ── Main Component ─────────────────────────────────────────────────

export function DeploymentGuide() {
  const goBack = useNavStore((s) => s.goBack);
  const [activeSection, setActiveSection] = useState('supabase-setup');

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* ── Background ─────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 size-[500px] rounded-full bg-gradient-to-br from-amber-300/10 via-orange-300/8 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-24 size-[400px] rounded-full bg-gradient-to-bl from-teal-300/8 via-emerald-300/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 size-[350px] rounded-full bg-gradient-to-tr from-orange-200/8 via-amber-200/5 to-transparent blur-3xl" />
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 transition-shadow duration-300">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 focus-visible:ring-amber-500/30"
              onClick={goBack}
              aria-label="Go back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/10">
                <Rocket className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight">Deployment Guide</h1>
                <p className="text-[11px] text-muted-foreground leading-tight">Supabase + PostgreSQL Production Setup</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] px-2 py-0 border-emerald-300/60 text-emerald-700 dark:border-emerald-700/60 dark:text-emerald-300 font-semibold">
            <Gauge className="size-3 mr-1" />
            ClassTrack
          </Badge>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="flex gap-6">
          {/* ── Sidebar Navigation (desktop) ──────────────────── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contents</p>
              <nav className="space-y-1">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>

              <Separator className="my-4" />

              {/* Quick links */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">External Links</p>
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Supabase Dashboard
                </a>
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Vercel
                </a>
                <a
                  href="https://www.prisma.io/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <ExternalLink className="size-3" />
                  Prisma Documentation
                </a>
              </div>
            </div>
          </aside>

          {/* ── Main Content ───────────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {/* Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-8"
            >
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 via-orange-50 to-teal-100 dark:from-amber-950/30 dark:via-orange-950/15 dark:to-teal-950/25 border border-amber-200/40 dark:border-amber-800/30 p-6 backdrop-blur-sm shadow-md shadow-amber-500/5">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-300/25 to-transparent rounded-bl-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-teal-300/20 to-transparent rounded-tr-full pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-5 text-amber-600 dark:text-amber-400" />
                    <h2 className="text-xl font-bold text-gradient-warm">Deploy ClassTrack to Production</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    This comprehensive guide walks you through deploying ClassTrack from a local SQLite development environment
                    to a production-ready Supabase PostgreSQL setup. Follow each section in order for a smooth deployment.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <ActionTag color="amber"><Server className="size-3" /> Supabase PostgreSQL</ActionTag>
                    <ActionTag color="teal"><Layers className="size-3" /> Prisma ORM</ActionTag>
                    <ActionTag color="emerald"><Globe className="size-3" /> Next.js 16</ActionTag>
                    <ActionTag color="orange"><Container className="size-3" /> Docker Ready</ActionTag>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mobile TOC */}
            <div className="lg:hidden mb-6">
              <Accordion type="single" collapsible>
                <AccordionItem value="toc" className="border rounded-xl bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <FolderTree className="size-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium">Table of Contents</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-2 pb-3">
                    <nav className="space-y-1">
                      {SECTIONS.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          >
                            <Icon className="size-4 shrink-0" />
                            <span>{section.title}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 1: Supabase Setup                              */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="supabase-setup"
              number="01"
              title="Supabase Project Setup"
              icon={Cloud}
              color="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              description="Create a Supabase project and obtain your database credentials"
            >
              <CalloutBox type="info">
                If you prefer other PostgreSQL providers (Neon, Railway Postgres, Render, etc.), the same Prisma setup applies —
                just use your provider&apos;s connection string. See <strong>Section 1.5</strong> below for provider-specific quick setup guides.
              </CalloutBox>

              <Step number={1} title="Create a Supabase Account">
                Visit <InlineCode>https://supabase.com</InlineCode> and sign up using your GitHub account or email.
                The free tier includes 500MB database storage and 2GB bandwidth — perfect for getting started.
              </Step>

              <Step number={2} title="Create a New Project">
                <ol className="list-decimal list-inside space-y-1 mt-1 text-sm text-muted-foreground">
                  <li>Click <strong>&quot;New Project&quot;</strong> in the dashboard</li>
                  <li>Choose your organization (or create one)</li>
                  <li>Enter a <strong>Project Name</strong> (e.g., <InlineCode>classtrack-prod</InlineCode>)</li>
                  <li>Set a <strong>Database Password</strong> — save this securely! You&apos;ll need it for the connection string</li>
                  <li>Select the <strong>Region</strong> closest to your users for best latency</li>
                  <li>Click <strong>&quot;Create new project&quot;</strong> and wait for provisioning (~2 min)</li>
                </ol>
              </Step>

              <Step number={3} title="Get Your Connection Credentials">
                Once the project is ready, navigate to <strong>Settings → Database</strong> in the Supabase dashboard.
                You&apos;ll find your <strong>Project URL</strong> and <strong>Project API keys</strong>.
              </Step>

              <Step number={4} title="Find the Connection String">
                In <strong>Settings → Database → Connection string</strong>, select the <InlineCode>URI</InlineCode> tab.
                The format will be:
                <CodeBlock
                  language="env"
                  code={`postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`}
                />
              </Step>

              <CalloutBox type="warning">
                Always use the <strong>Connection Pooler</strong> URL (port 6543) instead of the Direct connection (port 5432) for serverless deployments like Vercel.
                The pooler uses <strong>pgBouncer</strong> to manage connections efficiently and prevent connection exhaustion.
              </CalloutBox>

              <Step number={5} title="Note Your Project Reference">
                Your project reference is the unique identifier in your Supabase URL.
                For example, if your project URL is <InlineCode>https://abcdefgh.supabase.co</InlineCode>, then your
                project reference is <InlineCode>abcdefgh</InlineCode>. You&apos;ll need this for various configurations.
              </Step>
            </SectionCard>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 1.5: Alternative Database Providers               */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="alt-database-providers"
              number="01.5"
              title="Alternative Database Providers"
              icon={Server}
              color="bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
              description="Quick setup for Neon, Railway Postgres, Render, or self-hosted PostgreSQL"
            >
              <p className="text-sm text-muted-foreground mb-3">
                ClassTrack works with any PostgreSQL provider. The Prisma setup is identical across all providers —
                you only need to change the <InlineCode>provider</InlineCode> in your schema and set the correct <InlineCode>DATABASE_URL</InlineCode>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                {/* Neon */}
                <div className="rounded-xl border bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-teal-700 dark:text-teal-300">Neon</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/40 border">
                      Serverless
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    Serverless Postgres with branching and auto-scaling. Generous free tier (0.5GB storage, 100 compute-hours/month).
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`# 1. Sign up at https://neon.tech
# 2. Create a project → copy the connection string
# 3. Set your DATABASE_URL:
DATABASE_URL="postgresql://user:pass@ep-cool-name-12345.us-east-2.aws.neon.tech/classtrack?sslmode=require"`}
                  />
                </div>

                {/* Railway Postgres */}
                <div className="rounded-xl border bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-purple-700 dark:text-purple-300">Railway Postgres</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40 border">
                      Built-in
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    If deploying to Railway, add a PostgreSQL service directly in your project. Railway provides the <InlineCode>DATABASE_URL</InlineCode> automatically.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`# In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
# Railway sets the DATABASE_URL env var automatically
# Reference it in your Next.js app:
DATABASE_URL="\${DATABASE_URL}"`}
                  />
                </div>

                {/* Render Postgres */}
                <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Render Postgres</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 border">
                      Free Tier
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    Managed PostgreSQL with a free tier (90 days, then $7/mo). Easy dashboard, automatic backups.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`# 1. Go to https://render.com → "New" → "PostgreSQL"
# 2. Choose a name, region, and plan
# 3. Copy the "Internal Database URL" from dashboard
DATABASE_URL="postgresql://render_user:pass@dpg-abc123.oregon-postgres.render.com/classtrack"`}
                  />
                </div>

                {/* Self-hosted */}
                <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">Self-Hosted PostgreSQL</span>
                    <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 border">
                      Docker/VPS
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    Run your own PostgreSQL instance on a VPS or Docker container. Full control, but you manage backups and updates.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`# Docker quick-start:
docker run -d \\
  --name classtrack-pg \\
  -e POSTGRES_USER=classtrack \\
  -e POSTGRES_PASSWORD=your_secure_password \\
  -e POSTGRES_DB=classtrack \\
  -p 5432:5432 \\
  -v pgdata:/var/lib/postgresql/data \\
  postgres:16-alpine

DATABASE_URL="postgresql://classtrack:your_secure_password@host:5432/classtrack"`}
                  />
                </div>
              </div>

              <CalloutBox type="tip">
                Regardless of provider, the Prisma migration steps in <strong>Section 2</strong> remain the same:
                change <InlineCode>provider = &quot;sqlite&quot;</InlineCode> to <InlineCode>provider = &quot;postgresql&quot;</InlineCode>, set your <InlineCode>DATABASE_URL</InlineCode>, and run <InlineCode>bunx prisma db push</InlineCode>.
              </CalloutBox>
            </SectionCard>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 2: Database Migration                            */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="database-migration"
              number="02"
              title="Database Migration"
              icon={Database}
              color="bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
              description="Migrate your Prisma schema from SQLite to PostgreSQL"
            >
              <p className="text-sm text-muted-foreground mb-3">
                ClassTrack currently uses SQLite for local development. To deploy to Supabase, you need to update the
                Prisma schema to use PostgreSQL and migrate your data.
              </p>

              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="size-4 text-teal-600 dark:text-teal-400" />
                Update Prisma Schema
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Open <InlineCode>prisma/schema.prisma</InlineCode> and make the following changes:
              </p>

              <DiffBlock
                filename="prisma/schema.prisma"
                changes={[
                  {
                    before: 'provider = "sqlite"',
                    after: 'provider = "postgresql"',
                  },
                ]}
              />

              <p className="text-sm text-muted-foreground mt-4 mb-2">
                Your <InlineCode>DATABASE_URL</InlineCode> in <InlineCode>.env</InlineCode> must also change from:
              </p>

              <DiffBlock
                filename=".env"
                changes={[
                  {
                    before: 'DATABASE_URL="file:./dev.db"',
                    after: 'DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"',
                  },
                ]}
              />

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <Layers className="size-4 text-teal-600 dark:text-teal-400" />
                JSON Fields: Optional Type Upgrade
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Some fields in the schema store JSON data as <InlineCode>String</InlineCode> type (for SQLite compatibility).
                With PostgreSQL, you can optionally convert them to native <InlineCode>Json</InlineCode> type:
              </p>

              <CodeBlock
                filename="prisma/schema.prisma — Optional JSON upgrades"
                code={`// These fields can be upgraded from String to Json:
// In User model:
emailPatternExtracted  Json    @default("{}")   // was: String @default("{}")

// In Subject model:
scheduleDays           Json    @default("[]")    // was: String @default("[]")

// In Poll model:
options                Json    @default("[]")    // was: String @default("[]")

// In Classroom model:
gradeConfig            Json    @default("{...}") // was: String @default("{...}")`}
              />

              <CalloutBox type="info">
                If you upgrade to <InlineCode>Json</InlineCode> type, you&apos;ll need to update any code that parses these strings
                with <InlineCode>JSON.parse()</InlineCode> — the Prisma client will return native JavaScript objects instead.
                This is optional but recommended for a cleaner codebase.
              </CalloutBox>

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <HardDrive className="size-4 text-teal-600 dark:text-teal-400" />
                Run the Migration
              </h3>

              <Step number={1} title="Install Prisma Migrate (if not already)">
                <CodeBlock code="bun add prisma --save-dev" />
              </Step>

              <Step number={2} title="Generate the Prisma Client">
                <CodeBlock code="bunx prisma generate" />
              </Step>

              <Step number={3} title="Push Schema to Supabase">
                Use Prisma to create tables in your Supabase PostgreSQL database:
                <CodeBlock code="bunx prisma db push" />
                This will create all tables, indexes, and relations in your Supabase database based on your schema.
              </Step>

              <Step number={4} title="Verify Tables in Supabase Dashboard">
                Go to <strong>Table Editor</strong> in your Supabase dashboard. You should see all your models
                (User, Classroom, Subject, RosterEntry, AttendanceSession, etc.) created successfully.
              </Step>

              <CalloutBox type="warning">
                <InlineCode>prisma db push</InlineCode> does <strong>not</strong> create migration files.
                For production, consider using <InlineCode>prisma migrate dev</InlineCode> and <InlineCode>prisma migrate deploy</InlineCode>
                to track schema changes over time. This is important for rollback capability.
              </CalloutBox>

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <Shield className="size-4 text-teal-600 dark:text-teal-400" />
                Row Level Security (RLS)
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Supabase enables Row Level Security by default. Since ClassTrack handles authorization in the application layer
                (via JWT tokens and role checks), you have two options:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                <div className="rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Unlock className="size-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Option A: Disable RLS</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Simplest approach. Run <InlineCode>ALTER TABLE</InlineCode> to disable RLS on all tables.
                    ClassTrack handles auth at the app level.
                  </p>
                  <CodeBlock
                    code={`-- Disable RLS for all tables (in Supabase SQL Editor)
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Classroom" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subject" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RosterEntry" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceSession" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Assessment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Result" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Poll" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "PollVote" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "StudentFinalGrade" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerification" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" DISABLE ROW LEVEL SECURITY;`}
                  />
                </div>

                <div className="rounded-xl border bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="size-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">Option B: Keep RLS</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    More secure. Create policies that use the JWT from the <InlineCode>Authorization</InlineCode> header
                    to control row access. Requires more setup.
                  </p>
                  <CodeBlock
                    code={`-- Example: Allow authenticated users full access
CREATE POLICY "Authenticated users can read"
ON "User" FOR SELECT
TO authenticated
USING (true);

-- Allow service_role full access (for Prisma)
CREATE POLICY "Service role full access"
ON "User" FOR ALL
TO service_role
USING (true)
WITH CHECK (true);`}
                  />
                </div>
              </div>

              <CalloutBox type="tip">
                For most ClassTrack deployments, <strong>Option A (Disable RLS)</strong> is recommended since all authorization
                is handled by the Next.js API layer. If you plan to expose Supabase directly to clients, use Option B.
              </CalloutBox>

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <Package className="size-4 text-teal-600 dark:text-teal-400" />
                Data Migration (Existing Data)
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                If you have existing data in SQLite and want to migrate it to PostgreSQL:
              </p>

              <Step number={1} title="Export SQLite Data">
                <CodeBlock code="bunx prisma db seed -- --source=sqlite" />
                Or use <InlineCode>sqlite3 dev.db &quot;.dump&quot; &gt; dump.sql</InlineCode> for a raw SQL export.
              </Step>
              <Step number={2} title="Transform for PostgreSQL">
                Convert SQLite-specific syntax (e.g., <InlineCode>AUTOINCREMENT</InlineCode> → <InlineCode>SERIAL</InlineCode>,
                boolean integers → <InlineCode>BOOLEAN</InlineCode>). Tools like <InlineCode>pgloader</InlineCode> can automate this.
              </Step>
              <Step number={3} title="Import into Supabase">
                Run the transformed SQL in the <strong>Supabase SQL Editor</strong>, or use <InlineCode>psql</InlineCode>:
                <CodeBlock code={`psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" -f transformed_dump.sql`} />
              </Step>
            </SectionCard>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 3: Environment Variables                         */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="environment-variables"
              number="03"
              title="Environment Variables"
              icon={KeyRound}
              color="bg-gradient-to-r from-orange-500 to-amber-500 text-white"
              description="Configure all required environment variables for production"
            >
              <p className="text-sm text-muted-foreground mb-3">
                Set these environment variables in your deployment platform (Vercel dashboard, Docker <InlineCode>.env</InlineCode> file, etc.).
                <strong> Never commit secrets to version control.</strong>
              </p>

              <VarTable
                rows={[
                  {
                    name: 'DATABASE_URL',
                    description: 'PostgreSQL connection string. Include pgbouncer=true for Supabase (port 6543). For other providers, use their connection URL. Required in all environments.',
                  },
                  {
                    name: 'JWT_SECRET',
                    description: 'A cryptographically secure random string (32+ chars) for signing JWT tokens. Generate with: openssl rand -base64 48. Has a fallback default in dev but MUST be set in production.',
                  },
                  {
                    name: 'NEXT_PUBLIC_APP_URL',
                    description: 'Your production URL (e.g., https://classtrack.vercel.app). Used for PWA manifest, CORS, and redirects. Required for production deployments.',
                    required: true,
                  },
                  {
                    name: 'NODE_ENV',
                    description: 'Set to "production" for deployed environments. Enables Next.js optimizations. Defaults to "development" if omitted.',
                    required: false,
                  },
                  {
                    name: 'NEXT_TELEMETRY_DISABLED',
                    description: 'Set to "1" to disable Next.js anonymous telemetry. Optional but recommended for privacy.',
                    required: false,
                  },
                  {
                    name: 'NEXTAUTH_SECRET',
                    description: 'Only needed if you add NextAuth later. ClassTrack uses custom JWT auth (src/lib/jwt.ts), not NextAuth.',
                    required: false,
                  },
                  {
                    name: 'NEXTAUTH_URL',
                    description: 'Only needed if you add NextAuth later. Usually same as NEXT_PUBLIC_APP_URL.',
                    required: false,
                  },
                ]}
              />

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <Terminal className="size-4 text-orange-600 dark:text-orange-400" />
                Generate a JWT Secret
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Use one of these methods to generate a secure JWT secret:
              </p>
              <CodeBlock
                code={`# Option 1: OpenSSL
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Option 3: Bun
bun -e "console.log(crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,''))"`}
              />

              <h3 className="text-sm font-semibold mt-5 mb-2 flex items-center gap-2">
                <Globe className="size-4 text-orange-600 dark:text-orange-400" />
                Connection URL Reference
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Choose the correct connection URL based on your deployment type:
              </p>

              <div className="grid grid-cols-1 gap-3 my-3">
                <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 border">
                      Recommended
                    </Badge>
                    <span className="text-xs font-semibold">Serverless (Vercel, Netlify)</span>
                  </div>
                  <CodeBlock
                    code="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
                  />
                  <p className="text-xs text-muted-foreground">
                    Uses Supavisor pooler with pgBouncer mode. Required for serverless environments.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 border">
                      Long-running
                    </Badge>
                    <span className="text-xs font-semibold">Docker, Railway, Fly.io</span>
                  </div>
                  <CodeBlock
                    code="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?connection_limit=10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct connection. Use for long-running server processes (not serverless).
                  </p>
                </div>
              </div>

              <CalloutBox type="warning">
                The <InlineCode>?pgbouncer=true</InlineCode> parameter in the connection string tells Prisma to use
                the <strong>pgBouncer-compatible</strong> driver. This is critical for Supabase connection pooling to work correctly
                with Prisma. Without it, you may encounter &quot;prepared statement&quot; errors.
              </CalloutBox>
            </SectionCard>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 4: Deployment Options                           */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="deployment-options"
              number="04"
              title="Deployment Options"
              icon={Rocket}
              color="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
              description="Deploy to Vercel, Docker, Railway, or Fly.io"
            >
              <p className="text-sm text-muted-foreground mb-4">
                Choose the deployment platform that best fits your needs. Each option below includes complete step-by-step instructions.
              </p>

              {/* ── Vercel ─────────────────────────────────────── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-zinc-900 dark:bg-zinc-800">
                    <span className="text-white text-xs font-bold">V</span>
                  </div>
                  <h3 className="text-sm font-semibold">Vercel (Recommended)</h3>
                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40 border">
                    Easiest
                  </Badge>
                </div>

                <Step number={1} title="Push Code to GitHub">
                  <CodeBlock
                    code={`git add .
git commit -m "Configure for Supabase production deployment"
git push origin main`}
                  />
                </Step>

                <Step number={2} title="Connect Repository to Vercel">
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-sm text-muted-foreground">
                    <li>Go to <InlineCode>https://vercel.com/new</InlineCode></li>
                    <li>Import your GitHub repository</li>
                    <li>Vercel auto-detects Next.js — no extra configuration needed</li>
                  </ol>
                </Step>

                <Step number={3} title="Set Environment Variables">
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-sm text-muted-foreground">
                    <li>In your Vercel project dashboard, go to <strong>Settings → Environment Variables</strong></li>
                    <li>Add <InlineCode>DATABASE_URL</InlineCode>, <InlineCode>JWT_SECRET</InlineCode>, and <InlineCode>NEXT_PUBLIC_APP_URL</InlineCode></li>
                    <li>Select <strong>All</strong> environments (Production, Preview, Development)</li>
                  </ol>
                </Step>

                <Step number={4} title="Configure Build Settings">
                  <div className="grid grid-cols-2 gap-2 my-2">
                    <div className="bg-muted/50 rounded-lg p-2.5 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Framework</p>
                      <p className="text-xs font-mono font-medium">Next.js</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Build Command</p>
                      <p className="text-xs font-mono font-medium">next build</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Output Directory</p>
                      <p className="text-xs font-mono font-medium">.next</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5 border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Install Command</p>
                      <p className="text-xs font-mono font-medium">bun install</p>
                    </div>
                  </div>
                </Step>

                <Step number={5} title="Add Post-build Command for Prisma">
                  In Vercel project settings, set the <strong>Build Command</strong> to:
                  <CodeBlock code="bunx prisma generate && next build" />
                  This ensures Prisma Client is generated before the Next.js build runs.
                </Step>

                <Step number={6} title="Deploy">
                  Click <strong>&quot;Deploy&quot;</strong>. Vercel will build and deploy your app. Each subsequent push to the connected branch triggers an automatic redeploy.
                </Step>

                <CalloutBox type="tip">
                  Enable <strong>Vercel Speed Insights</strong> and <strong>Web Analytics</strong> for free performance monitoring of your deployed app.
                </CalloutBox>
              </div>

              <Separator className="my-6" />

              {/* ── Docker ─────────────────────────────────────── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Container className="size-5 text-blue-400" />
                  <h3 className="text-sm font-semibold">Docker</h3>
                  <Badge className="text-[10px] px-1.5 py-0 bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40 border">
                    Self-hosted
                  </Badge>
                </div>

                <Step number={1} title="Create a Dockerfile">
                  Create a <InlineCode>Dockerfile</InlineCode> in the project root with a multi-stage build:
                </Step>

                <CodeBlock
                  filename="Dockerfile"
                  code={`# ── Stage 1: Dependencies ──────────────────────
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN bunx prisma generate

# ── Stage 2: Builder ───────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ── Stage 3: Runner ────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma/
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]`}
                />

                <Step number={2} title="Update next.config for Standalone Output">
                  Ensure your <InlineCode>next.config.ts</InlineCode> includes:
                </Step>
                <CodeBlock
                  filename="next.config.ts (excerpt)"
                  code={`const nextConfig = {
  output: 'standalone',
  // ... other config
};`}
                />

                <Step number={3} title="Create a .dockerignore File">
                </Step>
                <CodeBlock
                  filename=".dockerignore"
                  code={`node_modules
.next
.git
*.md
.env*.local
db/
bun.lock`}
                />

                <Step number={4} title="Build and Run">
                  <CodeBlock
                    code={`# Build the image
docker build -t classtrack .

# Run the container
docker run -d \\
  --name classtrack \\
  -p 3000:3000 \\
  -e DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \\
  -e JWT_SECRET="[YOUR-JWT-SECRET]" \\
  -e NEXT_PUBLIC_APP_URL="https://your-domain.com" \\
  classtrack`}
                  />
                </Step>

                <CalloutBox type="info">
                  For Docker deployments, use the <strong>Direct connection</strong> (port 5432) instead of the pooler (port 6543)
                  since Docker containers are long-running processes. Remove <InlineCode>?pgbouncer=true</InlineCode> from the URL.
                </CalloutBox>
              </div>

              <Separator className="my-6" />

              {/* ── Railway ───────────────────────────────────── */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="size-5 text-purple-400" />
                  <h3 className="text-sm font-semibold">Railway</h3>
                  <Badge className="text-[10px] px-1.5 py-0 bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/40 border">
                    Simple
                  </Badge>
                </div>

                <Step number={1} title="Install Railway CLI">
                  <CodeBlock code="npm install -g @railway/cli" />
                </Step>

                <Step number={2} title="Login to Railway">
                  <CodeBlock code="railway login" />
                </Step>

                <Step number={3} title="Initialize and Deploy">
                  <CodeBlock
                    code={`# Create a new project
railway init

# Set environment variables
railway variables set DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
railway variables set JWT_SECRET="[YOUR-JWT-SECRET]"
railway variables set NEXT_PUBLIC_APP_URL="https://your-railway-app.up.railway.app"

# Deploy
railway up`}
                  />
                </Step>

                <Step number={4} title="Set Build Command">
                  In Railway project settings, set the <strong>Build Command</strong> to:
                  <CodeBlock code="bunx prisma generate && bun run build" />
                </Step>

                <CalloutBox type="tip">
                  Railway also has a web dashboard at <InlineCode>https://railway.app</InlineCode> where you can visually manage
                  projects, variables, and deployments.
                </CalloutBox>
              </div>

              <Separator className="my-6" />

              {/* ── Fly.io ────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="size-5 text-purple-400" />
                  <h3 className="text-sm font-semibold">Fly.io</h3>
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 border">
                    Edge
                  </Badge>
                </div>

                <Step number={1} title="Install Fly CLI">
                  <CodeBlock code="curl -L https://fly.io/install.sh | sh" />
                </Step>

                <Step number={2} title="Authenticate">
                  <CodeBlock code="fly auth login" />
                </Step>

                <Step number={3} title="Launch the App">
                  <CodeBlock
                    code={`# Launch (creates fly.toml and Dockerfile)
fly launch

# When prompted, choose:
# - Region closest to your users
# - No for PostgreSQL (we use Supabase)
# - Yes for deploying now`}
                  />
                </Step>

                <Step number={4} title="Set Secrets">
                  <CodeBlock
                    code={`fly secrets set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
fly secrets set JWT_SECRET="[YOUR-JWT-SECRET]"
fly secrets set NEXT_PUBLIC_APP_URL="https://your-app.fly.dev"`}
                  />
                </Step>

                <Step number={5} title="Set Release Command">
                  Add to <InlineCode>fly.toml</InlineCode>:
                </Step>
                <CodeBlock
                  filename="fly.toml (excerpt)"
                  code={`[deploy]
  release_command = "npx prisma migrate deploy"`}
                />

                <CalloutBox type="info">
                  Fly.io deployments are global by default — your app runs in the region you selected during launch.
                  You can scale to multiple regions later with <InlineCode>fly scale regions</InlineCode>.
                </CalloutBox>
              </div>
            </SectionCard>

            {/* ──────────────────────────────────────────────────────── */}
            {/* Section 5: Post-Deployment Checklist                     */}
            {/* ──────────────────────────────────────────────────────── */}
            <SectionCard
              id="post-deployment"
              number="05"
              title="Post-Deployment Checklist"
              icon={ClipboardCheck}
              color="bg-gradient-to-r from-amber-500 to-emerald-500 text-white"
              description="Verify everything is working correctly after deployment"
            >
              <p className="text-sm text-muted-foreground mb-4">
                After deploying, work through this checklist to ensure everything is configured correctly.
                Click items to mark them as complete.
              </p>

              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Globe className="size-3" /> Application
                </h4>
                <ChecklistItem>The application loads at your production URL without errors</ChecklistItem>
                <ChecklistItem>SSL/HTTPS is working correctly (most platforms handle this automatically)</ChecklistItem>
                <ChecklistItem>The PWA manifest loads and the install prompt works on mobile</ChecklistItem>
                <ChecklistItem>Dark mode / light mode toggle functions correctly</ChecklistItem>
                <ChecklistItem>Responsive design works on mobile, tablet, and desktop</ChecklistItem>

                <Separator className="my-3" />

                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Database className="size-3" /> Database
                </h4>
                <ChecklistItem>Database connection is successful (no &quot;Cannot connect to database&quot; errors)</ChecklistItem>
                <ChecklistItem>Prisma queries execute without timeouts</ChecklistItem>
                <ChecklistItem>All database tables exist in Supabase Table Editor</ChecklistItem>
                <ChecklistItem>Connection pooling works (check Supabase dashboard → Settings → Database → Pooler)</ChecklistItem>
                <ChecklistItem>RLS policies are configured (or disabled) as intended</ChecklistItem>

                <Separator className="my-3" />

                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Settings className="size-3" /> Authentication
                </h4>
                <ChecklistItem>User signup with email OTP works end-to-end</ChecklistItem>
                <ChecklistItem>JWT token generation and validation works</ChecklistItem>
                <ChecklistItem>Token refresh flow functions correctly</ChecklistItem>
                <ChecklistItem>Protected API routes return 401 for unauthenticated requests</ChecklistItem>

                <Separator className="my-3" />

                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Eye className="size-3" /> Features
                </h4>
                <ChecklistItem>Classroom creation and joining works</ChecklistItem>
                <ChecklistItem>Roster upload via Excel functions</ChecklistItem>
                <ChecklistItem>Attendance marking and finalization works</ChecklistItem>
                <ChecklistItem>Result upload and publishing works</ChecklistItem>
                <ChecklistItem>GPA calculator functions correctly</ChecklistItem>
                <ChecklistItem>Announcements and polls work</ChecklistItem>
                <ChecklistItem>Report card generates correctly</ChecklistItem>

                <Separator className="my-3" />

                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Clock className="size-3" /> Monitoring
                </h4>
                <ChecklistItem defaultChecked>Set up error monitoring (Sentry, or Vercel/Platform built-in)</ChecklistItem>
                <ChecklistItem defaultChecked>Configure logging for API routes</ChecklistItem>
                <ChecklistItem defaultChecked>Set up database backups (Supabase auto-backs up daily on free tier)</ChecklistItem>
                <ChecklistItem>Monitor Supabase usage dashboard for connection limits</ChecklistItem>
                <ChecklistItem>Review Vercel/Platform function execution logs for cold start issues</ChecklistItem>
              </div>

              <CalloutBox type="tip" title="Performance Tip">
                Vercel serverless functions have a cold start time. For ClassTrack, this is typically 200-500ms for the first request.
                Subsequent requests are warm and respond much faster. Consider using Vercel&apos;s Pro plan for longer serverless function timeouts if needed.
              </CalloutBox>

              <CalloutBox type="warning" title="Supabase Free Tier Limits">
                The Supabase free tier includes 500MB database, 50,000 monthly active users, and 500MB bandwidth.
                Monitor your usage at <InlineCode>https://supabase.com/dashboard → Settings → Usage</InlineCode>.
                Upgrade to Pro ($25/mo) when you need more capacity.
              </CalloutBox>

              {/* ── Troubleshooting Quick Reference ──────────── */}
              <h3 className="text-sm font-semibold mt-5 mb-3 flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                Common Issues & Fixes
              </h3>

              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="issue-1" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    &quot;Prepared statement does not exist&quot; error
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    This happens when using <InlineCode>pgbouncer=true</InlineCode> in transaction mode.
                    Add <InlineCode>?pgbouncer=true</InlineCode> to your DATABASE_URL and ensure your Prisma client is using
                    the connection pooler URL (port 6543). If the issue persists, try adding
                    <InlineCode> &amp;connect_timeout=15</InlineCode> to the URL.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue-2" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    Connection limit exceeded on Supabase
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    Reduce <InlineCode>connection_limit</InlineCode> in your DATABASE_URL to 5-10.
                    Verify you&apos;re using the Supavisor pooler URL (port 6543), not the direct connection.
                    Also check that Prisma&apos;s <InlineCode>pool_size</InlineCode> in the generated client isn&apos;t too high.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue-3" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    Prisma Client not found in production
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    Ensure <InlineCode>bunx prisma generate</InlineCode> runs as part of your build command
                    (e.g., <InlineCode>bunx prisma generate &amp;&amp; next build</InlineCode>). The Prisma client must be generated
                    during the build step, not at runtime.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue-4" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    PWA service worker not updating
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    Ensure <InlineCode>NEXT_PUBLIC_APP_URL</InlineCode> is set to your production URL.
                    Clear the browser cache and reload. The service worker will pick up the new manifest.
                    You may also need to unregister the old service worker in DevTools → Application → Service Workers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue-5" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    API routes return 500 on Vercel
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    Check the Vercel function logs for the specific error.
                    Common causes: missing environment variables, Prisma client not generated,
                    or exceeding the 10-second serverless function timeout (Pro plan allows 60s).
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="issue-6" className="border rounded-lg bg-muted/20 px-1">
                  <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                    Email OTP not sending
                  </AccordionTrigger>
                  <AccordionContent className="text-xs text-muted-foreground pb-3">
                    <p className="mb-2">
                      In the current demo setup, the OTP is returned directly in the API response (visible in DevTools or your API client).
                      No real email is sent. This is intentional for development and demo purposes.
                    </p>
                    <p className="mb-2">
                      For production, you need to integrate a real email provider to send OTP codes. Recommended options:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li><strong>Resend</strong> — developer-friendly, 100 emails/day free, excellent Next.js SDK</li>
                      <li><strong>SendGrid</strong> — 100 emails/day free, reliable with good deliverability</li>
                      <li><strong>AWS SES</strong> — lowest cost at scale ($0.10/1000 emails), requires domain verification</li>
                    </ul>
                    <p className="mt-2">
                      Update the <InlineCode>send-otp</InlineCode> API route to call your email provider instead of returning
                      the OTP in the response. Remove the OTP from the API response body before going live.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </SectionCard>

            {/* ── Footer ───────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-center py-6"
            >
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent mx-auto mb-4" />
              <p className="text-xs text-muted-foreground">
                ClassTrack Deployment Guide — Supabase + PostgreSQL
              </p>
              <p className="text-[11px] text-muted-foreground/60 mt-1">
                Last updated for Next.js 16, Prisma 6, and Supabase
              </p>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
