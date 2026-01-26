import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pillar, Severity, TerritorialInterpretation, TargetAgent } from '@/types/sistur';

export interface PrescriptionData {
  id: string;
  org_id: string;
  assessment_id: string;
  issue_id?: string;
  course_id?: string;
  training_id?: string;
  indicator_id?: string;
  pillar: Pillar;
  status: Severity;
  interpretation?: TerritorialInterpretation;
  justification: string;
  target_agent: TargetAgent;
  priority: number;
  cycle_number: number;
  created_at: string;
  course?: {
    id: string;
    title: string;
    level: string;
    url?: string;
    duration_minutes?: number;
  };
  training?: {
    training_id: string;
    title: string;
    level?: string;
    duration_minutes?: number;
    type?: string;
    pillar?: string;
  };
  issue?: {
    id: string;
    title: string;
    theme: string;
    severity: Severity;
  };
  indicator?: {
    id: string;
    code: string;
    name: string;
  };
}

export function usePrescriptions(assessmentId?: string) {
  return useQuery({
    queryKey: ['prescriptions', assessmentId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch prescriptions with course relation
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          course:courses(id, title, level, url, duration_minutes),
          issue:issues(id, title, theme, severity),
          indicator:indicators(id, code, name)
        `)
        .order('priority', { ascending: true });

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data: prescriptions, error } = await query;
      if (error) throw error;

      // For prescriptions with training_id, fetch from edu_trainings
      const trainingIds = (prescriptions || [])
        .filter(p => p.training_id && !p.course_id)
        .map(p => p.training_id);

      let trainingsMap: Record<string, any> = {};
      if (trainingIds.length > 0) {
        const { data: trainings } = await supabase
          .from('edu_trainings')
          .select('training_id, title, level, duration_minutes, type, pillar')
          .in('training_id', trainingIds);
        
        trainingsMap = (trainings || []).reduce((acc, t) => {
          acc[t.training_id] = t;
          return acc;
        }, {} as Record<string, any>);
      }

      // Merge training data into prescriptions
      return (prescriptions || []).map(p => ({
        ...p,
        training: p.training_id ? trainingsMap[p.training_id] : undefined,
      })) as PrescriptionData[];
    },
    enabled: !!assessmentId,
  });
}

export function usePrescriptionsByPillar(pillar?: Pillar) {
  return useQuery({
    queryKey: ['prescriptions-by-pillar', pillar],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          course:courses(id, title, level, url, duration_minutes),
          issue:issues(id, title, theme, severity),
          indicator:indicators(id, code, name)
        `)
        .order('priority', { ascending: true });

      if (pillar) {
        query = query.eq('pillar', pillar);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PrescriptionData[];
    },
  });
}
