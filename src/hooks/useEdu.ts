/**
 * SISTUR EDU Hooks - Track & Progress Management
 * 
 * This hook file manages edu_tracks and user_training_progress tables.
 * The tracks system bridges to the unified edu_trainings model via training_id.
 * 
 * CANONICAL MODEL:
 * - edu_trainings: Unified training records (courses + lives)
 * - edu_indicator_training_map: Indicator → Training mappings
 * - edu_tracks: Learning tracks/pathways
 * - edu_track_trainings: Track → Training relationships (uses training_id)
 * - user_training_progress: User completion tracking
 * 
 * For training data queries, use useEduTrainings.ts instead.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TargetAgent } from '@/types/sistur';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface EduTrack {
  id: string;
  name: string;
  description?: string;
  audience?: TargetAgent;
  objective?: string;
  delivery?: string;
  org_id?: string;
  created_at: string;
}

export interface EduTrackTraining {
  id: string;
  track_id: string;
  training_id: string;
  sort_order: number;
  created_at: string;
}

export interface EduTrackWithTrainings extends EduTrack {
  trainings: { training_id: string; sort_order: number }[];
}

export interface UserTrainingProgress {
  id: string;
  user_id: string;
  track_id: string;
  training_id: string;
  completed_at: string;
  created_at: string;
}

// ============================================
// EDU TRACKS
// ============================================

export function useEduTracks() {
  return useQuery({
    queryKey: ['edu-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_tracks')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as EduTrack[];
    },
  });
}

export function useEduTrack(id?: string) {
  return useQuery({
    queryKey: ['edu-track', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: track, error: trackError } = await supabase
        .from('edu_tracks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (trackError) throw trackError;
      return track as EduTrack;
    },
    enabled: !!id,
  });
}

export function useEduTrackWithTrainings(id?: string) {
  return useQuery({
    queryKey: ['edu-track-trainings', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data: track, error: trackError } = await supabase
        .from('edu_tracks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (trackError) throw trackError;
      
      const { data: trackTrainings, error: trainingsError } = await supabase
        .from('edu_track_trainings')
        .select('*')
        .eq('track_id', id)
        .order('sort_order', { ascending: true });
      
      if (trainingsError) throw trainingsError;
      
      return {
        ...track,
        trainings: trackTrainings || [],
      } as EduTrackWithTrainings;
    },
    enabled: !!id,
  });
}

// ============================================
// TRACK MUTATIONS
// ============================================

export function useEduTrackMutations() {
  const queryClient = useQueryClient();

  const createTrackWithTrainings = useMutation({
    mutationFn: async ({ 
      track, 
      trainingIds 
    }: { 
      track: Omit<EduTrack, 'id' | 'created_at'>; 
      trainingIds: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      // Create track
      const { data: newTrack, error: trackError } = await supabase
        .from('edu_tracks')
        .insert({ ...track, org_id: profile?.org_id })
        .select()
        .single();

      if (trackError) throw trackError;

      // Add trainings to track
      if (trainingIds.length > 0) {
        const trackTrainings = trainingIds.map((trainingId, index) => ({
          track_id: newTrack.id,
          training_id: trainingId,
          sort_order: index,
        }));

        const { error: trainingsError } = await supabase
          .from('edu_track_trainings')
          .insert(trackTrainings);

        if (trainingsError) throw trainingsError;
      }

      return newTrack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['edu-track-trainings'] });
      toast.success('Trilha criada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar trilha: ${error.message}`);
    },
  });

  const updateTrackWithTrainings = useMutation({
    mutationFn: async ({ 
      id,
      track, 
      trainingIds 
    }: { 
      id: string;
      track: Partial<Omit<EduTrack, 'id' | 'created_at'>>; 
      trainingIds: string[];
    }) => {
      // Update track
      const { error: trackError } = await supabase
        .from('edu_tracks')
        .update(track)
        .eq('id', id);

      if (trackError) throw trackError;

      // Delete existing track trainings
      const { error: deleteError } = await supabase
        .from('edu_track_trainings')
        .delete()
        .eq('track_id', id);

      if (deleteError) throw deleteError;

      // Add new trainings
      if (trainingIds.length > 0) {
        const trackTrainings = trainingIds.map((trainingId, index) => ({
          track_id: id,
          training_id: trainingId,
          sort_order: index,
        }));

        const { error: trainingsError } = await supabase
          .from('edu_track_trainings')
          .insert(trackTrainings);

        if (trainingsError) throw trainingsError;
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['edu-tracks'] });
      queryClient.invalidateQueries({ queryKey: ['edu-track-trainings', id] });
      queryClient.invalidateQueries({ queryKey: ['edu-track', id] });
      toast.success('Trilha atualizada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar trilha: ${error.message}`);
    },
  });

  const deleteTrack = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('edu_tracks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-tracks'] });
      toast.success('Trilha excluída');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return { createTrackWithTrainings, updateTrackWithTrainings, deleteTrack };
}

// ============================================
// USER TRAINING PROGRESS
// ============================================

export function useUserTrackProgress(trackId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-track-progress', trackId, user?.id],
    queryFn: async () => {
      if (!trackId || !user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_training_progress')
        .select('*')
        .eq('track_id', trackId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserTrainingProgress[];
    },
    enabled: !!trackId && !!user?.id,
  });
}

export function useAllUserProgress() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['all-user-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_training_progress')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserTrainingProgress[];
    },
    enabled: !!user?.id,
  });
}

export function useTrainingProgressMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const markComplete = useMutation({
    mutationFn: async ({ trackId, trainingId }: { trackId: string; trainingId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_training_progress')
        .insert({
          user_id: user.id,
          track_id: trackId,
          training_id: trainingId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-track-progress', variables.trackId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-progress'] });
      toast.success('Treinamento marcado como concluído!');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.info('Este treinamento já está marcado como concluído');
      } else {
        toast.error(`Erro ao marcar progresso: ${error.message}`);
      }
    },
  });

  const markIncomplete = useMutation({
    mutationFn: async ({ trackId, trainingId }: { trackId: string; trainingId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_training_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId)
        .eq('training_id', trainingId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-track-progress', variables.trackId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-progress'] });
      toast.success('Progresso removido');
    },
    onError: (error) => {
      toast.error(`Erro ao remover progresso: ${error.message}`);
    },
  });

  return { markComplete, markIncomplete };
}
