import { tx } from '@/i18n/t';
import { getDateLocale } from '@/i18n/dateLocale';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plane, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Run = {
  id: string;
  triggered_by: string;
  status: string;
  records_processed: number;
  records_failed: number;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};

const STATUS: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  success: { label: 'Sucesso', cls: 'bg-severity-good/15 text-severity-good border-severity-good/30', icon: CheckCircle2 },
  partial: { label: 'Parcial', cls: 'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30', icon: AlertTriangle },
  failed: { label: 'Falhou', cls: 'bg-severity-critical/15 text-severity-critical border-severity-critical/30', icon: XCircle },
};
const RUNNING = { label: 'Em execução', cls: 'bg-muted text-muted-foreground border-border', icon: Clock };

const fmt = (iso: string | null) => (iso ? format(new Date(iso), 'dd/MM/yyyy HH:mm:ss', { locale: getDateLocale() }) : '—');
const dur = (ms: number | null) =>
  ms == null ? '—' : ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;

export function PfIngestionRunsCard() {
  const q = useQuery({
    queryKey: ['ingestion-runs-pf'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ingestion_runs')
        .select('id, triggered_by, status, records_processed, records_failed, duration_ms, started_at, finished_at, error_message')
        .eq('function_name', 'ingest-pf-turismo')
        .order('started_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Run[];
    },
    refetchInterval: 30_000,
  });

  const runs = q.data ?? [];
  const last = runs[0];
  const lastOk = runs.find((r) => r.status === 'success');
  const failures = runs.filter((r) => r.status === 'failed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plane className="h-4 w-4" /> {tx('Chegadas internacionais (Polícia Federal / MTur)')}
        </CardTitle>
        <CardDescription>{tx('Status, horários e erros das últimas 30 execuções da importação.')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : q.error ? (
          <div className="text-sm text-severity-critical">{(q.error as Error).message}</div>
        ) : runs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{tx('Nenhuma execução registrada ainda.')}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{tx('Último status')}</div>
                {(() => { const s = STATUS[last.status] ?? RUNNING; const I = s.icon; return (
                  <Badge variant="outline" className={s.cls}><I className="h-3 w-3 mr-1" />{tx(s.label)}</Badge>
                ); })()}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tx('Última execução')}</div>
                <div className="font-medium">{fmt(last.started_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tx('Último sucesso')}</div>
                <div className="font-medium">{fmt(lastOk?.finished_at ?? lastOk?.started_at ?? null)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{tx('Falhas nas últimas 30')}</div>
                <div className="font-medium tabular-nums">{failures}</div>
              </div>
            </div>

            <div className="rounded-md border max-h-[420px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>{tx('Início')}</TableHead>
                    <TableHead>{tx('Fim')}</TableHead>
                    <TableHead>{tx('Origem')}</TableHead>
                    <TableHead>{tx('Status')}</TableHead>
                    <TableHead className="text-right">{tx('Proc.')}</TableHead>
                    <TableHead className="text-right">{tx('Falhas')}</TableHead>
                    <TableHead className="text-right">{tx('Duração')}</TableHead>
                    <TableHead>{tx('Erro')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => {
                    const s = STATUS[r.status] ?? RUNNING;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(r.started_at)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(r.finished_at)}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{r.triggered_by}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={s.cls}>{tx(s.label)}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{r.records_processed}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{r.records_failed}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{dur(r.duration_ms)}</TableCell>
                        <TableCell className="text-xs max-w-[320px]">
                          {r.error_message ? (
                            <span className="text-severity-critical whitespace-pre-wrap break-words">{r.error_message}</span>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
