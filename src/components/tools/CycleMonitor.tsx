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
  Clock,
  BarChart3
} from 'lucide-react';

interface PillarScore {
  assessment_id: string;
  pillar: string;
  score: number;
  severity: string;
}

interface Assessment {
  id: string;
  title: string;
  destination_id: string;
  calculated_at: string;
  destination_name: string;
}

interface EvolutionData {
  destinationId: string;
  destinationName: string;
  pillar: string;
  currentScore: number;
  previousScore: number | null;
  evolutionState: 'EVOLUTION' | 'STAGNATION' | 'REGRESSION' | null;
  assessmentTitle: string;
  calculatedAt: string;
}

interface Destination {
  id: string;
  name: string;
}

export function CycleMonitor() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evolutions, setEvolutions] = useState<EvolutionData[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [stats, setStats] = useState({
    evolution: 0,
    stagnation: 0,
    regression: 0
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, selectedDestination]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch destinations that have calculated assessments
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select(`
          id,
          title,
          destination_id,
          calculated_at,
          destinations!inner (
            id,
            name
          )
        `)
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: false });

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        return;
      }

      // Get unique destinations from assessments
      const uniqueDestinations = new Map<string, Destination>();
      assessmentsData?.forEach(a => {
        const dest = a.destinations as unknown as { id: string; name: string };
        if (dest && !uniqueDestinations.has(dest.id)) {
          uniqueDestinations.set(dest.id, { id: dest.id, name: dest.name });
        }
      });
      setDestinations(Array.from(uniqueDestinations.values()).sort((a, b) => a.name.localeCompare(b.name)));

      // Filter assessments by selected destination
      let filteredAssessments = assessmentsData || [];
      if (selectedDestination !== 'all') {
        filteredAssessments = filteredAssessments.filter(a => a.destination_id === selectedDestination);
      }

      // Get all pillar scores for these assessments
      const assessmentIds = filteredAssessments.map(a => a.id);
      if (assessmentIds.length === 0) {
        setEvolutions([]);
        setStats({ evolution: 0, stagnation: 0, regression: 0 });
        return;
      }

      const { data: pillarScores, error: pillarError } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (pillarError) {
        console.error('Error fetching pillar scores:', pillarError);
        return;
      }

      // Group assessments by destination to compare cycles
      const assessmentsByDestination = new Map<string, typeof filteredAssessments>();
      filteredAssessments.forEach(a => {
        const existing = assessmentsByDestination.get(a.destination_id) || [];
        existing.push(a);
        assessmentsByDestination.set(a.destination_id, existing);
      });

      // Calculate evolution data
      const evolutionData: EvolutionData[] = [];
      
      assessmentsByDestination.forEach((assessments, destinationId) => {
        // Sort by date (newest first)
        assessments.sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());
        
        const latestAssessment = assessments[0];
        const previousAssessment = assessments.length > 1 ? assessments[1] : null;
        
        const dest = latestAssessment.destinations as unknown as { id: string; name: string };
        const destinationName = dest?.name || 'Destino';

        // Get pillar scores for latest and previous
        const latestScores = pillarScores?.filter(ps => ps.assessment_id === latestAssessment.id) || [];
        const previousScores = previousAssessment 
          ? pillarScores?.filter(ps => ps.assessment_id === previousAssessment.id) || []
          : [];

        latestScores.forEach(ls => {
          const prevScore = previousScores.find(ps => ps.pillar === ls.pillar);
          
          let evolutionState: 'EVOLUTION' | 'STAGNATION' | 'REGRESSION' | null = null;
          if (prevScore) {
            const diff = ls.score - prevScore.score;
            if (diff > 0.02) evolutionState = 'EVOLUTION';
            else if (diff < -0.02) evolutionState = 'REGRESSION';
            else evolutionState = 'STAGNATION';
          }

          evolutionData.push({
            destinationId,
            destinationName,
            pillar: ls.pillar,
            currentScore: ls.score,
            previousScore: prevScore?.score || null,
            evolutionState,
            assessmentTitle: latestAssessment.title,
            calculatedAt: latestAssessment.calculated_at
          });
        });
      });

      setEvolutions(evolutionData);

      // Calculate stats (only count items that have previous data for comparison)
      const withComparison = evolutionData.filter(e => e.evolutionState !== null);
      const evolution = withComparison.filter(e => e.evolutionState === 'EVOLUTION').length;
      const stagnation = withComparison.filter(e => e.evolutionState === 'STAGNATION').length;
      const regression = withComparison.filter(e => e.evolutionState === 'REGRESSION').length;
      
      setStats({ evolution, stagnation, regression });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPillarLabel = (pillar: string) => {
    switch (pillar) {
      case 'RA': return 'Sustentabilidade';
      case 'AO': return 'Governança';
      case 'OE': return 'Oferta Turística';
      default: return pillar;
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
        return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
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
        return <Badge variant="outline">Primeira avaliação</Badge>;
    }
  };

  const formatScore = (score: number | null) => {
    if (score === null) return '-';
    return (score * 100).toFixed(1) + '%';
  };

  const hasEvolutionData = evolutions.some(e => e.evolutionState !== null);

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
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards - only show if there's evolution data */}
          {hasEvolutionData && (
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
          )}

          {/* Evolution List */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : evolutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <RefreshCw className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">Nenhum diagnóstico calculado</p>
                <p className="text-sm">Calcule diagnósticos para ver a evolução dos pilares</p>
              </div>
            ) : !hasEvolutionData ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                  <BarChart3 className="h-8 w-8 mb-2 opacity-40" />
                  <p className="font-medium text-sm">Aguardando segundo ciclo</p>
                  <p className="text-xs text-center px-4">
                    A comparação de evolução aparecerá após uma segunda rodada de diagnóstico para os destinos.
                  </p>
                </div>
                
                <p className="text-sm font-medium text-muted-foreground">Scores atuais dos pilares:</p>
                <div className="space-y-3 pr-4">
                  {evolutions.map((item, idx) => (
                    <div 
                      key={`${item.destinationId}-${item.pillar}-${idx}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                    >
                      <div className="flex items-center gap-3">
                        {getEvolutionIcon(item.evolutionState)}
                        <div>
                          <p className="font-medium text-sm">{item.destinationName}</p>
                          <p className="text-xs text-muted-foreground">
                            {getPillarLabel(item.pillar)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatScore(item.currentScore)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.calculatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {evolutions.filter(e => e.evolutionState !== null).map((item, idx) => (
                  <div 
                    key={`${item.destinationId}-${item.pillar}-${idx}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center gap-3">
                      {getEvolutionIcon(item.evolutionState)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.destinationName}</span>
                          {getEvolutionBadge(item.evolutionState)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getPillarLabel(item.pillar)} • {new Date(item.calculatedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{formatScore(item.previousScore)}</span>
                        <span>→</span>
                        <span className="font-medium">{formatScore(item.currentScore)}</span>
                      </div>
                      {item.previousScore !== null && item.currentScore !== null && (
                        <p className={`text-xs ${
                          item.currentScore > item.previousScore 
                            ? 'text-green-600' 
                            : item.currentScore < item.previousScore 
                              ? 'text-red-600' 
                              : 'text-yellow-600'
                        }`}>
                          {item.currentScore > item.previousScore ? '+' : ''}
                          {((item.currentScore - item.previousScore) * 100).toFixed(1)}%
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
