import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle, RefreshCw, Search, Sparkles, FileText, Filter, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LogRow = {
  id: string;
  created_at: string;
  job_id: string | null;
  report_id: string | null;
  assessment_id: string | null;
  org_id: string | null;
  user_id: string | null;
  trace_id: string | null;
  provider: string | null;
  model: string | null;
  level: 'info' | 'warn' | 'error';
  stage: string | null;
  message: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
};

const LEVEL_BADGE: Record<LogRow['level'], { label: string; className: string; icon: React.ReactNode }> = {
  info: { label: 'info', className: 'bg-muted text-muted-foreground', icon: <CheckCircle2 className="h-3 w-3" /> },
  warn: { label: 'warn', className: 'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30', icon: <AlertCircle className="h-3 w-3" /> },
  error: { label: 'error', className: 'bg-destructive/15 text-destructive border-destructive/30', icon: <AlertTriangle className="h-3 w-3" /> },
};

const PROVIDER_LABEL: Record<string, string> = {
  claude: 'Claude',
  gpt5: 'GPT-5',
  gemini: 'Gemini',
};

export default function AdminReportLogs() {
  // Default focus: Claude (motivo do painel: investigar a edge function quando usada por Claude).
  const [providerFilter, setProviderFilter] = useState<string>('claude');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LogRow | null>(null);

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['report-generation-logs', providerFilter],
    queryFn: async (): Promise<LogRow[]> => {
      let query = supabase
        .from('report_generation_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (providerFilter !== 'all') {
        query = query.eq('provider', providerFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LogRow[];
    },
    refetchInterval: 15_000,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r) => {
      if (levelFilter !== 'all' && r.level !== levelFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [r.stage, r.message, r.trace_id, r.job_id, r.report_id, r.model]
          .filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, levelFilter, search]);

  const stats = useMemo(() => {
    const rows = data ?? [];
    return {
      total: rows.length,
      errors: rows.filter((r) => r.level === 'error').length,
      warns: rows.filter((r) => r.level === 'warn').length,
      providerSelected: rows.filter((r) => r.stage === 'provider_selected').length,
      providerFailed: rows.filter((r) => r.stage === 'provider_failed').length,
    };
  }, [data]);

  return (
    <AppLayout
      title="Logs do Gerador de Relatórios"
      subtitle="Eventos e erros da edge function generate-report (filtrado por provedor de IA)"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <FileText className="h-3.5 w-3.5" />
                Eventos (últimos 500)
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-destructive">{stats.errors}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Erros
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-severity-moderate">{stats.warns}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                Avisos
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-severity-good">{stats.providerSelected}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <Sparkles className="h-3.5 w-3.5" />
                Provider OK
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold text-destructive">{stats.providerFailed}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Provider Falhou
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-44">
                <Sparkles className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Provedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                <SelectItem value="gpt5">GPT-5 (OpenAI)</SelectItem>
                <SelectItem value="gemini">Gemini (Google)</SelectItem>
                <SelectItem value="all">Todos os provedores</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-36">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar stage, mensagem, trace, job…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(8)].map((_, i) => (<Skeleton key={i} className="h-10" />))}
              </div>
            ) : error ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive" />
                <p className="text-sm">Falha ao carregar logs.</p>
                <p className="text-xs mt-1 opacity-70">{(error as Error).message}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">
                  Nenhum evento encontrado para{' '}
                  <strong>{PROVIDER_LABEL[providerFilter] ?? providerFilter}</strong>.
                </p>
                <p className="text-xs mt-2 opacity-70">
                  Os eventos são gerados a cada execução de geração de relatório.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[140px]">Data/Hora</TableHead>
                      <TableHead className="w-[80px]">Nível</TableHead>
                      <TableHead className="w-[100px]">Provider</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[120px]">Trace</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const lvl = LEVEL_BADGE[r.level];
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelected(r)}>
                          <TableCell className="text-xs tabular-nums">
                            {format(new Date(r.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${lvl.className}`}>
                              {lvl.icon}
                              {lvl.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {r.provider && (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <Sparkles className="h-2.5 w-2.5" />
                                {PROVIDER_LABEL[r.provider] ?? r.provider}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{r.stage ?? '—'}</TableCell>
                          <TableCell className="text-xs max-w-[420px] truncate" title={r.message ?? ''}>
                            {r.message ?? (r.metadata ? JSON.stringify(r.metadata).slice(0, 120) : '—')}
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]" title={r.trace_id ?? ''}>
                            {r.trace_id ? r.trace_id.slice(0, 14) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Atualização automática a cada 15s • {filtered.length} de {data?.length ?? 0} evento(s)
        </p>

        {/* Detail dialog */}
        <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes do Evento
              </DialogTitle>
              <DialogDescription>
                {selected && format(new Date(selected.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nível" value={selected.level} />
                  <Field label="Stage" value={selected.stage ?? '—'} mono />
                  <Field label="Provider" value={selected.provider ? (PROVIDER_LABEL[selected.provider] ?? selected.provider) : '—'} />
                  <Field label="Modelo" value={selected.model ?? '—'} mono />
                  <Field label="Duração" value={selected.duration_ms != null ? `${(selected.duration_ms / 1000).toFixed(1)}s` : '—'} />
                  <Field label="Trace ID" value={selected.trace_id ?? '—'} mono />
                  <Field label="Job ID" value={selected.job_id ?? '—'} mono />
                  <Field label="Report ID" value={selected.report_id ?? '—'} mono />
                </div>
                {selected.message && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                    <pre className="p-3 bg-muted rounded text-xs whitespace-pre-wrap">{selected.message}</pre>
                  </div>
                )}
                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                    <pre className="p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono' : ''} break-all`}>{value}</p>
    </div>
  );
}