import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, BellOff, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AlertRow {
  id: string;
  metric_id: string;
  reference_year: number;
  reference_month: number | null;
  previous_year: number;
  previous_month: number | null;
  previous_value: number;
  current_value: number;
  delta_pct: number;
  severity: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  email_sent_at: string | null;
  email_recipients_count: number;
  observatory_metrics?: { name: string; unit: string; code: string } | null;
}

export function RegressionAlertsPanel() {
  const qc = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["observatory", "alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("observatory_alerts" as any)
        .select("*, observatory_metrics(name, unit, code)")
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as AlertRow[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AlertRow> }) => {
      const { error } = await supabase.from("observatory_alerts" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["observatory", "alerts"] }),
    onError: (e: any) => toast.error("Erro: " + (e?.message ?? "desconhecido")),
  });

  // Dispara e-mail para alertas críticos ainda não notificados (idempotente: a edge function checa email_sent_at)
  const notifiedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const pending = alerts.filter(
      (a) => a.severity === "critical" && !a.email_sent_at && !notifiedRef.current.has(a.id)
    );
    if (pending.length === 0) return;
    pending.forEach(async (a) => {
      notifiedRef.current.add(a.id);
      try {
        await supabase.functions.invoke("notify-observatory-alert", {
          body: { alert_id: a.id },
        });
        qc.invalidateQueries({ queryKey: ["observatory", "alerts"] });
      } catch (e) {
        // silencioso — não interrompe o usuário
        console.error("notify-observatory-alert falhou", e);
      }
    });
  }, [alerts, qc]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Verificando alertas...
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          Alertas de regressão ({alerts.length})
        </CardTitle>
        <CardDescription>
          Variações superiores a 10% em relação ao período anterior. Alertas críticos sinalizam quedas acima de 25%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((a) => {
          const period = a.reference_month
            ? `${String(a.reference_month).padStart(2, "0")}/${a.reference_year}`
            : `${a.reference_year}`;
          return (
            <div
              key={a.id}
              className={`rounded-lg border p-3 flex items-start justify-between gap-3 bg-background ${
                a.is_read ? "opacity-70" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant={a.severity === "critical" ? "destructive" : "secondary"}>
                    {a.severity === "critical" ? "Crítico" : "Atenção"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Período: {period}</span>
                  <span className="text-xs text-muted-foreground">
                    · {format(new Date(a.created_at), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Variação: {a.delta_pct.toFixed(1)}%
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!a.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => update.mutate({ id: a.id, patch: { is_read: true } })}
                    title="Marcar como lido"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update.mutate({ id: a.id, patch: { is_dismissed: true } })}
                  title="Dispensar"
                >
                  <BellOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}