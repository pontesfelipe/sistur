import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface BudgetLine {
  id: string;
  project_id: string;
  phase_id: string | null;
  category: string;
  description: string;
  planned_amount: number;
  actual_amount: number;
  currency: string;
  funding_source: string | null;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const BUDGET_CATEGORIES = [
  "Infraestrutura",
  "Capacitação",
  "Marketing",
  "Pesquisa",
  "Sinalização",
  "Tecnologia",
  "Consultoria",
  "Operacional",
  "Outro",
];

export const BUDGET_STATUS = [
  { value: "planned", label: "Planejado" },
  { value: "approved", label: "Aprovado" },
  { value: "committed", label: "Empenhado" },
  { value: "executed", label: "Executado" },
  { value: "cancelled", label: "Cancelado" },
];

export function useProjectBudget(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-budget", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_budget_lines" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetLine[];
    },
    enabled: !!projectId,
  });
}

export function useUpsertBudgetLine() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<BudgetLine> & { project_id: string }) => {
      const payload: any = {
        ...input,
        created_by: input.created_by ?? user?.id,
      };
      if (input.id) {
        const { id, created_by, created_at, ...rest } = payload;
        const { error } = await supabase
          .from("project_budget_lines" as any)
          .update(rest)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_budget_lines" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-budget", vars.project_id] });
      toast({ title: "Linha de orçamento salva" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}

export function useDeleteBudgetLine() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_budget_lines" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["project-budget", projectId] });
      toast({ title: "Linha removida" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}
