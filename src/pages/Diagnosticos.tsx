import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AssessmentCard } from '@/components/dashboard/AssessmentCard';
import { 
  Plus, 
  Search, 
  Filter,
  ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockAssessments } from '@/data/mockData';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Diagnosticos = () => {
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
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="data_ready">Dados Prontos</SelectItem>
              <SelectItem value="calculated">Calculado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild>
          <Link to="/diagnosticos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova Rodada
          </Link>
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="draft" className="h-6 px-3">Rascunho</Badge>
            <span className="text-2xl font-display font-bold">
              {mockAssessments.filter(a => a.status === 'DRAFT').length}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="ready" className="h-6 px-3">Dados Prontos</Badge>
            <span className="text-2xl font-display font-bold">
              {mockAssessments.filter(a => a.status === 'DATA_READY').length}
            </span>
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <Badge variant="calculated" className="h-6 px-3">Calculado</Badge>
            <span className="text-2xl font-display font-bold">
              {mockAssessments.filter(a => a.status === 'CALCULATED').length}
            </span>
          </div>
        </div>
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAssessments.map((assessment, index) => (
          <div
            key={assessment.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <AssessmentCard assessment={assessment} />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {mockAssessments.length === 0 && (
        <div className="text-center py-16">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhum diagnóstico encontrado
          </h3>
          <p className="mt-2 text-muted-foreground">
            Crie sua primeira rodada de diagnóstico.
          </p>
          <Button className="mt-4" asChild>
            <Link to="/diagnosticos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Nova Rodada
            </Link>
          </Button>
        </div>
      )}
    </AppLayout>
  );
};

export default Diagnosticos;
