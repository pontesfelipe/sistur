import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search,
  Sparkles,
  ChevronLeft,
  AlertCircle,
  Info,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useIndicators } from '@/hooks/useIndicators';
import { useDestinations } from '@/hooks/useDestinations';
import { useLearningRecommendations, type LearningRecommendation } from '@/hooks/useLearningRecommendations';
import { PILLAR_INFO, type Pillar } from '@/types/sistur';
import { toast } from 'sonner';

// Results component shown after calculation
const LearningResults = ({ 
  results, 
  onReset 
}: { 
  results: { courses: LearningRecommendation[], lives: LearningRecommendation[], tracks: LearningRecommendation[] };
  onReset: () => void;
}) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Recomendações Personalizadas</h2>
        <Button variant="outline" onClick={onReset}>
          Nova Consulta
        </Button>
      </div>

      {/* Top Courses */}
      {results.courses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Comece por Aqui
            </CardTitle>
            <CardDescription>
              Cursos mais relevantes com base nos indicadores selecionados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.courses.slice(0, 5).map((rec, index) => (
                <div 
                  key={rec.entity_id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {rec.training && (
                        <Badge variant={rec.training.pillar?.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                          {rec.training.pillar}
                        </Badge>
                      )}
                      {rec.training?.course_code && (
                        <Badge variant="outline" className="text-xs">
                          {rec.training.course_code}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        Score: {Math.round(rec.score)}%
                      </Badge>
                    </div>
                    <h4 className="font-medium">
                      {rec.training?.title || 'Curso'}
                    </h4>
                    {rec.training?.objective && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {rec.training.objective}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {rec.reasons.slice(0, 3).map((reason, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {reason.indicator_name}
                        </Badge>
                      ))}
                      {rec.reasons.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{rec.reasons.length - 3} indicadores
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/edu/training/${rec.entity_id}`}>Ver</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Lives */}
      {results.lives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📺 Lives Recomendadas
            </CardTitle>
            <CardDescription>
              Conteúdos audiovisuais para aprofundamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.lives.slice(0, 10).map((rec) => (
                <Link
                  key={rec.entity_id}
                  to={`/edu/training/${rec.entity_id}`}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {rec.training?.title || 'Live'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Relevância: {Math.round(rec.score)}%
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggested Tracks */}
      {results.tracks.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🛤️ Trilha Recomendada
            </CardTitle>
            <CardDescription>
              Percurso formativo completo sugerido
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.tracks.slice(0, 1).map((rec) => (
              <div key={rec.entity_id} className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-lg">
                    {rec.training?.title || 'Trilha'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rec.reasons[0]?.indicator_name || `Cobertura: ${Math.round(rec.score)}%`}
                  </p>
                </div>
                <Button asChild>
                  <Link to={`/edu/trilha/${rec.entity_id}`}>Ver Trilha</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results.courses.length === 0 && results.lives.length === 0 && results.tracks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">
              Nenhuma recomendação encontrada para os indicadores selecionados.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Isso pode ocorrer se os mapeamentos indicador→curso ainda não foram importados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Learning = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [selectedTerritory, setSelectedTerritory] = useState<string>('');
  const [results, setResults] = useState<{ courses: LearningRecommendation[], lives: LearningRecommendation[], tracks: LearningRecommendation[] } | null>(null);

  const { indicators, isLoading: indicatorsLoading } = useIndicators();
  const { destinations, isLoading: destinationsLoading } = useDestinations();
  const { generateRecommendations, isCalculating } = useLearningRecommendations();

  // Filter indicators
  const filteredIndicators = indicators?.filter(ind => {
    const matchesSearch = !searchQuery || 
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.igma_dimension?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPillar = pillarFilter === 'all' || ind.pillar === pillarFilter;
    
    return matchesSearch && matchesPillar;
  }) || [];

  // Group by dimension for display
  const indicatorsByDimension = filteredIndicators.reduce((acc, ind) => {
    const dimension = ind.igma_dimension || 'Outros';
    if (!acc[dimension]) acc[dimension] = [];
    acc[dimension].push(ind);
    return acc;
  }, {} as Record<string, typeof filteredIndicators>);

  const handleToggleIndicator = (id: string) => {
    setSelectedIndicators(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = (dimension: string) => {
    const dimensionIds = indicatorsByDimension[dimension].map(i => i.id);
    const allSelected = dimensionIds.every(id => selectedIndicators.includes(id));
    
    if (allSelected) {
      setSelectedIndicators(prev => prev.filter(id => !dimensionIds.includes(id)));
    } else {
      setSelectedIndicators(prev => [...new Set([...prev, ...dimensionIds])]);
    }
  };

  const handleGenerate = async () => {
    if (selectedIndicators.length === 0) {
      toast.error('Selecione pelo menos um indicador');
      return;
    }

    const result = await generateRecommendations.mutateAsync({
      indicatorIds: selectedIndicators,
      territoryId: selectedTerritory || undefined,
    });

    setResults(result);
  };

  const handleReset = () => {
    setResults(null);
    setSelectedIndicators([]);
  };

  if (results) {
    return (
      <AppLayout 
        title="Recomendações de Aprendizagem" 
        subtitle="Cursos e lives baseados em seus indicadores"
      >
        <LearningResults results={results} onReset={handleReset} />
      </AppLayout>
    );
  }

  const isLoading = indicatorsLoading || destinationsLoading;

  return (
    <AppLayout 
      title="Recomendações de Aprendizagem" 
      subtitle="Selecione indicadores para gerar recomendações personalizadas"
    >
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/edu">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar ao Catálogo
          </Link>
        </Button>
      </div>

      {/* Info Card */}
      <Card className="mb-6 bg-muted/30 border-muted">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Como funciona?</p>
              <p className="text-sm text-muted-foreground">
                Selecione os indicadores IGMA que representam desafios ou áreas de melhoria do seu destino. 
                O sistema irá recomendar cursos e lives mais relevantes com base no mapeamento IGMA→EDU.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Territory Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Território (opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="Selecione um destino" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Nenhum (geral)</SelectItem>
              {destinations?.map(dest => (
                <SelectItem key={dest.id} value={dest.id}>
                  {dest.name} {dest.uf && `- ${dest.uf}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar indicadores..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Pilar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pilares</SelectItem>
            <SelectItem value="RA">IRA - Relações Ambientais</SelectItem>
            <SelectItem value="OE">IOE - Org. Estrutural</SelectItem>
            <SelectItem value="AO">IAO - Ações Operacionais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection Stats */}
      <div className="flex items-center justify-between mb-4 p-4 rounded-lg bg-muted/50">
        <div>
          <span className="font-medium">{selectedIndicators.length}</span>
          <span className="text-muted-foreground"> indicadores selecionados</span>
        </div>
        <Button 
          onClick={handleGenerate}
          disabled={selectedIndicators.length === 0 || isCalculating}
        >
          {isCalculating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Recomendações
            </>
          )}
        </Button>
      </div>

      {/* Indicators by Dimension */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : Object.keys(indicatorsByDimension).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(indicatorsByDimension).map(([dimension, inds]) => {
            const dimensionIds = inds.map(i => i.id);
            const selectedCount = dimensionIds.filter(id => selectedIndicators.includes(id)).length;
            
            return (
              <Card key={dimension}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{dimension}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedCount}/{inds.length}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSelectAll(dimension)}
                      >
                        {selectedCount === inds.length ? 'Desmarcar' : 'Selecionar'} todos
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {inds.map(ind => (
                      <div 
                        key={ind.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIndicators.includes(ind.id) 
                            ? 'bg-primary/5 border-primary/30' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleToggleIndicator(ind.id)}
                      >
                        <Checkbox 
                          checked={selectedIndicators.includes(ind.id)}
                          onChange={() => {}}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ind.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={ind.pillar.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-xs">
                              {ind.pillar}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{ind.code}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">
              {indicators?.length === 0 
                ? 'Nenhum indicador cadastrado no sistema.'
                : 'Nenhum indicador encontrado com os filtros atuais.'}
            </p>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Learning;
