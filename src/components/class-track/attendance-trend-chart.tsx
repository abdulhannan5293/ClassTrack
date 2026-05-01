'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Loader2,
  Info,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth-store';

// ── Types ──────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  label: string;
  rate: number;
  totalPresent: number;
  totalStudents: number;
  subjectName: string;
}

// ── Constants ──────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;

const CHART_HEIGHT = 200;
const CHART_PADDING = { top: 20, right: 16, bottom: 40, left: 40 };
const DOT_RADIUS = 4;

function getRateColor(rate: number): string {
  if (rate >= 100) return '#10b981';   // emerald
  if (rate >= 75) return '#10b981';    // emerald
  if (rate >= 50) return '#f59e0b';    // amber
  return '#ef4444';                     // red
}

function getRateLabel(rate: number): string {
  if (rate >= 100) return 'Perfect';
  if (rate >= 75) return 'Good';
  if (rate >= 50) return 'Warning';
  return 'Low';
}

// ── SVG Line Chart ─────────────────────────────────────────────────

function TrendChart({
  data,
  classAverage,
  onHover,
  activeIndex,
}: {
  data: TrendDataPoint[];
  classAverage: number | null;
  onHover: (index: number | null) => void;
  activeIndex: number | null;
}) {
  if (data.length === 0) return null;

  const width = 600;
  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const maxRate = 100;
  const minRate = Math.max(0, Math.min(...data.map((d) => d.rate)) - 10);

  const xScale = (i: number) => {
    if (data.length === 1) return CHART_PADDING.left + innerWidth / 2;
    return CHART_PADDING.left + (i / (data.length - 1)) * innerWidth;
  };
  const yScale = (val: number) =>
    CHART_PADDING.top + innerHeight - ((val - minRate) / (maxRate - minRate)) * innerHeight;

  // Build path
  const linePoints = data.map((d, i) => `${xScale(i)},${yScale(d.rate)}`);
  const linePath = `M${linePoints.join('L')}`;

  // Gradient fill path
  const fillPath = `${linePath} L${xScale(data.length - 1)},${CHART_PADDING.top + innerHeight} L${xScale(0)},${CHART_PADDING.top + innerHeight} Z`;

  // Average line
  const avgY = classAverage !== null ? yScale(classAverage) : null;

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100].filter((v) => v >= minRate);

  const activePoint = activeIndex !== null ? data[activeIndex] : null;

  return (
    <svg viewBox={`0 0 ${width} ${CHART_HEIGHT}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((val) => {
        const y = yScale(val);
        return (
          <g key={val}>
            <line
              x1={CHART_PADDING.left}
              y1={y}
              x2={width - CHART_PADDING.right}
              y2={y}
              stroke="currentColor"
              className="text-muted-foreground/10"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={CHART_PADDING.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
              fontSize="10"
            >
              {val}%
            </text>
          </g>
        );
      })}

      {/* Class average line */}
      {avgY !== null && (
        <g>
          <line
            x1={CHART_PADDING.left}
            y1={avgY}
            x2={width - CHART_PADDING.right}
            y2={avgY}
            stroke="#14b8a6"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
          <text
            x={width - CHART_PADDING.right + 4}
            y={avgY + 4}
            className="fill-teal-500 dark:fill-teal-400"
            fontSize="9"
          >
            avg {classAverage}%
          </text>
        </g>
      )}

      {/* Gradient fill */}
      <path d={fillPath} fill="url(#trend-gradient)" />

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="url(#line-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* Hover zone (invisible) */}
      {data.map((d, i) => (
        <rect
          key={i}
          x={xScale(i) - (data.length > 1 ? innerWidth / (data.length - 1) / 2 : 30)}
          y={CHART_PADDING.top}
          width={data.length > 1 ? innerWidth / (data.length - 1) : 60}
          height={innerHeight}
          fill="transparent"
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
          className="cursor-pointer"
        />
      ))}

      {/* Data dots */}
      {data.map((d, i) => (
        <g key={i}>
          {/* Glow ring on hover */}
          {activeIndex === i && (
            <motion.circle
              cx={xScale(i)}
              cy={yScale(d.rate)}
              r={DOT_RADIUS + 4}
              fill={getRateColor(d.rate)}
              opacity={0.15}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
          <circle
            cx={xScale(i)}
            cy={yScale(d.rate)}
            r={activeIndex === i ? DOT_RADIUS + 1.5 : DOT_RADIUS}
            fill={getRateColor(d.rate)}
            stroke="white"
            strokeWidth="2"
            className="transition-all duration-150"
          />
        </g>
      ))}

      {/* Vertical hover line */}
      {activeIndex !== null && (
        <motion.line
          x1={xScale(activeIndex)}
          y1={CHART_PADDING.top}
          x2={xScale(activeIndex)}
          y2={CHART_PADDING.top + innerHeight}
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth="1"
          strokeDasharray="3 3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* X-axis labels */}
      {data.map((d, i) => {
        const showLabel = data.length <= 8 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1;
        if (!showLabel) return null;
        return (
          <text
            key={i}
            x={xScale(i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
            fontSize="9"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Tooltip Popup ──────────────────────────────────────────────────

function ChartTooltip({ point }: { point: TrendDataPoint }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg min-w-[140px]">
      <p className="text-xs font-semibold">{point.subjectName}</p>
      <p className="text-[10px] text-muted-foreground">{point.date}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${
            point.rate >= 75
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : point.rate >= 50
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {point.rate}% {getRateLabel(point.rate)}
        </Badge>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {point.totalPresent}/{point.totalStudents} present
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function AttendanceTrendChart({ classroomId }: { classroomId: string }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [classAverage, setClassAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      // Fetch sessions for the classroom
      const sessionsRes = await fetch(
        `/api/attendance/sessions?classroomId=${classroomId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!sessionsRes.ok) return;

      const sessionsData = await sessionsRes.json();
      const sessions = sessionsData.sessions ?? [];

      // Only finalized sessions
      const finalized = sessions.filter((s: { status: string }) => s.status === 'finalized');

      if (finalized.length === 0) {
        setData([]);
        setClassAverage(null);
        return;
      }

      // Sort by date
      finalized.sort((a: { conductedDate: string }, b: { conductedDate: string }) =>
        a.conductedDate.localeCompare(b.conductedDate)
      );

      // Fetch records for each session
      const trendData: TrendDataPoint[] = [];
      const allRates: number[] = [];

      await Promise.all(
        finalized.map(async (session: { id: string; conductedDate: string; subject: { name: string } }) => {
          try {
            const recordsRes = await fetch(
              `/api/attendance/records?sessionId=${session.id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!recordsRes.ok) return;

            const recordsData = await recordsRes.json();
            const records = recordsData.records ?? [];
            const total = records.length;
            const present = records.filter(
              (r: { status: string }) => r.status === 'present' || r.status === 'late'
            ).length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;

            const date = new Date(session.conductedDate + 'T00:00:00');
            trendData.push({
              date: session.conductedDate,
              label: `${date.getMonth() + 1}/${date.getDate()}`,
              rate,
              totalPresent: present,
              totalStudents: total,
              subjectName: session.subject.name,
            });
            allRates.push(rate);
          } catch {
            // Skip failed fetches
          }
        })
      );

      // Sort by date
      trendData.sort((a, b) => a.date.localeCompare(b.date));
      setData(trendData);
      setClassAverage(allRates.length > 0 ? Math.round(allRates.reduce((a, b) => a + b, 0) / allRates.length) : null);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, classroomId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Overall trend
  const overallTrend = useMemo(() => {
    if (data.length < 2) return null;
    const recent = data.slice(-3);
    const older = data.slice(0, -3);
    if (older.length === 0) return null;
    const recentAvg = recent.reduce((sum, d) => sum + d.rate, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.rate, 0) / older.length;
    const diff = Math.round(recentAvg - olderAvg);
    if (diff > 0) return { direction: 'up' as const, value: diff };
    if (diff < 0) return { direction: 'down' as const, value: Math.abs(diff) };
    return null;
  }, [data]);

  const latestRate = data.length > 0 ? data[data.length - 1].rate : null;

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Attendance Trend
          </CardTitle>
          {latestRate !== null && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${
                latestRate >= 75
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : latestRate >= 50
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-800'
              }`}
            >
              Latest: {latestRate}%
            </Badge>
          )}
        </div>
        {overallTrend && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {overallTrend.direction === 'up' ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                +{overallTrend.value}% improving
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                -{overallTrend.value}% declining
              </span>
            )}
            {' · '}
            <span className="text-muted-foreground">Based on last {data.length} sessions</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex items-center justify-center size-12 rounded-2xl bg-muted mb-3">
              <TrendingUp className="size-6 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">No attendance data yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Finalize attendance sessions to see trends.
            </p>
          </div>
        ) : (
          <div className="relative">
            <TooltipProvider delayDuration={0}>
              <TrendChart
                data={data}
                classAverage={classAverage}
                onHover={setActiveIndex}
                activeIndex={activeIndex}
              />
              {activeIndex !== null && data[activeIndex] && (
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
                >
                  <ChartTooltip point={data[activeIndex]} />
                </div>
              )}
            </TooltipProvider>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                <span className="text-[9px] text-muted-foreground">Good (≥75%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                <span className="text-[9px] text-muted-foreground">Warning (≥50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500 dark:bg-red-400" />
                <span className="text-[9px] text-muted-foreground">Low (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0 border-t-2 border-dashed border-teal-500" />
                <span className="text-[9px] text-muted-foreground">Average</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
