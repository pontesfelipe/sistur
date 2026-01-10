import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface EduEnrollment {
  id: string;
  user_id: string;
  trail_id: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'dropped';
  completed_at: string | null;
  created_at: string;
}

export interface EduProgress {
  id: string;
  user_id: string;
  training_id: string;
  trail_id: string | null;
  started_at: string;
  last_activity_at: string;
  progress_percent: number;
  completed_at: string | null;
  watch_seconds: number;
  attempts: number;
  created_at: string;
}

export interface EduEvent {
  id: string;
  user_id: string;
  trail_id: string | null;
  training_id: string | null;
  event_type: string;
  event_value: Record<string, unknown>;
  created_at: string;
}

// ============================================
// ENROLLMENTS
// ============================================
export function useUserEnrollments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['edu-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('edu_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });
      
      if (error) throw error;
      return data as EduEnrollment[];
    },
    enabled: !!user?.id,
  });
}

export function useEnrollment(trailId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['edu-enrollment', user?.id, trailId],
    queryFn: async () => {
      if (!user?.id || !trailId) return null;
      
      const { data, error } = await supabase
        .from('edu_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('trail_id', trailId)
        .maybeSingle();
      
      if (error) throw error;
      return data as EduEnrollment | null;
    },
    enabled: !!user?.id && !!trailId,
  });
}

export function useEnrollmentMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const enroll = useMutation({
    mutationFn: async (trailId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('edu_enrollments')
        .insert({
          user_id: user.id,
          trail_id: trailId,
          status: 'active',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['edu-enrollment'] });
    },
  });
  
  const updateStatus = useMutation({
    mutationFn: async ({ enrollmentId, status }: { enrollmentId: string; status: 'active' | 'completed' | 'dropped' }) => {
      const updateData: Partial<EduEnrollment> = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('edu_enrollments')
        .update(updateData)
        .eq('id', enrollmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['edu-enrollment'] });
    },
  });
  
  return { enroll, updateStatus };
}

// ============================================
// PROGRESS
// ============================================
export function useUserProgress() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['edu-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('edu_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false });
      
      if (error) throw error;
      return data as EduProgress[];
    },
    enabled: !!user?.id,
  });
}

export function useTrainingProgress(trainingId?: string, trailId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['edu-training-progress', user?.id, trainingId, trailId],
    queryFn: async () => {
      if (!user?.id || !trainingId) return null;
      
      let query = supabase
        .from('edu_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('training_id', trainingId);
      
      if (trailId) {
        query = query.eq('trail_id', trailId);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data as EduProgress | null;
    },
    enabled: !!user?.id && !!trainingId,
  });
}

export function useProgressMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const startProgress = useMutation({
    mutationFn: async ({ trainingId, trailId }: { trainingId: string; trailId?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('edu_progress')
        .upsert({
          user_id: user.id,
          training_id: trainingId,
          trail_id: trailId || null,
          started_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
          progress_percent: 0,
          watch_seconds: 0,
          attempts: 1,
        }, {
          onConflict: 'user_id,training_id,trail_id',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-progress'] });
      queryClient.invalidateQueries({ queryKey: ['edu-training-progress'] });
    },
  });
  
  const updateProgress = useMutation({
    mutationFn: async ({ 
      progressId, 
      progressPercent, 
      watchSeconds,
      completed 
    }: { 
      progressId: string; 
      progressPercent?: number; 
      watchSeconds?: number;
      completed?: boolean;
    }) => {
      const updateData: Partial<EduProgress> = {
        last_activity_at: new Date().toISOString(),
      };
      
      if (progressPercent !== undefined) {
        updateData.progress_percent = progressPercent;
      }
      if (watchSeconds !== undefined) {
        updateData.watch_seconds = watchSeconds;
      }
      if (completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.progress_percent = 100;
      }
      
      const { data, error } = await supabase
        .from('edu_progress')
        .update(updateData)
        .eq('id', progressId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-progress'] });
      queryClient.invalidateQueries({ queryKey: ['edu-training-progress'] });
    },
  });
  
  return { startProgress, updateProgress };
}

// ============================================
// EVENTS (Analytics)
// ============================================
export function useEventMutations() {
  const { user } = useAuth();
  
  const trackEvent = useMutation({
    mutationFn: async ({ 
      eventType, 
      trainingId, 
      trailId, 
      eventValue 
    }: { 
      eventType: string; 
      trainingId?: string; 
      trailId?: string; 
      eventValue?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const insertData = {
        user_id: user.id,
        event_type: eventType,
        training_id: trainingId || null,
        trail_id: trailId || null,
        event_value: eventValue || {},
      };
      
      const { data, error } = await supabase
        .from('edu_events')
        .insert(insertData as never)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });
  
  return { trackEvent };
}

// ============================================
// ADMIN ANALYTICS
// ============================================
export function useAdminEnrollmentStats() {
  return useQuery({
    queryKey: ['admin-enrollment-stats'],
    queryFn: async () => {
      const { data: enrollments, error: enrollError } = await supabase
        .from('edu_enrollments')
        .select('id, status, enrolled_at, completed_at');
      
      if (enrollError) throw enrollError;
      
      const { data: progress, error: progressError } = await supabase
        .from('edu_progress')
        .select('id, progress_percent, watch_seconds, completed_at');
      
      if (progressError) throw progressError;
      
      const stats = {
        totalEnrollments: enrollments?.length || 0,
        activeEnrollments: enrollments?.filter(e => e.status === 'active').length || 0,
        completedEnrollments: enrollments?.filter(e => e.status === 'completed').length || 0,
        droppedEnrollments: enrollments?.filter(e => e.status === 'dropped').length || 0,
        totalWatchSeconds: progress?.reduce((sum, p) => sum + (p.watch_seconds || 0), 0) || 0,
        averageProgress: progress?.length 
          ? Math.round(progress.reduce((sum, p) => sum + (p.progress_percent || 0), 0) / progress.length)
          : 0,
        completedTrainings: progress?.filter(p => p.completed_at).length || 0,
      };
      
      return stats;
    },
  });
}

export function useAdminEventStats(days: number = 30) {
  return useQuery({
    queryKey: ['admin-event-stats', days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('edu_events')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      
      const byType = (data || []).reduce((acc, event) => {
        acc[event.event_type] = (acc[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const byDay = (data || []).reduce((acc, event) => {
        const day = event.created_at.split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalEvents: data?.length || 0,
        byType,
        byDay,
      };
    },
  });
}
