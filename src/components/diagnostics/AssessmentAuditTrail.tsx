import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  OFFICIAL_API: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  AUTOMATICA: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  DERIVED: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  MANUAL: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  ESTIMADA: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
};

const SOURCE_LABEL: Record<string, string> = {
  OFFICIAL_API: 'API Oficial',
  AUTOMATICA: 'Automática',
  DERIVED: 'Derivado',
  MANUAL: 'Manual',
  ESTIMADA: 'Estimada',
};

export function AssessmentAuditTrail({ assessmentId }: { assessmentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['assessment-audit', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assessment_audit', { p_assessment_id: assessmentId });
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    enabled: !!assessmentId,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

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
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary).map(([type, count]) => (
              <Badge key={type} variant="outline" className={SOURCE_BADGE[type] || ''}>
                {SOURCE_LABEL[type] || type}: {count}
              </Badge>
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
              {data.map((r, idx) => (
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