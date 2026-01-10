import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IngestionPreviewItem {
  title: string;
  videoId: string;
  pillar: 'RA' | 'AO' | 'OE';
  confidence: number;
  type: 'course' | 'live';
  exists: boolean;
}

export interface IngestionResult {
  success: boolean;
  message: string;
  channelId?: string;
  totalInFeed?: number;
  processed?: number;
  imported?: number;
  skipped?: number;
  preview?: IngestionPreviewItem[];
  error?: string;
}

export interface ImportedTraining {
  training_id: string;
  title: string;
  type: string;
  pillar: string;
  status: string;
  video_url: string;
  thumbnail_url: string;
  ingestion_source: string;
  ingestion_confidence: number;
  ingestion_metadata: {
    youtube_id: string;
    channel_handle: string;
    published_at: string;
    matched_keywords: string[];
    imported_at: string;
  };
  created_at: string;
}

// Hook to fetch imported trainings pending review
export function useImportedTrainings() {
  return useQuery({
    queryKey: ['imported-trainings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('*')
        .not('ingestion_source', 'is', null)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data as unknown as ImportedTraining[];
    },
  });
}

// Hook for YouTube ingestion operations
export function useYoutubeIngestion() {
  const queryClient = useQueryClient();
  const [isIngesting, setIsIngesting] = useState(false);
  
  const ingestMutation = useMutation({
    mutationFn: async ({ 
      channelHandle = '@ProfessorMarioBeni',
      channelId,
      action = 'ingest',
      limit = 50,
    }: {
      channelHandle?: string;
      channelId?: string;
      action?: 'ingest' | 'preview';
      limit?: number;
    }) => {
      setIsIngesting(true);
      
      const { data, error } = await supabase.functions.invoke('ingest-youtube', {
        body: { channelHandle, channelId, action, limit },
      });
      
      if (error) throw error;
      return data as IngestionResult;
    },
    onSuccess: (data) => {
      if (data.imported && data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
        queryClient.invalidateQueries({ queryKey: ['imported-trainings'] });
      }
    },
    onSettled: () => {
      setIsIngesting(false);
    },
  });
  
  const previewIngestion = async (channelHandle?: string, channelId?: string, limit = 50) => {
    return ingestMutation.mutateAsync({ 
      channelHandle, 
      channelId, 
      action: 'preview', 
      limit 
    });
  };
  
  const runIngestion = async (channelHandle?: string, channelId?: string, limit = 50) => {
    return ingestMutation.mutateAsync({ 
      channelHandle, 
      channelId, 
      action: 'ingest', 
      limit 
    });
  };
  
  return {
    previewIngestion,
    runIngestion,
    isIngesting,
    isPending: ingestMutation.isPending,
    error: ingestMutation.error,
    lastResult: ingestMutation.data,
  };
}

// Hook for batch operations on imported trainings
export function useImportedTrainingActions() {
  const queryClient = useQueryClient();
  
  const batchPublish = useMutation({
    mutationFn: async (trainingIds: string[]) => {
      const { error } = await supabase
        .from('edu_trainings')
        .update({ 
          status: 'published',
          active: true,
          published_at: new Date().toISOString(),
        })
        .in('training_id', trainingIds);
      
      if (error) throw error;
      return trainingIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['imported-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
    },
  });
  
  const batchUpdatePillar = useMutation({
    mutationFn: async ({ trainingIds, pillar }: { trainingIds: string[]; pillar: 'RA' | 'AO' | 'OE' }) => {
      const { error } = await supabase
        .from('edu_trainings')
        .update({ pillar })
        .in('training_id', trainingIds);
      
      if (error) throw error;
      return trainingIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['imported-trainings'] });
    },
  });
  
  const batchDelete = useMutation({
    mutationFn: async (trainingIds: string[]) => {
      const { error } = await supabase
        .from('edu_trainings')
        .delete()
        .in('training_id', trainingIds);
      
      if (error) throw error;
      return trainingIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['imported-trainings'] });
    },
  });
  
  const assignToTrack = useMutation({
    mutationFn: async ({ trainingIds, trackId }: { trainingIds: string[]; trackId: string }) => {
      // Get current max sort_order for track
      const { data: existing } = await supabase
        .from('edu_track_trainings')
        .select('sort_order')
        .eq('track_id', trackId)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      let sortOrder = (existing?.[0]?.sort_order || 0) + 1;
      
      // Insert track assignments
      const assignments = trainingIds.map(training_id => ({
        track_id: trackId,
        training_id,
        sort_order: sortOrder++,
        required: true,
      }));
      
      const { error } = await supabase
        .from('edu_track_trainings')
        .upsert(assignments, { 
          onConflict: 'track_id,training_id',
          ignoreDuplicates: true 
        });
      
      if (error) throw error;
      return trainingIds.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-tracks'] });
    },
  });
  
  return {
    batchPublish,
    batchUpdatePillar,
    batchDelete,
    assignToTrack,
  };
}

// Helper to get confidence badge color
export function getConfidenceBadgeVariant(confidence: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (confidence >= 0.7) return 'default';
  if (confidence >= 0.5) return 'secondary';
  if (confidence >= 0.3) return 'outline';
  return 'destructive';
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'Alta';
  if (confidence >= 0.5) return 'Média';
  if (confidence >= 0.3) return 'Baixa';
  return 'Muito Baixa';
}