/**
 * SISEDU - Rating/Avaliação de Treinamentos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TrainingRating {
  id: string;
  user_id: string;
  training_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export function useTrainingRatings(trainingId?: string) {
  return useQuery({
    queryKey: ['edu-training-ratings', trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      const { data, error } = await supabase
        .from('edu_training_ratings')
        .select('*')
        .eq('training_id', trainingId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TrainingRating[];
    },
    enabled: !!trainingId,
  });
}

export function useTrainingAverageRating(trainingId?: string) {
  const { data: ratings } = useTrainingRatings(trainingId);
  if (!ratings || ratings.length === 0) return { average: 0, count: 0 };
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return { average: sum / ratings.length, count: ratings.length };
}

export function useMyTrainingRating(trainingId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['edu-my-rating', trainingId, user?.id],
    queryFn: async () => {
      if (!trainingId || !user?.id) return null;
      const { data, error } = await supabase
        .from('edu_training_ratings')
        .select('*')
        .eq('training_id', trainingId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as TrainingRating | null;
    },
    enabled: !!trainingId && !!user?.id,
  });
}

export function useRatingMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const submitRating = useMutation({
    mutationFn: async ({ trainingId, rating, comment }: {
      trainingId: string;
      rating: number;
      comment?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('edu_training_ratings')
        .upsert({
          user_id: user.id,
          training_id: trainingId,
          rating,
          comment: comment || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,training_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['edu-training-ratings', vars.trainingId] });
      queryClient.invalidateQueries({ queryKey: ['edu-my-rating', vars.trainingId] });
      toast.success('Avaliação enviada!');
    },
    onError: () => {
      toast.error('Erro ao enviar avaliação');
    },
  });

  return { submitRating };
}
