/**
 * SISEDU - Calendário de Estudos
 * Exibe aulas ao vivo, prazos de atribuições e datas de exames
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, FileText, Target, Clock } from 'lucide-react';
import { useEduTrainings } from '@/hooks/useEduTrainings';
import { useAuth } from '@/hooks/useAuth';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'live' | 'assignment_due' | 'exam';
  link?: string;
}

export function StudyCalendar() {
  const { data: trainings } = useEduTrainings();
  const { user } = useAuth();

  const upcomingEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const now = new Date();
    const cutoff = addDays(now, 30);

    // Add upcoming lives from trainings
    trainings?.forEach((t) => {
      if (t.type === 'live' && (t as any).scheduled_at) {
        const date = new Date((t as any).scheduled_at);
        if (isAfter(date, now) && isBefore(date, cutoff)) {
          events.push({
            id: `live-${t.training_id}`,
            title: t.title,
            date,
            type: 'live',
            link: `/edu/training/${t.training_id}`,
          });
        }
      }
    });

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [trainings]);

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    upcomingEvents.forEach((event) => {
      const dayKey = format(event.date, 'yyyy-MM-dd');
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(event);
    });
    return groups;
  }, [upcomingEvents]);

  const getIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'live': return <Video className="h-3.5 w-3.5 text-red-500" />;
      case 'assignment_due': return <FileText className="h-3.5 w-3.5 text-blue-500" />;
      case 'exam': return <Target className="h-3.5 w-3.5 text-amber-500" />;
    }
  };

  const getTypeBadge = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'live': return <Badge variant="destructive" className="text-[10px]">Live</Badge>;
      case 'assignment_due': return <Badge variant="default" className="text-[10px]">Prazo</Badge>;
      case 'exam': return <Badge variant="secondary" className="text-[10px]">Exame</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Calendário de Estudos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedByDay).length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum evento nos próximos 30 dias</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByDay).map(([dayKey, events]) => (
              <div key={dayKey}>
                <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  {format(new Date(dayKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <div className="space-y-1.5">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {getIcon(event.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{event.title}</p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {format(event.date, 'HH:mm')}
                        </div>
                      </div>
                      {getTypeBadge(event.type)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
