/**
 * SISTUR EDU LMS - On-Demand Learning Engine
 * Handles personalized learning path generation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { Json } from '@/integrations/supabase/types';

// ============================================
// TYPES
// ============================================

export type GoalType = 'course' | 'track' | 'lesson_plan' | 'tcc_outline' | 'thesis_outline' | 'training_plan';
export type ContextType = 'academic' | 'institutional' | 'professional';
export type RequestStatus = 'received' | 'validated' | 'generating' | 'generated' | 'rejected' | 'failed';
export type OutputType = 'track_instance' | 'course_instance' | 'lesson_plan' | 'tcc_outline' | 'thesis_outline' | 'training_plan';

export interface OnDemandRequest {
  request_id: string;
  user_id: string;
  goal_type: GoalType;
  context_type: ContextType | null;
  desired_pillar: 'RA' | 'OE' | 'AO' | 'INTEGRATED' | null;
  desired_level: number | null;
  topic_text: string;
  additional_context: string | null;
  specific_topics: string[] | null;
  learning_goals: string[] | null;
  status: RequestStatus;
  processing_time_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnDemandOutput {
  output_id: string;
  request_id: string;
  output_type: OutputType;
  title: string;
  description: string | null;
  payload: unknown;
  file_uri: string | null;
  created_at: string;
}

export interface OnDemandOutputSource {
  output_id: string;
  content_id: string;
  source_locator: string | null;
  usage_context: string | null;
}

export interface TrackInstance {
  track_instance_id: string;
  request_id: string;
  user_id: string;
  title: string;
  description: string | null;
  pillar_scope: string;
  level: number;
  created_at: string;
}

// ============================================
// ON-DEMAND REQUESTS
// ============================================

export function useUserOnDemandRequests() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ondemand-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('ondemand_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OnDemandRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useOnDemandRequest(requestId?: string) {
  return useQuery({
    queryKey: ['ondemand-request', requestId],
    queryFn: async () => {
      if (!requestId) return null;
      
      const { data: request, error: reqError } = await supabase
        .from('ondemand_requests')
        .select('*')
        .eq('request_id', requestId)
        .single();
      
      if (reqError) throw reqError;
      
      // Get outputs
      const { data: outputs, error: outError } = await supabase
        .from('ondemand_outputs')
        .select('*')
        .eq('request_id', requestId);
      
      if (outError) throw outError;
      
      return {
        ...request,
        outputs: outputs || [],
      } as OnDemandRequest & { outputs: OnDemandOutput[] };
    },
    enabled: !!requestId,
  });
}

// ============================================
// ON-DEMAND MUTATIONS
// ============================================

export function useOnDemandMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createRequest = useMutation({
    mutationFn: async (request: {
      goal_type: GoalType;
      topic_text: string;
      context_type?: ContextType;
      desired_pillar?: 'RA' | 'OE' | 'AO' | 'INTEGRATED';
      desired_level?: number;
      additional_context?: string;
      specific_topics?: string[];
      learning_goals?: string[];
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('ondemand_requests')
        .insert({
          ...request,
          user_id: user.id,
          status: 'received',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as OnDemandRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ondemand-requests'] });
      toast.success('Solicitação criada! Gerando conteúdo...');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const processRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const startTime = Date.now();
      
      // Update status to generating
      await supabase
        .from('ondemand_requests')
        .update({ status: 'generating', updated_at: new Date().toISOString() })
        .eq('request_id', requestId);
      
      // Get request details
      const { data: request } = await supabase
        .from('ondemand_requests')
        .select('*')
        .eq('request_id', requestId)
        .single();
      
      if (!request) throw new Error('Request not found');
      
      // Get compatible content based on request
      const pillar = request.desired_pillar || 'INTEGRATED';
      const level = request.desired_level || 3;
      
      let contentQuery = supabase
        .from('content_items')
        .select('*')
        .eq('status', 'published')
        .lte('level', level);
      
      if (pillar !== 'INTEGRATED') {
        contentQuery = contentQuery.eq('primary_pillar', pillar);
      }
      
      const { data: content } = await contentQuery.limit(20);
      
      // Build output based on goal type
      let payload: Record<string, unknown> = {};
      let outputType: OutputType = 'track_instance';
      let title = '';
      let description = '';
      
      switch (request.goal_type) {
        case 'track':
          outputType = 'track_instance';
          title = `Trilha: ${request.topic_text}`;
          description = `Trilha personalizada baseada em: ${request.topic_text}`;
          payload = {
            pillar_scope: pillar,
            level,
            modules: content?.slice(0, 5).map((c, i) => ({
              order: i + 1,
              content_id: c.content_id,
              title: c.title,
              type: c.content_type,
            })) || [],
            learning_objectives: request.learning_goals || [],
          };
          break;
          
        case 'lesson_plan':
          outputType = 'lesson_plan';
          title = `Plano de Aula: ${request.topic_text}`;
          description = 'Plano de aula estruturado';
          payload = {
            target_audience: request.context_type === 'academic' ? 'Estudantes' : 'Profissionais',
            duration: '2 horas',
            objectives: request.learning_goals || ['Compreender conceitos fundamentais'],
            content: {
              introduction: 'Contextualização do tema no SISTUR',
              development: content?.slice(0, 3).map(c => c.summary).join('\n\n'),
              activities: ['Discussão em grupo', 'Estudo de caso'],
              assessment: 'Avaliação formativa',
            },
            references: content?.map(c => c.title) || [],
          };
          break;
          
        case 'tcc_outline':
        case 'thesis_outline':
          outputType = request.goal_type === 'tcc_outline' ? 'tcc_outline' : 'thesis_outline';
          title = `Estrutura: ${request.topic_text}`;
          description = `Estrutura de ${request.goal_type === 'tcc_outline' ? 'TCC' : 'Tese'}`;
          payload = {
            chapters: [
              { number: 1, title: 'Introdução', sections: ['Justificativa', 'Objetivos', 'Metodologia'] },
              { number: 2, title: 'Fundamentação Teórica: O Modelo SISTUR', sections: ['Teoria Sistêmica', `O Conjunto ${pillar}`, 'Aplicações'] },
              { number: 3, title: 'Estudo de Caso', sections: ['Caracterização', `Diagnóstico ${pillar}`, 'Análise'] },
              { number: 4, title: 'Proposta', sections: ['Diretrizes', 'Plano de Ação'] },
              { number: 5, title: 'Considerações Finais', sections: [] },
            ],
            references: content?.map(c => ({
              author: c.author,
              title: c.title,
              year: c.publication_year,
            })) || [],
          };
          break;
          
        case 'training_plan':
          outputType = 'training_plan';
          title = `Plano de Capacitação: ${request.topic_text}`;
          description = 'Plano de capacitação institucional';
          payload = {
            target_roles: ['Gestores', 'Técnicos'],
            duration_weeks: 8,
            modules: content?.slice(0, 4).map((c, i) => ({
              week: i + 1,
              topic: c.title,
              content_id: c.content_id,
              activities: ['Leitura', 'Discussão', 'Prática'],
            })) || [],
            assessment_strategy: 'Avaliação contínua com prova final',
          };
          break;
          
        default:
          outputType = 'course_instance';
          title = `Curso: ${request.topic_text}`;
          description = 'Curso personalizado';
          payload = {
            modules: content?.slice(0, 5).map((c, i) => ({
              order: i + 1,
              content_id: c.content_id,
              title: c.title,
            })) || [],
          };
      }
      
      // Create output
      const { data: output, error: outputError } = await supabase
        .from('ondemand_outputs')
        .insert([{
          request_id: requestId,
          output_type: outputType,
          title,
          description,
          payload: payload as Json,
        }])
        .select()
        .single();
      
      if (outputError) throw outputError;
      
      // Record content sources
      if (content && content.length > 0) {
        const sources = content.map(c => ({
          output_id: output.output_id,
          content_id: c.content_id,
          source_locator: '',
          usage_context: 'primary',
        }));
        
        await supabase.from('ondemand_output_sources').insert(sources);
      }
      
      // Update request as complete
      const processingTime = Math.round((Date.now() - startTime) / 1000);
      
      await supabase
        .from('ondemand_requests')
        .update({
          status: 'generated',
          processing_time_seconds: processingTime,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId);
      
      return output;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ondemand-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ondemand-request'] });
      toast.success('Conteúdo gerado com sucesso!');
    },
    onError: async (error, requestId) => {
      await supabase
        .from('ondemand_requests')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('request_id', requestId);
      
      toast.error(`Erro na geração: ${error.message}`);
    },
  });

  return { createRequest, processRequest };
}

// ============================================
// TRACK INSTANCES
// ============================================

export function useUserTrackInstances() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['track-instances', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('track_instances')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TrackInstance[];
    },
    enabled: !!user?.id,
  });
}

export function useTrackInstance(instanceId?: string) {
  return useQuery({
    queryKey: ['track-instance', instanceId],
    queryFn: async () => {
      if (!instanceId) return null;
      
      const { data: instance, error: instError } = await supabase
        .from('track_instances')
        .select('*')
        .eq('track_instance_id', instanceId)
        .single();
      
      if (instError) throw instError;
      
      const { data: items, error: itemsError } = await supabase
        .from('track_instance_items')
        .select('*')
        .eq('track_instance_id', instanceId)
        .order('order_index', { ascending: true });
      
      if (itemsError) throw itemsError;
      
      return {
        ...instance,
        items: items || [],
      };
    },
    enabled: !!instanceId,
  });
}
