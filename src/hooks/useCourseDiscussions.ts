import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourseDiscussion {
  id: string;
  training_id: string;
  author_id: string;
  title: string;
  body: string;
  status: 'open' | 'resolved' | 'closed';
  reply_count: number;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  body: string;
  is_accepted: boolean;
  is_instructor_reply: boolean;
  created_at: string;
  author_name?: string;
}

export function useCourseDiscussions(trainingId?: string) {
  return useQuery({
    queryKey: ['course-discussions', trainingId],
    enabled: !!trainingId,
    queryFn: async (): Promise<CourseDiscussion[]> => {
      const { data, error } = await supabase
        .from('course_discussions')
        .select('*')
        .eq('training_id', trainingId!)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as CourseDiscussion[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
        rows.forEach((r) => { r.author_name = map.get(r.author_id) ?? 'Usuário'; });
      }
      return rows;
    },
  });
}

export function useDiscussionReplies(discussionId?: string) {
  return useQuery({
    queryKey: ['discussion-replies', discussionId],
    enabled: !!discussionId,
    queryFn: async (): Promise<DiscussionReply[]> => {
      const { data, error } = await supabase
        .from('course_discussion_replies')
        .select('*')
        .eq('discussion_id', discussionId!)
        .order('is_accepted', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as DiscussionReply[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
        rows.forEach((r) => { r.author_name = map.get(r.author_id) ?? 'Usuário'; });
      }
      return rows;
    },
  });
}

export function useCreateDiscussion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { training_id: string; title: string; body: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('course_discussions').insert({
        training_id: input.training_id,
        title: input.title,
        body: input.body,
        author_id: u.user.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['course-discussions', vars.training_id] });
      toast.success('Pergunta publicada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao publicar'),
  });
}

export function useCreateReply(trainingId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { discussion_id: string; body: string; is_instructor_reply?: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('course_discussion_replies').insert({
        discussion_id: input.discussion_id,
        body: input.body,
        author_id: u.user.id,
        is_instructor_reply: input.is_instructor_reply ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['discussion-replies', vars.discussion_id] });
      if (trainingId) qc.invalidateQueries({ queryKey: ['course-discussions', trainingId] });
      toast.success('Resposta enviada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao responder'),
  });
}

export function useAcceptReply(discussionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (replyId: string) => {
      // Unset others
      await supabase
        .from('course_discussion_replies')
        .update({ is_accepted: false })
        .eq('discussion_id', discussionId);
      const { error } = await supabase
        .from('course_discussion_replies')
        .update({ is_accepted: true })
        .eq('id', replyId);
      if (error) throw error;
      await supabase
        .from('course_discussions')
        .update({ status: 'resolved' })
        .eq('id', discussionId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discussion-replies', discussionId] });
      qc.invalidateQueries({ queryKey: ['course-discussions'] });
      toast.success('Resposta marcada como aceita');
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro'),
  });
}