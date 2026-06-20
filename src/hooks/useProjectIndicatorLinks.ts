import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProjectIndicatorLink {
  id: string;
  project_id: string;
  indicator_id: string | null;
  indicator_code: string;
  indicator_name: string | null;
  pillar: string | null;
  baseline_score: number | null;
  baseline_status: string | null;
  baseline_captured_at: string;
  target_score: number | null;
  notes: string | null;
}

export interface ProjectIndicatorImpact extends ProjectIndicatorLink {
  current_score: number | null;
  current_status: string | null;
  delta: number | null;
}

function statusOf(score: number | null | undefined): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (score >= 0.67) return "ADEQUADO";
  if (score >= 0.34) return "ATENCAO";
  return "CRITICO";
}

/**
 * Returns the indicators a project pledged to improve, plus the current score
 * pulled from the same assessment_id, so the UI can render baseline → current
 * deltas (impact evidence trail for Frente 1).
 */
export function useProjectIndicatorImpact(projectId: string | undefined, assessmentId: string | undefined) {
  return useQuery({
    queryKey: ["project-indicator-impact", projectId, assessmentId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectIndicatorImpact[]> => {
      const { data: links, error } = await supabase
        .from("project_indicator_links")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;
      if (!links || links.length === 0) return [];

      let currentByCode = new Map<string, number>();
      if (assessmentId) {
        const { data: scores } = await supabase
          .from("indicator_scores")
          .select("score, indicator:indicators(code)")
          .eq("assessment_id", assessmentId);
        (scores || []).forEach((s: any) => {
          const code = s.indicator?.code;
          if (code && typeof s.score === "number") currentByCode.set(code, s.score);
        });
      }

      return (links as ProjectIndicatorLink[]).map((l) => {
        const current = currentByCode.get(l.indicator_code) ?? null;
        const delta =
          current !== null && l.baseline_score !== null
            ? Number((current - Number(l.baseline_score)).toFixed(4))
            : null;
        return {
          ...l,
          current_score: current,
          current_status: statusOf(current),
          delta,
        };
      });
    },
  });
}

export function useCreateIndicatorLinks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (rows: Omit<ProjectIndicatorLink, "id" | "baseline_captured_at">[]) => {
      if (!rows.length) return [];
      const { data, error } = await supabase
        .from("project_indicator_links")
        .insert(rows)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      const pid = vars[0]?.project_id;
      qc.invalidateQueries({ queryKey: ["project-indicator-impact", pid] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao vincular indicadores", description: err.message, variant: "destructive" });
    },
  });
}