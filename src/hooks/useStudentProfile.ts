import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface StudentProfile {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  occupation_area: string | null;
  experience_level: string | null;
  job_role: string | null;
  interest_pillars: string[];
  interest_themes: string[];
  preferred_format: string | null;
  available_hours_per_week: number | null;
  learning_goals: string[];
  territory_context: string | null;
  destination_id: string | null;
  is_complete: boolean;
  completed_at: string | null;
}

export interface StudentProfileInput {
  occupation_area?: string;
  experience_level?: string;
  job_role?: string;
  interest_pillars?: string[];
  interest_themes?: string[];
  preferred_format?: string;
  available_hours_per_week?: number;
  learning_goals?: string[];
  territory_context?: string;
  destination_id?: string | null;
}

export interface PersonalizedRecommendation {
  id: string;
  user_id: string;
  profile_id: string;
  created_at: string;
  recommendation_type: 'track' | 'course' | 'live';
  entity_id: string;
  relevance_score: number;
  match_reasons: Array<{ reason: string; weight: number }>;
  is_dismissed: boolean;
  is_enrolled: boolean;
  // Joined data
  training?: {
    training_id: string;
    title: string;
    description: string | null;
    pillar: string;
    type: string;
    duration_minutes: number | null;
    thumbnail_url: string | null;
  };
  track?: {
    id: string;
    name: string;
    description: string | null;
    objective: string | null;
  };
}

// Occupation area options
export const OCCUPATION_AREAS = [
  { value: 'tourism', label: 'Turismo' },
  { value: 'hospitality', label: 'Hotelaria e Hospitalidade' },
  { value: 'public_sector', label: 'Setor Público' },
  { value: 'education', label: 'Educação' },
  { value: 'environment', label: 'Meio Ambiente' },
  { value: 'culture', label: 'Cultura e Patrimônio' },
  { value: 'gastronomy', label: 'Gastronomia' },
  { value: 'events', label: 'Eventos' },
  { value: 'transport', label: 'Transporte e Logística' },
  { value: 'other', label: 'Outro' },
];

// Experience level options
export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Iniciante', description: 'Estou começando na área' },
  { value: 'intermediate', label: 'Intermediário', description: '1-3 anos de experiência' },
  { value: 'advanced', label: 'Avançado', description: 'Mais de 3 anos de experiência' },
  { value: 'expert', label: 'Especialista', description: 'Ampla experiência e liderança' },
];

// Theme options by pillar
export const THEME_OPTIONS = {
  RA: [
    { value: 'sustainability', label: 'Sustentabilidade Ambiental' },
    { value: 'conservation', label: 'Conservação e Preservação' },
    { value: 'climate', label: 'Mudanças Climáticas' },
    { value: 'biodiversity', label: 'Biodiversidade' },
    { value: 'waste', label: 'Gestão de Resíduos' },
    { value: 'water', label: 'Recursos Hídricos' },
  ],
  OE: [
    { value: 'governance', label: 'Governança Turística' },
    { value: 'policy', label: 'Políticas Públicas' },
    { value: 'planning', label: 'Planejamento Territorial' },
    { value: 'infrastructure', label: 'Infraestrutura' },
    { value: 'regulation', label: 'Regulamentação' },
    { value: 'partnerships', label: 'Parcerias Público-Privadas' },
  ],
  AO: [
    { value: 'marketing', label: 'Marketing e Promoção' },
    { value: 'quality', label: 'Qualidade de Serviços' },
    { value: 'innovation', label: 'Inovação Turística' },
    { value: 'digital', label: 'Transformação Digital' },
    { value: 'experience', label: 'Experiência do Visitante' },
    { value: 'products', label: 'Desenvolvimento de Produtos' },
  ],
};

// Learning goals options
export const LEARNING_GOALS = [
  { value: 'certification', label: 'Obter certificação profissional' },
  { value: 'career', label: 'Avançar na carreira' },
  { value: 'skills', label: 'Desenvolver novas habilidades' },
  { value: 'knowledge', label: 'Expandir conhecimentos gerais' },
  { value: 'project', label: 'Aplicar em projeto específico' },
  { value: 'network', label: 'Ampliar rede de contatos' },
];

// Preferred format options
export const FORMAT_OPTIONS = [
  { value: 'video', label: 'Vídeo-aulas', icon: '🎬' },
  { value: 'reading', label: 'Leitura', icon: '📚' },
  { value: 'interactive', label: 'Interativo', icon: '🎮' },
  { value: 'mixed', label: 'Misto', icon: '🔄' },
];

// Hook for managing student profile
export function useStudentProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('edu_student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as StudentProfile | null;
    },
    enabled: !!user?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (input: StudentProfileInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const isComplete = !!(
        input.occupation_area &&
        input.experience_level &&
        input.interest_pillars?.length
      );

      const { data, error } = await supabase
        .from('edu_student_profiles')
        .insert({
          user_id: user.id,
          ...input,
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as StudentProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      toast.success('Perfil criado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao criar perfil: ${error.message}`);
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (input: StudentProfileInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      const isComplete = !!(
        input.occupation_area &&
        input.experience_level &&
        input.interest_pillars?.length
      );

      const { data, error } = await supabase
        .from('edu_student_profiles')
        .update({
          ...input,
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as StudentProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const saveProfile = useMutation({
    mutationFn: async (input: StudentProfileInput) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Check if profile exists
      const { data: existing } = await supabase
        .from('edu_student_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return updateProfile.mutateAsync(input);
      } else {
        return createProfile.mutateAsync(input);
      }
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    hasProfile: !!profileQuery.data,
    isProfileComplete: profileQuery.data?.is_complete ?? false,
    createProfile,
    updateProfile,
    saveProfile,
  };
}

// Hook for generating personalized recommendations
export function useGenerateRecommendations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch the student profile
      const { data: profile, error: profileError } = await supabase
        .from('edu_student_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError || !profile) throw new Error('Profile not found');

      // Fetch all active trainings
      const { data: trainings, error: trainingsError } = await supabase
        .from('edu_trainings')
        .select('training_id, title, description, pillar, type, duration_minutes, thumbnail_url, tags, target_audience')
        .eq('active', true);

      if (trainingsError) throw trainingsError;

      // Fetch all active tracks
      const { data: tracks, error: tracksError } = await supabase
        .from('edu_tracks')
        .select('id, name, description, objective, audience')
        .eq('active', true);

      if (tracksError) throw tracksError;

      // Clear existing recommendations for this user
      await supabase
        .from('edu_personalized_recommendations')
        .delete()
        .eq('user_id', user.id);

      const recommendations: Array<{
        user_id: string;
        profile_id: string;
        recommendation_type: string;
        entity_id: string;
        relevance_score: number;
        match_reasons: Array<{ reason: string; weight: number }>;
      }> = [];

      // Score trainings based on profile
      trainings?.forEach((training) => {
        const reasons: Array<{ reason: string; weight: number }> = [];
        let score = 0;

        // Pillar match (highest weight)
        if (profile.interest_pillars?.includes(training.pillar)) {
          score += 40;
          reasons.push({ reason: `Pilar ${training.pillar} é do seu interesse`, weight: 40 });
        }

        // Theme match
        const trainingTags = Array.isArray(training.tags) ? training.tags : [];
        const matchedThemes = profile.interest_themes?.filter((theme: string) =>
          trainingTags.some((tag: unknown) => 
            typeof tag === 'string' && tag.toLowerCase().includes(theme.toLowerCase())
          )
        );
        if (matchedThemes?.length) {
          const themeScore = Math.min(matchedThemes.length * 15, 30);
          score += themeScore;
          reasons.push({ reason: `Tema alinhado: ${matchedThemes.join(', ')}`, weight: themeScore });
        }

        // Audience match
        if (training.target_audience && profile.occupation_area) {
          if (training.target_audience.toLowerCase().includes(profile.occupation_area)) {
            score += 15;
            reasons.push({ reason: 'Público-alvo compatível', weight: 15 });
          }
        }

        // Duration match (if user has time constraints)
        if (profile.available_hours_per_week && training.duration_minutes) {
          const weeklyMinutes = profile.available_hours_per_week * 60;
          if (training.duration_minutes <= weeklyMinutes) {
            score += 10;
            reasons.push({ reason: 'Duração compatível com sua disponibilidade', weight: 10 });
          }
        }

        // Only add if score is above threshold
        if (score >= 20) {
          recommendations.push({
            user_id: user.id,
            profile_id: profileId,
            recommendation_type: training.type === 'live' ? 'live' : 'course',
            entity_id: training.training_id,
            relevance_score: Math.min(score, 100),
            match_reasons: reasons,
          });
        }
      });

      // Score tracks
      tracks?.forEach((track) => {
        const reasons: Array<{ reason: string; weight: number }> = [];
        let score = 0;

        // Audience match
        if (track.audience && profile.occupation_area) {
          if (track.audience.toLowerCase().includes(profile.occupation_area)) {
            score += 30;
            reasons.push({ reason: 'Trilha destinada ao seu perfil', weight: 30 });
          }
        }

        // Description contains interest themes
        const matchedThemes = profile.interest_themes?.filter((theme: string) =>
          track.description?.toLowerCase().includes(theme.toLowerCase()) ||
          track.objective?.toLowerCase().includes(theme.toLowerCase())
        );
        if (matchedThemes?.length) {
          const themeScore = Math.min(matchedThemes.length * 20, 40);
          score += themeScore;
          reasons.push({ reason: `Objetivo alinhado: ${matchedThemes.join(', ')}`, weight: themeScore });
        }

        // Add general recommendation if user wants certification
        if (profile.learning_goals?.includes('certification')) {
          score += 20;
          reasons.push({ reason: 'Trilha completa para certificação', weight: 20 });
        }

        if (score >= 20) {
          recommendations.push({
            user_id: user.id,
            profile_id: profileId,
            recommendation_type: 'track',
            entity_id: track.id,
            relevance_score: Math.min(score, 100),
            match_reasons: reasons,
          });
        }
      });

      // Sort by relevance and take top recommendations
      recommendations.sort((a, b) => b.relevance_score - a.relevance_score);
      const topRecommendations = recommendations.slice(0, 20);

      // Insert recommendations
      if (topRecommendations.length > 0) {
        const { error: insertError } = await supabase
          .from('edu_personalized_recommendations')
          .insert(topRecommendations);

        if (insertError) throw insertError;
      }

      return {
        total: topRecommendations.length,
        courses: topRecommendations.filter((r) => r.recommendation_type === 'course').length,
        lives: topRecommendations.filter((r) => r.recommendation_type === 'live').length,
        tracks: topRecommendations.filter((r) => r.recommendation_type === 'track').length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['personalized-recommendations'] });
      toast.success(`${result.total} recomendações personalizadas geradas!`);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar recomendações: ${error.message}`);
    },
  });
}

// Hook for fetching personalized recommendations
export function usePersonalizedRecommendations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['personalized-recommendations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch recommendations
      const { data: recommendations, error } = await supabase
        .from('edu_personalized_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('relevance_score', { ascending: false });

      if (error) throw error;

      // Enrich with training/track data
      const enriched: PersonalizedRecommendation[] = [];

      for (const rec of recommendations || []) {
        const enrichedRec: PersonalizedRecommendation = {
          ...rec,
          recommendation_type: rec.recommendation_type as 'track' | 'course' | 'live',
          match_reasons: rec.match_reasons as Array<{ reason: string; weight: number }>,
        };

        if (rec.recommendation_type === 'track') {
          const { data: track } = await supabase
            .from('edu_tracks')
            .select('id, name, description, objective')
            .eq('id', rec.entity_id)
            .single();
          enrichedRec.track = track || undefined;
        } else {
          const { data: training } = await supabase
            .from('edu_trainings')
            .select('training_id, title, description, pillar, type, duration_minutes, thumbnail_url')
            .eq('training_id', rec.entity_id)
            .single();
          enrichedRec.training = training || undefined;
        }

        enriched.push(enrichedRec);
      }

      return enriched;
    },
    enabled: !!user?.id,
  });
}

// Hook for dismissing a recommendation
export function useDismissRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('edu_personalized_recommendations')
        .update({ is_dismissed: true })
        .eq('id', recommendationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalized-recommendations'] });
    },
  });
}
