import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type CommentEntityType = 'assessment' | 'report';

export interface DiscussionComment {
  id: string;
  org_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author_id: string;
  author_name: string;
  body: string;
  mentioned_user_ids: string[];
  edited_at: string | null;
  created_at: string;
}

export interface MentionableMember {
  user_id: string;
  full_name: string;
}

export function useDiscussionComments(entityType: CommentEntityType, entityId?: string) {
  return useQuery({
    queryKey: ['discussion-comments', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_comments' as any)
        .select('id, org_id, entity_type, entity_id, author_id, body, mentioned_user_ids, edited_at, created_at')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map(r => r.author_id))).filter(Boolean);
      let nameMap = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ids);
        nameMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name || 'Usuário']));
      }
      return rows.map(r => ({
        ...r,
        author_name: nameMap.get(r.author_id) || 'Usuário',
      })) as DiscussionComment[];
    },
  });
}

export function useMentionableMembers(orgId?: string, search: string = '') {
  return useQuery({
    queryKey: ['mentionable-members', orgId, search],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('list_mentionable_members', {
        p_org_id: orgId,
        p_search: search || null,
      });
      if (error) throw error;
      return (data ?? []) as MentionableMember[];
    },
  });
}

export function useCanComment(orgId?: string) {
  return useQuery({
    queryKey: ['can-comment', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('can_comment_on_org', { p_org_id: orgId });
      if (error) throw error;
      return !!data;
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      entity_type: CommentEntityType;
      entity_id: string;
      org_id: string;
      body: string;
      mentioned_user_ids?: string[];
    }) => {
      if (!user?.id) throw new Error('Não autenticado');
      const body = input.body.trim();
      if (!body) throw new Error('Comentário vazio');
      if (body.length > 4000) throw new Error('Comentário muito longo (máx. 4000)');
      const { data, error } = await supabase
        .from('discussion_comments' as any)
        .insert({
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          org_id: input.org_id,
          author_id: user.id,
          body,
          mentioned_user_ids: input.mentioned_user_ids ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['discussion-comments', vars.entity_type, vars.entity_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Não foi possível enviar o comentário'),
  });
}

export function useDeleteComment(entityType: CommentEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discussion_comments' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discussion-comments', entityType, entityId] });
      toast.success('Comentário removido');
    },
    onError: () => toast.error('Não foi possível remover o comentário'),
  });
}