import { useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { eduTurmasNav } from '@/components/layout/eduSubNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Video, FileText, Target, Clock, Download, MapPin, Bell, Trash2, Users as UsersIcon, Link as LinkIcon } from 'lucide-react';
import { useEduTrainings } from '@/hooks/useEduTrainings';
import { useMyClassroomAssignments } from '@/hooks/useStudentAssignments';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildICS, downloadICS, ICSEvent } from '@/lib/icsExport';
import { Link } from 'react-router-dom';
import { useMyClassroomEvents, useDeleteClassroomEvent, type ClassroomEvent } from '@/hooks/useClassroomEvents';
import { CreateClassroomEventDialog } from '@/components/edu/CreateClassroomEventDialog';

type EvtType = 'live' | 'assignment_due' | 'exam' | 'aula' | 'prova' | 'prazo' | 'reuniao' | 'evento';
interface CalEvt {
  id: string;
  title: string;
  date: Date;
  type: EvtType;
  href?: string;
  description?: string;
  location?: string | null;
  link?: string | null;
  classroom?: string;
  alarmMinutes?: number;
  isOwner?: boolean;
  rawId?: string;
}

export default function EduCalendario() {
  const { data: trainings } = useEduTrainings();
  const { data: assignments } = useMyClassroomAssignments();
  const { data: classroomEvents } = useMyClassroomEvents();
  const del = useDeleteClassroomEvent();

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

    classroomEvents?.forEach((e: ClassroomEvent) => {
      const d = new Date(e.starts_at);
      out.push({
        id: `clev-${e.id}`,
        rawId: e.id,
        title: e.title,
        date: d,
        type: e.event_type as EvtType,
        description: e.description ?? undefined,
        location: e.location,
        link: e.link_url,
        classroom: e.classroom_name,
        alarmMinutes: e.alarm_minutes_before,
        isOwner: e.is_owner,
      });
    });

    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trainings, assignments, classroomEvents]);

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
    t === 'live' || t === 'aula' ? (
      <Video className="h-4 w-4 text-red-500" />
    ) : t === 'exam' || t === 'prova' ? (
      <Target className="h-4 w-4 text-amber-500" />
    ) : t === 'reuniao' ? (
      <UsersIcon className="h-4 w-4 text-purple-500" />
    ) : t === 'evento' ? (
      <Calendar className="h-4 w-4 text-emerald-500" />
    ) : (
      <FileText className="h-4 w-4 text-blue-500" />
    );

  const badge = (t: EvtType) => {
    const map: Record<EvtType, { v: any; label: string }> = {
      live: { v: 'destructive', label: 'Live' },
      aula: { v: 'destructive', label: 'Aula' },
      exam: { v: 'secondary', label: 'Exame' },
      prova: { v: 'secondary', label: 'Prova' },
      assignment_due: { v: 'default', label: 'Prazo' },
      prazo: { v: 'default', label: 'Prazo' },
      reuniao: { v: 'outline', label: 'Reunião' },
      evento: { v: 'outline', label: 'Evento' },
    };
    const m = map[t] ?? { v: 'outline', label: 'Evento' };
    return <Badge variant={m.v}>{m.label}</Badge>;
  };

  return (
    <AppLayout subNav={eduTurmasNav}
      title="Calendário Acadêmico"
      subtitle="Lives, prazos e exames dos próximos 90 dias"
      actions={
        <div className="flex gap-2">
          <CreateClassroomEventDialog />
          <Button variant="outline" onClick={handleExport} disabled={events.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar .ics
          </Button>
        </div>
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
                          <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                            {icon(e.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium line-clamp-1">{e.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(e.date, 'HH:mm')}</span>
                                {e.classroom && <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{e.classroom}</span>}
                                {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                                {typeof e.alarmMinutes === 'number' && e.alarmMinutes > 0 && (
                                  <span className="flex items-center gap-1"><Bell className="h-3 w-3" />{e.alarmMinutes < 60 ? `${e.alarmMinutes}min` : e.alarmMinutes === 1440 ? '1 dia' : `${e.alarmMinutes/60}h`} antes</span>
                                )}
                                {e.link && (
                                  <a href={e.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={ev => ev.stopPropagation()}>
                                    <LinkIcon className="h-3 w-3" />Acessar
                                  </a>
                                )}
                              </div>
                              {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                            </div>
                            <div className="flex items-center gap-1">
                              {badge(e.type)}
                              {e.isOwner && e.rawId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(ev) => { ev.preventDefault(); if (confirm('Remover este evento?')) del.mutate(e.rawId!); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
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