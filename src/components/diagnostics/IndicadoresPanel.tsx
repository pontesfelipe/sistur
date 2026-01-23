import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  BarChart3,
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
  FileBarChart,
  List,
} from 'lucide-react';
import { useIndicators } from '@/hooks/useIndicators';
import { useIsMobile } from '@/hooks/use-mobile';
import { IndicatorDistributionReport } from './IndicatorDistributionReport';
import { IndicatorFormDialog } from './IndicatorFormDialog';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// EnterpriseIndicatorsPanel removed - unified into single panel

type CollectionType = 'AUTOMATICA' | 'MANUAL' | 'ESTIMADA';
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

export function IndicadoresPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editingWeightValue, setEditingWeightValue] = useState<string>('');
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingScopeId, setEditingScopeId] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { indicators, isLoading, deleteIndicator, updateIndicator, createIndicator } = useIndicators();
  const isMobile = useIsMobile();

  const directionLabels = {
    HIGH_IS_BETTER: '↑ Maior é melhor',
    LOW_IS_BETTER: '↓ Menor é melhor',
  };

  const normLabels = {
    MIN_MAX: 'Min-Max',
    BANDS: 'Faixas',
    BINARY: 'Binário',
  };

  // Get unique themes
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    indicators.forEach(i => {
      if (i.theme) themes.add(i.theme);
    });
    return Array.from(themes).sort();
  }, [indicators]);

  const filteredIndicators = indicators.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.theme.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = pillarFilter === 'all' || i.pillar.toLowerCase() === pillarFilter;
    const indicatorSource = (i as any).source || '';
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'igma' && indicatorSource === 'IGMA') ||
      (sourceFilter === 'other' && indicatorSource !== 'IGMA');
    const matchesTheme = themeFilter === 'all' || i.theme === themeFilter;
    const indicatorTier = (i as any).minimum_tier || 'COMPLETE';
    const matchesTier = tierFilter === 'all' || indicatorTier === tierFilter;
    const indicatorScope = (i as any).indicator_scope || 'territorial';
    const matchesScope = scopeFilter === 'all' || indicatorScope === scopeFilter;
    return matchesSearch && matchesPillar && matchesSource && matchesTheme && matchesTier && matchesScope;
  });

  // Count by tier
  const tierCounts = useMemo(() => ({
    SMALL: indicators.filter(i => (i as any).minimum_tier === 'SMALL').length,
    MEDIUM: indicators.filter(i => (i as any).minimum_tier === 'MEDIUM').length,
    COMPLETE: indicators.filter(i => !((i as any).minimum_tier) || (i as any).minimum_tier === 'COMPLETE').length,
  }), [indicators]);

  // Count by scope
  const scopeCounts = useMemo(() => ({
    territorial: indicators.filter(i => (i as any).indicator_scope === 'territorial').length,
    enterprise: indicators.filter(i => (i as any).indicator_scope === 'enterprise').length,
    both: indicators.filter(i => (i as any).indicator_scope === 'both').length,
  }), [indicators]);

  const handleUpdateTier = async (indicatorId: string, newTier: DiagnosisTier) => {
    try {
      await updateIndicator.mutateAsync({
        id: indicatorId,
        minimum_tier: newTier,
      } as any);
      toast.success('Tier atualizado com sucesso');
      setEditingTierId(null);
    } catch (error) {
      toast.error('Erro ao atualizar tier');
    }
  };

  const igmaCount = indicators.filter(i => (i as any).source === 'IGMA').length;

  const pillarNames = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  const isPendingConfirmation = (_indicator: any) => {
    return false; // Disabled - indicators 'a confirmar' are now shown normally
  };

  const handleStartEditWeight = (indicator: any) => {
    setEditingWeightId(indicator.id);
    setEditingWeightValue(String(Math.round(indicator.weight * 100)));
  };

  const handleCancelEditWeight = () => {
    setEditingWeightId(null);
    setEditingWeightValue('');
  };

  const handleSaveWeight = async (indicatorId: string) => {
    const newWeight = parseFloat(editingWeightValue) / 100;
    
    if (isNaN(newWeight) || newWeight < 0 || newWeight > 1) {
      toast.error('Peso inválido. Use um valor entre 0 e 100.');
      return;
    }

    try {
      await updateIndicator.mutateAsync({
        id: indicatorId,
        weight: newWeight,
      });
      toast.success('Peso atualizado com sucesso');
      setEditingWeightId(null);
      setEditingWeightValue('');
    } catch (error) {
      toast.error('Erro ao atualizar peso');
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent, indicatorId: string) => {
    if (e.key === 'Enter') {
      handleSaveWeight(indicatorId);
    } else if (e.key === 'Escape') {
      handleCancelEditWeight();
    }
  };

  const handleSaveScope = async (indicatorId: string, newScope: IndicatorScope) => {
    try {
      await updateIndicator.mutateAsync({
        id: indicatorId,
        indicator_scope: newScope,
      } as any);
      toast.success('Escopo atualizado com sucesso');
      setEditingScopeId(null);
    } catch {
      toast.error('Erro ao atualizar escopo');
    }
  };

  const handleCreateIndicator = async (data: any) => {
    setIsCreating(true);
    try {
      await createIndicator.mutateAsync(data);
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error('Error creating indicator:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Tabs defaultValue="list" className="space-y-6">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileBarChart className="h-4 w-4" />
            Relatório
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="list" className="space-y-6 mt-0">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1 flex-wrap">
          <div className="relative max-w-md flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicadores..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-full xs:w-32">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ra">IRA</SelectItem>
              <SelectItem value="oe">IOE</SelectItem>
              <SelectItem value="ao">IAO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full xs:w-32">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="igma">IGMA</SelectItem>
              <SelectItem value="other">Outras</SelectItem>
            </SelectContent>
          </Select>
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-full xs:w-44">
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os temas</SelectItem>
              {availableThemes.map(theme => (
                <SelectItem key={theme} value={theme}>{theme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full xs:w-36">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="SMALL">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-green-600" />
                  Essencial ({tierCounts.SMALL})
                </div>
              </SelectItem>
              <SelectItem value="MEDIUM">
                <div className="flex items-center gap-2">
                  <Gauge className="h-3 w-3 text-amber-600" />
                  Estratégico ({tierCounts.MEDIUM})
                </div>
              </SelectItem>
              <SelectItem value="COMPLETE">
                <div className="flex items-center gap-2">
                  <Target className="h-3 w-3 text-primary" />
                  Integral ({tierCounts.COMPLETE})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-full xs:w-40">
              <SelectValue placeholder="Escopo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos escopos ({indicators.length})</SelectItem>
              <SelectItem value="territorial">
                <div className="flex items-center gap-2">
                  <Landmark className="h-3 w-3 text-blue-600" />
                  Territorial ({scopeCounts.territorial})
                </div>
              </SelectItem>
              <SelectItem value="enterprise">
                <div className="flex items-center gap-2">
                  <Hotel className="h-3 w-3 text-amber-600" />
                  Enterprise ({scopeCounts.enterprise})
                </div>
              </SelectItem>
              <SelectItem value="both">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-purple-600" />
                  Ambos ({scopeCounts.both})
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Indicador
        </Button>
      </div>


      <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Sobre os Níveis de Diagnóstico</h3>
            <p className="text-sm text-muted-foreground">
              Cada indicador pertence a um nível que define em quais diagnósticos ele será utilizado.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-400">Essencial</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.SMALL} ind.</Badge>
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              Indicadores essenciais para municípios menores ou análises rápidas. 
              Ideal para primeira avaliação ou destinos com dados limitados.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">Estratégico</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.MEDIUM} ind.</Badge>
            </div>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
              Adiciona indicadores de profundidade intermediária. 
              Recomendado para cidades médias ou diagnósticos de acompanhamento.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Integral</span>
              <Badge variant="outline" className="ml-auto text-xs">{tierCounts.COMPLETE} ind.</Badge>
            </div>
            <p className="text-xs text-primary/80">
              Análise mais abrangente com todos os indicadores. 
              Ideal para capitais, polos turísticos ou planejamento estratégico.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources Info */}
      <div className="p-4 rounded-lg border bg-muted/30">
        <div className="flex items-start gap-3 mb-3">
          <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Fontes de Dados Oficiais</h3>
            <p className="text-sm text-muted-foreground">
              Os indicadores podem ser pré-preenchidos automaticamente de fontes oficiais:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { name: 'IBGE', desc: 'Dados demográficos e econômicos' },
            { name: 'CADASTUR', desc: 'Serviços turísticos registrados' },
            { name: 'DATASUS', desc: 'Indicadores de saúde' },
            { name: 'INEP', desc: 'Dados educacionais' },
            { name: 'STN', desc: 'Dados fiscais municipais' },
          ].map(source => (
            <div key={source.name} className="p-2 rounded bg-background border text-center">
              <span className="font-mono text-xs font-medium text-foreground">{source.name}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">{source.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Summary by Pillar */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {(['RA', 'OE', 'AO'] as const).map((pillar) => {
          const pillarIndicators = indicators.filter(i => i.pillar === pillar);
          const totalWeight = pillarIndicators.reduce((sum, i) => sum + i.weight, 0);
          
          return (
            <div key={pillar} className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                  I{pillar}
                </Badge>
                <span className="text-sm font-medium">{pillarNames[pillar]}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-display font-bold">
                  {pillarIndicators.length}
                </span>
                <span className="text-sm text-muted-foreground">indicadores</span>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Soma dos pesos</span>
                  <span className={cn(
                    totalWeight > 1 && 'text-amber-500 font-medium',
                    totalWeight === 1 && 'text-green-500 font-medium'
                  )}>
                    {(totalWeight * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(totalWeight * 100, 100)} 
                  className={cn(
                    "h-1.5",
                    totalWeight > 1 && "[&>div]:bg-amber-500"
                  )} 
                />
              </div>
            </div>
          );
        })}
        
        {/* IGMA Summary Card */}
        <div className="p-4 rounded-lg border bg-card border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Fonte IGMA</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display font-bold text-primary">
              {igmaCount}
            </span>
            <span className="text-sm text-muted-foreground">indicadores</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Indicadores oficiais do IGMA integrados ao SISTUR
          </p>
        </div>
      </div>

      {/* Inline Edit Info */}
      <div className="p-3 bg-muted/50 rounded-lg border flex items-center gap-3">
        <Edit className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Edição de pesos, tiers e escopo:</span> Clique no peso, tier ou escopo de qualquer indicador para editá-lo.
          A soma dos pesos por pilar deve totalizar 100% para um cálculo correto.
        </p>
      </div>

      {/* Indicators Table/Cards */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : isMobile ? (
          // MOBILE CARD VIEW
          <div className="divide-y">
            {filteredIndicators.map((indicator) => {
              const isIGMA = (indicator as any).source === 'IGMA';
              const igmaDimension = (indicator as any).igma_dimension;
              const defaultInterpretation = (indicator as any).default_interpretation;
              const isPending = isPendingConfirmation(indicator);
              const isEditingWeight = editingWeightId === indicator.id;
              const indicatorScope = ((indicator as any).indicator_scope || 'territorial') as IndicatorScope;
              const scopeInfo = scopeLabels[indicatorScope];

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
                            onClick={() => setSelectedIndicator(indicator)}
                          >
                            <div className="font-medium text-sm">{indicator.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {directionLabels[indicator.direction]}
                            </div>
                          </button>
                        </DialogTrigger>
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
                            {(indicator as any).notes && (
                              <div>
                                <span className="text-muted-foreground text-sm">Notas:</span>
                                <p className="text-sm mt-1 text-muted-foreground">{(indicator as any).notes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleStartEditWeight(indicator)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Peso
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteIndicator.mutate(indicator.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    {/* Scope */}
                    {editingScopeId === indicator.id ? (
                      <Select
                        defaultValue={indicatorScope}
                        onValueChange={(value) => handleSaveScope(indicator.id, value as IndicatorScope)}
                        onOpenChange={(open) => {
                          if (!open) setEditingScopeId(null);
                        }}
                        open={true}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
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
                    ) : (
                      <button onClick={() => setEditingScopeId(indicator.id)} className="rounded transition-colors flex gap-1">
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
                    )}
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
                    {(() => {
                      const currentTier = ((indicator as any).minimum_tier || 'COMPLETE') as DiagnosisTier;
                      const tierInfo = tierConfig[currentTier];
                      const TierIcon = tierInfo.icon;
                      const isEditingThisTier = editingTierId === indicator.id;

                      if (isEditingThisTier) {
                        return (
                          <Select
                            defaultValue={currentTier}
                            onValueChange={(value) => handleUpdateTier(indicator.id, value as DiagnosisTier)}
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
                          onClick={() => setEditingTierId(indicator.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80 cursor-pointer",
                            tierInfo.bgClass
                          )}
                        >
                          <TierIcon className={cn("h-3 w-3", tierInfo.color)} />
                          <span className={tierInfo.color}>{tierInfo.label}</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Weight Editor */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Peso:</span>
                    {isEditingWeight ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          className="w-16 h-8 text-right font-mono text-sm"
                          value={editingWeightValue}
                          onChange={(e) => setEditingWeightValue(e.target.value)}
                          onKeyDown={(e) => handleWeightKeyDown(e, indicator.id)}
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSaveWeight(indicator.id)}
                          disabled={updateIndicator.isPending}
                        >
                          {updateIndicator.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCancelEditWeight}
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEditWeight(indicator)}
                        className="font-mono text-sm hover:bg-muted px-3 py-1.5 rounded transition-colors"
                      >
                        {(indicator.weight * 100).toFixed(0)}%
                      </button>
                    )}
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
                    <TooltipTrigger className="cursor-help">
                      Tier
                    </TooltipTrigger>
                    <TooltipContent>
                      Clique para editar o nível mínimo
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead>Normalização</TableHead>
                <TableHead className="text-right">
                  <Tooltip>
                    <TooltipTrigger className="cursor-help">
                      Peso
                    </TooltipTrigger>
                    <TooltipContent>
                      Clique para editar
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndicators.map((indicator) => {
                const collectionType = (indicator as any).collection_type as CollectionType | undefined;
                const reliability = reliabilityIcons[collectionType || 'MANUAL'];
                const ReliabilityIcon = reliability.icon;
                const isIGMA = (indicator as any).source === 'IGMA';
                const igmaDimension = (indicator as any).igma_dimension;
                const defaultInterpretation = (indicator as any).default_interpretation;
                const isPending = isPendingConfirmation(indicator);
                const isEditingWeight = editingWeightId === indicator.id;
                const indicatorScope = ((indicator as any).indicator_scope || 'territorial') as IndicatorScope;
                const scopeInfo = scopeLabels[indicatorScope];

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
                            <TooltipContent>
                              Pendente de confirmação
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button 
                            className="text-left hover:underline"
                            onClick={() => setSelectedIndicator(indicator)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{indicator.name}</span>
                              {indicator.description && (
                                <Info className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {directionLabels[indicator.direction]}
                            </span>
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>{indicator.name}</DialogTitle>
                            <DialogDescription>
                              Código: {indicator.code}
                            </DialogDescription>
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
                            {(indicator as any).notes && (
                              <div>
                                <span className="text-muted-foreground text-sm">Notas:</span>
                                <p className="text-sm mt-1 text-muted-foreground">{(indicator as any).notes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      {editingScopeId === indicator.id ? (
                        <Select
                          defaultValue={indicatorScope}
                          onValueChange={(value) => handleSaveScope(indicator.id, value as IndicatorScope)}
                          onOpenChange={(open) => {
                            if (!open) setEditingScopeId(null);
                          }}
                          open={true}
                        >
                          <SelectTrigger className="h-8 w-32">
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
                      ) : (
                        <button
                          onClick={() => setEditingScopeId(indicator.id)}
                          className="hover:bg-muted px-1 py-0.5 rounded transition-colors cursor-pointer flex gap-1"
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
                      )}
                    </TableCell>
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
                        <div>
                          <span className="text-sm">{igmaDimension}</span>
                        </div>
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
                        const currentTier = ((indicator as any).minimum_tier || 'COMPLETE') as DiagnosisTier;
                        const tierInfo = tierConfig[currentTier];
                        const TierIcon = tierInfo.icon;
                        const isEditingTier = editingTierId === indicator.id;

                        if (isEditingTier) {
                          return (
                            <Select
                              defaultValue={currentTier}
                              onValueChange={(value) => handleUpdateTier(indicator.id, value as DiagnosisTier)}
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
                            onClick={() => setEditingTierId(indicator.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors hover:opacity-80 cursor-pointer",
                              tierInfo.bgClass
                            )}
                          >
                            <TierIcon className={cn("h-3 w-3", tierInfo.color)} />
                            <span className={tierInfo.color}>{tierInfo.label}</span>
                          </button>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{normLabels[indicator.normalization]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditingWeight ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            className="w-16 h-7 text-right font-mono text-sm"
                            value={editingWeightValue}
                            onChange={(e) => setEditingWeightValue(e.target.value)}
                            onKeyDown={(e) => handleWeightKeyDown(e, indicator.id)}
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleSaveWeight(indicator.id)}
                            disabled={updateIndicator.isPending}
                          >
                            {updateIndicator.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCancelEditWeight}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditWeight(indicator)}
                          className="font-mono hover:bg-muted px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          {(indicator.weight * 100).toFixed(0)}%
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleStartEditWeight(indicator)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Peso
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteIndicator.mutate(indicator.id)}
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
      {!isLoading && filteredIndicators.length === 0 && (
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
      </TabsContent>

      <TabsContent value="report" className="mt-0">
        <IndicatorDistributionReport />
      </TabsContent>

      <IndicatorFormDialog
        open={isFormDialogOpen}
        onOpenChange={setIsFormDialogOpen}
        onSubmit={handleCreateIndicator}
        isLoading={isCreating}
      />
    </Tabs>
  );
}

// Removed wrapper - unified panel is now the main export
