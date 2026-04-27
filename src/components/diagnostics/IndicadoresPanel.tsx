import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, FileBarChart, RefreshCw } from 'lucide-react';
import { useIndicators } from '@/hooks/useIndicators';
import { useIsMobile } from '@/hooks/use-mobile';
import { IndicatorDistributionReport } from './IndicatorDistributionReport';
import { IndicatorFormDialog } from './IndicatorFormDialog';
import { IndicadoresFilters } from './IndicadoresFilters';
import { IndicadoresChart } from './IndicadoresChart';
import { IndicadoresTable, getEffectiveCollection } from './IndicadoresTable';
import { StaleAssessmentsPanel } from './StaleAssessmentsPanel';
import { toast } from 'sonner';

type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type IndicatorScope = 'territorial' | 'enterprise' | 'both';

// Codes that are auto-fetched via REAL API (fetch-official-data edge function)
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

// Codes fetched semi-automatically from CADASTUR open data (CSV pipeline)
const CADASTUR_SEMI_AUTO_CODES = new Set([
  'igma_guias_turismo', 'igma_agencias_turismo',
]);

// Codes that require manual input (no public API available)
const MANUAL_ENTRY_CODES = new Set([
  'igma_taxa_escolarizacao',
]);

export function IndicadoresPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [mandalaFilter, setMandalaFilter] = useState('all');
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editingWeightValue, setEditingWeightValue] = useState<string>('');
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingScopeId, setEditingScopeId] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const { indicators, isLoading, deleteIndicator, updateIndicator, createIndicator } = useIndicators();
  const isMobile = useIsMobile();

  const pillarNames: Record<string, string> = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
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
    const indicatorCollection = getEffectiveCollection(i);
    const matchesCollection = collectionFilter === 'all' || indicatorCollection === collectionFilter;
    const isMandala = (i as any).is_mandala_extension === true;
    const matchesMandala = mandalaFilter === 'all'
      || (mandalaFilter === 'mandala' && isMandala)
      || (mandalaFilter === 'core' && !isMandala);
    return matchesSearch && matchesPillar && matchesSource && matchesTheme && matchesTier && matchesScope && matchesCollection && matchesMandala;
  });

  // Count Mandala vs Core
  const mandalaCounts = useMemo(() => ({
    core: indicators.filter(i => !((i as any).is_mandala_extension)).length,
    mandala: indicators.filter(i => (i as any).is_mandala_extension === true).length,
  }), [indicators]);

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

  // Count by collection type
  const collectionCounts = useMemo(() => ({
    AUTOMATICA: indicators.filter(i => getEffectiveCollection(i) === 'AUTOMATICA').length,
    DERIVED: indicators.filter(i => getEffectiveCollection(i) === 'DERIVED').length,
    MANUAL: indicators.filter(i => getEffectiveCollection(i) === 'MANUAL').length,
    ESTIMADA: indicators.filter(i => getEffectiveCollection(i) === 'ESTIMADA').length,
  }), [indicators]);

  const igmaCount = indicators.filter(i => (i as any).source === 'IGMA').length;

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
      await updateIndicator.mutateAsync({ id: indicatorId, weight: newWeight });
      toast.success('Peso atualizado com sucesso');
      setEditingWeightId(null);
      setEditingWeightValue('');
    } catch (error) {
      toast.error('Erro ao atualizar peso');
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent, indicatorId: string) => {
    if (e.key === 'Enter') handleSaveWeight(indicatorId);
    else if (e.key === 'Escape') handleCancelEditWeight();
  };

  const handleSaveScope = async (indicatorId: string, newScope: IndicatorScope) => {
    try {
      await updateIndicator.mutateAsync({ id: indicatorId, indicator_scope: newScope } as any);
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
          <TabsTrigger value="stale" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recálculo
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="list" className="space-y-6 mt-0">
        <IndicadoresFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          pillarFilter={pillarFilter}
          onPillarFilterChange={setPillarFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          themeFilter={themeFilter}
          onThemeFilterChange={setThemeFilter}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          scopeFilter={scopeFilter}
          onScopeFilterChange={setScopeFilter}
          collectionFilter={collectionFilter}
          onCollectionFilterChange={setCollectionFilter}
          mandalaFilter={mandalaFilter}
          onMandalaFilterChange={setMandalaFilter}
          availableThemes={availableThemes}
          tierCounts={tierCounts}
          scopeCounts={scopeCounts}
          collectionCounts={collectionCounts}
          mandalaCounts={mandalaCounts}
          indicatorsTotal={indicators.length}
          onNewIndicator={() => setIsFormDialogOpen(true)}
        />

        <IndicadoresChart
          indicators={indicators}
          tierCounts={tierCounts}
          igmaCount={igmaCount}
          pillarNames={pillarNames}
        />

        <IndicadoresTable
          filteredIndicators={filteredIndicators}
          indicators={indicators}
          isLoading={isLoading}
          isMobile={isMobile}
          editingWeightId={editingWeightId}
          editingWeightValue={editingWeightValue}
          editingTierId={editingTierId}
          editingScopeId={editingScopeId}
          updateIndicatorPending={updateIndicator.isPending}
          onStartEditWeight={handleStartEditWeight}
          onCancelEditWeight={handleCancelEditWeight}
          onSaveWeight={handleSaveWeight}
          onWeightKeyDown={handleWeightKeyDown}
          onWeightValueChange={setEditingWeightValue}
          onUpdateTier={handleUpdateTier}
          onSaveScope={handleSaveScope}
          onSetEditingTierId={setEditingTierId}
          onSetEditingScopeId={setEditingScopeId}
          onDeleteIndicator={(id) => deleteIndicator.mutate(id)}
          onSetSelectedIndicator={setSelectedIndicator}
        />
      </TabsContent>

      <TabsContent value="report" className="mt-0">
        <IndicatorDistributionReport />
      </TabsContent>

      <TabsContent value="stale" className="mt-0">
        <StaleAssessmentsPanel />
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
