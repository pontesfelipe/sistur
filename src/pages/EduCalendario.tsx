import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Video, FileText, Target, Clock, Download } from 'lucide-react';
import { useEduTrainings } from '@/hooks/useEduTrainings';
import { useMyClassroomAssignments } from '@/hooks/useStudentAssignments';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildICS, downloadICS, ICSEvent } from '@/lib/icsExport';
import { Link } from 'react-router-dom';

type EvtType = 'live' | 'assignment_due' | 'exam';
interface CalEvt {
  id: string;
  title: string;
  date: Date;
  type: EvtType;
  href?: string;
  description?: string;
}

export default function EduCalendario() {
  const { data: trainings } = useEduTrainings();
  const { data: assignments } = useMyClassroomAssignments();

  const events = useMemo<CalEvt[]>(() => {
    const out: CalEvt[] = [];
    const now = new Date();
    const cutoff = addDays(now, 90);

    trainings?.forEach((t: any) => {
      if (t.type === 'live' && t.scheduled_at) {
        const d = new Date(t.scheduled_at);
        if (isAfter(d, now) && isBefore(d, cutoff)) {
          out.push({
            id: `live-${t.training_id}`,
            title: t.title,
            date: d,
            type: 'live',
            href: `/edu/training/${t.training_id}`,
            description: 'Aula ao vivo',
          });
        }
      }
    });

    assignments?.forEach((a) => {
      if (a.due_date) {
        const d = new Date(a.due_date);
        if (isAfter(d, now) && isBefore(d, cutoff)) {
          out.push({
            id: `asg-${a.id}`,
            title: `${a.title} (${a.classroom_name})`,
            date: d,
            type: a.assignment_type === 'exam' ? 'exam' : 'assignment_due',
            description: a.description ?? undefined,
          });
        }
      }
    });

    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trainings, assignments]);

  const grouped = useMemo(() => {
    const g: Record<string, CalEvt[]> = {};
    events.forEach((e) => {
      const k = format(e.date, 'yyyy-MM-dd');
      (g[k] ||= []).push(e);
    });
    return g;
  }, [events]);

  const handleExport = () => {
    const ics = buildICS(
      events.map<ICSEvent>((e) => ({
        uid: e.id,
        title: e.title,
        description: e.description,
        start: e.date,
        url: e.href ? `${window.location.origin}${e.href}` : undefined,
      })),
      'SISTUR EDU — Calendário Acadêmico',
    );
    downloadICS('sistur-edu-calendario', ics);
  };

  const icon = (t: EvtType) =>
    t === 'live' ? (
      <Video className="h-4 w-4 text-red-500" />
    ) : t === 'exam' ? (
      <Target className="h-4 w-4 text-amber-500" />
    ) : (
      <FileText className="h-4 w-4 text-blue-500" />
    );

  const badge = (t: EvtType) =>
    t === 'live' ? (
      <Badge variant="destructive">Live</Badge>
    ) : t === 'exam' ? (
      <Badge variant="secondary">Exame</Badge>
    ) : (
      <Badge variant="default">Prazo</Badge>
    );

  return (
    <AppLayout
      title="Calendário Acadêmico"
      subtitle="Lives, prazos e exames dos próximos 90 dias"
      actions={
        <Button onClick={handleExport} disabled={events.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar .ics
        </Button>
      }
    >
      <div className="container mx-auto p-4 md:p-6 space-y-4">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum evento agendado nos próximos 90 dias.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {Object.entries(grouped).map(([day, items]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      {format(new Date(day), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <div className="space-y-2">
                      {items.map((e) => {
                        const Inner = (
                          <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            {icon(e.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium line-clamp-1">{e.title}</p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(e.date, 'HH:mm')}
                              </div>
                            </div>
                            {badge(e.type)}
                          </div>
                        );
                        return e.href ? (
                          <Link key={e.id} to={e.href}>
                            {Inner}
                          </Link>
                        ) : (
                          <div key={e.id}>{Inner}</div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}