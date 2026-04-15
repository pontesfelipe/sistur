/**
 * SISEDU - Relatório Individual do Aluno (para Professores)
 * Visão detalhada do progresso de um aluno específico
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  Clock,
  GraduationCap,
  Award,
  Target,
  TrendingUp,
  User,
  Calendar,
  FileDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentReportProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
}

interface StudentStats {
  totalProgress: number;
  completedTrainings: number;
  totalTimeSeconds: number;
  certificates: number;
  examsPassed: number;
  examsFailed: number;
  avgExamScore: number;
  progressByPillar: Record<string, { completed: number; total: number }>;
  recentActivity: { date: string; training: string; action: string }[];
}

export function StudentReportDialog({ studentId, studentName, open, onClose }: StudentReportProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['student-report', studentId],
    queryFn: async (): Promise<StudentStats> => {
      // Fetch detailed progress
      const { data: progress } = await supabase
        .from('edu_detailed_progress')
        .select('*')
        .eq('user_id', studentId);

      // Fetch exam attempts
      const { data: exams } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', studentId);

      // Fetch certificates
      const { data: certs } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', studentId);

      // Fetch training details for names
      const trainingIds = [...new Set(progress?.map(p => p.training_id) ?? [])];
      const { data: trainings } = trainingIds.length > 0
        ? await supabase
            .from('edu_trainings')
            .select('training_id, title, pillar')
            .in('training_id', trainingIds)
        : { data: [] };

      const completed = progress?.filter(p => p.completed_at) ?? [];
      const totalTime = progress?.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0) ?? 0;

      const passed = exams?.filter(e => e.result === 'passed') ?? [];
      const failed = exams?.filter(e => e.result === 'failed') ?? [];
      const avgScore = exams?.length
        ? exams.reduce((acc, e) => acc + (e.score_pct || 0), 0) / exams.length
        : 0;

      // Group by pillar
      const pillarProgress: Record<string, { completed: number; total: number }> = {};
      trainings?.forEach(t => {
        if (!pillarProgress[t.pillar]) {
          pillarProgress[t.pillar] = { completed: 0, total: 0 };
        }
        pillarProgress[t.pillar].total++;
        if (completed.find(c => c.training_id === t.training_id)) {
          pillarProgress[t.pillar].completed++;
        }
      });

      // Recent activity
      const recent = (progress ?? [])
        .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
        .slice(0, 10)
        .map(p => ({
          date: p.last_accessed_at,
          training: trainings?.find(t => t.training_id === p.training_id)?.title ?? p.training_id,
          action: p.completed_at ? 'Concluiu' : `${Math.round(p.progress_pct)}% progresso`,
        }));

      return {
        totalProgress: trainingIds.length > 0 ? Math.round((completed.length / trainingIds.length) * 100) : 0,
        completedTrainings: completed.length,
        totalTimeSeconds: totalTime,
        certificates: certs?.length ?? 0,
        examsPassed: passed.length,
        examsFailed: failed.length,
        avgExamScore: Math.round(avgScore),
        progressByPillar: pillarProgress,
        recentActivity: recent,
      };
    },
    enabled: open && !!studentId,
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Relatório — {studentName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <GraduationCap className="h-5 w-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold">{stats.completedTrainings}</p>
                  <p className="text-[10px] text-muted-foreground">Concluídos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xl font-bold">{formatTime(stats.totalTimeSeconds)}</p>
                  <p className="text-[10px] text-muted-foreground">Estudo</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Target className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <p className="text-xl font-bold">{stats.avgExamScore}%</p>
                  <p className="text-[10px] text-muted-foreground">Média Exames</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Award className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <p className="text-xl font-bold">{stats.certificates}</p>
                  <p className="text-[10px] text-muted-foreground">Certificados</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress by Pillar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progresso por Pilar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats.progressByPillar).map(([pillar, data]) => (
                  <div key={pillar} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Badge variant={pillar.toLowerCase() as any}>{pillar}</Badge>
                      <span className="text-muted-foreground">
                        {data.completed}/{data.total}
                      </span>
                    </div>
                    <Progress
                      value={data.total > 0 ? (data.completed / data.total) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
                {Object.keys(stats.progressByPillar).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum dado de progresso ainda
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Exam Performance */}
            {(stats.examsPassed > 0 || stats.examsFailed > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Desempenho em Exames</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">{stats.examsPassed} aprovados</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-destructive" />
                      <span className="text-sm">{stats.examsFailed} reprovados</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            {stats.recentActivity.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Atividade Recente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Treinamento</TableHead>
                        <TableHead className="text-xs">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentActivity.map((act, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">
                            {format(new Date(act.date), 'dd/MM HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs line-clamp-1 max-w-48">{act.training}</TableCell>
                          <TableCell>
                            <Badge variant={act.action === 'Concluiu' ? 'default' : 'secondary'} className="text-[10px]">
                              {act.action}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
