import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { 
  Plus, 
  Search, 
  ClipboardList,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssessments } from '@/hooks/useAssessments';
import { AssessmentFormDialog } from '@/components/assessments/AssessmentFormDialog';
import { Skeleton } from '@/components/ui/skeleton';

const Diagnosticos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const { assessments, isLoading, createAssessment } = useAssessments();

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

  const handleCreate = async (data: {
    title: string;
    destination_id: string;
    period_start?: string | null;
    period_end?: string | null;
    status: 'DRAFT' | 'DATA_READY' | 'CALCULATED';
  }) => {
    await createAssessment.mutateAsync(data);
  };

  return (
    <AppLayout 
      title="Diagnósticos" 
      subtitle="Rodadas de avaliação dos destinos"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
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
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Rodada
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="draft" className="h-6 px-3">Rascunho</Badge>
            <span className="text-2xl font-display font-bold">
              {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.DRAFT}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="ready" className="h-6 px-3">Dados Prontos</Badge>
            <span className="text-2xl font-display font-bold">
              {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.DATA_READY}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="calculated" className="h-6 px-3">Calculado</Badge>
            <span className="text-2xl font-display font-bold">
              {isLoading ? <Skeleton className="h-8 w-8" /> : statusCounts.CALCULATED}
            </span>
          </div>
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
              <AssessmentCard assessment={assessment as any} />
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
            <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Rodada
            </Button>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <AssessmentFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
      />
    </AppLayout>
  );
};

export default Diagnosticos;
