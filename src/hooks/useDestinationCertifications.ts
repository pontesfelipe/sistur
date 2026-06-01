import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CertificationLevel = "bronze" | "prata" | "ouro" | "diamante";
export type CertificationStatus = "ativo" | "expirado" | "revogado" | "suspenso";

export interface CertificationLevelConfig {
  id: string;
  level: CertificationLevel;
  display_name: string;
  description: string | null;
  min_overall_score: number;
  min_ra_score: number;
  min_oe_score: number;
  min_ao_score: number;
  validity_months: number;
  badge_color: string | null;
  sort_order: number;
  active: boolean;
}

export interface DestinationCertification {
  id: string;
  org_id: string;
  level: CertificationLevel;
  status: CertificationStatus;
  verification_code: string;
  issued_at: string;
  valid_until: string;
  issued_by: string | null;
  assessment_id: string | null;
  overall_score_snapshot: number | null;
  ra_score_snapshot: number | null;
  oe_score_snapshot: number | null;
  ao_score_snapshot: number | null;
  criteria_snapshot: any;
  revoked_at: string | null;
  revoked_by: string | null;
  revocation_reason: string | null;
  notes: string | null;
  created_at: string;
}

function generateCode(): string {
  const seg = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SISTUR-${seg()}-${seg()}-${seg()}`;
}

export function useCertificationLevels() {
  return useQuery({
    queryKey: ["certification-levels"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("destination_certification_levels")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as CertificationLevelConfig[];
    },
  });
}

export function useOrgCertifications(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["destination-certifications", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("destination_certifications")
        .select("*")
        .eq("org_id", orgId)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data || []) as DestinationCertification[];
    },
  });
}

export function useAllCertifications() {
  return useQuery({
    queryKey: ["destination-certifications-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("destination_certifications")
        .select("*, orgs(name)")
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useEvaluateEligibility(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ["certification-eligibility", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "evaluate_destination_certification_eligibility",
        { _org_id: orgId },
      );
      if (error) throw error;
      return (data?.[0] ?? null) as null | {
        eligible_level: CertificationLevel | null;
        overall_score: number;
        ra_score: number;
        oe_score: number;
        ao_score: number;
        assessment_id: string;
        details: any;
      };
    },
  });
}

export function useIssueCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      org_id: string;
      level: CertificationLevel;
      assessment_id?: string | null;
      overall_score?: number | null;
      ra_score?: number | null;
      oe_score?: number | null;
      ao_score?: number | null;
      validity_months: number;
      notes?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const valid_until = new Date();
      valid_until.setMonth(valid_until.getMonth() + params.validity_months);
      const { data, error } = await (supabase as any)
        .from("destination_certifications")
        .insert({
          org_id: params.org_id,
          level: params.level,
          status: "ativo",
          verification_code: generateCode(),
          issued_by: userRes.user?.id,
          assessment_id: params.assessment_id ?? null,
          overall_score_snapshot: params.overall_score ?? null,
          ra_score_snapshot: params.ra_score ?? null,
          oe_score_snapshot: params.oe_score ?? null,
          ao_score_snapshot: params.ao_score ?? null,
          valid_until: valid_until.toISOString(),
          notes: params.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destination-certifications-all"] });
      qc.invalidateQueries({ queryKey: ["destination-certifications"] });
      toast.success("Certificado emitido com sucesso");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao emitir certificado"),
  });
}

export function useRevokeCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; reason: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from("destination_certifications")
        .update({
          status: "revogado",
          revoked_at: new Date().toISOString(),
          revoked_by: userRes.user?.id,
          revocation_reason: params.reason,
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["destination-certifications-all"] });
      qc.invalidateQueries({ queryKey: ["destination-certifications"] });
      toast.success("Certificado revogado");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao revogar"),
  });
}

export function useVerifyCertification(code: string | null) {
  return useQuery({
    queryKey: ["verify-certification", code],
    enabled: !!code && code.trim().length > 4,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "verify_destination_certification",
        { _code: code },
      );
      if (error) throw error;
      return (data?.[0] ?? null);
    },
  });
}