import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { EduTraining } from '@/hooks/useEduTrainings';

export interface TrainingFormData {
  training_id: string;
  title: string;
  slug?: string;
  type: 'course' | 'live';
  pillar: 'RA' | 'OE' | 'AO';
  level?: string;
  description?: string;
  objectives?: string;
  objective?: string;
  target_audience?: string;
  course_code?: string;
  duration_minutes?: number;
  language?: string;
  thumbnail_url?: string;
  status: 'draft' | 'published' | 'archived';
  video_provider?: 'supabase' | 'mux' | 'vimeo' | 'youtube';
  video_url?: string;
  video_asset?: Record<string, unknown>;
  materials?: unknown[];
  tags?: unknown[];
  modules?: unknown[];
  free_preview_seconds?: number;
  active?: boolean;
}

// ============================================
// ADMIN TRAINING MANAGEMENT
// ============================================
export function useAdminTrainings() {
  return useQuery({
    queryKey: ['admin-trainings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (EduTraining & {
        slug?: string;
        description?: string;
        objectives?: string;
        duration_minutes?: number;
        language?: string;
        thumbnail_url?: string;
        status?: string;
        published_at?: string;
        created_by?: string;
        updated_at?: string;
        tags?: unknown;
        materials?: unknown;
        video_provider?: string;
        video_asset?: unknown;
        video_url?: string;
        free_preview_seconds?: number;
      })[];
    },
  });
}

async function getUserOrgId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .single();
  
  if (error) return null;
  return data?.org_id;
}

export function useAdminTrainingMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const createTraining = useMutation({
    mutationFn: async (data: TrainingFormData) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const orgId = await getUserOrgId(user.id);
      if (!orgId) throw new Error('No organization found');
      
      const slug = data.slug || data.title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 50) + '-' + Date.now().toString(36);
      
      const insertData = {
        training_id: data.training_id,
        title: data.title,
        slug,
        type: data.type,
        pillar: data.pillar,
        level: data.level || null,
        objective: data.objective || data.objectives || null,
        target_audience: data.target_audience || null,
        course_code: data.course_code || null,
        modules: data.modules || [],
        aliases: [],
        source: 'admin',
        active: data.active !== false,
        org_id: orgId,
      };
      
      const { data: training, error } = await supabase
        .from('edu_trainings')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
    },
  });
  
  const updateTraining = useMutation({
    mutationFn: async ({ trainingId, data }: { trainingId: string; data: Partial<TrainingFormData> }) => {
      const updateData: Record<string, unknown> = { ...data };
      
      if (data.status === 'published' && !updateData.published_at) {
        updateData.published_at = new Date().toISOString();
      }
      
      // Map objectives to objective field
      if (data.objectives && !data.objective) {
        updateData.objective = data.objectives;
      }
      
      const { data: training, error } = await supabase
        .from('edu_trainings')
        .update(updateData)
        .eq('training_id', trainingId)
        .select()
        .single();
      
      if (error) throw error;
      return training;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-training'] });
    },
  });
  
  const deleteTraining = useMutation({
    mutationFn: async (trainingId: string) => {
      const { error } = await supabase
        .from('edu_trainings')
        .delete()
        .eq('training_id', trainingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
    },
  });
  
  const archiveTraining = useMutation({
    mutationFn: async (trainingId: string) => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .update({ status: 'archived', active: false })
        .eq('training_id', trainingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
    },
  });
  
  const publishTraining = useMutation({
    mutationFn: async (trainingId: string) => {
      const { data, error } = await supabase
        .from('edu_trainings')
        .update({ 
          status: 'published', 
          active: true,
          published_at: new Date().toISOString(),
        })
        .eq('training_id', trainingId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
      queryClient.invalidateQueries({ queryKey: ['edu-trainings'] });
    },
  });
  
  return { 
    createTraining, 
    updateTraining, 
    deleteTraining,
    archiveTraining,
    publishTraining,
  };
}

// ============================================
// VIDEO UPLOAD
// ============================================
export function useVideoUpload() {
  const queryClient = useQueryClient();
  
  const uploadVideo = useMutation({
    mutationFn: async ({ file, trainingId }: { file: File; trainingId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${trainingId}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('edu-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('edu-videos')
        .getPublicUrl(data.path);
      
      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
    },
  });
  
  const deleteVideo = useMutation({
    mutationFn: async (filePath: string) => {
      const { error } = await supabase.storage
        .from('edu-videos')
        .remove([filePath]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainings'] });
    },
  });
  
  const getSignedUrl = async (filePath: string, expiresIn: number = 3600) => {
    const { data, error } = await supabase.storage
      .from('edu-videos')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  };
  
  return { uploadVideo, deleteVideo, getSignedUrl };
}

// ============================================
// MATERIAL UPLOAD
// ============================================
export function useMaterialUpload() {
  const uploadMaterial = useMutation({
    mutationFn: async ({ file, trainingId }: { file: File; trainingId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${trainingId}/materials/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('edu-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('edu-videos')
        .getPublicUrl(data.path);
      
      return {
        path: data.path,
        url: urlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    },
  });
  
  return { uploadMaterial };
}
