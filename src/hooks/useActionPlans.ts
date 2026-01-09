import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ActionPlan {
  id: string;
  org_id: string;
  assessment_id: string;
  title: string;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: number;
  pillar: 'RA' | 'OE' | 'AO' | null;
  linked_issue_id: string | null;
  linked_prescription_id: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useActionPlans(assessmentId?: string) {
  return useQuery({
    queryKey: ["action-plans", assessmentId],
    queryFn: async () => {
      let query = supabase
        .from("action_plans")
        .select("*")
        .order("priority", { ascending: true });

      if (assessmentId) {
        query = query.eq("assessment_id", assessmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionPlan[];
    },
    enabled: !!assessmentId,
  });
}

export function useUpdateActionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ActionPlan, 'id' | 'org_id' | 'assessment_id' | 'created_at' | 'updated_at'>>;
    }) => {
      // If completing, set completed_at
      if (updates.status === 'COMPLETED') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("action_plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      toast({
        title: "Plano atualizado",
        description: `Status alterado para ${data.status}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateActionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (plan: {
      assessment_id: string;
      org_id: string;
      title: string;
      description?: string;
      owner?: string;
      due_date?: string;
      pillar?: 'RA' | 'OE' | 'AO';
      priority?: number;
      linked_issue_id?: string;
      linked_prescription_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("action_plans")
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      toast({
        title: "Plano criado",
        description: "Novo plano de ação criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteActionPlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("action_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-plans"] });
      toast({
        title: "Plano excluído",
        description: "Plano de ação removido",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir plano",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
