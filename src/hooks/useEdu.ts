import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Pillar, TargetAgent } from '@/types/sistur';

// Types
export interface EduCourse {
  id: string;
  code: string;
  pillar: Pillar;
  title: string;
  objective?: string;
  suggested_hours?: number;
  certification?: string;
  audience?: TargetAgent;
  description?: string;
  url?: string;
  org_id?: string;
  created_at: string;
}

export interface EduLive {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number;
  url?: string;
  tags: string[];
  org_id?: string;
  created_at: string;
}

export interface EduModule {
  id: string;
  course_id: string;
  module_index: number;
  title: string;
  activities: string[];
  created_at: string;
}

export interface EduModuleLive {
  id: string;
  module_id: string;
  live_id: string;
  live_type: 'primary' | 'case' | 'complementary';
  sort_order: number;
  live?: EduLive;
}

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

export interface EduTrackCourse {
  id: string;
  track_id: string;
  course_id: string;
  sort_order: number;
  course?: EduCourse;
}

export interface EduCourseWithModules extends EduCourse {
  modules: (EduModule & { lives: EduModuleLive[] })[];
}

export interface EduTrackWithCourses extends EduTrack {
  courses: EduTrackCourse[];
}

// ============================================
// EDU COURSES
// ============================================
export function useEduCourses(pillar?: Pillar) {
  return useQuery({
    queryKey: ['edu-courses', pillar],
    queryFn: async () => {
      let query = supabase
        .from('edu_courses')
        .select('*')
        .order('code', { ascending: true });
      
      if (pillar) {
        query = query.eq('pillar', pillar);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EduCourse[];
    },
  });
}

export function useEduCourse(id?: string) {
  return useQuery({
    queryKey: ['edu-course', id],
    queryFn: async () => {
      if (!id) return null;
      
      // Fetch course
      const { data: course, error: courseError } = await supabase
        .from('edu_courses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (courseError) throw courseError;
      
      // Fetch modules
      const { data: modules, error: modulesError } = await supabase
        .from('edu_modules')
        .select('*')
        .eq('course_id', id)
        .order('module_index', { ascending: true });
      
      if (modulesError) throw modulesError;
      
      // Fetch lives for each module
      const modulesWithLives = await Promise.all(
        (modules || []).map(async (module) => {
          const { data: moduleLives } = await supabase
            .from('edu_module_lives')
            .select(`
              *,
              live:edu_lives(*)
            `)
            .eq('module_id', module.id)
            .order('sort_order', { ascending: true });
          
          return {
            ...module,
            lives: moduleLives || [],
          };
        })
      );
      
      return {
        ...course,
        modules: modulesWithLives,
      } as EduCourseWithModules;
    },
    enabled: !!id,
  });
}

// ============================================
// EDU LIVES
// ============================================
export function useEduLives() {
  return useQuery({
    queryKey: ['edu-lives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('edu_lives')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as EduLive[];
    },
  });
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
      
      // Fetch track
      const { data: track, error: trackError } = await supabase
        .from('edu_tracks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (trackError) throw trackError;
      
      // Fetch track courses with course details
      const { data: trackCourses, error: coursesError } = await supabase
        .from('edu_track_courses')
        .select(`
          *,
          course:edu_courses(*)
        `)
        .eq('track_id', id)
        .order('sort_order', { ascending: true });
      
      if (coursesError) throw coursesError;
      
      return {
        ...track,
        courses: trackCourses || [],
      } as EduTrackWithCourses;
    },
    enabled: !!id,
  });
}

// ============================================
// INDICATOR MAPPINGS
// ============================================
export function useIndicatorCourseMappings() {
  return useQuery({
    queryKey: ['indicator-course-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_course_map')
        .select(`
          *,
          indicator:indicators(*),
          course:edu_courses(*)
        `);
      
      if (error) throw error;
      return data;
    },
  });
}

export function useIndicatorLiveMappings() {
  return useQuery({
    queryKey: ['indicator-live-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicator_live_map')
        .select(`
          *,
          indicator:indicators(*),
          live:edu_lives(*)
        `);
      
      if (error) throw error;
      return data;
    },
  });
}

// ============================================
// ADMIN MUTATIONS
// ============================================
export function useEduCourseMutations() {
  const queryClient = useQueryClient();

  const createCourse = useMutation({
    mutationFn: async (course: Omit<EduCourse, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('edu_courses')
        .insert({ ...course, org_id: profile?.org_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-courses'] });
      toast.success('Curso criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar curso: ${error.message}`);
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...course }: Partial<EduCourse> & { id: string }) => {
      const { data, error } = await supabase
        .from('edu_courses')
        .update(course)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-courses'] });
      queryClient.invalidateQueries({ queryKey: ['edu-course'] });
      toast.success('Curso atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('edu_courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-courses'] });
      toast.success('Curso excluído');
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return { createCourse, updateCourse, deleteCourse };
}

export function useEduTrackMutations() {
  const queryClient = useQueryClient();

  const createTrack = useMutation({
    mutationFn: async (track: Omit<EduTrack, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('edu_tracks')
        .insert({ ...track, org_id: profile?.org_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-tracks'] });
      toast.success('Trilha criada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar trilha: ${error.message}`);
    },
  });

  return { createTrack };
}

export function useEduLiveMutations() {
  const queryClient = useQueryClient();

  const createLive = useMutation({
    mutationFn: async (live: Omit<EduLive, 'id' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await supabase
        .from('edu_lives')
        .insert({ ...live, org_id: profile?.org_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-lives'] });
      toast.success('Live criada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar live: ${error.message}`);
    },
  });

  return { createLive };
}
