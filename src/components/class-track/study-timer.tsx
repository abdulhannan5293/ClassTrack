'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play, Pause, RotateCcw, Coffee, Flame, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ── Types ──────────────────────────────────────────────────────────

type TimerMode = 'study' | 'break';

interface TimerDuration {
  label: string;
  value: number; // minutes
}

// ── Constants ──────────────────────────────────────────────────────

const STUDY_DURATIONS: TimerDuration[] = [
  { label: '15 min', value: 15 },
  { label: '25 min', value: 25 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
];

const BREAK_DURATION = 5; // minutes

const MODE_CONFIG: Record<TimerMode, { label: string; gradient: string; ringStroke: string; ringBg: string; iconBg: string; badgeClass: string }> = {
  study: {
    label: 'Focus Session',
    gradient: 'from-amber-500 to-orange-500',
    ringStroke: 'stroke-amber-500',
    ringBg: 'from-amber-500/20 to-orange-500/10',
    iconBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  break: {
    label: 'Break Time',
    gradient: 'from-teal-500 to-emerald-500',
    ringStroke: 'stroke-teal-500',
    ringBg: 'from-teal-500/20 to-emerald-500/10',
    iconBg: 'bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400',
    badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
};

const ease = [0.22, 1, 0.36, 1] as const;

// ── Progress Ring ──────────────────────────────────────────────────

function ProgressRing({
  progress,
  mode,
  size = 140,
  strokeWidth = 8,
}: {
  progress: number;
  mode: TimerMode;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const config = MODE_CONFIG[mode];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted/50"
          strokeWidth={strokeWidth}
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`timer-gradient-${mode}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={mode === 'study' ? '#f59e0b' : '#14b8a6'} />
            <stop offset="100%" stopColor={mode === 'study' ? '#f97316' : '#10b981'} />
          </linearGradient>
        </defs>
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#timer-gradient-${mode})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {/* Center content handled by parent overlay */}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function StudyTimer() {
  // Timer state
  const [mode, setMode] = useState<TimerMode>('study');
  const [studyDuration, setStudyDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classtrack-study-sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === new Date().toDateString()) {
          return parsed.count;
        }
      }
    }
    return 0;
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTime = mode === 'study' ? studyDuration * 60 : BREAK_DURATION * 60;
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;

  // ── Timer Logic ──────────────────────────────────────────────────

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const switchMode = useCallback((newMode: TimerMode) => {
    clearTimer();
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'study') {
      setTimeLeft(studyDuration * 60);
    } else {
      setTimeLeft(BREAK_DURATION * 60);
    }
  }, [clearTimer, studyDuration]);

  const handleStartPause = useCallback(() => {
    if (isRunning) {
      clearTimer();
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  }, [isRunning, clearTimer]);

  const handleReset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    switchMode('study');
  }, [clearTimer, switchMode]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);

          if (mode === 'study') {
            const newCount = sessionsCompleted + 1;
            setSessionsCompleted(newCount);
            localStorage.setItem(
              'classtrack-study-sessions',
              JSON.stringify({ date: new Date().toDateString(), count: newCount })
            );
            // Auto-switch to break
            setMode('break');
            return BREAK_DURATION * 60;
          } else {
            // Auto-switch to study
            setMode('study');
            return studyDuration * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return clearTimer;
  }, [isRunning, mode, sessionsCompleted, studyDuration, clearTimer]);

  // ── Format Time ──────────────────────────────────────────────────

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const config = MODE_CONFIG[mode];

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Timer className="size-4 text-muted-foreground" />
            Study Timer
          </CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            <Flame className="size-3 text-amber-500 mr-1" />
            {sessionsCompleted} today
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col items-center gap-4">
          {/* Mode Badge */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.3, ease }}
            >
              <Badge variant="outline" className={`text-xs px-3 py-1 ${config.badgeClass}`}>
                {mode === 'study' ? <Timer className="size-3 mr-1.5" /> : <Coffee className="size-3 mr-1.5" />}
                {config.label}
              </Badge>
            </motion.div>
          </AnimatePresence>

          {/* Progress Ring + Timer Display */}
          <div className="relative">
            <ProgressRing progress={progress} mode={mode} size={160} strokeWidth={10} />
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: -8 }}>
              <motion.span
                key={formattedTime}
                initial={{ opacity: 0.7 }}
                animate={{ opacity: 1 }}
                className="text-3xl font-bold tabular-nums tracking-tight"
              >
                {formattedTime}
              </motion.span>
              <span className="text-[10px] text-muted-foreground font-medium">
                {mode === 'study' ? 'remaining' : 'break'}
              </span>
            </div>
          </div>

          {/* Duration Selector (only in study mode when not running) */}
          <AnimatePresence>
            {mode === 'study' && !isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease }}
                className="w-full"
              >
                <Select
                  value={String(studyDuration)}
                  onValueChange={(val) => {
                    setStudyDuration(Number(val));
                    setTimeLeft(Number(val) * 60);
                  }}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <span className="text-muted-foreground mr-1">Duration:</span>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDY_DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-xl"
              onClick={handleReset}
              aria-label="Reset timer"
            >
              <RotateCcw className="size-4" />
            </Button>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                className={`size-14 rounded-2xl bg-gradient-to-r ${config.gradient} text-white shadow-lg hover:shadow-xl transition-shadow duration-200`}
                onClick={handleStartPause}
                aria-label={isRunning ? 'Pause' : 'Start'}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isRunning ? 'pause' : 'play'}
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    transition={{ duration: 0.2, ease }}
                  >
                    {isRunning ? (
                      <Pause className="size-6" />
                    ) : (
                      <Play className="size-6 ml-0.5" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </motion.div>

            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-xl"
              onClick={() => switchMode(mode === 'study' ? 'break' : 'study')}
              disabled={isRunning}
              aria-label="Switch mode"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4" />
                </motion.div>
              </AnimatePresence>
            </Button>
          </div>

          {/* Session counter visual */}
          {sessionsCompleted > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5"
            >
              {Array.from({ length: Math.min(sessionsCompleted, 8) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05, duration: 0.2, ease }}
                  className="size-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
                />
              ))}
              {sessionsCompleted > 8 && (
                <span className="text-[10px] text-muted-foreground font-medium ml-1">
                  +{sessionsCompleted - 8}
                </span>
              )}
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
