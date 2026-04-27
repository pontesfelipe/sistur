import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  MoreVertical,
  Info,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Database,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Target,
  Gauge,
  Zap,
  Landmark,
  Hotel,
  Globe,
  BarChart3,
  Plus,
  Calculator,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { INDICATOR_GUIDANCE } from '@/data/enterpriseIndicatorGuidance';

type CollectionType = 'AUTOMATICA' | 'MANUAL' | 'ESTIMADA';
export type EffectiveCollection = 'AUTOMATICA' | 'DERIVED' | 'MANUAL' | 'ESTIMADA';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type IndicatorScope = 'territorial' | 'enterprise' | 'both';

const reliabilityIcons = {
  AUTOMATICA: { icon: ShieldCheck, color: 'text-severity-good', label: 'Automático' },
  MANUAL: { icon: Shield, color: 'text-severity-moderate', label: 'Manual' },
  ESTIMADA: { icon: ShieldAlert, color: 'text-severity-critical', label: 'Estimado' },
};

const tierConfig = {
  COMPLETE: { label: 'Integral', icon: Target, color: 'text-primary', bgClass: 'bg-primary/10 border-primary/30' },
  MEDIUM: { label: 'Estratégico', icon: Gauge, color: 'text-amber-600', bgClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-500/30' },
  SMALL: { label: 'Essencial', icon: Zap, color: 'text-green-600', bgClass: 'bg-green-50 dark:bg-green-950/30 border-green-500/30' },
};

const interpretationLabels: Record<string, string> = {
  'Estrutural': 'Estrutural',
  'Gestão': 'Gestão',
  'Entrega': 'Entrega',
};

const scopeLabels: Record<IndicatorScope, { label: string; color: string; bgColor: string }> = {
  territorial: { label: 'Territorial', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' },
  enterprise: { label: 'Enterprise', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800' },
  both: { label: 'Ambos', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' },
};

// Codes that are auto-fetched via REAL API
const API_FETCHED_CODES = new Set([
  'igma_populacao', 'igma_pib_per_capita', 'igma_idh', 'igma_area_territorial',
  'igma_densidade_demografica', 'igma_leitos_por_habitante', 'igma_cobertura_saude',
  'igma_ideb', 'igma_receita_propria', 'igma_despesa_turismo',
  'igma_meios_hospedagem',
  'igma_categoria_mapa_turismo', 'igma_regiao_turistica',
  'igma_empregos_turismo', 'igma_estabelecimentos_turismo',
  'igma_visitantes_internacionais', 'igma_visitantes_nacionais',
  'igma_arrecadacao_turismo', 'igma_conselho_municipal_turismo',
]);

const CADASTUR_SEMI_AUTO_CODES = new Set([
  'igma_guias_turismo', 'igma_agencias_turismo',
]);

const MANUAL_ENTRY_CODES = new Set([
  'igma_taxa_escolarizacao',
]);

// Indicadores derivados (calculados via fórmula a partir de fontes oficiais)
export const DERIVED_INDICATOR_CODES = new Set([
  'igma_guias_por_10k',
  'igma_hospedagem_por_10k',
  'igma_agencias_por_10k',
  'igma_empregos_turismo_por_1k',
  'igma_despesa_turismo_per_capita',
  'igma_arrecadacao_turismo_per_capita',
  'igma_visitantes_por_1k',
]);

export const getEffectiveCollection = (i: any): EffectiveCollection => {
  if (DERIVED_INDICATOR_CODES.has(i.code)) return 'DERIVED';
  if (API_FETCHED_CODES.has(i.code) || CADASTUR_SEMI_AUTO_CODES.has(i.code)) return 'AUTOMATICA';
  if (MANUAL_ENTRY_CODES.has(i.code)) return 'MANUAL';
  return (i.collection_type || 'MANUAL') as EffectiveCollection;
};

// Confiabilidade 1-5 baseada na efetiva coleta (regra determinística)
export const getReliabilityStars = (i: any): number => {
  const c = getEffectiveCollection(i);
  switch (c) {
    case 'AUTOMATICA': return 5;
    case 'DERIVED': return 4;
    case 'MANUAL': return 3;
    case 'ESTIMADA': return 2;
    default: return 3;
  }
};

const directionLabels: Record<string, string> = {
  HIGH_IS_BETTER: '↑ Maior é melhor',
  LOW_IS_BETTER: '↓ Menor é melhor',
};

const normLabels: Record<string, string> = {
  MIN_MAX: 'Min-Max',
  BANDS: 'Faixas',
  BINARY: 'Binário',
};

interface IndicadoresTableProps {
  filteredIndicators: any[];
  indicators: any[];
  isLoading: boolean;
  isMobile: boolean;
  editingWeightId: string | null;
  editingWeightValue: string;
  editingTierId: string | null;
  editingScopeId: string | null;
  updateIndicatorPending: boolean;
  onStartEditWeight: (indicator: any) => void;
  onCancelEditWeight: () => void;
  onSaveWeight: (indicatorId: string) => void;
  onWeightKeyDown: (e: React.KeyboardEvent, indicatorId: string) => void;
  onWeightValueChange: (value: string) => void;
  onUpdateTier: (indicatorId: string, tier: DiagnosisTier) => void;
  onSaveScope: (indicatorId: string, scope: IndicatorScope) => void;
  onSetEditingTierId: (id: string | null) => void;
  onSetEditingScopeId: (id: string | null) => void;
  onDeleteIndicator: (id: string) => void;
  onSetSelectedIndicator: (indicator: any) => void;
}

export function IndicadoresTable({
  filteredIndicators,
  indicators,
  isLoading,
  isMobile,
  editingWeightId,
  editingWeightValue,
  editingTierId,
  editingScopeId,
  updateIndicatorPending,
  onStartEditWeight,
  onCancelEditWeight,
  onSaveWeight,
  onWeightKeyDown,
  onWeightValueChange,
  onUpdateTier,
  onSaveScope,
  onSetEditingTierId,
  onSetEditingScopeId,
  onDeleteIndicator,
  onSetSelectedIndicator,
}: IndicadoresTableProps) {
  const isPendingConfirmation = (_indicator: any) => false;

  const renderIndicatorDialog = (indicator: any) => {
    const isIGMA = (indicator as any).source === 'IGMA';
    const igmaDimension = (indicator as any).igma_dimension;
    const defaultInterpretation = (indicator as any).default_interpretation;
    const isPending = isPendingConfirmation(indicator);

    return (
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{indicator.name}</DialogTitle>
          <DialogDescription>Código: {indicator.code}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isIGMA && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Fonte: IGMA</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Dimensão IGMA:</span>
                  <p className="font-medium">{igmaDimension || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pilar SISTUR:</span>
                  <p className="font-medium">{indicator.pillar}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Interpretação padrão:</span>
                  <p className="font-medium">{defaultInterpretation || 'N/A'}</p>
                </div>
              </div>
              {isPending && (
                <div className="mt-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Pendente de confirmação</span>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Direção:</span>
              <p className="font-medium">{directionLabels[indicator.direction]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Normalização:</span>
              <p className="font-medium">{normLabels[indicator.normalization]}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Peso:</span>
              <p className="font-medium">{(indicator.weight * 100).toFixed(0)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tema:</span>
              <p className="font-medium capitalize">{indicator.theme}</p>
            </div>
          </div>
          {indicator.description && (
            <div>
              <span className="text-muted-foreground text-sm">Descrição:</span>
              <p className="text-sm mt-1">{indicator.description}</p>
            </div>
          )}
          {/* Guidance for enterprise indicators */}
          {INDICATOR_GUIDANCE[indicator.code] && (
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">💡 Como obter este dado</p>
              <p className="text-sm text-blue-700/90 dark:text-blue-300/90">
                {INDICATOR_GUIDANCE[indicator.code].howToFind}
              </p>
              {INDICATOR_GUIDANCE[indicator.code].examples && (
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1 italic">
                  Exemplo: {INDICATOR_GUIDANCE[indicator.code].examples}
                </p>
              )}
              {INDICATOR_GUIDANCE[indicator.code].validation && (
                <p className="text-xs text-muted-foreground mt-1">
                  Faixa válida: {INDICATOR_GUIDANCE[indicator.code].validation!.min ?? '—'} a {INDICATOR_GUIDANCE[indicator.code].validation!.max ?? '∞'}
                  {INDICATOR_GUIDANCE[indicator.code].validation!.integer && ' (inteiro)'}
                </p>
              )}
            </div>
          )}
          {(indicator as any).notes && (
            <div>
              <span className="text-muted-foreground text-sm">Notas:</span>
              <p className="text-sm mt-1 text-muted-foreground">{(indicator as any).notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    );
  };

  const renderScopeEditor = (indicator: any) => {
    const indicatorScope = ((indicator as any).indicator_scope || 'territorial') as IndicatorScope;
    const scopeInfo = scopeLabels[indicatorScope];

    if (editingScopeId === indicator.id) {
      return (
        <Select
          defaultValue={indicatorScope}
          onValueChange={(value) => onSaveScope(indicator.id, value as IndicatorScope)}
          onOpenChange={(open) => {
            if (!open) onSetEditingScopeId(null);
          }}
          open={true}
        >
          <SelectTrigger className={cn("h-8", isMobile ? "h-7 w-32 text-xs" : "w-32")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="territorial">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-blue-600" />
                <span>Territorial</span>
              </div>
            </SelectItem>
            <SelectItem value="enterprise">
              <div className="flex items-center gap-2">
                <Hotel className="h-3 w-3 text-amber-600" />
                <span>Enterprise</span>
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-purple-600" />
                <span>Ambos</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <button
        onClick={() => onSetEditingScopeId(indicator.id)}
        className={cn(
          "rounded transition-colors flex gap-1",
          !isMobile && "hover:bg-muted px-1 py-0.5 cursor-pointer"
        )}
      >
        {indicatorScope === 'both' ? (
          <>
            <Badge variant="outline" className={cn('gap-1 border', scopeLabels.territorial.bgColor)}>
              <Landmark className={cn('h-3 w-3', scopeLabels.territorial.color)} />
              <span className={scopeLabels.territorial.color}>{scopeLabels.territorial.label}</span>
            </Badge>
            <Badge variant="outline" className={cn('gap-1 border', scopeLabels.enterprise.bgColor)}>
              <Hotel className={cn('h-3 w-3', scopeLabels.enterprise.color)} />
              <span className={scopeLabels.enterprise.color}>{scopeLabels.enterprise.label}</span>
            </Badge>
          </>
        ) : (
          <Badge variant="outline" className={cn('gap-1 border', scopeInfo.bgColor)}>
            {indicatorScope === 'territorial' && <Landmark className={cn('h-3 w-3', scopeInfo.color)} />}
            {indicatorScope === 'enterprise' && <Hotel className={cn('h-3 w-3', scopeInfo.color)} />}
            <span className={scopeInfo.color}>{scopeInfo.label}</span>
          </Badge>
        )}
      </button>
    );
  };

  const renderTierEditor = (indicator: any) => {
    const currentTier = ((indicator as any).minimum_tier || 'COMPLETE') as DiagnosisTier;
    const tierInfo = tierConfig[currentTier];
    const TierIcon = tierInfo.icon;
    const isEditingTier = editingTierId === indicator.id;

    if (isEditingTier) {
      return (
        <Select
          defaultValue={currentTier}
          onValueChange={(value) => onUpdateTier(indicator.id, value as DiagnosisTier)}
        >
          <SelectTrigger className="h-8 w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SMALL">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-green-600" />
                Essencial
              </div>
            </SelectItem>
            <SelectItem value="MEDIUM">
              <div className="flex items-center gap-2">
                <Gauge className="h-3 w-3 text-amber-600" />
                Estratégico
              </div>
            </SelectItem>
            <SelectItem value="COMPLETE">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" />
                Integral
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }

    return (
      <button
        onClick={() => onSetEditingTierId(indicator.id)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80 cursor-pointer",
          tierInfo.bgClass
        )}
      >
        <TierIcon className={cn("h-3 w-3", tierInfo.color)} />
        <span className={tierInfo.color}>{tierInfo.label}</span>
      </button>
    );
  };

  const renderWeightEditor = (indicator: any) => {
    const isEditingWeight = editingWeightId === indicator.id;

    if (isEditingWeight) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            className={cn(
              "text-right font-mono text-sm",
              isMobile ? "w-16 h-8" : "w-16 h-7"
            )}
            value={editingWeightValue}
            onChange={(e) => onWeightValueChange(e.target.value)}
            onKeyDown={(e) => onWeightKeyDown(e, indicator.id)}
            autoFocus
          />
          <span className="text-xs text-muted-foreground">%</span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(isMobile ? "h-8 w-8" : "h-7 w-7")}
            onClick={() => onSaveWeight(indicator.id)}
            disabled={updateIndicatorPending}
          >
            {updateIndicatorPending ? (
              <Loader2 className={cn("animate-spin", isMobile ? "h-4 w-4" : "h-3 w-3")} />
            ) : (
              <Check className={cn("text-green-500", isMobile ? "h-4 w-4" : "h-3 w-3")} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(isMobile ? "h-8 w-8" : "h-7 w-7")}
            onClick={onCancelEditWeight}
          >
            <X className={cn("text-muted-foreground", isMobile ? "h-4 w-4" : "h-3 w-3")} />
          </Button>
        </div>
      );
    }

    return (
      <button
        onClick={() => onStartEditWeight(indicator)}
        className={cn(
          "font-mono text-sm hover:bg-muted rounded transition-colors",
          isMobile ? "px-3 py-1.5" : "px-2 py-1 cursor-pointer"
        )}
      >
        {(indicator.weight * 100).toFixed(0)}%
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border overflow-hidden">
        {isMobile ? (
          // MOBILE CARD VIEW
          <div className="divide-y">
            {filteredIndicators.map((indicator) => {
              const collectionType = getEffectiveCollection(indicator) as CollectionType;
              const isIGMA = (indicator as any).source === 'IGMA';
              const igmaDimension = (indicator as any).igma_dimension;
              const defaultInterpretation = (indicator as any).default_interpretation;
              const isPending = isPendingConfirmation(indicator);

              return (
                <div key={indicator.id} className={cn("p-4 space-y-3", isPending && 'opacity-60')}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{indicator.code}</span>
                        {isPending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Pendente de confirmação</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="text-left hover:underline w-full"
                            onClick={() => onSetSelectedIndicator(indicator)}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-sm">{indicator.name}</span>
                              {(indicator as any).is_mandala_extension && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/50 text-primary bg-primary/10">
                                  🌀 MST
                                </Badge>
                              )}
                              {CADASTUR_SEMI_AUTO_CODES.has(indicator.code) ? (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-cyan-500/50 text-cyan-600 bg-cyan-500/10">
                                  <Database className="h-2.5 w-2.5 mr-0.5" />
                                  CADASTUR
                                </Badge>
                              ) : collectionType === 'AUTOMATICA' && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 border-severity-good/50 text-severity-good bg-severity-good/10">
                                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                                  API
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {directionLabels[indicator.direction]}
                            </div>
                          </button>
                        </DialogTrigger>
                        {renderIndicatorDialog(indicator)}
                      </Dialog>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onStartEditWeight(indicator)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Peso
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeleteIndicator(indicator.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {renderScopeEditor(indicator)}
                    {isIGMA && (
                      <Badge variant="outline" className="border-primary/50 text-primary">
                        <Database className="h-3 w-3 mr-1" />
                        IGMA
                      </Badge>
                    )}
                    <Badge variant={indicator.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                      {indicator.pillar}
                    </Badge>
                    <Badge variant="outline">{normLabels[indicator.normalization]}</Badge>
                    {defaultInterpretation && (
                      <Badge variant="secondary" className="text-xs">
                        {interpretationLabels[defaultInterpretation] || defaultInterpretation}
                      </Badge>
                    )}
                  </div>

                  {/* Theme */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tema: </span>
                    <span className="capitalize">{isIGMA && igmaDimension ? igmaDimension : indicator.theme}</span>
                  </div>

                  {/* Tier Editor - Mobile */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Tier:</span>
                    {renderTierEditor(indicator)}
                  </div>

                  {/* Weight Editor */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Peso:</span>
                    {renderWeightEditor(indicator)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Escopo</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Dimensão/Tema</TableHead>
                <TableHead>Interpretação</TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">Confiab.</TooltipTrigger>
                    <TooltipContent>
                      Confiabilidade da fonte (1-5):<br/>
                      5★ Automático (API oficial)<br/>
                      4★ Calculado (derivado oficial)<br/>
                      3★ Manual (entrada do usuário)<br/>
                      2★ Estimado
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">Tier</TooltipTrigger>
                    <TooltipContent>Clique para editar o nível mínimo</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>Normalização</TableHead>
                <TableHead className="text-right">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">Peso</TooltipTrigger>
                    <TooltipContent>Clique para editar</TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndicators.map((indicator) => {
                const collectionType = getEffectiveCollection(indicator) as CollectionType;
                const isIGMA = (indicator as any).source === 'IGMA';
                const igmaDimension = (indicator as any).igma_dimension;
                const defaultInterpretation = (indicator as any).default_interpretation;
                const isPending = isPendingConfirmation(indicator);

                return (
                  <TableRow key={indicator.id} className={cn(isPending && 'opacity-60')}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {indicator.code}
                        {isPending && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>Pendente de confirmação</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            className="text-left hover:underline"
                            onClick={() => onSetSelectedIndicator(indicator)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{indicator.name}</span>
                              {indicator.description && (
                                <Info className="h-4 w-4 text-muted-foreground" />
                              )}
                              {(indicator as any).is_mandala_extension && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/50 text-primary bg-primary/10">
                                  🌀 MST
                                </Badge>
                              )}
                              {CADASTUR_SEMI_AUTO_CODES.has(indicator.code) ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/50 text-cyan-600 bg-cyan-500/10">
                                  <Database className="h-3 w-3 mr-0.5" />
                                  CADASTUR
                                </Badge>
                              ) : collectionType === 'DERIVED' ? (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-500/50 text-violet-600 bg-violet-500/10">
                                  <Calculator className="h-3 w-3 mr-0.5" />
                                  CALCULADO
                                </Badge>
                              ) : collectionType === 'AUTOMATICA' && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-severity-good/50 text-severity-good bg-severity-good/10">
                                  <Zap className="h-3 w-3 mr-0.5" />
                                  API
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {directionLabels[indicator.direction]}
                            </span>
                          </button>
                        </DialogTrigger>
                        {renderIndicatorDialog(indicator)}
                      </Dialog>
                    </TableCell>
                    <TableCell>{renderScopeEditor(indicator)}</TableCell>
                    <TableCell>
                      {isIGMA ? (
                        <Badge variant="outline" className="border-primary/50 text-primary">
                          <Database className="h-3 w-3 mr-1" />
                          IGMA
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={indicator.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                        {indicator.pillar}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isIGMA && igmaDimension ? (
                        <span className="text-sm">{igmaDimension}</span>
                      ) : (
                        <span className="capitalize text-sm">{indicator.theme}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {defaultInterpretation ? (
                        <Badge variant="secondary" className="text-xs">
                          {interpretationLabels[defaultInterpretation] || defaultInterpretation}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const stars = getReliabilityStars(indicator);
                        const colorMap: Record<number, string> = {
                          5: 'text-severity-good border-severity-good/40 bg-severity-good/10',
                          4: 'text-violet-600 border-violet-500/40 bg-violet-500/10',
                          3: 'text-severity-moderate border-severity-moderate/40 bg-severity-moderate/10',
                          2: 'text-severity-critical border-severity-critical/40 bg-severity-critical/10',
                          1: 'text-muted-foreground border-muted bg-muted/30',
                        };
                        return (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className={cn('gap-1 font-mono text-xs', colorMap[stars])}>
                                <Star className="h-3 w-3 fill-current" />
                                {stars}/5
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {collectionType === 'AUTOMATICA' && 'Coletado de API oficial'}
                              {collectionType === 'DERIVED' && 'Calculado a partir de fontes oficiais'}
                              {collectionType === 'MANUAL' && 'Entrada manual do usuário'}
                              {collectionType === 'ESTIMADA' && 'Estimativa sem fonte primária'}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{renderTierEditor(indicator)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{normLabels[indicator.normalization]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderWeightEditor(indicator)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onStartEditWeight(indicator)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Peso
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onDeleteIndicator(indicator.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Empty State */}
      {filteredIndicators.length === 0 && (
        <div className="text-center py-16">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {indicators.length === 0 ? 'Nenhum indicador cadastrado' : 'Nenhum indicador encontrado'}
          </h3>
          <p className="mt-2 text-muted-foreground">
            {indicators.length === 0
              ? 'Comece cadastrando seu primeiro indicador.'
              : 'Tente ajustar os filtros de busca.'}
          </p>
          {indicators.length === 0 && (
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Novo Indicador
            </Button>
          )}
        </div>
      )}
    </>
  );
}
