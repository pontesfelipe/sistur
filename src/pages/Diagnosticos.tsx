import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';

import { IndicadoresPanel } from '@/components/diagnostics/IndicadoresPanel';
import { DestinosPanel } from '@/components/diagnostics/DestinosPanel';
import { 
  Plus, 
  Search, 
  ClipboardList,
  Loader2,
  Upload,
  MapPin
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssessments } from '@/hooks/useAssessments';
import { Skeleton } from '@/components/ui/skeleton';
import { AssessmentCardSkeleton } from '@/components/ui/content-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';

const Diagnosticos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { isViewingDemoData } = useProfile();
  
  // Get tab, destination, and assessment from URL params.
  // `tab=importacao` is a legacy alias redirected to the `indicadores` tab
  // so that "Preencher Dados" CTAs from DiagnosticoDetalhe land on a real tab
  // instead of defaulting to "Rodadas".
  const tabFromUrl = searchParams.get('tab');
  const destinoFromUrl = searchParams.get('destino');
  const assessmentFromUrl = searchParams.get('assessment');
  const resolveTab = (t: string | null) => {
    if (t === 'destinos') return 'destinos' as const;
    if (t === 'indicadores' || t === 'importacao') return 'indicadores' as const;
    return 'rodadas' as const;
  };
  const [mainTab, setMainTab] = useState<'rodadas' | 'destinos' | 'indicadores'>(resolveTab(tabFromUrl));

  useEffect(() => {
    setMainTab(resolveTab(tabFromUrl));
  }, [tabFromUrl]);

  const { assessments, isLoading, deleteAssessment } = useAssessments();

  const filteredAssessments = assessments?.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assessment.destinations as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    const matchesDestino = !destinoFromUrl || (assessment as any).destination_id === destinoFromUrl;
    return matchesSearch && matchesStatus && matchesDestino;
  }) ?? [];

  // Scroll/highlight the linked assessment when arriving via ?assessment=...
  useEffect(() => {
    if (!assessmentFromUrl || isLoading) return;
    const el = document.getElementById(`assessment-${assessmentFromUrl}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary');
      const t = window.setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2500);
      return () => window.clearTimeout(t);
    }
  }, [assessmentFromUrl, isLoading, filteredAssessments.length]);

  const statusCounts = {
    DRAFT: assessments?.filter(a => a.status === 'DRAFT').length ?? 0,
    DATA_READY: assessments?.filter(a => a.status === 'DATA_READY').length ?? 0,
    CALCULATED: assessments?.filter(a => a.status === 'CALCULATED').length ?? 0,
  };

  const handleDelete = () => {
    // Invalidation is handled by DeleteAssessmentDialog
    // This callback just triggers a refetch if needed
    queryClient.invalidateQueries({ queryKey: ['assessments'] });
  };

  return (
    <AppLayout 
      title="Diagnósticos" 
      subtitle="Rodadas de avaliação dos destinos"
    >
      <Tabs
        value={mainTab}
        onValueChange={(v) => {
          const next = v as typeof mainTab;
          setMainTab(next);
          // Keep the URL in sync with the active tab so browser Back restores it.
          const params = new URLSearchParams(searchParams);
          if (next === 'rodadas') params.delete('tab');
          else params.set('tab', next);
          setSearchParams(params, { replace: true });
        }}
        className="space-y-6"
      >
        <TabsList className="w-full max-w-2xl">
          <TabsTrigger value="rodadas" className="gap-2 flex-1">
            <ClipboardList className="h-4 w-4" />
            Rodadas
          </TabsTrigger>
          <TabsTrigger value="destinos" className="gap-2 flex-1">
            <MapPin className="h-4 w-4" />
            Destinos
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-2 flex-1">
            <Upload className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rodadas" className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-3 flex-1">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar diagnósticos..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="DATA_READY">Dados Prontos</SelectItem>
                  <SelectItem value="CALCULATED">Calculado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button asChild>
              <Link to="/nova-rodada">
                <Plus className="mr-2 h-4 w-4" />
                Nova Rodada
              </Link>
            </Button>
          </div>

          {/* Tier Explanation */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-muted/50 to-transparent">
            <h3 className="font-semibold mb-3">Níveis de Diagnóstico</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400 mb-1">
                  <span className="text-lg">⚡</span> Essencial
                </div>
                <p className="text-xs text-green-600/80 dark:text-green-400/80">
                  ~20 indicadores essenciais. Ideal para municípios menores ou primeira avaliação rápida.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400 mb-1">
                  <span className="text-lg">📊</span> Estratégico
                </div>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  ~50 indicadores. Análise tática para cidades médias ou acompanhamento contínuo.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 font-medium text-primary mb-1">
                  <span className="text-lg">🎯</span> Integral
                </div>
                <p className="text-xs text-primary/80">
                  100+ indicadores. Análise 360° para capitais, polos turísticos ou planejamento estratégico.
                </p>
              </div>
            </div>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Badge variant="draft" className="h-6 px-3">Rascunho</Badge>
                <span className="text-2xl font-display font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.DRAFT}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando preenchimento de dados</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Badge variant="ready" className="h-6 px-3">Dados Prontos</Badge>
                <span className="text-2xl font-display font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.DATA_READY}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Pronto para calcular diagnóstico</p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Badge variant="calculated" className="h-6 px-3">Calculado</Badge>
                <span className="text-2xl font-display font-bold">
                  {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.CALCULATED}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Diagnóstico completo</p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <AssessmentCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Assessments Grid */}
          {!isLoading && filteredAssessments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((assessment, index) => (
                <div
                  key={assessment.id}
                  id={`assessment-${assessment.id}`}
                  className="animate-fade-in rounded-lg transition-shadow"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <AssessmentCard 
                    assessment={assessment as any} 
                    onDelete={handleDelete}
                    isDemoContext={isViewingDemoData}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAssessments.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title={searchQuery || statusFilter !== 'all' ? 'Nenhum diagnóstico encontrado' : 'Nenhum diagnóstico cadastrado'}
              description={searchQuery || statusFilter !== 'all'
                ? 'Tente ajustar seus filtros para encontrar o que procura.'
                : 'Comece avaliando um destino turístico para gerar insights e planos de ação.'}
              actionLabel={!searchQuery && statusFilter === 'all' ? 'Criar Primeira Rodada' : undefined}
              actionHref={!searchQuery && statusFilter === 'all' ? '/nova-rodada' : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="destinos">
          <DestinosPanel />
        </TabsContent>


        <TabsContent value="indicadores">
          <IndicadoresPanel />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Diagnosticos;
