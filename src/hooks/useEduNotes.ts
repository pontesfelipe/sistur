/**
 * SISEDU - Anotações Pessoais
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface EduNote {
  id: string;
  user_id: string;
  training_id: string;
  module_index: number;
  video_timestamp_seconds: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export function useTrainingNotes(trainingId?: string, moduleIndex?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['edu-notes', trainingId, moduleIndex, user?.id],
    queryFn: async () => {
      if (!trainingId || !user?.id) return [];
      let query = supabase
        .from('edu_notes')
        .select('*')
        .eq('user_id', user.id)
        .eq('training_id', trainingId);

      if (moduleIndex !== undefined) {
        query = query.eq('module_index', moduleIndex);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as EduNote[];
    },
    enabled: !!trainingId && !!user?.id,
  });
}

export function useNoteMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createNote = useMutation({
    mutationFn: async (data: {
      training_id: string;
      module_index?: number;
      video_timestamp_seconds?: number;
      content: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data: note, error } = await supabase
        .from('edu_notes')
        .insert({
          user_id: user.id,
          training_id: data.training_id,
          module_index: data.module_index ?? 0,
          video_timestamp_seconds: data.video_timestamp_seconds ?? null,
          content: data.content,
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['edu-notes', vars.training_id] });
      toast.success('Anotação salva!');
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { error } = await supabase
        .from('edu_notes')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-notes'] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('edu_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-notes'] });
      toast.success('Anotação excluída');
    },
  });

  return { createNote, updateNote, deleteNote };
}
