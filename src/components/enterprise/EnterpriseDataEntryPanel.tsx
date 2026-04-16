import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  Hotel, 
  Leaf, 
  Building2, 
  Cog, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  EyeOff,
  Search,
  Database as DatabaseIcon,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { useIndicators, useIndicatorValues } from '@/hooks/useIndicators';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { INDICATOR_GUIDANCE, validateIndicatorValue, formatIndicatorValueBR } from '@/data/enterpriseIndicatorGuidance';
import {
  EMPTY_SELECT_VALUE,
  formatIndicatorFieldDisplayValue,
  getIndicatorFieldConfig,
  getIndicatorSelectValue,
  parseIndicatorSelectValue,
  validateIndicatorSelectValue,
} from '@/lib/indicatorFieldConfig';
import type { Database } from '@/integrations/supabase/types';

type Indicator = Database['public']['Tables']['indicators']['Row'];

interface EnterpriseDataEntryPanelProps {
  assessmentId: string;
  tier: 'SMALL' | 'MEDIUM' | 'COMPLETE';
  onComplete?: () => void;
  /** Pre-filled values from review search in step 4 (code -> value) */
  initialAutoFillValues?: Record<string, number>;
}

const PILLAR_CONFIG = {
  RA: {
    name: 'Relações Ambientais',
    icon: Leaf,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
  },
  OE: {
    name: 'Organização Estrutural',
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-500',
  },
  AO: {
    name: 'Ações Operacionais',
    icon: Cog,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
  },
};

export function EnterpriseDataEntryPanel({ assessmentId, tier, onComplete, initialAutoFillValues }: EnterpriseDataEntryPanelProps) {
  const { profile } = useProfile();
  
  // Use unified indicators table with enterprise scope filter
  const { indicators, isLoading: indicatorsLoading } = useIndicators({ scope: 'enterprise', tier });
  const { values: existingValues, isLoading: valuesLoading, bulkUpsertValues, upsertValue } = useIndicatorValues(assessmentId);
  
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [activePillar, setActivePillar] = useState<'RA' | 'OE' | 'AO'>('RA');

  const formatNumberBR = useCallback((value: number | null | undefined, indicator?: Indicator) => {
    return formatIndicatorFieldDisplayValue(value, indicator as any);
  }, []);

  const parseNumberBR = useCallback((value: string) => {
    const raw = value.trim();
    if (!raw) return null;

    if (raw.includes(',')) {
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const dotParts = raw.split('.');
    if (dotParts.length === 2) {
      const [, decimalPart] = dotParts;
      const normalized = decimalPart.length === 3 ? raw.replace('.', '') : raw;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (dotParts.length > 2) {
      const parsed = Number(raw.replace(/\./g, ''));
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  const normalizeForValidation = useCallback((value: string) => {
    const parsed = parseNumberBR(value);
    return parsed === null ? value : String(parsed);
  }, [parseNumberBR]);

  // Initialize local values and ignored state from existing
  useEffect(() => {
    if (existingValues && existingValues.length > 0 && Object.keys(localValues).length === 0) {
      const initial: Record<string, string> = {};
      const ignored = new Set<string>();
      const indicatorById = new Map((indicators || []).map(i => [i.id, i]));
      existingValues.forEach(v => {
        if (v.value_raw !== null) {
          initial[v.indicator_id] = formatNumberBR(v.value_raw, indicatorById.get(v.indicator_id));
        }
        if (v.is_ignored) {
          ignored.add(v.indicator_id);
        }
      });
      if (Object.keys(initial).length > 0) {
        setLocalValues(initial);
      }
      if (ignored.size > 0) {
        setIgnoredIds(ignored);
      }
    }
  }, [existingValues, localValues, formatNumberBR, indicators]);

  // Index existing values by indicator_id so we can surface provenance
  // (source, reference_date, value_text) next to each input. This data is
  // already persisted and used in the report prompt — the UI just never
  // exposed it before.
  const existingByIndicator = useMemo(() => {
    const map = new Map<string, any>();
    (existingValues || []).forEach((v: any) => {
      map.set(v.indicator_id, v);
    });
    return map;
  }, [existingValues]);

  // Apply initial auto-fill values from step 4 review search
  useEffect(() => {
    if (!initialAutoFillValues || Object.keys(initialAutoFillValues).length === 0 || !indicators) return;
    const codeToId = new Map(indicators.map(i => [(i as any).code, i.id]));
    const codeToIndicator = new Map(indicators.map(i => [(i as any).code, i]));
    setLocalValues(prev => {
      const updated = { ...prev };
      let applied = false;
      Object.entries(initialAutoFillValues).forEach(([code, value]) => {
        const id = codeToId.get(code);
        if (id && !updated[id]) {
          updated[id] = formatNumberBR(value, codeToIndicator.get(code));
          applied = true;
        }
      });
      return applied ? updated : prev;
    });
  }, [initialAutoFillValues, indicators, formatNumberBR]);

  const handleToggleIgnore = useCallback((indicatorId: string) => {
    setIgnoredIds(prev => {
      const next = new Set(prev);
      if (next.has(indicatorId)) {
        next.delete(indicatorId);
      } else {
        next.add(indicatorId);
      }
      return next;
    });
  }, []);
  
  // Group indicators by pillar and theme (category)
  const groupedIndicators = useMemo(() => {
    if (!indicators) return {};
    
    const grouped: Record<string, Record<string, Indicator[]>> = {
      RA: {},
      OE: {},
      AO: {},
    };
    
    indicators.forEach(ind => {
      const categoryName = ind.theme || 'Outros';
      if (!grouped[ind.pillar][categoryName]) {
        grouped[ind.pillar][categoryName] = [];
      }
      grouped[ind.pillar][categoryName].push(ind);
    });
    
    return grouped;
  }, [indicators]);
  
  // Calculate progress (exclude ignored)
  const progress = useMemo(() => {
    if (!indicators) return { filled: 0, total: 0, percent: 0, ignored: 0 };
    
    const ignored = ignoredIds.size;
    const active = indicators.filter(i => !ignoredIds.has(i.id));
    const total = active.length;
    const filled = active.filter(i => localValues[i.id] && localValues[i.id] !== '').length;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
    
    return { filled, total, percent, ignored };
  }, [indicators, localValues, ignoredIds]);
  
  // Progress by pillar (exclude ignored)
  const pillarProgress = useMemo(() => {
    if (!indicators) return {};
    
    const result: Record<string, { filled: number; total: number; percent: number }> = {};
    
    ['RA', 'OE', 'AO'].forEach(pillar => {
      const pillarIndicators = indicators.filter(i => i.pillar === pillar && !ignoredIds.has(i.id));
      const total = pillarIndicators.length;
      const filled = pillarIndicators.filter(i => localValues[i.id] && localValues[i.id] !== '').length;
      result[pillar] = {
        filled,
        total,
        percent: total > 0 ? Math.round((filled / total) * 100) : 0,
      };
    });
    
    return result;
  }, [indicators, localValues, ignoredIds]);
  
  const handleValueChange = (indicatorId: string, value: string, indicator: Indicator) => {
    const fieldConfig = getIndicatorFieldConfig({ code: (indicator as any).code, normalization: indicator.normalization });

    if (fieldConfig.kind === 'select') {
      const numVal = parseIndicatorSelectValue(value, { code: (indicator as any).code, normalization: indicator.normalization });
      const label = fieldConfig.options.find(o => o.value === value)?.label ?? '';
      setLocalValues(prev => ({ ...prev, [indicatorId]: label }));
      setValidationErrors(prev => ({ ...prev, [indicatorId]: validateIndicatorSelectValue(value, { code: (indicator as any).code, normalization: indicator.normalization }) }));
      return;
    }

    if (value !== '' && !/^-?[\d.,]*$/.test(value)) return;
    setLocalValues(prev => ({ ...prev, [indicatorId]: value }));
    const error = validateIndicatorValue(normalizeForValidation(value), indicator as any);
    setValidationErrors(prev => ({ ...prev, [indicatorId]: error }));
  };
  
  // Parse local value back to number, handling select fields
  const parseLocalValue = useCallback((value: string, indicator?: Indicator) => {
    if (!indicator) return parseNumberBR(value);
    const fieldConfig = getIndicatorFieldConfig({ code: (indicator as any).code, normalization: indicator.normalization });
    if (fieldConfig.kind === 'select') {
      const option = fieldConfig.options.find(o => o.label === value);
      return option ? option.numericValue : parseNumberBR(value);
    }
    return parseNumberBR(value);
  }, [parseNumberBR]);

  const handleSave = async (proceedToCalculation: boolean = false) => {
    if (!profile?.org_id) return;

    const activeErrors = Object.entries(validationErrors).filter(([id, err]) => err && localValues[id]);
    if (activeErrors.length > 0) {
      toast.error('Corrija os erros de validação antes de salvar', {
        description: `${activeErrors.length} indicador(es) com valores inválidos`,
      });
      return;
    }
    
    const indicatorById = new Map((indicators || []).map(i => [i.id, i]));
    const values = Object.entries(localValues)
      .filter(([_, value]) => value !== '')
      .map(([indicatorId, value]) => ({
        assessment_id: assessmentId,
        indicator_id: indicatorId,
        value_raw: parseLocalValue(value, indicatorById.get(indicatorId)),
        source: 'Manual (Enterprise)',
      }));
    
    await bulkUpsertValues.mutateAsync(values);
    
    // Save ignored state for each ignored indicator
    for (const indicatorId of ignoredIds) {
      await upsertValue.mutateAsync({
        assessment_id: assessmentId,
        indicator_id: indicatorId,
        value_raw: null,
        source: 'Manual (Enterprise)',
        is_ignored: true,
        ignore_reason: 'Marcado como não aplicável pelo usuário',
      });
    }
    
    // Update assessment status to DATA_READY if enough data is filled
    if (progress.percent >= 50) {
      await supabase
        .from('assessments')
        .update({ status: 'DATA_READY' })
        .eq('id', assessmentId);
    }
    
    if (proceedToCalculation && onComplete) {
      onComplete();
    }
  };
  
  const getBenchmarkStatus = (indicator: Indicator, value: number | null) => {
    const benchmarkTarget = (indicator as any).benchmark_target;
    const benchmarkMin = (indicator as any).benchmark_min;
    const benchmarkMax = (indicator as any).benchmark_max;
    
    if (value === null || benchmarkTarget === null) return null;
    
    // Check if lower is better (e.g., consumption, costs)
    const lowerIsBetter = benchmarkMin !== null && benchmarkMax !== null && benchmarkMin < benchmarkMax;
    
    if (lowerIsBetter) {
      if (value <= benchmarkTarget) return 'good';
      if (value <= benchmarkMax!) return 'moderate';
      return 'bad';
    } else {
      if (value >= benchmarkTarget) return 'good';
      if (benchmarkMin !== null && value >= benchmarkMin) return 'moderate';
      return 'bad';
    }
  };
  
  const isLoading = indicatorsLoading || valuesLoading;
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-amber-600" />
            Indicadores Enterprise
          </CardTitle>
          <CardDescription>
            Preencha os KPIs de hospitalidade para gerar o diagnóstico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progresso geral</span>
              <span className="font-medium">
                {progress.filled} / {progress.total} indicadores
                {progress.ignored > 0 && (
                  <span className="text-destructive ml-1">({progress.ignored} ignorado{progress.ignored > 1 ? 's' : ''})</span>
                )}
              </span>
            </div>
            <Progress value={progress.percent} className="h-2" />
          </div>
          
          {/* Pillar Progress Cards */}
          <div className="grid grid-cols-3 gap-3">
            {(['RA', 'OE', 'AO'] as const).map(pillar => {
              const config = PILLAR_CONFIG[pillar];
              const prog = pillarProgress[pillar] || { filled: 0, total: 0, percent: 0 };
              const Icon = config.icon;
              
              return (
                <button
                  key={pillar}
                  onClick={() => setActivePillar(pillar)}
                  className={cn(
                    "p-3 rounded-lg border-2 text-left transition-all",
                    activePillar === pillar 
                      ? `${config.borderColor} ${config.bgColor}` 
                      : "border-muted hover:border-muted-foreground/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className="font-medium text-sm">{pillar}</span>
                  </div>
                  <Progress value={prog.percent} className="h-1.5 mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {prog.filled}/{prog.total}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Note: Review search moved to Step 4 (EnterpriseProfileStep) to avoid duplication */}
      
      {/* Indicator Entry by Pillar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const config = PILLAR_CONFIG[activePillar];
                const Icon = config.icon;
                return (
                  <>
                    <Icon className={cn("h-5 w-5", config.color)} />
                    <CardTitle>{config.name}</CardTitle>
                  </>
                );
              })()}
            </div>
            <Badge variant="outline">
              {pillarProgress[activePillar]?.filled || 0} / {pillarProgress[activePillar]?.total || 0}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {Object.entries(groupedIndicators[activePillar] || {}).map(([categoryName, categoryIndicators]) => (
              <AccordionItem key={categoryName} value={categoryName}>
                <AccordionTrigger className="text-sm font-medium">
                  {categoryName}
                  <Badge variant="secondary" className="ml-2">
                    {categoryIndicators.filter(i => localValues[i.id] && localValues[i.id] !== '').length}/{categoryIndicators.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-2">
                    {categoryIndicators.map(indicator => {
                      const currentValue = localValues[indicator.id] || '';
                      const numericValue = currentValue ? parseNumberBR(currentValue) : null;
                      const benchmarkStatus = getBenchmarkStatus(indicator, numericValue);
                      const benchmarkTarget = (indicator as any).benchmark_target;
                      const isIgnored = ignoredIds.has(indicator.id);
                      const guidance = INDICATOR_GUIDANCE[(indicator as any).code];
                      const valError = validationErrors[indicator.id];
                      const existing = existingByIndicator.get(indicator.id);
                      const hasNonManualSource = existing?.source && existing.source !== 'Manual (Enterprise)' && existing.source !== 'Manual';
                      const referenceDate = existing?.reference_date
                        ? new Date(existing.reference_date).toLocaleDateString('pt-BR')
                        : null;
                      const observation = existing?.value_text;
                      
                      return (
                        <div key={indicator.id} className={cn(
                          "grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20",
                          isIgnored && "opacity-50",
                          valError && "border-destructive/50"
                        )}>
                          <div>
                            <label className={cn(
                              "text-sm font-medium flex items-center gap-2",
                              isIgnored && "line-through"
                            )}>
                              {indicator.name}
                              {isIgnored && (
                                <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Ignorado
                                </Badge>
                              )}
                              {!isIgnored && benchmarkStatus === 'good' && (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              )}
                              {!isIgnored && benchmarkStatus === 'moderate' && (
                                <Minus className="h-4 w-4 text-amber-500" />
                              )}
                              {!isIgnored && benchmarkStatus === 'bad' && (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {indicator.description}
                            </p>
                            {!isIgnored && benchmarkTarget !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Target className="h-3 w-3 inline mr-1" />
                                Meta: {formatNumberBR(benchmarkTarget, indicator)} {indicator.unit}
                              </p>
                            )}
                            {!isIgnored && guidance && (
                              <div className="mt-2 p-2 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  <strong>💡 Como obter:</strong> {guidance.howToFind}
                                </p>
                                {guidance.examples && (
                                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                                    <em>Ex: {guidance.examples}</em>
                                  </p>
                                )}
                              </div>
                            )}
                            {/* Provenance: surface source, reference date and free-text
                                observation that are already persisted on indicator_values
                                but were invisible in the UI until now. This is what the
                                report prompt consumes as "Evidência:". */}
                            {existing && (hasNonManualSource || referenceDate || observation) && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {hasNonManualSource && (
                                  <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                                    <Database className="h-3 w-3" />
                                    {existing.source}
                                  </Badge>
                                )}
                                {referenceDate && (
                                  <Badge variant="outline" className="text-[10px] font-normal gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Ref: {referenceDate}
                                  </Badge>
                                )}
                                {observation && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="outline" className="text-[10px] font-normal gap-1 cursor-help">
                                        <MessageSquare className="h-3 w-3" />
                                        Observação
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {observation}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              {fieldConfig.kind === 'select' ? (
                                <Select
                                  value={(() => {
                                    const opt = fieldConfig.options.find(o => o.label === currentValue);
                                    return opt?.value ?? EMPTY_SELECT_VALUE;
                                  })()}
                                  onValueChange={(selectedValue) => handleValueChange(indicator.id, selectedValue, indicator)}
                                  disabled={isIgnored}
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "flex-1",
                                      isIgnored && "bg-muted cursor-not-allowed",
                                      valError && "border-destructive focus-visible:ring-destructive",
                                    )}
                                  >
                                    <SelectValue placeholder={isIgnored ? 'Ignorado' : 'Selecionar'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={EMPTY_SELECT_VALUE}>Não informado</SelectItem>
                                    {fieldConfig.options.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder={isIgnored ? 'Ignorado' : 'Valor'}
                                  value={currentValue}
                                  onChange={(e) => handleValueChange(indicator.id, e.target.value, indicator)}
                                  onBlur={() => {
                                    const parsed = parseNumberBR(currentValue);
                                    setLocalValues(prev => ({
                                      ...prev,
                                      [indicator.id]: parsed === null ? '' : formatNumberBR(parsed, indicator),
                                    }));
                                  }}
                                  disabled={isIgnored}
                                  className={cn(
                                    "flex-1",
                                    isIgnored && "bg-muted cursor-not-allowed",
                                    valError && "border-destructive focus-visible:ring-destructive",
                                    !valError && !isIgnored && benchmarkStatus === 'good' && "border-green-500",
                                    !valError && !isIgnored && benchmarkStatus === 'moderate' && "border-amber-500",
                                    !valError && !isIgnored && benchmarkStatus === 'bad' && "border-red-500"
                                  )}
                                />
                              )}
                              <span className="text-sm text-muted-foreground min-w-[40px]">
                                {indicator.unit}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant={isIgnored ? "destructive" : "ghost"}
                                    className="h-8 w-8 p-0 shrink-0"
                                    onClick={() => handleToggleIgnore(indicator.id)}
                                  >
                                    <EyeOff className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isIgnored ? 'Reativar indicador' : 'Ignorar (não será considerado no cálculo)'}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {valError && (
                              <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {valError}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {progress.percent >= 50 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Dados suficientes para cálculo do diagnóstico ({progress.filled}/{progress.total} preenchidos)
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Preencha ao menos 50% dos indicadores ({progress.filled}/{Math.ceil(progress.total * 0.5)} mínimo)
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleSave(false)} 
                disabled={bulkUpsertValues.isPending || progress.filled === 0}
              >
                {bulkUpsertValues.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Rascunho
              </Button>
              <Button 
                onClick={() => handleSave(true)} 
                disabled={bulkUpsertValues.isPending || progress.percent < 50}
              >
                {bulkUpsertValues.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Salvar e Calcular Índices
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
