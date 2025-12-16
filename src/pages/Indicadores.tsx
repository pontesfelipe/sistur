import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { useIndicators } from '@/hooks/useIndicators';
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
import { cn } from '@/lib/utils';

type CollectionType = 'AUTOMATICA' | 'MANUAL' | 'ESTIMADA';

const reliabilityIcons = {
  AUTOMATICA: { icon: ShieldCheck, color: 'text-severity-good', label: 'Automático' },
  MANUAL: { icon: Shield, color: 'text-severity-moderate', label: 'Manual' },
  ESTIMADA: { icon: ShieldAlert, color: 'text-severity-critical', label: 'Estimado' },
};

const Indicadores = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  
  const { indicators, isLoading, deleteIndicator } = useIndicators();

  const directionLabels = {
    HIGH_IS_BETTER: '↑ Maior é melhor',
    LOW_IS_BETTER: '↓ Menor é melhor',
  };

  const normLabels = {
    MIN_MAX: 'Min-Max',
    BANDS: 'Faixas',
    BINARY: 'Binário',
  };

  const filteredIndicators = indicators.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.theme.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPillar = pillarFilter === 'all' || i.pillar.toLowerCase() === pillarFilter;
    return matchesSearch && matchesPillar;
  });

  const pillarNames = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  return (
    <AppLayout 
      title="Indicadores" 
      subtitle="Catálogo de indicadores para diagnóstico"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicadores..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ra">IRA</SelectItem>
              <SelectItem value="oe">IOE</SelectItem>
              <SelectItem value="ao">IAO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Indicador
        </Button>
      </div>

      {/* Summary by Pillar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                  <span>{(totalWeight * 100).toFixed(0)}%</span>
                </div>
                <Progress value={totalWeight * 100} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicators Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Tema</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead>Normalização</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndicators.map((indicator) => {
                const collectionType = (indicator as any).collection_type as CollectionType | undefined;
                const reliability = reliabilityIcons[collectionType || 'MANUAL'];
                const ReliabilityIcon = reliability.icon;

                return (
                  <TableRow key={indicator.id}>
                    <TableCell className="font-mono text-sm">
                      {indicator.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{indicator.name}</span>
                        {indicator.description && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {indicator.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {directionLabels[indicator.direction]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={indicator.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                        {indicator.pillar}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{indicator.theme}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1.5">
                            <ReliabilityIcon className={cn('h-4 w-4', reliability.color)} />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(((indicator as any).reliability_score || 0.7) * 100)}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {reliability.label} - {(indicator as any).data_source || 'N/A'}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{normLabels[indicator.normalization]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(indicator.weight * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
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
    </AppLayout>
  );
};

export default Indicadores;
