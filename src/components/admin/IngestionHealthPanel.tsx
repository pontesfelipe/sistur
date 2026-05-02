import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CalendarClock, CheckCircle2, PlayCircle, RefreshCw, XCircle, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type HealthRow = {
  function_name: string;
  expected_cadence: string;
  last_run_at: string | null;
  last_status: string | null;
  last_records_processed: number | null;
  last_records_failed: number | null;
  last_error: string | null;
  age_days: number | null;
  health: 'healthy' | 'partial' | 'failed' | 'stale' | 'never_run';
};

type RunRow = {
  id: string;
  function_name: string;
  triggered_by: string;
  status: string;
  records_processed: number;
  records_failed: number;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};

type MturFreshness = {
  latest_reference_year: number | null;
  rows_count: number;
  last_updated: string | null;
  age_days: number | null;
  needs_review: boolean;
};

const HEALTH_STYLE: Record<HealthRow['health'], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  healthy:   { label: 'Saudável',     cls: 'bg-severity-good/15 text-severity-good border-severity-good/30', icon: CheckCircle2 },
  partial:   { label: 'Parcial',      cls: 'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30', icon: AlertTriangle },
  failed:    { label: 'Falhou',       cls: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30', icon: XCircle },
  stale:     { label: 'Defasado',     cls: 'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30', icon: CalendarClock },
  never_run: { label: 'Nunca rodou',  cls: 'bg-muted text-muted-foreground border-border', icon: Activity },
};

const FN_DISPLAY: Record<string, string> = {
  'ingest-cadastur': 'CADASTUR (Guias / Hospedagem / Agências)',
  'ingest-mapa-turismo': 'Mapa do Turismo (MTur)',
  'ingest-ana': 'ANA — IQA (Qualidade da Água)',
  'ingest-tse': 'TSE (Eleições)',
  'ingest-anatel': 'ANATEL (Cobertura)',
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

function formatDuration(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function IngestionHealthPanel() {
  const qc = useQueryClient();
  const [triggering, setTriggering] = useState<string | null>(null);

  const healthQuery = useQuery({
    queryKey: ['ingestion-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ingestion_health');
      if (error) throw error;
      return (data ?? []) as HealthRow[];
    },
    refetchInterval: 30_000,
  });

  const runsQuery = useQuery({
    queryKey: ['ingestion-runs-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingestion_runs')
        .select('id, function_name, triggered_by, status, records_processed, records_failed, duration_ms, started_at, finished_at, error_message')
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as RunRow[];
    },
    refetchInterval: 30_000,
  });

  const mturQuery = useQuery({
    queryKey: ['mtur-freshness'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_mtur_reference_freshness');
      if (error) throw error;
      return (data?.[0] ?? null) as MturFreshness | null;
    },
  });

  const triggerMut = useMutation({
    mutationFn: async (fn: string) => {
      setTriggering(fn);
      const { data, error } = await supabase.functions.invoke('trigger-ingestion', {
        body: { function_name: fn },
      });
      if (error) throw error;
      return data as { status: string; processed: number; failed: number; error: string | null };
    },
    onSuccess: (res, fn) => {
      if (res.status === 'success') {
        toast.success(`${fn}: OK (${res.processed} processados)`);
      } else if (res.status === 'partial') {
        toast.warning(`${fn}: parcial — ${res.processed} ok, ${res.failed} falhas`);
      } else {
        toast.error(`${fn}: falhou — ${res.error ?? 'erro desconhecido'}`);
      }
      qc.invalidateQueries({ queryKey: ['ingestion-health'] });
      qc.invalidateQueries({ queryKey: ['ingestion-runs-recent'] });
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
    onSettled: () => setTriggering(null),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Saúde das Ingestões Oficiais</h3>
          <p className="text-xs text-muted-foreground">
            Monitoramento e teste manual das funções automáticas (CADASTUR, ANA, TSE, ANATEL, Mapa do Turismo).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ['ingestion-health'] });
            qc.invalidateQueries({ queryKey: ['ingestion-runs-recent'] });
            qc.invalidateQueries({ queryKey: ['mtur-freshness'] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {mturQuery.data && (
        <Card className={mturQuery.data.needs_review ? 'border-severity-moderate' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Tabela de Referência MTur (gastos turísticos por UF)
            </CardTitle>
            <CardDescription>
              Lembrete anual: o MTur publica novas médias de gasto e permanência todo ano.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Ano-referência mais recente</div>
              <div className="text-2xl font-display font-bold">{mturQuery.data.latest_reference_year ?? '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Linhas no catálogo</div>
              <div className="text-2xl font-display font-bold">{mturQuery.data.rows_count}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Última atualização</div>
              <div className="text-base font-medium">{formatDate(mturQuery.data.last_updated)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Status</div>
              {mturQuery.data.needs_review ? (
                <Badge variant="outline" className="bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Revisão recomendada
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-severity-good/15 text-severity-good border-severity-good/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Atualizada
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status atual por função</CardTitle>
          <CardDescription>Teste manual (smoke test) registra a execução no histórico abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          {healthQuery.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(healthQuery.data ?? []).map((row) => {
                const style = HEALTH_STYLE[row.health];
                const Icon = style.icon;
                return (
                  <div key={row.function_name} className="border rounded-lg p-4 space-y-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{FN_DISPLAY[row.function_name] ?? row.function_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{row.function_name}</div>
                      </div>
                      <Badge variant="outline" className={style.cls}>
                        <Icon className="h-3 w-3 mr-1" /> {style.label}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Cadência</div>
                        <div className="font-medium">{row.expected_cadence}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Última execução</div>
                        <div className="font-medium">
                          {row.last_run_at ? `${formatDate(row.last_run_at)} (${row.age_days}d)` : 'Nunca'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Processados</div>
                        <div className="font-medium tabular-nums">{row.last_records_processed ?? 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Falhas</div>
                        <div className="font-medium tabular-nums">{row.last_records_failed ?? 0}</div>
                      </div>
                    </div>
                    {row.last_error && (
                      <div className="text-xs text-severity-critical bg-severity-critical/5 p-2 rounded border border-severity-critical/20 line-clamp-2">
                        {row.last_error}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={triggering === row.function_name}
                      onClick={() => triggerMut.mutate(row.function_name)}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {triggering === row.function_name ? 'Executando...' : 'Smoke test'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas 50 execuções</CardTitle>
          <CardDescription>Histórico unificado (cron + manual + admin).</CardDescription>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (runsQuery.data ?? []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma execução registrada ainda. Rode um smoke test para começar.
            </div>
          ) : (
            <div className="rounded-md border max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Proc.</TableHead>
                    <TableHead className="text-right">Falhas</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(runsQuery.data ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(r.started_at)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.function_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.triggered_by}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          r.status === 'success' ? 'bg-severity-good/15 text-severity-good border-severity-good/30' :
                          r.status === 'failed'  ? 'bg-severity-critical/15 text-severity-critical border-severity-critical/30' :
                          r.status === 'partial' ? 'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30' :
                          'bg-muted text-muted-foreground'
                        }>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.records_processed}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{r.records_failed}</TableCell>
                      <TableCell className="text-right tabular-nums text-xs">{formatDuration(r.duration_ms)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}