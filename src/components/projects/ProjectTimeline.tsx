import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectPhase, ProjectMilestone, Project } from '@/hooks/useProjects';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Milestone as MilestoneIcon, Calendar } from 'lucide-react';

interface Props {
  project: Project;
  phases: ProjectPhase[];
  milestones: ProjectMilestone[];
}

/**
 * Lightweight Gantt-style timeline. Computes a global window from earliest
 * planned_start to latest planned_end (or project dates as fallback) and
 * positions each phase bar proportionally. Milestones render as flags below.
 */
export function ProjectTimeline({ project, phases, milestones }: Props) {
  const data = useMemo(() => {
    const allDates: number[] = [];
    const phasesWithDates = phases.filter((p) => p.planned_start_date && p.planned_end_date);
    phasesWithDates.forEach((p) => {
      allDates.push(parseISO(p.planned_start_date!).getTime());
      allDates.push(parseISO(p.planned_end_date!).getTime());
    });
    if (project.planned_start_date) allDates.push(parseISO(project.planned_start_date).getTime());
    if (project.planned_end_date) allDates.push(parseISO(project.planned_end_date).getTime());
    milestones.forEach((m) => { if (m.target_date) allDates.push(parseISO(m.target_date).getTime()); });

    if (allDates.length === 0) return null;
    const min = Math.min(...allDates);
    const max = Math.max(...allDates);
    const span = Math.max(max - min, 24 * 3600 * 1000); // at least 1 day
    return { min, max, span, phasesWithDates };
  }, [phases, milestones, project]);

  if (!data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-muted-foreground">
          Defina datas planejadas nas fases ou no projeto para visualizar a linha do tempo.
        </CardContent>
      </Card>
    );
  }

  const pct = (ts: number) => ((ts - data.min) / data.span) * 100;
  const totalDays = differenceInCalendarDays(new Date(data.max), new Date(data.min)) + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linha do tempo</CardTitle>
        <CardDescription>
          {format(new Date(data.min), 'dd MMM yyyy', { locale: ptBR })} → {format(new Date(data.max), 'dd MMM yyyy', { locale: ptBR })} · {totalDays} dias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase bars */}
        <div className="space-y-2">
          {data.phasesWithDates.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma fase com datas planejadas.</p>
          )}
          {data.phasesWithDates.map((p) => {
            const start = parseISO(p.planned_start_date!).getTime();
            const end = parseISO(p.planned_end_date!).getTime();
            const left = pct(start);
            const width = Math.max(pct(end) - left, 1.5);
            const days = differenceInCalendarDays(new Date(end), new Date(start)) + 1;
            const statusColor =
              p.status === 'completed' ? 'bg-emerald-500' :
              p.status === 'in_progress' ? 'bg-amber-500' :
              p.status === 'blocked' ? 'bg-red-500' :
              'bg-primary/60';
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium truncate">{p.name}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">{days}d</span>
                </div>
                <div className="relative h-6 bg-muted rounded">
                  <div
                    className={cn('absolute top-0 h-full rounded text-[10px] text-white px-2 flex items-center', statusColor)}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${format(new Date(start), 'dd/MM')} → ${format(new Date(end), 'dd/MM')}`}
                  >
                    {width > 12 && (
                      <span className="truncate">
                        {format(new Date(start), 'dd/MM')}–{format(new Date(end), 'dd/MM')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone lane */}
        {milestones.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <MilestoneIcon className="h-3 w-3" /> Marcos
            </p>
            <div className="relative h-10">
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed" />
              {milestones.map((m) => {
                if (!m.target_date) return null;
                const ts = parseISO(m.target_date).getTime();
                const left = pct(ts);
                const done = m.status === 'completed';
                return (
                  <div
                    key={m.id}
                    className="absolute -translate-x-1/2 top-0 flex flex-col items-center"
                    style={{ left: `${left}%` }}
                  >
                    <Badge variant={done ? 'default' : 'outline'} className="text-[10px] gap-1">
                      <MilestoneIcon className="h-2.5 w-2.5" />
                      {format(ts, 'dd/MM')}
                    </Badge>
                    <span className="text-[10px] mt-0.5 max-w-[100px] truncate" title={m.name}>{m.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Project window indicator */}
        {(project.planned_start_date || project.planned_end_date) && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
            <Calendar className="h-3 w-3" />
            Janela do projeto:{' '}
            {project.planned_start_date ? format(parseISO(project.planned_start_date), 'dd/MM/yyyy') : '—'}
            {' → '}
            {project.planned_end_date ? format(parseISO(project.planned_end_date), 'dd/MM/yyyy') : '—'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}