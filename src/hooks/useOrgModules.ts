import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ERP_MODULES: { key: string; label: string; description: string }[] = [
  { key: "diagnostico",        label: "Diagnóstico",          description: "Diagnósticos sistêmicos (RA/OE/AO)." },
  { key: "indicadores",        label: "Indicadores",          description: "Catálogo, coleta e validação de indicadores." },
  { key: "cadastro",           label: "Cadastro / Inventário", description: "Inventário turístico, CADASTUR, mapa de turismo." },
  { key: "mapa_oportunidades", label: "Mapa de Oportunidades", description: "Identificação de gaps e oportunidades." },
  { key: "certificacao",       label: "Certificação Institucional", description: "Selo SISTUR para destinos." },
  { key: "projetos",           label: "Painel de Projetos",   description: "Gestão de projetos do destino." },
  { key: "relatorios",         label: "Relatórios",            description: "Geração de relatórios IA." },
  { key: "consorcios",         label: "Consórcios Regionais", description: "ERP regional para grupos de municípios." },
  { key: "observatorio",       label: "Observatório Turístico", description: "Fluxo, ocupação, eventos, receita, empregos." },
  { key: "edu",                label: "EDU",                   description: "Capacitação, trilhas e certificação educacional." },
];

export interface OrgModuleOverride {
  id: string;
  org_id: string;
  module_key: string;
  enabled: boolean;
  reason: string | null;
  updated_by: string | null;
  updated_at: string;
}

export function useOrgModuleOverrides(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["org-module-overrides", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_module_overrides")
        .select("*")
        .eq("org_id", orgId);
      if (error) throw error;
      return (data || []) as OrgModuleOverride[];
    },
  });
}

export function useUpsertModuleOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { org_id: string; module_key: string; enabled: boolean; reason?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("org_module_overrides")
        .upsert(
          {
            org_id: params.org_id,
            module_key: params.module_key,
            enabled: params.enabled,
            reason: params.reason ?? null,
            updated_by: userRes.user?.id,
          },
          { onConflict: "org_id,module_key" },
        );
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["org-module-overrides", vars.org_id] });
      toast.success("Módulo atualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao atualizar"),
  });
}

export function useOrgHasModule(orgId: string | null | undefined, moduleKey: string) {
  return useQuery({
    queryKey: ["org-has-module", orgId, moduleKey],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("org_has_module", {
        _org_id: orgId,
        _module: moduleKey,
      });
      if (error) throw error;
      return data as boolean;
    },
  });
}