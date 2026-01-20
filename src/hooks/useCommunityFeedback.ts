import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type TourismImpactPerception = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface CommunityFeedback {
  id: string;
  destination_id: string;
  assessment_id: string | null;
  org_id: string;
  community_member_id: string | null;
  quality_of_life_score: number | null;
  tourism_impact_perception: TourismImpactPerception | null;
  environmental_concern_level: number | null;
  cultural_preservation_score: number | null;
  concerns: string[];
  suggestions: string[];
  priorities: string[];
  neighborhood: string | null;
  age_group: string | null;
  occupation_sector: string | null;
  submitted_at: string;
  created_at: string;
}

export interface CommunityFeedbackInput {
  destination_id: string;
  assessment_id?: string;
  quality_of_life_score: number;
  tourism_impact_perception: TourismImpactPerception;
  environmental_concern_level: number;
  cultural_preservation_score: number;
  concerns?: string[];
  suggestions?: string[];
  priorities?: string[];
  neighborhood?: string;
  age_group?: string;
  occupation_sector?: string;
}

export interface CommunityFeedbackSummary {
  destination_id: string;
  feedback_count: number;
  avg_quality_of_life: number;
  avg_environmental_concern: number;
  avg_cultural_preservation: number;
  positive_perception_ratio: number;
  neutral_perception_ratio: number;
  negative_perception_ratio: number;
  top_concerns: string[];
  top_suggestions: string[];
}

async function getEffectiveOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('org_id, viewing_demo_org_id')
    .eq('user_id', userId)
    .single();
  // Use effective org_id (supports demo mode)
  return data?.viewing_demo_org_id ?? data?.org_id ?? null;
}

export function useCommunityFeedback(destinationId?: string, assessmentId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feedbacks, isLoading } = useQuery({
    queryKey: ['community-feedback', destinationId, assessmentId],
    queryFn: async () => {
      let query = supabase
        .from('community_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CommunityFeedback[];
    },
    enabled: !!destinationId || !!assessmentId,
  });

  const submitFeedback = useMutation({
    mutationFn: async (input: CommunityFeedbackInput) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const orgId = await getEffectiveOrgId(user.id);
      if (!orgId) {
        throw new Error('Perfil não encontrado');
      }

      const { data, error } = await supabase
        .from('community_feedback')
        .insert({
          destination_id: input.destination_id,
          assessment_id: input.assessment_id || null,
          org_id: orgId,
          quality_of_life_score: input.quality_of_life_score,
          tourism_impact_perception: input.tourism_impact_perception,
          environmental_concern_level: input.environmental_concern_level,
          cultural_preservation_score: input.cultural_preservation_score,
          concerns: input.concerns || [],
          suggestions: input.suggestions || [],
          priorities: input.priorities || [],
          neighborhood: input.neighborhood || null,
          age_group: input.age_group || null,
          occupation_sector: input.occupation_sector || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feedback'] });
      toast({
        title: 'Feedback Enviado',
        description: 'Obrigado por contribuir com a avaliação territorial!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate summary from feedbacks
  const summary: CommunityFeedbackSummary | null = feedbacks?.length
    ? {
        destination_id: destinationId || '',
        feedback_count: feedbacks.length,
        avg_quality_of_life:
          feedbacks.reduce((sum, f) => sum + (f.quality_of_life_score || 0), 0) /
          feedbacks.length /
          5,
        avg_environmental_concern:
          feedbacks.reduce((sum, f) => sum + (f.environmental_concern_level || 0), 0) /
          feedbacks.length /
          5,
        avg_cultural_preservation:
          feedbacks.reduce((sum, f) => sum + (f.cultural_preservation_score || 0), 0) /
          feedbacks.length /
          5,
        positive_perception_ratio:
          feedbacks.filter((f) => f.tourism_impact_perception === 'POSITIVE').length /
          feedbacks.length,
        neutral_perception_ratio:
          feedbacks.filter((f) => f.tourism_impact_perception === 'NEUTRAL').length /
          feedbacks.length,
        negative_perception_ratio:
          feedbacks.filter((f) => f.tourism_impact_perception === 'NEGATIVE').length /
          feedbacks.length,
        top_concerns: getTopItems(feedbacks.flatMap((f) => f.concerns || [])),
        top_suggestions: getTopItems(feedbacks.flatMap((f) => f.suggestions || [])),
      }
    : null;

  return {
    feedbacks,
    isLoading,
    submitFeedback: submitFeedback.mutate,
    isSubmitting: submitFeedback.isPending,
    summary,
  };
}

function getTopItems(items: string[], limit = 5): string[] {
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([item]) => item);
}
