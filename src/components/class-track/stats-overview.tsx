'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, BookOpen, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Classroom {
  id: string;
  name: string;
  department: string;
  sessionYear: string;
  inviteCode: string;
  studentCount: number;
  claimedCount: number;
  userRole: string;
}

export function StatsOverview({ classrooms }: { classrooms: Classroom[] }) {
  const totalStudents = classrooms.reduce((sum, c) => sum + c.studentCount, 0);
  const uniqueDepts = new Set(classrooms.map((c) => c.department)).size;

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30' },
    { label: 'Departments', value: uniqueDepts, icon: BookOpen, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30' },
    { label: 'Admin Roles', value: classrooms.filter((c) => { const r = c.userRole?.toUpperCase(); return r === 'CR' || r === 'GR'; }).length, icon: ClipboardCheck, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30' },
    { label: 'Growth', value: classrooms.length > 0 ? '+' : 0, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' },
  ];

  return (
    <Card className="py-0 gap-0 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">Overview Stats</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-3 rounded-xl border bg-card/50 hover:bg-card transition-colors"
            >
              <div className={`flex items-center justify-center size-9 rounded-lg shrink-0 ${stat.color}`}>
                <stat.icon className="size-4" />
              </div>
              <div>
                <span className="text-lg font-bold tabular-nums">{stat.value}</span>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
