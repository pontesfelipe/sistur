import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Consortium {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  lead_org_id: string;
  created_by: string;
  status: "active" | "inactive" | "archived";
  created_at: string;
  updated_at: string;
}

export interface ConsortiumMember {
  id: string;
  consortium_id: string;
  org_id: string;
  member_role: "lead" | "member";
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  org_name?: string;
}

export interface ConsortiumComparisonRow {
  org_id: string;
  org_name: string;
  destination_name: string | null;
  ra_score: number | null;
  oe_score: number | null;
  ao_score: number | null;
  ra_status: "ADEQUADO" | "ATENCAO" | "CRITICO" | null;
  oe_status: "ADEQUADO" | "ATENCAO" | "CRITICO" | null;
  ao_status: "ADEQUADO" | "ATENCAO" | "CRITICO" | null;
  final_score: number | null;
  final_classification: string | null;
  last_calculated_at: string | null;
  latitude: number | null;
  longitude: number | null;
}

export function useConsortia() {
  return useQuery({
    queryKey: ["consortia"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consortia")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Consortium[];
    },
  });
}

export function useConsortium(id: string | undefined) {
  return useQuery({
    queryKey: ["consortium", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consortia")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Consortium | null;
    },
  });
}

export function useConsortiumMembers(consortiumId: string | undefined) {
  return useQuery({
    queryKey: ["consortium-members", consortiumId],
    enabled: !!consortiumId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consortium_members")
        .select("*, orgs:org_id(name)")
        .eq("consortium_id", consortiumId)
        .order("invited_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((m) => ({
        ...m,
        org_name: m.orgs?.name ?? "Município",
      })) as ConsortiumMember[];
    },
  });
}

export function useConsortiumComparison(consortiumId: string | undefined) {
  return useQuery({
    queryKey: ["consortium-comparison", consortiumId],
    enabled: !!consortiumId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_consortium_comparison", {
        _consortium_id: consortiumId,
      });
      if (error) throw error;
      return (data ?? []) as ConsortiumComparisonRow[];
    },
  });
}

// Convites pendentes para a própria org do usuário (banner em /configuracoes)
export function usePendingInvitesForMyOrg(orgId: string | undefined) {
  return useQuery({
    queryKey: ["consortium-pending-invites", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("consortium_members")
        .select("*, consortia:consortium_id(name, description)")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .is("declined_at", null);
      if (error) throw error;
      return (data ?? []) as Array<ConsortiumMember & { consortia: { name: string; description: string | null } }>;
    },
  });
}

export function useCreateConsortium() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; slug: string; description?: string; lead_org_id: string }) => {
      if (!user) throw new Error("Sem usuário autenticado");
      const { data, error } = await (supabase as any)
        .from("consortia")
        .insert({
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          lead_org_id: input.lead_org_id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      // Auto-adiciona a org-líder como membro já aceito.
      await (supabase as any).from("consortium_members").insert({
        consortium_id: data.id,
        org_id: input.lead_org_id,
        member_role: "lead",
        invited_by: user.id,
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      });
      return data as Consortium;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consortia"] });
      toast.success("Consórcio criado");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar consórcio"),
  });
}

export function useInviteOrg(consortiumId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (orgId: string) => {
      if (!user) throw new Error("Sem usuário autenticado");
      const { error } = await (supabase as any).from("consortium_members").insert({
        consortium_id: consortiumId,
        org_id: orgId,
        member_role: "member",
        invited_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consortium-members", consortiumId] });
      qc.invalidateQueries({ queryKey: ["consortium-comparison", consortiumId] });
      toast.success("Município convidado");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao convidar"),
  });
}

export function useRespondInvite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ memberId, accept }: { memberId: string; accept: boolean }) => {
      if (!user) throw new Error("Sem usuário autenticado");
      const patch = accept
        ? { accepted_at: new Date().toISOString(), accepted_by: user.id }
        : { declined_at: new Date().toISOString(), declined_by: user.id };
      const { error } = await (supabase as any).from("consortium_members").update(patch).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["consortium-pending-invites"] });
      qc.invalidateQueries({ queryKey: ["consortium-members"] });
      qc.invalidateQueries({ queryKey: ["consortium-comparison"] });
      qc.invalidateQueries({ queryKey: ["consortia"] });
      toast.success(vars.accept ? "Convite aceito" : "Convite recusado");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });
}

export function useRemoveMember(consortiumId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any)
        .from("consortium_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["consortium-members", consortiumId] });
      qc.invalidateQueries({ queryKey: ["consortium-comparison", consortiumId] });
      toast.success("Município removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao remover"),
  });
}