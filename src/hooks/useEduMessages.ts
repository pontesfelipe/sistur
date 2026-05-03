import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EduMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  context_training_id: string | null;
  context_classroom_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  peer_id: string;
  peer_name: string;
  last_body: string;
  last_at: string;
  unread_count: number;
}

async function fetchProfileMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const { data } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  return new Map((data ?? []).map((p: any) => [p.user_id, p.full_name ?? 'Usuário']));
}

export function useConversations() {
  return useQuery({
    queryKey: ['edu-conversations'],
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const me = u.user.id;
      const { data, error } = await supabase
        .from('edu_messages')
        .select('*')
        .or(`sender_id.eq.${me},recipient_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as EduMessage[];
      const byPeer = new Map<string, { last: EduMessage; unread: number }>();
      for (const m of rows) {
        const peer = m.sender_id === me ? m.recipient_id : m.sender_id;
        const cur = byPeer.get(peer);
        if (!cur) {
          byPeer.set(peer, {
            last: m,
            unread: m.recipient_id === me && !m.read_at ? 1 : 0,
          });
        } else {
          if (m.recipient_id === me && !m.read_at) cur.unread += 1;
        }
      }
      const peers = Array.from(byPeer.keys());
      const names = await fetchProfileMap(peers);
      return peers.map((peer) => {
        const c = byPeer.get(peer)!;
        return {
          peer_id: peer,
          peer_name: names.get(peer) ?? 'Usuário',
          last_body: c.last.body,
          last_at: c.last.created_at,
          unread_count: c.unread,
        };
      }).sort((a, b) => b.last_at.localeCompare(a.last_at));
    },
  });
}

export function useConversationMessages(peerId: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['edu-messages', peerId],
    enabled: !!peerId,
    queryFn: async (): Promise<EduMessage[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !peerId) return [];
      const me = u.user.id;
      const { data, error } = await supabase
        .from('edu_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${me},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${me})`,
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EduMessage[];
    },
  });

  // Mark as read on view
  useEffect(() => {
    if (!peerId) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase
        .from('edu_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', peerId)
        .eq('recipient_id', u.user.id)
        .is('read_at', null);
      qc.invalidateQueries({ queryKey: ['edu-conversations'] });
    })();
  }, [peerId, qc]);

  return query;
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      recipient_id: string;
      body: string;
      context_training_id?: string;
      context_classroom_id?: string;
    }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error('Não autenticado');
      const { error } = await supabase.from('edu_messages').insert({
        sender_id: u.user.id,
        recipient_id: input.recipient_id,
        body: input.body,
        context_training_id: input.context_training_id ?? null,
        context_classroom_id: input.context_classroom_id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['edu-messages', vars.recipient_id] });
      qc.invalidateQueries({ queryKey: ['edu-conversations'] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao enviar'),
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: ['edu-messages-unread-count'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return 0;
      const { count, error } = await supabase
        .from('edu_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', u.user.id)
        .is('read_at', null);
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}