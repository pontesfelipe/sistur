import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfileContext } from "@/contexts/ProfileContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, LineChart as LineIcon } from "lucide-react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Props {
  metricId: string;
  metricName: string;
  unit: string;
}

/**
 * Mostra a série temporal completa (todos os anos/meses) do indicador para a org efetiva.
 * Usa Recharts; agrupa por ano-mês quando há dados mensais, senão por ano.
 */
export function MetricHistoryDialog({ metricId, metricName, unit }: Props) {
  const [open, setOpen] = useState(false);
  const { effectiveOrgId } = useProfileContext();

  const { data: series = [], isLoading } = useQuery({
    queryKey: ["observatory-metric-history", effectiveOrgId, metricId],
    enabled: open && !!effectiveOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observatory_measurements")
        .select("reference_year, reference_month, value")
        .eq("org_id", effectiveOrgId!)
        .eq("metric_id", metricId)
        .order("reference_year", { ascending: true })
        .order("reference_month", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        label: r.reference_month
          ? `${MONTHS[r.reference_month - 1]}/${String(r.reference_year).slice(2)}`
          : `${r.reference_year}`,
        value: Number(r.value),
      }));
    },
  });

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        title="Ver histórico"
        onClick={() => setOpen(true)}
      >
        <LineIcon className="h-3 w-3" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{metricName}</DialogTitle>
            <DialogDescription>Série histórica em {unit}</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : series.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado registrado ainda para este indicador.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}