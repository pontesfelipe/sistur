import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Info,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { cn, formatIndicatorName, formatIndicatorCode } from '@/lib/utils';

interface IndicatorScore {
  id: string;
  score: number;
  min_ref_used: number | null;
  max_ref_used: number | null;
  weight_used: number | null;
  indicator: {
    id: string;
    code: string;
    name: string;
    pillar: string;
    theme: string;
    direction: string;
    normalization: string;
    min_ref: number | null;
    max_ref: number | null;
    unit: string | null;
    description: string | null;
    data_source?: string;
    collection_type?: string;
    reliability_score?: number;
  } | null;
}

interface IndicatorValue {
  indicator_id: string;
  value_raw: number | null;
  source: string | null;
}

interface NormalizationViewProps {
  indicatorScores: IndicatorScore[];
  indicatorValues?: IndicatorValue[];
}

const reliabilityIcons = {
  AUTOMATICA: { icon: ShieldCheck, color: 'text-severity-good', label: 'Automático (Alta)' },
  MANUAL: { icon: Shield, color: 'text-severity-moderate', label: 'Manual (Média)' },
  ESTIMADA: { icon: ShieldAlert, color: 'text-severity-critical', label: 'Estimado (Baixa)' },
};

const normalizationLabels = {
  MIN_MAX: 'Normalização Min-Max',
  BANDS: 'Faixas Categóricas',
  BINARY: 'Binário (0 ou 1)',
};

export function NormalizationView({ indicatorScores, indicatorValues = [] }: NormalizationViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique themes from indicators
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    indicatorScores.forEach(score => {
      if (score.indicator?.theme) {
        themes.add(score.indicator.theme);
      }
    });
    return Array.from(themes).sort();
  }, [indicatorScores]);

  // Filter indicator scores
  const filteredScores = useMemo(() => {
    return indicatorScores.filter(score => {
      const indicator = score.indicator;
      if (!indicator) return false;

      // Search filter
      const matchesSearch = searchQuery === '' ||
        indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        indicator.code.toLowerCase().includes(searchQuery.toLowerCase());

      // Pillar filter
      const matchesPillar = pillarFilter === 'all' || 
        indicator.pillar.toLowerCase() === pillarFilter;

      // Theme filter
      const matchesTheme = themeFilter === 'all' || 
        indicator.theme === themeFilter;

      // Status filter (by score severity)
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'critico') {
          matchesStatus = score.score < 0.34;
        } else if (statusFilter === 'moderado') {
          matchesStatus = score.score >= 0.34 && score.score < 0.67;
        } else if (statusFilter === 'bom') {
          matchesStatus = score.score >= 0.67;
        }
      }

      return matchesSearch && matchesPillar && matchesTheme && matchesStatus;
    });
  }, [indicatorScores, searchQuery, pillarFilter, themeFilter, statusFilter]);
  const getValueForIndicator = (indicatorId: string) => {
    return indicatorValues.find(v => v.indicator_id === indicatorId)?.value_raw;
  };

  const getSourceForIndicator = (indicatorId: string) => {
    return indicatorValues.find(v => v.indicator_id === indicatorId)?.source;
  };

  const getNormalizationExplanation = (score: IndicatorScore) => {
    const indicator = score.indicator;
    if (!indicator) return 'Indicador não encontrado';

    const rawValue = getValueForIndicator(indicator.id);
    const min = score.min_ref_used ?? indicator.min_ref ?? 0;
    const max = score.max_ref_used ?? indicator.max_ref ?? 100;
    const direction = indicator.direction;
    const normType = indicator.normalization;

    if (normType === 'MIN_MAX') {
      if (direction === 'HIGH_IS_BETTER') {
        return `Score = (${rawValue ?? '?'} - ${min}) / (${max} - ${min}) = ${(score.score * 100).toFixed(1)}%`;
      } else {
        return `Score = (${max} - ${rawValue ?? '?'}) / (${max} - ${min}) = ${(score.score * 100).toFixed(1)}%`;
      }
    } else if (normType === 'BINARY') {
      return `Valor ${rawValue ? '≥' : '<'} limite → Score = ${score.score === 1 ? '100%' : '0%'}`;
    } else {
      return `Classificado em faixa → Score = ${(score.score * 100).toFixed(1)}%`;
    }
  };

  const pillarNames = {
    RA: 'Relações Ambientais (IRA)',
    OE: 'Organização Estrutural (IOE)',
    AO: 'Ações Operacionais (IAO)',
  };

  // Group filtered scores by pillar
  const groupedByPillar = filteredScores.reduce((acc, score) => {
    const pillar = score.indicator?.pillar || 'RA';
    if (!acc[pillar]) acc[pillar] = [];
    acc[pillar].push(score);
    return acc;
  }, {} as Record<string, IndicatorScore[]>);

  return (
    <div className="space-y-6">
      {/* Transparency Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">Transparência na Normalização</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Esta visão mostra como cada indicador foi normalizado: valor bruto, fonte dos dados, 
          regra de normalização aplicada e score final. Objetivo: auditoria e confiança pública.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros:</span>
        </div>
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicador..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ra">IRA</SelectItem>
              <SelectItem value="oe">IOE</SelectItem>
              <SelectItem value="ao">IAO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os temas</SelectItem>
              {availableThemes.map(theme => (
                <SelectItem key={theme} value={theme}>{theme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="bom">Bom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground self-center">
          {filteredScores.length} de {indicatorScores.length}
        </div>
      </div>

      {/* Grouped Tables */}
      {Object.entries(groupedByPillar).map(([pillar, scores]) => (
        <div key={pillar} className="bg-card rounded-xl border overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                I{pillar}
              </Badge>
              <span className="font-semibold">
                {pillarNames[pillar as keyof typeof pillarNames]}
              </span>
              <span className="text-sm text-muted-foreground ml-auto">
                {scores.length} indicador{scores.length !== 1 ? 'es' : ''}</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Código</TableHead>
                <TableHead>Indicador</TableHead>
                <TableHead className="w-24">Valor Bruto</TableHead>
                <TableHead className="w-28">Fonte</TableHead>
                <TableHead className="w-28">Confiança</TableHead>
                <TableHead>Regra Aplicada</TableHead>
                <TableHead className="w-32 text-right">Score Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => {
                const indicator = score.indicator;
                if (!indicator) return null;

                const rawValue = getValueForIndicator(indicator.id);
                const source = getSourceForIndicator(indicator.id);
                const collectionType = (indicator as any).collection_type || 'MANUAL';
                const reliability = reliabilityIcons[collectionType as keyof typeof reliabilityIcons] || reliabilityIcons.MANUAL;
                const ReliabilityIcon = reliability.icon;

                return (
                  <TableRow key={score.id}>
                    <TableCell className="font-mono text-sm">
                      {formatIndicatorCode(indicator.code)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{formatIndicatorName(indicator.name)}</span>
                        {indicator.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {indicator.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{indicator.theme}</span>
                        {indicator.direction === 'HIGH_IS_BETTER' ? (
                          <ArrowUp className="h-3 w-3 text-severity-good" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-severity-critical" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono">
                        {rawValue !== null && rawValue !== undefined ? rawValue.toLocaleString('pt-BR') : '—'}
                      </span>
                      {indicator.unit && (
                        <span className="text-xs text-muted-foreground ml-1">{indicator.unit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {source || (indicator as any).data_source || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1.5">
                            <ReliabilityIcon className={cn('h-4 w-4', reliability.color)} />
                            <span className="text-xs">
                              {Math.round(((indicator as any).reliability_score || 0.7) * 100)}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>{reliability.label}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger className="text-left">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {normalizationLabels[indicator.normalization as keyof typeof normalizationLabels]}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm font-mono text-xs">
                          {getNormalizationExplanation(score)}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress
                          value={score.score * 100}
                          className={cn(
                            'w-16 h-2',
                            score.score >= 0.67
                              ? '[&>div]:bg-severity-good'
                              : score.score >= 0.34
                              ? '[&>div]:bg-severity-moderate'
                              : '[&>div]:bg-severity-critical'
                          )}
                        />
                        <span
                          className={cn(
                            'font-mono text-sm font-semibold min-w-[3rem] text-right',
                            score.score >= 0.67
                              ? 'text-severity-good'
                              : score.score >= 0.34
                              ? 'text-severity-moderate'
                              : 'text-severity-critical'
                          )}
                        >
                          {Math.round(score.score * 100)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}

      {indicatorScores.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum indicador calculado ainda.
        </div>
      )}
    </div>
  );
}
