import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfileContext } from "@/contexts/ProfileContext";
import { toast } from "sonner";

export interface ObservatoryMetric {
  id: string;
  code: string;
  category: string;
  name: string;
  description: string | null;
  unit: string;
  aggregation: string;
  display_order: number;
  active: boolean;
}

export interface ObservatoryMeasurement {
  id: string;
  org_id: string;
  metric_id: string;
  reference_year: number;
  reference_month: number | null;
  value: number;
  source: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface ObservatoryEvent {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  category: string | null;
  start_date: string;
  end_date: string;
  estimated_attendance: number | null;
  estimated_revenue: number | null;
  actual_attendance: number | null;
  actual_revenue: number | null;
  status: string;
}

export interface ObservatorySummaryRow {
  category: string;
  metric_code: string;
  metric_name: string;
  unit: string;
  total_value: number;
  avg_value: number;
  data_points: number;
}

export function useObservatoryMetrics() {
  return useQuery({
    queryKey: ["observatory-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observatory_metrics")
        .select("*")
        .eq("active", true)
        .order("category")
        .order("display_order");
      if (error) throw error;
      return data as ObservatoryMetric[];
    },
  });
}

export function useObservatoryMeasurements(year: number, orgIdOverride?: string) {
  const { effectiveOrgId: ctxOrgId } = useProfileContext();
  const effectiveOrgId = orgIdOverride || ctxOrgId;
  return useQuery({
    queryKey: ["observatory-measurements", effectiveOrgId, year],
    enabled: !!effectiveOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observatory_measurements")
        .select("*")
        .eq("org_id", effectiveOrgId!)
        .eq("reference_year", year)
        .order("reference_month", { ascending: true });
      if (error) throw error;
      return data as ObservatoryMeasurement[];
    },
  });
}

export function useObservatorySummary(year: number, orgIdOverride?: string) {
  const { effectiveOrgId: ctxOrgId } = useProfileContext();
  const effectiveOrgId = orgIdOverride || ctxOrgId;
  return useQuery({
    queryKey: ["observatory-summary", effectiveOrgId, year],
    enabled: !!effectiveOrgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_observatory_summary", {
        _org_id: effectiveOrgId!,
        _year: year,
      });
      if (error) throw error;
      return (data || []) as ObservatorySummaryRow[];
    },
  });
}

export function useObservatoryEvents(year: number, orgIdOverride?: string) {
  const { effectiveOrgId: ctxOrgId } = useProfileContext();
  const effectiveOrgId = orgIdOverride || ctxOrgId;
  return useQuery({
    queryKey: ["observatory-events", effectiveOrgId, year],
    enabled: !!effectiveOrgId,
    queryFn: async () => {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      const { data, error } = await supabase
        .from("observatory_events")
        .select("*")
        .eq("org_id", effectiveOrgId!)
        .gte("start_date", start)
        .lte("start_date", end)
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as ObservatoryEvent[];
    },
  });
}

export function useUpsertMeasurement() {
  const qc = useQueryClient();
  const { effectiveOrgId } = useProfileContext();
  return useMutation({
    mutationFn: async (payload: {
      metric_id: string;
      reference_year: number;
      reference_month: number | null;
      value: number;
      source?: string;
      notes?: string;
    }) => {
      if (!effectiveOrgId) throw new Error("Organização não definida");
      const { data: existing } = await supabase
        .from("observatory_measurements")
        .select("id")
        .eq("org_id", effectiveOrgId)
        .eq("metric_id", payload.metric_id)
        .eq("reference_year", payload.reference_year)
        .is("reference_month", payload.reference_month === null ? null : undefined as any)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("observatory_measurements")
          .update({
            value: payload.value,
            source: payload.source ?? null,
            notes: payload.notes ?? null,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("observatory_measurements").insert({
          org_id: effectiveOrgId,
          metric_id: payload.metric_id,
          reference_year: payload.reference_year,
          reference_month: payload.reference_month,
          value: payload.value,
          source: payload.source ?? null,
          notes: payload.notes ?? null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["observatory-measurements"] });
      qc.invalidateQueries({ queryKey: ["observatory-summary"] });
      toast.success("Medição salva");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar medição"),
  });
}

export function useCreateObservatoryEvent() {
  const qc = useQueryClient();
  const { effectiveOrgId } = useProfileContext();
  return useMutation({
    mutationFn: async (payload: Partial<ObservatoryEvent> & { name: string; start_date: string; end_date: string }) => {
      if (!effectiveOrgId) throw new Error("Organização não definida");
      const { error } = await supabase.from("observatory_events").insert({
        org_id: effectiveOrgId,
        name: payload.name,
        description: payload.description ?? null,
        category: payload.category ?? null,
        start_date: payload.start_date,
        end_date: payload.end_date,
        estimated_attendance: payload.estimated_attendance ?? null,
        estimated_revenue: payload.estimated_revenue ?? null,
        status: payload.status ?? "planned",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["observatory-events"] });
      toast.success("Evento criado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar evento"),
  });
}

export function useDeleteObservatoryEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("observatory_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["observatory-events"] });
      toast.success("Evento excluído");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });
}