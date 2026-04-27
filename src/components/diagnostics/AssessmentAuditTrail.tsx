import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Database, FileSearch } from 'lucide-react';

type AuditRow = {
  indicator_code: string;
  pillar: string | null;
  value: number | null;
  normalized_score: number;
  source_type: string;
  source_detail: string | null;
  weight: number;
};

const SOURCE_BADGE: Record<string, string> = {
  OFFICIAL_API: 'bg-severity-good/15 text-severity-good border-severity-good/30',
  AUTOMATICA:   'bg-severity-good/15 text-severity-good border-severity-good/30',
  DERIVED:      'bg-pillar-oe/15 text-pillar-oe border-pillar-oe/30',
  MANUAL:       'bg-primary/10 text-primary border-primary/30',
  ESTIMADA:     'bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30',
};

const SOURCE_LABEL: Record<string, string> = {
  OFFICIAL_API: 'API Oficial',
  AUTOMATICA: 'Automática',
  DERIVED: 'Derivado',
  MANUAL: 'Manual',
  ESTIMADA: 'Estimada',
};

export function AssessmentAuditTrail({ assessmentId }: { assessmentId: string }) {
  const [filter, setFilter] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assessment-audit', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assessment_audit', { p_assessment_id: assessmentId });
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    enabled: !!assessmentId,
    retry: false,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  // Silently hide the audit panel for viewers without permission instead of crashing.
  if (error) {
    const msg = String((error as any)?.message || '');
    if (msg.includes('not_authorized')) return null;
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Não foi possível carregar a trilha de auditoria.
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhum registro de auditoria para este diagnóstico.
        </CardContent>
      </Card>
    );
  }

  // Summary by source type
  const summary = data.reduce((acc, r) => {
    acc[r.source_type] = (acc[r.source_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rows = useMemo(
    () => (filter ? data.filter((r) => r.source_type === filter) : data),
    [data, filter],
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Trilha de Auditoria — Procedência por Indicador
            </CardTitle>
            <CardDescription>
              {data.length} indicadores processados neste cálculo
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {filter && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => setFilter(null)}
              >
                Limpar filtro
              </Button>
            )}
            {Object.entries(summary).map(([type, count]) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(filter === type ? null : type)}
                className={`transition-opacity ${filter && filter !== type ? 'opacity-40 hover:opacity-70' : ''}`}
                aria-pressed={filter === type}
              >
                <Badge variant="outline" className={`${SOURCE_BADGE[type] || ''} cursor-pointer`}>
                  {SOURCE_LABEL[type] || type}: {count}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Procedência</TableHead>
                <TableHead>Detalhe</TableHead>
                <TableHead className="text-right">Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={`${r.indicator_code}-${idx}`}>
                  <TableCell className="font-mono text-xs">{r.indicator_code}</TableCell>
                  <TableCell>
                    {r.pillar && <Badge variant="outline" className="text-xs">{r.pillar}</Badge>}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs">
                    {r.value !== null ? Number(r.value).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs font-medium">
                    {Math.round((r.normalized_score || 0) * 100)}%
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={SOURCE_BADGE[r.source_type] || ''}>
                      {SOURCE_LABEL[r.source_type] || r.source_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={r.source_detail || ''}>
                    {r.source_detail || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{Number(r.weight).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}