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
  Database,
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type CollectionType = 'AUTOMATICA' | 'MANUAL' | 'ESTIMADA';

const reliabilityIcons = {
  AUTOMATICA: { icon: ShieldCheck, color: 'text-severity-good', label: 'Automático' },
  MANUAL: { icon: Shield, color: 'text-severity-moderate', label: 'Manual' },
  ESTIMADA: { icon: ShieldAlert, color: 'text-severity-critical', label: 'Estimado' },
};

const interpretationLabels: Record<string, string> = {
  'Estrutural': 'Estrutural',
  'Gestão': 'Gestão',
  'Entrega': 'Entrega',
};

const Indicadores = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  
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
    const indicatorSource = (i as any).source || '';
    const matchesSource = sourceFilter === 'all' || 
      (sourceFilter === 'igma' && indicatorSource === 'IGMA') ||
      (sourceFilter === 'other' && indicatorSource !== 'IGMA');
    return matchesSearch && matchesPillar && matchesSource;
  });

  const igmaCount = indicators.filter(i => (i as any).source === 'IGMA').length;

  const pillarNames = {
    RA: 'Relações Ambientais',
    OE: 'Organização Estrutural',
    AO: 'Ações Operacionais',
  };

  const isPendingConfirmation = (indicator: any) => {
    return indicator.notes?.includes('Pendente de confirmação') || 
           indicator.name?.includes('a confirmar');
  };

  return (
    <AppLayout 
      title="Indicadores" 
      subtitle="Catálogo de indicadores para diagnóstico"
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
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
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Fonte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="igma">IGMA</SelectItem>
              <SelectItem value="other">Outras</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Indicador
        </Button>
      </div>

      {/* Summary by Pillar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
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
                <TableHead>Fonte</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Dimensão/Tema</TableHead>
                <TableHead>Interpretação</TableHead>
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
                const isIGMA = (indicator as any).source === 'IGMA';
                const igmaDimension = (indicator as any).igma_dimension;
                const defaultInterpretation = (indicator as any).default_interpretation;
                const isPending = isPendingConfirmation(indicator);

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
