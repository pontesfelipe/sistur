import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type ExternalLinkType =
  | "investment_opportunity"
  | "consortium"
  | "observatory_alert"
  | "issue";

export interface ExternalLink {
  id: string;
  project_id: string;
  link_type: ExternalLinkType;
  external_id: string;
  label: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const LINK_TYPE_LABELS: Record<ExternalLinkType, string> = {
  investment_opportunity: "Oportunidade de Investimento",
  consortium: "Consórcio",
  observatory_alert: "Alerta do Observatório",
  issue: "Issue / Ocorrência",
};

export function useProjectExternalLinks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-external-links", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_external_links" as any)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExternalLink[];
    },
    enabled: !!projectId,
  });
}

export function useCreateExternalLink() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      link_type: ExternalLinkType;
      external_id: string;
      label?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("project_external_links" as any).insert({
        ...input,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-external-links", vars.project_id] });
      toast({ title: "Vínculo criado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });
}

export function useDeleteExternalLink() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_external_links" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      qc.invalidateQueries({ queryKey: ["project-external-links", projectId] });
      toast({ title: "Vínculo removido" });
    },
  });
}

// ===== Candidatos disponíveis para vincular =====

export function useLinkCandidates(orgId: string | undefined, destinationId: string | undefined) {
  return useQuery({
    queryKey: ["link-candidates", orgId, destinationId],
    queryFn: async () => {
      const [opps, alerts, consortia, issues] = await Promise.all([
        destinationId
          ? supabase
              .from("investment_opportunities")
              .select("id, title, investment_type, status")
              .eq("destination_id", destinationId)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        orgId
          ? supabase
              .from("observatory_alerts" as any)
              .select("id, message, severity, reference_year, reference_month, is_dismissed")
              .eq("org_id", orgId)
              .eq("is_dismissed", false)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("consortia" as any)
          .select("id, name, description")
          .order("created_at", { ascending: false })
          .limit(50),
        orgId
          ? supabase
              .from("issues")
              .select("id, title, severity, theme")
              .eq("org_id", orgId)
              .order("created_at", { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [], error: null }),
      ]);
      return {
        investment_opportunity: (opps.data ?? []) as any[],
        observatory_alert: (alerts.data ?? []) as any[],
        consortium: (consortia.data ?? []) as any[],
        issue: (issues.data ?? []) as any[],
      };
    },
    enabled: !!orgId || !!destinationId,
  });
}
