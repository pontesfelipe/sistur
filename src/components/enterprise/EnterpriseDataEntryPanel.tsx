import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useEnterpriseIndicators, 
  useEnterpriseIndicatorValues,
  useBulkSaveEnterpriseIndicatorValues,
  EnterpriseIndicator,
} from '@/hooks/useEnterpriseIndicators';
import { useProfile } from '@/hooks/useProfile';

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
  const { data: indicators, isLoading: indicatorsLoading } = useEnterpriseIndicators(tier);
  const { data: existingValues, isLoading: valuesLoading } = useEnterpriseIndicatorValues(assessmentId);
  const bulkSave = useBulkSaveEnterpriseIndicatorValues();
  
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [activePillar, setActivePillar] = useState<'RA' | 'OE' | 'AO'>('RA');
  
  // Initialize local values from existing
  useMemo(() => {
    if (existingValues && Object.keys(localValues).length === 0) {
      const initial: Record<string, string> = {};
      existingValues.forEach(v => {
        if (v.value !== null) {
          initial[v.indicator_id] = v.value.toString();
        }
      });
      if (Object.keys(initial).length > 0) {
        setLocalValues(initial);
      }
    }
  }, [existingValues]);
  
  // Group indicators by pillar and category
  const groupedIndicators = useMemo(() => {
    if (!indicators) return {};
    
    const grouped: Record<string, Record<string, EnterpriseIndicator[]>> = {
      RA: {},
      OE: {},
      AO: {},
    };
    
    indicators.forEach(ind => {
      const categoryName = ind.category?.name || 'Outros';
      if (!grouped[ind.pillar][categoryName]) {
        grouped[ind.pillar][categoryName] = [];
      }
      grouped[ind.pillar][categoryName].push(ind);
    });
    
    return grouped;
  }, [indicators]);
  
  // Calculate progress
  const progress = useMemo(() => {
    if (!indicators) return { filled: 0, total: 0, percent: 0 };
    
    const total = indicators.length;
    const filled = Object.keys(localValues).filter(k => localValues[k] && localValues[k] !== '').length;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
    
    return { filled, total, percent };
  }, [indicators, localValues]);
  
  // Progress by pillar
  const pillarProgress = useMemo(() => {
    if (!indicators) return {};
    
    const result: Record<string, { filled: number; total: number; percent: number }> = {};
    
    ['RA', 'OE', 'AO'].forEach(pillar => {
      const pillarIndicators = indicators.filter(i => i.pillar === pillar);
      const total = pillarIndicators.length;
      const filled = pillarIndicators.filter(i => localValues[i.id] && localValues[i.id] !== '').length;
      result[pillar] = {
        filled,
        total,
        percent: total > 0 ? Math.round((filled / total) * 100) : 0,
      };
    });
    
    return result;
  }, [indicators, localValues]);
  
  const handleValueChange = (indicatorId: string, value: string) => {
    setLocalValues(prev => ({
      ...prev,
      [indicatorId]: value,
    }));
  };
  
  const handleSave = async () => {
    if (!profile?.org_id) return;
    
    const effectiveOrgId = profile.viewing_demo_org_id || profile.org_id;
    
    const values = Object.entries(localValues)
      .filter(([_, value]) => value !== '')
      .map(([indicatorId, value]) => ({
        indicatorId,
        value: parseFloat(value),
        source: 'manual',
        referenceDate: new Date().toISOString().split('T')[0],
      }));
    
    await bulkSave.mutateAsync({
      assessmentId,
      orgId: effectiveOrgId,
      values,
    });
    
    onComplete?.();
  };
  
  const getBenchmarkStatus = (indicator: EnterpriseIndicator, value: number | null) => {
    if (value === null || indicator.benchmark_target === null) return null;
    
    const { benchmark_min, benchmark_max, benchmark_target } = indicator;
    
    // Check if lower is better (e.g., consumption, costs)
    const lowerIsBetter = benchmark_min !== null && benchmark_max !== null && benchmark_min < benchmark_max;
    
    if (lowerIsBetter) {
      if (value <= benchmark_target) return 'good';
      if (value <= benchmark_max!) return 'moderate';
      return 'bad';
    } else {
      if (value >= benchmark_target) return 'good';
      if (benchmark_min !== null && value >= benchmark_min) return 'moderate';
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
              <span className="font-medium">{progress.filled} / {progress.total} indicadores</span>
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
                      
                      return (
                        <div key={indicator.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20">
                          <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                              {indicator.name}
                              {benchmarkStatus === 'good' && (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              )}
                              {benchmarkStatus === 'moderate' && (
                                <Minus className="h-4 w-4 text-amber-500" />
                              )}
                              {benchmarkStatus === 'bad' && (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {indicator.description}
                            </p>
                            {indicator.benchmark_target !== null && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <Target className="h-3 w-3 inline mr-1" />
                                Meta: {indicator.benchmark_target} {indicator.unit}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="any"
                              placeholder="Valor"
                              value={currentValue}
                              onChange={(e) => handleValueChange(indicator.id, e.target.value)}
                              className={cn(
                                "flex-1",
                                benchmarkStatus === 'good' && "border-green-500",
                                benchmarkStatus === 'moderate' && "border-amber-500",
                                benchmarkStatus === 'bad' && "border-red-500"
                              )}
                            />
                            <span className="text-sm text-muted-foreground min-w-[60px]">
                              {indicator.unit}
                            </span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {progress.percent >= 50 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Dados suficientes para cálculo do diagnóstico
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Preencha ao menos 50% dos indicadores ({Math.ceil(progress.total * 0.5)} mínimo)
                </>
              )}
            </div>
            <Button onClick={handleSave} disabled={bulkSave.isPending}>
              {bulkSave.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Indicadores
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
