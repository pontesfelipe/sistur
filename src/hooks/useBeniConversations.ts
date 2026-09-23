import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type BeniFolder = { id: string; name: string; instructions: string | null };
export type BeniConversation = {
  id: string; title: string; folder_id: string | null; updated_at: string;
  share_enabled: boolean; share_token: string | null;
};

export function useBeniConversations() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['beni-conversations', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const [f, c] = await Promise.all([
        supabase.from('beni_folders').select('id, name, instructions').order('name'),
        supabase.from('beni_conversations')
          .select('id, title, folder_id, updated_at, share_enabled, share_token')
          .order('updated_at', { ascending: false }),
      ]);
      if (f.error) throw f.error;
      if (c.error) throw c.error;
      return { folders: (f.data ?? []) as BeniFolder[], conversations: (c.data ?? []) as BeniConversation[] };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const createFolder = async (name: string, instructions?: string) => {
    const { data, error } = await supabase.from('beni_folders')
      .insert({ user_id: user!.id, name, instructions: instructions || null }).select('id').single();
    if (error) throw error;
    refresh();
    return data.id as string;
  };
  const updateFolder = async (id: string, patch: Partial<Pick<BeniFolder, 'name' | 'instructions'>>) => {
    const { error } = await supabase.from('beni_folders').update(patch).eq('id', id);
    if (error) throw error;
    refresh();
  };
  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from('beni_folders').delete().eq('id', id);
    if (error) throw error;
    refresh();
  };
  const updateConversation = async (id: string, patch: Partial<Pick<BeniConversation, 'title' | 'folder_id' | 'share_enabled' | 'share_token'>>) => {
    const { error } = await supabase.from('beni_conversations').update(patch).eq('id', id);
    if (error) throw error;
    refresh();
  };
  const deleteConversation = async (id: string) => {
    const { error } = await supabase.from('beni_conversations').delete().eq('id', id);
    if (error) throw error;
    refresh();
  };

  return {
    folders: query.data?.folders ?? [],
    conversations: query.data?.conversations ?? [],
    isLoading: query.isLoading,
    refresh, createFolder, updateFolder, deleteFolder, updateConversation, deleteConversation,
  };
}
