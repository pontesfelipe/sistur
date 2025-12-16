import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface PrescriptionCycle {
  id: string;
  prescription_id: string;
  assessment_id: string;
  current_score: number | null;
  previous_score: number | null;
  evolution_state: string | null;
  created_at: string;
}

interface Destination {
  id: string;
  name: string;
}

export function CycleMonitor() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<PrescriptionCycle[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [stats, setStats] = useState({
    evolution: 0,
    stagnation: 0,
    regression: 0
  });

  useEffect(() => {
    if (open) {
      fetchDestinations();
      fetchCycles();
    }
  }, [open, selectedDestination]);

  const fetchDestinations = async () => {
    const { data } = await supabase
      .from('destinations')
      .select('id, name')
      .order('name');
    setDestinations(data || []);
  };

  const fetchCycles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('prescription_cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await query;
      
      const cycleData = data || [];
      setCycles(cycleData);

      // Calculate stats
      const evolution = cycleData.filter(c => c.evolution_state === 'EVOLUTION').length;
      const stagnation = cycleData.filter(c => c.evolution_state === 'STAGNATION').length;
      const regression = cycleData.filter(c => c.evolution_state === 'REGRESSION').length;
      
      setStats({ evolution, stagnation, regression });
    } catch (error) {
      console.error('Error fetching cycles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEvolutionIcon = (state: string | null) => {
    switch (state) {
      case 'EVOLUTION':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'REGRESSION':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'STAGNATION':
        return <Minus className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEvolutionBadge = (state: string | null) => {
    switch (state) {
      case 'EVOLUTION':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Evolução</Badge>;
      case 'REGRESSION':
        return <Badge variant="destructive">Regressão</Badge>;
      case 'STAGNATION':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Estagnação</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const formatScore = (score: number | null) => {
    if (score === null) return '-';
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Abrir Monitor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Monitor de Ciclos
          </DialogTitle>
          <DialogDescription>
            Acompanhe a evolução, estagnação e regressão de indicadores entre ciclos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <Select value={selectedDestination} onValueChange={setSelectedDestination}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Destinos</SelectItem>
                {destinations.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchCycles}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Evolução
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{stats.evolution}</div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Minus className="h-4 w-4 text-yellow-500" />
                  Estagnação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{stats.stagnation}</div>
              </CardContent>
            </Card>

            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Regressão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">{stats.regression}</div>
              </CardContent>
            </Card>
          </div>

          {/* Cycles List */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : cycles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Nenhum ciclo registrado</p>
                <p className="text-sm">Os ciclos aparecerão aqui após múltiplas rodadas de diagnóstico</p>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {cycles.map((cycle) => (
                  <div 
                    key={cycle.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center gap-3">
                      {getEvolutionIcon(cycle.evolution_state)}
                      <div>
                        <div className="flex items-center gap-2">
                          {getEvolutionBadge(cycle.evolution_state)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(cycle.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{formatScore(cycle.previous_score)}</span>
                        <span>→</span>
                        <span className="font-medium">{formatScore(cycle.current_score)}</span>
                      </div>
                      {cycle.previous_score !== null && cycle.current_score !== null && (
                        <p className={`text-xs ${
                          cycle.current_score > cycle.previous_score 
                            ? 'text-green-600' 
                            : cycle.current_score < cycle.previous_score 
                              ? 'text-red-600' 
                              : 'text-yellow-600'
                        }`}>
                          {cycle.current_score > cycle.previous_score ? '+' : ''}
                          {((cycle.current_score - cycle.previous_score) * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Legend */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span><strong>Evolução:</strong> Score aumentou</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span><strong>Estagnação:</strong> Score estável</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span><strong>Regressão:</strong> Score diminuiu</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
