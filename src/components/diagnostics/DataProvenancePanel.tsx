import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, CheckCircle2, Calculator, PenLine, Globe2 } from 'lucide-react';

interface Props {
  indicatorValues: any[];
}

/**
 * Painel de Transparência de Dados.
 * Mostra a procedência de cada indicador preenchido (oficial / derivado / manual)
 * com cobertura automática e badge de confiabilidade. Não altera dados, apenas exibe.
 */
export function DataProvenancePanel({ indicatorValues }: Props) {
  const analysis = useMemo(() => {
    const filled = (indicatorValues || []).filter((v: any) => !v.is_ignored && v.value != null);
    const buckets = {
      official: [] as any[],
      derived: [] as any[],
      manual: [] as any[],
      other: [] as any[],
    };
    filled.forEach((v: any) => {
      const src = (v.source || v.source_type || '').toString().toUpperCase();
      const method = (v.collection_method || '').toString().toUpperCase();
      const isDerived = src.includes('+IBGE') || method === 'DERIVED' || v._source === 'derived';
      const isManual = method === 'MANUAL' || src === 'MANUAL';
      const isOfficial = !isDerived && !isManual && (
        src.startsWith('IBGE') || src.startsWith('CADASTUR') || src.startsWith('STN') ||
        src.startsWith('DATASUS') || src.startsWith('MAPA_TURISMO') || src.startsWith('INEP') ||
        src.startsWith('ANATEL') || src.startsWith('TSE') || src.startsWith('ANA')
      );
      if (isDerived) buckets.derived.push(v);
      else if (isOfficial) buckets.official.push(v);
      else if (isManual) buckets.manual.push(v);
      else buckets.other.push(v);
    });
    const total = filled.length;
    const automated = buckets.official.length + buckets.derived.length;
    const coveragePct = total > 0 ? Math.round((automated / total) * 100) : 0;
    return { ...buckets, total, automated, coveragePct };
  }, [indicatorValues]);

  const sourceLabel = (src: string) => {
    const map: Record<string, string> = {
      IBGE: 'IBGE',
      CADASTUR: 'CADASTUR',
      STN: 'STN / Tesouro Nacional',
      DATASUS: 'DATASUS',
      MAPA_TURISMO: 'Mapa do Turismo',
      INEP: 'INEP',
    };
    return map[src] || src;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Procedência dos Dados
          </span>
          <Badge variant={analysis.coveragePct >= 60 ? 'default' : 'secondary'}>
            Cobertura automática: {analysis.coveragePct}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">{analysis.automated} de {analysis.total} indicadores via fontes oficiais ou derivados</span>
          </div>
          <Progress value={analysis.coveragePct} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Globe2 className="h-4 w-4" />
              <span className="text-xs font-medium">Oficiais</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analysis.official.length}</p>
            <p className="text-[10px] text-muted-foreground">IBGE, CADASTUR, STN…</p>
          </div>
          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Calculator className="h-4 w-4" />
              <span className="text-xs font-medium">Calculados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analysis.derived.length}</p>
            <p className="text-[10px] text-muted-foreground">Fórmulas sobre dados oficiais</p>
          </div>
          <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <PenLine className="h-4 w-4" />
              <span className="text-xs font-medium">Manuais</span>
            </div>
            <p className="text-2xl font-bold mt-1">{analysis.manual.length}</p>
            <p className="text-[10px] text-muted-foreground">Preenchidos pela equipe</p>
          </div>
        </div>

        {analysis.derived.length > 0 && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              Indicadores calculados ({analysis.derived.length})
            </p>
            <div className="space-y-1">
              {analysis.derived.slice(0, 8).map((v: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate">{v.indicator?.name || v.indicators?.name || v.indicator_id}</span>
                  <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                    {sourceLabel(v.source || 'CALCULADO')}
                  </Badge>
                </div>
              ))}
              {analysis.derived.length > 8 && (
                <p className="text-[10px] text-muted-foreground">+{analysis.derived.length - 8} outros…</p>
              )}
            </div>
          </div>
        )}

        {analysis.manual.length > 0 && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs font-medium mb-1 flex items-center gap-1">
              <PenLine className="h-3.5 w-3.5 text-amber-600" />
              Indicadores manuais ({analysis.manual.length})
            </p>
            <p className="text-[11px] text-muted-foreground">
              Sem fonte automática disponível — atualize periodicamente para manter a confiabilidade.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
