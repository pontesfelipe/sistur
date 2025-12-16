import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EduCourse, EduLive, EduTrack } from './useEdu';
import type { Json } from '@/integrations/supabase/types';

export interface RecommendationReason {
  indicator_id: string;
  indicator_name: string;
  contribution_score: number;
  note?: string;
}

export interface LearningRecommendation {
  id: string;
  entity_type: 'course' | 'live' | 'track';
  entity_id: string;
  score: number;
  reasons: RecommendationReason[];
  entity?: EduCourse | EduLive | EduTrack;
}

export interface LearningRun {
  id: string;
  user_id: string;
  territory_id?: string;
  inputs: {
    indicator_ids?: string[];
    problems?: string[];
  };
  org_id: string;
  created_at: string;
  recommendations?: LearningRecommendation[];
}

interface RecommendationInput {
  indicatorIds: string[];
  territoryId?: string;
}

interface RecommendationOutput {
  courses: LearningRecommendation[];
  lives: LearningRecommendation[];
  tracks: LearningRecommendation[];
}

// Main hook for generating recommendations
export function useLearningRecommendations() {
  const queryClient = useQueryClient();
  const [isCalculating, setIsCalculating] = useState(false);

  const generateRecommendations = useMutation({
    mutationFn: async (input: RecommendationInput): Promise<RecommendationOutput> => {
      setIsCalculating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // 1. Create learning run
      const { data: run, error: runError } = await supabase
        .from('learning_runs')
        .insert({
          user_id: user.id,
          territory_id: input.territoryId || null,
          inputs: { indicator_ids: input.indicatorIds },
          org_id: profile.org_id,
        })
        .select()
        .single();

      if (runError) throw runError;

      // 2. Fetch indicator info for selected indicators
      const { data: indicators } = await supabase
        .from('indicators')
        .select('id, name, pillar')
        .in('id', input.indicatorIds);

      // 3. Fetch course mappings for selected indicators
      const { data: courseMappings } = await supabase
        .from('indicator_course_map')
        .select(`
          indicator_id,
          course_id,
          weight,
          course:edu_courses(*)
        `)
        .in('indicator_id', input.indicatorIds);

      // 4. Fetch live mappings for selected indicators
      const { data: liveMappings } = await supabase
        .from('indicator_live_map')
        .select(`
          indicator_id,
          live_id,
          weight,
          live:edu_lives(*)
        `)
        .in('indicator_id', input.indicatorIds);

      // 5. Calculate course scores
      const courseScores: Record<string, { score: number; reasons: RecommendationReason[]; course: EduCourse }> = {};
      
      (courseMappings || []).forEach((mapping: any) => {
        if (!mapping.course) return;
        
        const courseId = mapping.course_id;
        const indicator = indicators?.find(i => i.id === mapping.indicator_id);
        
        if (!courseScores[courseId]) {
          courseScores[courseId] = {
            score: 0,
            reasons: [],
            course: mapping.course,
          };
        }
        
        const baseScore = 10 * (mapping.weight || 1);
        courseScores[courseId].score += baseScore;
        courseScores[courseId].reasons.push({
          indicator_id: mapping.indicator_id,
          indicator_name: indicator?.name || 'Indicador',
          contribution_score: baseScore,
        });
      });

      // 6. Calculate live scores
      const liveScores: Record<string, { score: number; reasons: RecommendationReason[]; live: EduLive }> = {};
      
      (liveMappings || []).forEach((mapping: any) => {
        if (!mapping.live) return;
        
        const liveId = mapping.live_id;
        const indicator = indicators?.find(i => i.id === mapping.indicator_id);
        
        if (!liveScores[liveId]) {
          liveScores[liveId] = {
            score: 0,
            reasons: [],
            live: mapping.live,
          };
        }
        
        const baseScore = 10 * (mapping.weight || 1);
        liveScores[liveId].score += baseScore;
        liveScores[liveId].reasons.push({
          indicator_id: mapping.indicator_id,
          indicator_name: indicator?.name || 'Indicador',
          contribution_score: baseScore,
        });
      });

      // 7. Normalize scores and sort
      const maxCourseScore = Math.max(...Object.values(courseScores).map(c => c.score), 1);
      const maxLiveScore = Math.max(...Object.values(liveScores).map(l => l.score), 1);

      const courseRecommendations: LearningRecommendation[] = Object.entries(courseScores)
        .map(([courseId, data]) => ({
          id: '',
          entity_type: 'course' as const,
          entity_id: courseId,
          score: (data.score / maxCourseScore) * 100,
          reasons: data.reasons,
          entity: data.course,
        }))
        .sort((a, b) => b.score - a.score);

      const liveRecommendations: LearningRecommendation[] = Object.entries(liveScores)
        .map(([liveId, data]) => ({
          id: '',
          entity_type: 'live' as const,
          entity_id: liveId,
          score: (data.score / maxLiveScore) * 100,
          reasons: data.reasons,
          entity: data.live,
        }))
        .sort((a, b) => b.score - a.score);

      // 8. Calculate track suggestions based on course coverage
      const { data: allTracks } = await supabase
        .from('edu_tracks')
        .select(`
          *,
          courses:edu_track_courses(course_id)
        `);

      const trackScores: Record<string, { score: number; track: EduTrack; coverage: number }> = {};
      
      (allTracks || []).forEach((track: any) => {
        const trackCourseIds = track.courses?.map((tc: any) => tc.course_id) || [];
        const recommendedCourseIds = courseRecommendations.slice(0, 10).map(r => r.entity_id);
        
        const matchingCourses = trackCourseIds.filter((id: string) => recommendedCourseIds.includes(id));
        const coverage = trackCourseIds.length > 0 ? matchingCourses.length / trackCourseIds.length : 0;
        
        if (coverage > 0.3) { // At least 30% coverage
          trackScores[track.id] = {
            score: coverage * 100,
            track,
            coverage,
          };
        }
      });

      const trackRecommendations: LearningRecommendation[] = Object.entries(trackScores)
        .map(([trackId, data]) => ({
          id: '',
          entity_type: 'track' as const,
          entity_id: trackId,
          score: data.score,
          reasons: [{
            indicator_id: '',
            indicator_name: `${Math.round(data.coverage * 100)}% dos cursos recomendados`,
            contribution_score: data.score,
          }],
          entity: data.track,
        }))
        .sort((a, b) => b.score - a.score);

      // 9. Save recommendations to database
      const allRecommendations = [
        ...courseRecommendations.slice(0, 10),
        ...liveRecommendations.slice(0, 15),
        ...trackRecommendations.slice(0, 3),
      ];

      if (allRecommendations.length > 0) {
        const { error: insertError } = await supabase
          .from('learning_recommendations')
          .insert(
            allRecommendations.map(rec => ({
              run_id: run.id,
              entity_type: rec.entity_type,
              entity_id: rec.entity_id,
              score: rec.score,
              reasons: JSON.parse(JSON.stringify(rec.reasons)) as Json,
            }))
          );

        if (insertError) {
          console.error('Error saving recommendations:', insertError);
        }
      }

      setIsCalculating(false);

      return {
        courses: courseRecommendations,
        lives: liveRecommendations,
        tracks: trackRecommendations,
      };
    },
    onError: (error) => {
      setIsCalculating(false);
      toast.error(`Erro ao gerar recomendações: ${error.message}`);
    },
  });

  return {
    generateRecommendations,
    isCalculating,
  };
}

// Hook for fetching past learning runs
export function useLearningRuns() {
  return useQuery({
    queryKey: ['learning-runs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('learning_runs')
        .select(`
          *,
          territory:destinations(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}

// Hook for fetching a specific learning run with recommendations
export function useLearningRun(runId?: string) {
  return useQuery({
    queryKey: ['learning-run', runId],
    queryFn: async () => {
      if (!runId) return null;

      const { data: run, error: runError } = await supabase
        .from('learning_runs')
        .select(`
          *,
          territory:destinations(name)
        `)
        .eq('id', runId)
        .single();

      if (runError) throw runError;

      const { data: recommendations, error: recError } = await supabase
        .from('learning_recommendations')
        .select('*')
        .eq('run_id', runId)
        .order('score', { ascending: false });

      if (recError) throw recError;

      // Fetch entity details for each recommendation
      const enrichedRecommendations = await Promise.all(
        (recommendations || []).map(async (rec) => {
          let entity = null;
          
          if (rec.entity_type === 'course') {
            const { data } = await supabase
              .from('edu_courses')
              .select('*')
              .eq('id', rec.entity_id)
              .single();
            entity = data;
          } else if (rec.entity_type === 'live') {
            const { data } = await supabase
              .from('edu_lives')
              .select('*')
              .eq('id', rec.entity_id)
              .single();
            entity = data;
          } else if (rec.entity_type === 'track') {
            const { data } = await supabase
              .from('edu_tracks')
              .select('*')
              .eq('id', rec.entity_id)
              .single();
            entity = data;
          }

          return { 
            ...rec, 
            entity,
            reasons: (rec.reasons || []) as unknown as RecommendationReason[],
          };
        })
      );

      return {
        ...run,
        inputs: run.inputs as LearningRun['inputs'],
        recommendations: enrichedRecommendations,
      } as LearningRun;
    },
    enabled: !!runId,
  });
}
