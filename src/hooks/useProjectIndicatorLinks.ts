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
  /** Rodada usada como "agora" (mais recente calculada do mesmo destino). */
  current_assessment_id: string | null;
  current_assessment_title: string | null;
  current_assessment_date: string | null;
  /** true quando a medição "agora" vem de uma rodada mais nova que a de origem. */
  is_newer_round: boolean;
  reached_target: boolean;
}

function statusOf(score: number | null | undefined): string | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  if (score >= 0.67) return "ADEQUADO";
  if (score >= 0.34) return "ATENCAO";
  return "CRITICO";
}

/**
 * Indicadores que o projeto se comprometeu a melhorar, comparados com a rodada
 * de diagnóstico CALCULADA mais recente do mesmo destino (Etapa 3). Se não houver
 * rodada mais nova, usa a rodada de origem do projeto.
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

      let current: { id: string; title: string | null; calculated_at: string | null } | null = null;
      if (assessmentId) {
        const { data: origin } = await supabase
          .from("assessments")
          .select("id, title, calculated_at, destination_id")
          .eq("id", assessmentId)
          .maybeSingle();
        current = origin ? { id: origin.id, title: origin.title, calculated_at: origin.calculated_at } : null;
        if (origin?.destination_id) {
          const { data: latest } = await supabase
            .from("assessments")
            .select("id, title, calculated_at")
            .eq("destination_id", origin.destination_id)
            .eq("status", "CALCULATED")
            .not("calculated_at", "is", null)
            .order("calculated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latest && (!origin.calculated_at || latest.calculated_at > origin.calculated_at)) current = latest;
        }
      }

      const currentByCode = new Map<string, number>();
      if (current) {
        const { data: scores } = await supabase
          .from("indicator_scores")
          .select("score, indicator:indicators(code)")
          .eq("assessment_id", current.id);
        (scores || []).forEach((s: any) => {
          const code = s.indicator?.code;
          if (code && typeof s.score === "number") currentByCode.set(code, s.score);
        });
      }
      const isNewer = !!current && current.id !== assessmentId;

      return (links as ProjectIndicatorLink[]).map((l) => {
        const score = currentByCode.get(l.indicator_code) ?? null;
        const delta =
          score !== null && l.baseline_score !== null
            ? Number((score - Number(l.baseline_score)).toFixed(4))
            : null;
        return {
          ...l,
          current_score: score,
          current_status: statusOf(score),
          delta,
          current_assessment_id: current?.id ?? null,
          current_assessment_title: current?.title ?? null,
          current_assessment_date: current?.calculated_at ?? null,
          is_newer_round: isNewer,
          reached_target: score !== null && l.target_score !== null && score >= Number(l.target_score),
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