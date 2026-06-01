import { createContext, useContext, ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfileContext } from "@/contexts/ProfileContext";

/**
 * Keys do empacotamento modular (precisam bater com `ERP_MODULES` em useOrgModules.ts).
 * Default = habilitado, exceto se houver override `enabled = false` em `org_module_overrides`.
 */
export type ModuleKey =
  | "diagnostico"
  | "indicadores"
  | "cadastro"
  | "mapa_oportunidades"
  | "certificacao"
  | "projetos"
  | "relatorios"
  | "consorcios"
  | "observatorio"
  | "edu";

interface OrgModulesContextType {
  /** Mapa moduleKey → enabled. Ausente = habilitado (default). */
  overrides: Record<string, boolean>;
  /** true se módulo está habilitado para a org efetiva. ADMIN sempre true. */
  isModuleEnabled: (key: ModuleKey | string) => boolean;
  loading: boolean;
}

const OrgModulesContext = createContext<OrgModulesContextType | undefined>(undefined);

export function OrgModulesProvider({ children }: { children: ReactNode }) {
  const { effectiveOrgId, isAdmin } = useProfileContext();

  const { data, isLoading } = useQuery({
    queryKey: ["org-modules-effective", effectiveOrgId],
    enabled: !!effectiveOrgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("org_module_overrides")
        .select("module_key, enabled")
        .eq("org_id", effectiveOrgId);
      if (error) throw error;
      return (data || []) as { module_key: string; enabled: boolean }[];
    },
  });

  const value = useMemo<OrgModulesContextType>(() => {
    const overrides: Record<string, boolean> = {};
    (data || []).forEach((row) => {
      overrides[row.module_key] = row.enabled;
    });
    return {
      overrides,
      loading: isLoading,
      isModuleEnabled: (key) => {
        if (isAdmin) return true; // ADMIN global bypassa empacotamento
        if (key in overrides) return overrides[key];
        return true; // default = habilitado quando não há override
      },
    };
  }, [data, isLoading, isAdmin]);

  return <OrgModulesContext.Provider value={value}>{children}</OrgModulesContext.Provider>;
}

export function useOrgModulesContext() {
  const ctx = useContext(OrgModulesContext);
  if (!ctx) throw new Error("useOrgModulesContext must be used within OrgModulesProvider");
  return ctx;
}