import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Calendar, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type DataQualityRow = {
  source: string;
  total_records: number;
  distinct_municipalities: number;
  last_collected_at: string | null;
  age_days: number | null;
  coverage_pct: number | null;
};

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  IBGE: { label: 'IBGE — Demografia & Economia', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  CADASTUR: { label: 'CADASTUR — Prestadores Turísticos', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  STN: { label: 'STN — Finanças Municipais', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  DATASUS: { label: 'DATASUS — Saúde', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  INEP: { label: 'INEP — Educação', color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  SISMAPA: { label: 'SISMAPA — Mapa do Turismo', color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
};

function ageBadge(days: number | null) {
  if (days === null) return <Badge variant="outline">—</Badge>;
  if (days <= 30) return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Recente ({Math.round(days)}d)</Badge>;
  if (days <= 180) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">Aceitável ({Math.round(days)}d)</Badge>;
  return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Defasado ({Math.round(days)}d)</Badge>;
}

export function ExternalDataQualityPanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['external-data-quality'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_external_data_quality');
      if (error) throw error;
      return (data || []) as DataQualityRow[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
          Não foi possível carregar a qualidade dos dados oficiais.
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhum dado oficial coletado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Qualidade dos Dados Oficiais</h3>
        <p className="text-sm text-muted-foreground">
          Idade, cobertura municipal e volume de cada fonte oficial integrada ao SISTUR.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((row) => {
          const meta = SOURCE_LABELS[row.source] || { label: row.source, color: 'bg-muted' };
          return (
            <Card key={row.source} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={meta.color} variant="outline">{row.source}</Badge>
                  {ageBadge(row.age_days)}
                </div>
                <CardTitle className="text-base mt-2">{meta.label}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3" />
                  {row.last_collected_at
                    ? `Última coleta: ${new Date(row.last_collected_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : 'Sem coleta registrada'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Registros</div>
                    <div className="font-semibold tabular-nums">{row.total_records.toLocaleString('pt-BR')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Municípios</div>
                    <div className="font-semibold tabular-nums">{row.distinct_municipalities.toLocaleString('pt-BR')}</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Cobertura municipal</span>
                    <span className="font-medium">{row.coverage_pct?.toFixed(1) ?? '0'}%</span>
                  </div>
                  <Progress value={row.coverage_pct || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}