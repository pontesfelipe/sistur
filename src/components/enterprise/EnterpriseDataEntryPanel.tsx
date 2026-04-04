import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIndicators, useIndicatorValues } from '@/hooks/useIndicators';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { BusinessReviewSearch } from './BusinessReviewSearch';
import { INDICATOR_GUIDANCE, validateIndicatorValue } from '@/data/enterpriseIndicatorGuidance';
import type { Database } from '@/integrations/supabase/types';

type Indicator = Database['public']['Tables']['indicators']['Row'];

interface EnterpriseDataEntryPanelProps {
  assessmentId: string;
  tier: 'SMALL' | 'MEDIUM' | 'COMPLETE';
  onComplete?: () => void;
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

export function EnterpriseDataEntryPanel({ assessmentId, tier, onComplete }: EnterpriseDataEntryPanelProps) {
  const { profile } = useProfile();
  
  // Use unified indicators table with enterprise scope filter
  const { indicators, isLoading: indicatorsLoading } = useIndicators({ scope: 'enterprise', tier });
  const { values: existingValues, isLoading: valuesLoading, bulkUpsertValues, upsertValue } = useIndicatorValues(assessmentId);
  
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string | null>>({});
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [activePillar, setActivePillar] = useState<'RA' | 'OE' | 'AO'>('RA');
  const [showReviewSearch, setShowReviewSearch] = useState(false);

  // Auto-fill handler from review search
  const handleReviewAutoFill = useCallback((indicatorValues: Record<string, number>) => {
    if (!indicators) return;
    const codeToId = new Map(indicators.map(i => [(i as any).code, i.id]));
    const newValues = { ...localValues };
    Object.entries(indicatorValues).forEach(([code, value]) => {
      const id = codeToId.get(code);
      if (id) {
        newValues[id] = value.toString();
      }
    });
    setLocalValues(newValues);
  }, [indicators, localValues]);
  
  // Initialize local values and ignored state from existing
  useEffect(() => {
    if (existingValues && existingValues.length > 0 && Object.keys(localValues).length === 0) {
      const initial: Record<string, string> = {};
      const ignored = new Set<string>();
      existingValues.forEach(v => {
        if (v.value_raw !== null) {
          initial[v.indicator_id] = v.value_raw.toString();
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
  }, [existingValues]);
  
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
    // Only allow valid numeric characters
    if (value !== '' && !/^-?\d*\.?\d*$/.test(value)) return;

    setLocalValues(prev => ({ ...prev, [indicatorId]: value }));

    // Validate
    const error = validateIndicatorValue(value, indicator as any);
    setValidationErrors(prev => ({ ...prev, [indicatorId]: error }));
  };
  
  const handleSave = async (proceedToCalculation: boolean = false) => {
    if (!profile?.org_id) return;

    // Check for validation errors before saving
    const activeErrors = Object.entries(validationErrors).filter(([id, err]) => err && localValues[id]);
    if (activeErrors.length > 0) {
      toast.error('Corrija os erros de validação antes de salvar', {
        description: `${activeErrors.length} indicador(es) com valores inválidos`,
      });
      return;
    }
    
    const values = Object.entries(localValues)
      .filter(([_, value]) => value !== '')
      .map(([indicatorId, value]) => ({
        assessment_id: assessmentId,
        indicator_id: indicatorId,
        value_raw: parseFloat(value),
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

      {/* Business Review Search */}
      <Collapsible open={showReviewSearch} onOpenChange={setShowReviewSearch}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Search className="h-4 w-4 text-primary" />
                  Busca Automática de Reviews Online
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showReviewSearch && "rotate-180")} />
              </div>
              <CardDescription className="text-xs">
                Pesquise avaliações do seu estabelecimento e preencha indicadores automaticamente
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <BusinessReviewSearch
                onAutoFill={handleReviewAutoFill}
                compact
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
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
                      const numericValue = currentValue ? parseFloat(currentValue) : null;
                      const benchmarkStatus = getBenchmarkStatus(indicator, numericValue);
                      const benchmarkTarget = (indicator as any).benchmark_target;
                      const isIgnored = ignoredIds.has(indicator.id);
                      
                      return (
                        <div key={indicator.id} className={cn(
                          "grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20",
                          isIgnored && "opacity-50"
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
                                Meta: {benchmarkTarget} {indicator.unit}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="any"
                              placeholder={isIgnored ? 'Ignorado' : 'Valor'}
                              value={currentValue}
                              onChange={(e) => handleValueChange(indicator.id, e.target.value)}
                              disabled={isIgnored}
                              className={cn(
                                "flex-1",
                                isIgnored && "bg-muted cursor-not-allowed",
                                !isIgnored && benchmarkStatus === 'good' && "border-green-500",
                                !isIgnored && benchmarkStatus === 'moderate' && "border-amber-500",
                                !isIgnored && benchmarkStatus === 'bad' && "border-red-500"
                              )}
                            />
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
