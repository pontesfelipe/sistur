import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreateClassroomEvent } from '@/hooks/useClassroomEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface ClassroomLite { id: string; name: string }

function useMyOwnedClassrooms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-owned-classrooms', user?.id],
    queryFn: async (): Promise<ClassroomLite[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name')
        .eq('professor_id', user.id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

const TYPES: { value: 'aula'|'prova'|'prazo'|'reuniao'|'live'|'evento'; label: string }[] = [
  { value: 'aula', label: 'Aula' },
  { value: 'live', label: 'Live' },
  { value: 'prova', label: 'Prova' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'evento', label: 'Evento' },
];

const ALARMS = [0, 15, 30, 60, 120, 1440];

export function CreateClassroomEventDialog() {
  const [open, setOpen] = useState(false);
  const { data: classrooms = [] } = useMyOwnedClassrooms();
  const create = useCreateClassroomEvent();

  const [classroomId, setClassroomId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'aula'|'prova'|'prazo'|'reuniao'|'live'|'evento'>('aula');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [alarm, setAlarm] = useState(60);

  useEffect(() => {
    if (!classroomId && classrooms[0]) setClassroomId(classrooms[0].id);
  }, [classrooms, classroomId]);

  const reset = () => {
    setTitle(''); setDescription(''); setType('aula');
    setDate(''); setTime('19:00'); setEndDate(''); setEndTime('');
    setLocation(''); setLink(''); setAlarm(60);
  };

  const handleSubmit = () => {
    if (!classroomId || !title.trim() || !date) return;
    const starts = new Date(`${date}T${time || '00:00'}`).toISOString();
    const ends = endDate
      ? new Date(`${endDate}T${endTime || time || '00:00'}`).toISOString()
      : null;
    create.mutate(
      {
        classroom_id: classroomId,
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: type,
        starts_at: starts,
        ends_at: ends,
        location: location.trim() || null,
        link_url: link.trim() || null,
        alarm_minutes_before: alarm,
      },
      { onSuccess: () => { reset(); setOpen(false); } },
    );
  };

  if (classrooms.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="h-4 w-4 mr-2" /> Novo evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar evento da turma</DialogTitle>
          <DialogDescription>
            Os alunos matriculados serão notificados automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Turma</Label>
              <Select value={classroomId} onValueChange={setClassroomId}>
                <SelectTrigger><SelectValue placeholder="Escolha a turma" /></SelectTrigger>
                <SelectContent>
                  {classrooms.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Aula sobre IGMA" />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alarme (antes)</Label>
              <Select value={String(alarm)} onValueChange={v => setAlarm(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALARMS.map(a => (
                    <SelectItem key={a} value={String(a)}>
                      {a === 0 ? 'No horário' : a < 60 ? `${a} min` : a === 1440 ? '1 dia' : `${a/60} h`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Horário</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div>
              <Label>Fim (data)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label>Fim (hora)</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Local</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Sala 12 ou online" />
            </div>
            <div className="col-span-2">
              <Label>Link (opcional)</Label>
              <Input value={link} onChange={e => setLink(e.target.value)} placeholder="https://meet..." />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !date || create.isPending}>
            {create.isPending ? 'Criando...' : 'Criar e notificar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}