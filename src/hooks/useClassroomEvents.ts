import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassroomEvent {
  id: string;
  classroom_id: string;
  classroom_name: string;
  professor_id: string;
  professor_name: string | null;
  title: string;
  description: string | null;
  event_type: 'aula' | 'prova' | 'prazo' | 'reuniao' | 'live' | 'evento';
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  link_url: string | null;
  alarm_minutes_before: number;
  color: string | null;
  is_owner: boolean;
}

export interface NewClassroomEvent {
  classroom_id: string;
  title: string;
  description?: string;
  event_type: ClassroomEvent['event_type'];
  starts_at: string;
  ends_at?: string | null;
  location?: string | null;
  link_url?: string | null;
  alarm_minutes_before?: number;
  color?: string | null;
}

export function useMyClassroomEvents(fromIso?: string, toIso?: string) {
  return useQuery({
    queryKey: ['classroom-events', fromIso, toIso],
    queryFn: async (): Promise<ClassroomEvent[]> => {
      const { data, error } = await supabase.rpc('get_my_classroom_events', {
        ...(fromIso ? { p_from: fromIso } : {}),
        ...(toIso ? { p_to: toIso } : {}),
      });
      if (error) throw error;
      return (data ?? []) as ClassroomEvent[];
    },
  });
}

export function useCreateClassroomEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewClassroomEvent) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('classroom_calendar_events')
        .insert({ ...input, professor_id: u.user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classroom-events'] });
      toast.success('Evento criado e alunos notificados');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar evento'),
  });
}

export function useDeleteClassroomEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classroom_calendar_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classroom-events'] });
      toast.success('Evento removido');
    },
  });
}

export interface MessageContact {
  user_id: string;
  full_name: string;
  role: 'professor' | 'student';
  classroom_id: string;
  classroom_name: string;
}

export function useMessageContacts() {
  return useQuery({
    queryKey: ['message-contacts'],
    queryFn: async (): Promise<MessageContact[]> => {
      const { data, error } = await supabase.rpc('list_message_contacts');
      if (error) throw error;
      return (data ?? []) as MessageContact[];
    },
  });
}