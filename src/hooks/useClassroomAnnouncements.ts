import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClassroomAnnouncement {
  id: string;
  classroom_id: string;
  author_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export function useClassroomAnnouncements(classroomId: string | null) {
  return useQuery({
    queryKey: ['classroom-announcements', classroomId],
    enabled: !!classroomId,
    queryFn: async (): Promise<ClassroomAnnouncement[]> => {
      const { data, error } = await supabase
        .from('classroom_announcements')
        .select('*')
        .eq('classroom_id', classroomId!)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ClassroomAnnouncement[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ids);
        const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
        rows.forEach((r) => { r.author_name = map.get(r.author_id) ?? 'Professor'; });
      }
      return rows;
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { classroom_id: string; title: string; body: string; pinned?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('classroom_announcements').insert({
        classroom_id: input.classroom_id,
        title: input.title,
        body: input.body,
        pinned: input.pinned ?? false,
        author_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['classroom-announcements', vars.classroom_id] });
      toast.success('Anúncio publicado');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao publicar anúncio'),
  });
}

export function useTogglePinAnnouncement(classroomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('classroom_announcements')
        .update({ pinned: input.pinned })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classroom-announcements', classroomId] }),
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });
}

export function useDeleteAnnouncement(classroomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('classroom_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classroom-announcements', classroomId] });
      toast.success('Anúncio removido');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });
}