import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { DataImportPanel } from '@/components/diagnostics/DataImportPanel';
import { IndicadoresPanel } from '@/components/diagnostics/IndicadoresPanel';
import { DestinosPanel } from '@/components/diagnostics/DestinosPanel';
import { 
  Plus, 
  Search, 
  ClipboardList,
  Loader2,
  Upload,
  BarChart3,
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

const Diagnosticos = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Get tab and assessment from URL params
  const tabFromUrl = searchParams.get('tab');
  const assessmentFromUrl = searchParams.get('assessment');
  const [mainTab, setMainTab] = useState<'rodadas' | 'destinos' | 'importacao' | 'indicadores'>(
    tabFromUrl === 'destinos' ? 'destinos' :
    tabFromUrl === 'importacao' ? 'importacao' : 
    tabFromUrl === 'indicadores' ? 'indicadores' : 'rodadas'
  );

  useEffect(() => {
    if (tabFromUrl === 'destinos') {
      setMainTab('destinos');
    } else if (tabFromUrl === 'importacao') {
      setMainTab('importacao');
    } else if (tabFromUrl === 'indicadores') {
      setMainTab('indicadores');
    }
  }, [tabFromUrl]);
  
  const { assessments, isLoading, deleteAssessment } = useAssessments();

  const filteredAssessments = assessments?.filter((assessment) => {
    const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (assessment.destinations as any)?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) ?? [];

  const statusCounts = {
    DRAFT: assessments?.filter(a => a.status === 'DRAFT').length ?? 0,
    DATA_READY: assessments?.filter(a => a.status === 'DATA_READY').length ?? 0,
    CALCULATED: assessments?.filter(a => a.status === 'CALCULATED').length ?? 0,
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteAssessment.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout 
      title="Diagnósticos" 
      subtitle="Rodadas de avaliação dos destinos"
    >
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)} className="space-y-6">
        <TabsList className="w-full max-w-2xl">
          <TabsTrigger value="rodadas" className="gap-2 flex-1">
            <ClipboardList className="h-4 w-4" />
            Rodadas
          </TabsTrigger>
          <TabsTrigger value="destinos" className="gap-2 flex-1">
            <MapPin className="h-4 w-4" />
            Destinos
          </TabsTrigger>
          <TabsTrigger value="importacao" className="gap-2 flex-1">
            <Upload className="h-4 w-4" />
            Preenchimento
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-2 flex-1">
            <BarChart3 className="h-4 w-4" />
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
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Assessments Grid */}
          {!isLoading && filteredAssessments.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssessments.map((assessment, index) => (
                <div
                  key={assessment.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <AssessmentCard 
                    assessment={assessment as any} 
                    onDelete={handleDelete}
                    isDeleting={deletingId === assessment.id}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredAssessments.length === 0 && (
            <div className="text-center py-16">
              <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {searchQuery || statusFilter !== 'all' ? 'Nenhum diagnóstico encontrado' : 'Nenhum diagnóstico cadastrado'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tente ajustar seus filtros.'
                  : 'Crie sua primeira rodada de diagnóstico.'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="mt-4" asChild>
                  <Link to="/nova-rodada">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Rodada
                  </Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="destinos">
          <DestinosPanel />
        </TabsContent>

        <TabsContent value="importacao">
          <DataImportPanel preSelectedAssessmentId={assessmentFromUrl || undefined} />
        </TabsContent>

        <TabsContent value="indicadores">
          <IndicadoresPanel />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Diagnosticos;
