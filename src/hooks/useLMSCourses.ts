/**
 * SISTUR EDU LMS - Course Management Hooks
 * Handles LMS courses, modules, lessons with full CRUD
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface LMSCourse {
  course_id: string;
  title: string;
  description: string | null;
  primary_pillar: 'RA' | 'OE' | 'AO';
  level: number;
  version: number;
  status: 'draft' | 'published' | 'archived';
  workload_minutes: number | null;
  prerequisite_text: string | null;
  learning_objectives: string[] | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LMSModule {
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface LMSLesson {
  lesson_id: string;
  module_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lesson_type: 'video' | 'text' | 'interactive' | 'quiz';
  estimated_minutes: number | null;
  video_url: string | null;
  content_text: string | null;
  slides_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LMSEnrollment {
  enrollment_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  started_at: string;
  completed_at: string | null;
  last_accessed_at: string | null;
  progress_pct: number;
  created_at: string;
}

export interface LessonProgress {
  user_id: string;
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_pct: number;
  time_spent_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
}

// ============================================
// LMS COURSES
// ============================================

export function useLMSCourses(status?: 'draft' | 'published' | 'archived') {
  return useQuery({
    queryKey: ['lms-courses', status],
    queryFn: async () => {
      let query = supabase
        .from('lms_courses')
        .select('*')
        .order('title', { ascending: true });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LMSCourse[];
    },
  });
}

export function useLMSCourse(courseId?: string) {
  return useQuery({
    queryKey: ['lms-course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      if (error) throw error;
      return data as LMSCourse;
    },
    enabled: !!courseId,
  });
}

export function useLMSCourseWithModules(courseId?: string) {
  return useQuery({
    queryKey: ['lms-course-modules', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data: course, error: courseError } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      if (courseError) throw courseError;
      
      const { data: modules, error: modulesError } = await supabase
        .from('lms_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      
      if (modulesError) throw modulesError;
      
      // Fetch lessons for each module
      const modulesWithLessons = await Promise.all(
        (modules || []).map(async (module) => {
          const { data: lessons } = await supabase
            .from('lms_lessons')
            .select('*')
            .eq('module_id', module.module_id)
            .order('order_index', { ascending: true });
          
          return { ...module, lessons: lessons || [] };
        })
      );
      
      return {
        ...course,
        modules: modulesWithLessons,
      };
    },
    enabled: !!courseId,
  });
}

// ============================================
// COURSE MUTATIONS
// ============================================

export function useLMSCourseMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createCourse = useMutation({
    mutationFn: async (course: Omit<LMSCourse, 'course_id' | 'version' | 'created_at' | 'updated_at' | 'published_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('lms_courses')
        .insert({ ...course, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      toast.success('Curso criado com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao criar curso: ${error.message}`);
    },
  });

  const updateCourse = useMutation({
    mutationFn: async ({ courseId, ...updates }: Partial<LMSCourse> & { courseId: string }) => {
      const { data, error } = await supabase
        .from('lms_courses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      queryClient.invalidateQueries({ queryKey: ['lms-course', variables.courseId] });
      toast.success('Curso atualizado');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const publishCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from('lms_courses')
        .update({ 
          status: 'published', 
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('course_id', courseId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      queryClient.invalidateQueries({ queryKey: ['lms-course', courseId] });
      toast.success('Curso publicado!');
    },
    onError: (error) => {
      toast.error(`Erro ao publicar: ${error.message}`);
    },
  });

  const archiveCourse = useMutation({
    mutationFn: async (courseId: string) => {
      const { data, error } = await supabase
        .from('lms_courses')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('course_id', courseId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['lms-courses'] });
      queryClient.invalidateQueries({ queryKey: ['lms-course', courseId] });
      toast.success('Curso arquivado');
    },
    onError: (error) => {
      toast.error(`Erro ao arquivar: ${error.message}`);
    },
  });

  return { createCourse, updateCourse, publishCourse, archiveCourse };
}

// ============================================
// MODULES
// ============================================

export function useLMSModuleMutations() {
  const queryClient = useQueryClient();

  const createModule = useMutation({
    mutationFn: async (module: Omit<LMSModule, 'module_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lms_modules')
        .insert(module)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules', variables.course_id] });
      toast.success('Módulo criado');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateModule = useMutation({
    mutationFn: async ({ moduleId, ...updates }: Partial<LMSModule> & { moduleId: string; course_id?: string }) => {
      const { data, error } = await supabase
        .from('lms_modules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('module_id', moduleId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules'] });
      toast.success('Módulo atualizado');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteModule = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from('lms_modules')
        .delete()
        .eq('module_id', moduleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules'] });
      toast.success('Módulo excluído');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { createModule, updateModule, deleteModule };
}

// ============================================
// LESSONS
// ============================================

export function useLMSLessonMutations() {
  const queryClient = useQueryClient();

  const createLesson = useMutation({
    mutationFn: async (lesson: Omit<LMSLesson, 'lesson_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('lms_lessons')
        .insert(lesson)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules'] });
      toast.success('Aula criada');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const updateLesson = useMutation({
    mutationFn: async ({ lessonId, ...updates }: Partial<LMSLesson> & { lessonId: string }) => {
      const { data, error } = await supabase
        .from('lms_lessons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('lesson_id', lessonId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules'] });
      toast.success('Aula atualizada');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from('lms_lessons')
        .delete()
        .eq('lesson_id', lessonId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-course-modules'] });
      toast.success('Aula excluída');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { createLesson, updateLesson, deleteLesson };
}

// ============================================
// ENROLLMENTS
// ============================================

export function useUserLMSEnrollments() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['lms-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('lms_enrollments')
        .select('*, lms_courses(*)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useLMSEnrollmentMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const enrollInCourse = useMutation({
    mutationFn: async ({ courseId, courseVersion }: { courseId: string; courseVersion: number }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('lms_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          course_version: courseVersion,
          status: 'active',
          progress_pct: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-enrollments'] });
      toast.success('Matrícula realizada!');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.info('Você já está matriculado neste curso');
      } else {
        toast.error(`Erro: ${error.message}`);
      }
    },
  });

  const updateEnrollmentProgress = useMutation({
    mutationFn: async ({ enrollmentId, progressPct }: { enrollmentId: string; progressPct: number }) => {
      const updates: Partial<LMSEnrollment> = {
        progress_pct: progressPct,
        last_accessed_at: new Date().toISOString(),
      };
      
      if (progressPct >= 100) {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('lms_enrollments')
        .update(updates)
        .eq('enrollment_id', enrollmentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms-enrollments'] });
    },
  });

  return { enrollInCourse, updateEnrollmentProgress };
}

// ============================================
// LESSON PROGRESS
// ============================================

export function useLessonProgressMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateLessonProgress = useMutation({
    mutationFn: async ({ 
      lessonId, 
      status, 
      progressPct, 
      timeSpent 
    }: { 
      lessonId: string; 
      status?: 'not_started' | 'in_progress' | 'completed';
      progressPct?: number;
      timeSpent?: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { last_accessed_at: now };
      
      if (status) updates.status = status;
      if (progressPct !== undefined) updates.progress_pct = progressPct;
      if (timeSpent !== undefined) updates.time_spent_minutes = timeSpent;
      if (status === 'in_progress' && !updates.started_at) updates.started_at = now;
      if (status === 'completed') updates.completed_at = now;
      
      const { data, error } = await supabase
        .from('lms_lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          ...updates,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
    },
  });

  return { updateLessonProgress };
}
