import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  ibgeCode?: string | null;
  canRefresh?: boolean;
}

function fmtNumber(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);
}
function fmtBRL(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

export function SocioeconomicContextPanel({ ibgeCode, canRefresh }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["municipal-context", ibgeCode],
    enabled: !!ibgeCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipal_socioeconomic_context")
        .select("*")
        .eq("ibge_code", ibgeCode!)
        .order("reference_year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = async () => {
    if (!ibgeCode) return;
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("enrich-municipality-sidra", {
        body: { ibge_code: ibgeCode },
      });
      if (error) throw error;
      const r = (res as any)?.results?.[0];
      if (r?.error) throw new Error(r.error);
      toast.success("Dados socioeconômicos atualizados (IBGE/SIDRA)");
      await queryClient.invalidateQueries({ queryKey: ["municipal-context", ibgeCode] });
    } catch (e: any) {
      toast.error("Falha ao buscar IBGE/SIDRA: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  if (!ibgeCode) return null;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Contexto Socioeconômico
            {data?.reference_year && (
              <Badge variant="outline" className="text-[10px] font-normal">{data.reference_year}</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fonte oficial: IBGE/SIDRA (população estimada + PIB municipal)
          </p>
        </div>
        {canRefresh && (
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            {data ? "Atualizar" : "Buscar"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">
            Nenhum dado socioeconômico carregado. {canRefresh && 'Clique em "Buscar" para consultar IBGE/SIDRA.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> População estimada
              </div>
              <div className="text-2xl font-semibold">{fmtNumber(data.population)}</div>
              <div className="text-[10px] text-muted-foreground">SIDRA tab. 6579</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> PIB total
              </div>
              <div className="text-2xl font-semibold">{fmtBRL(data.pib_total_brl)}</div>
              <div className="text-[10px] text-muted-foreground">SIDRA tab. 5938 (var. 37)</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> PIB per capita
              </div>
              <div className="text-2xl font-semibold">{fmtBRL(data.pib_per_capita_brl)}</div>
              <div className="text-[10px] text-muted-foreground">SIDRA tab. 5938 (var. 39)</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}