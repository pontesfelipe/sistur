import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type InvestmentType =
  | 'ENVIRONMENTAL_RESTORATION'
  | 'GOVERNANCE_CAPACITY'
  | 'INFRASTRUCTURE_DEVELOPMENT'
  | 'TRAINING_CAPACITY'
  | 'RESEARCH_DEVELOPMENT';

export type InvestmentStatus = 'DRAFT' | 'PUBLISHED' | 'FUNDED' | 'COMPLETED';

export interface InvestmentOpportunity {
  id: string;
  destination_id: string;
  assessment_id: string;
  org_id: string;
  title: string;
  description: string;
  investment_type: InvestmentType;
  required_capital: number;
  expected_roi: number | null;
  impact_focus: string[];
  igma_approved: boolean;
  blocked_by_igma: boolean;
  blocking_reason: string | null;
  projected_ra_improvement: number | null;
  projected_ao_improvement: number | null;
  projected_oe_improvement: number | null;
  data_package_url: string | null;
  risk_assessment: Record<string, unknown>;
  status: InvestmentStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  funded_at: string | null;
  completed_at: string | null;
}

export interface InvestmentOpportunityInput {
  destination_id: string;
  assessment_id: string;
  title: string;
  description: string;
  investment_type: InvestmentType;
  required_capital: number;
  expected_roi?: number;
  impact_focus?: string[];
  projected_ra_improvement?: number;
  projected_ao_improvement?: number;
  projected_oe_improvement?: number;
}

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  ENVIRONMENTAL_RESTORATION: 'Restauração Ambiental',
  GOVERNANCE_CAPACITY: 'Capacitação em Governança',
  INFRASTRUCTURE_DEVELOPMENT: 'Desenvolvimento de Infraestrutura',
  TRAINING_CAPACITY: 'Capacitação e Treinamento',
  RESEARCH_DEVELOPMENT: 'Pesquisa e Desenvolvimento',
};

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  FUNDED: 'Financiado',
  COMPLETED: 'Concluído',
};

async function getUserOrgId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', userId)
    .single();
  return data?.org_id ?? null;
}

export function useInvestmentOpportunities(destinationId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['investment-opportunities', destinationId],
    queryFn: async () => {
      let query = supabase
        .from('investment_opportunities')
        .select(`
          *,
          destinations(id, name, uf),
          assessments(id, title, calculated_at)
        `)
        .order('created_at', { ascending: false });

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (InvestmentOpportunity & {
        destinations: { id: string; name: string; uf: string } | null;
        assessments: { id: string; title: string; calculated_at: string } | null;
      })[];
    },
  });

  const createOpportunity = useMutation({
    mutationFn: async (input: InvestmentOpportunityInput) => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const orgId = await getUserOrgId(user.id);
      if (!orgId) {
        throw new Error('Perfil não encontrado');
      }

      const { data, error } = await supabase
        .from('investment_opportunities')
        .insert({
          destination_id: input.destination_id,
          assessment_id: input.assessment_id,
          org_id: orgId,
          title: input.title,
          description: input.description,
          investment_type: input.investment_type,
          required_capital: input.required_capital,
          expected_roi: input.expected_roi || null,
          impact_focus: input.impact_focus || [],
          projected_ra_improvement: input.projected_ra_improvement || null,
          projected_ao_improvement: input.projected_ao_improvement || null,
          projected_oe_improvement: input.projected_oe_improvement || null,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger IGMA calculation
      const { data: igmaResult } = await supabase.functions.invoke('calculate-investment-igma', {
        body: { opportunity_id: data.id },
      });

      return { ...data, ...igmaResult };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investment-opportunities'] });

      if (data.igma_approved) {
        toast({
          title: 'Oportunidade Criada',
          description: 'A oportunidade passou pela validação IGMA e está pronta para publicação.',
        });
      } else {
        toast({
          title: 'IGMA Bloqueou Publicação',
          description: data.blocking_reason || 'A oportunidade foi bloqueada pelo motor IGMA.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const publishOpportunity = useMutation({
    mutationFn: async (opportunityId: string) => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .update({
          status: 'PUBLISHED',
          published_at: new Date().toISOString(),
        })
        .eq('id', opportunityId)
        .eq('igma_approved', true)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment-opportunities'] });
      toast({
        title: 'Oportunidade Publicada',
        description: 'A oportunidade está agora visível para investidores.',
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

  return {
    opportunities,
    isLoading,
    createOpportunity: createOpportunity.mutate,
    publishOpportunity: publishOpportunity.mutate,
    isCreating: createOpportunity.isPending,
    isPublishing: publishOpportunity.isPending,
    igmaApprovedCount: opportunities?.filter((o) => o.igma_approved).length ?? 0,
    publishedCount: opportunities?.filter((o) => o.status === 'PUBLISHED').length ?? 0,
  };
}

export function usePublicInvestmentOpportunities() {
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['public-investment-opportunities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_opportunities')
        .select(`
          *,
          destinations(id, name, uf),
          assessments(id, title, calculated_at)
        `)
        .eq('status', 'PUBLISHED')
        .eq('igma_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return {
    opportunities,
    isLoading,
  };
}
