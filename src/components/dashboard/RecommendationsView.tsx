import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import type { Recommendation, Pillar, Severity, TerritorialInterpretation } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO, INTERPRETATION_INFO } from '@/types/sistur';

interface RecommendationsViewProps {
  recommendations: Recommendation[];
}

export function RecommendationsView({ recommendations }: RecommendationsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [interpretationFilter, setInterpretationFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  // Get unique values for filters
  const { pillars, severities, interpretations, levels } = useMemo(() => {
    const pillarsSet = new Set<Pillar>();
    const severitiesSet = new Set<Severity>();
    const interpretationsSet = new Set<TerritorialInterpretation>();
    const levelsSet = new Set<string>();

    recommendations.forEach(rec => {
      if (rec.issue?.pillar) pillarsSet.add(rec.issue.pillar);
      if (rec.issue?.severity) severitiesSet.add(rec.issue.severity);
      if (rec.issue?.interpretation) interpretationsSet.add(rec.issue.interpretation);
      if (rec.course?.level) levelsSet.add(rec.course.level);
    });

    return {
      pillars: Array.from(pillarsSet),
      severities: Array.from(severitiesSet),
      interpretations: Array.from(interpretationsSet),
      levels: Array.from(levelsSet),
    };
  }, [recommendations]);

  // Filter recommendations
  const filteredRecommendations = useMemo(() => {
    return recommendations.filter(rec => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          rec.course?.title?.toLowerCase().includes(query) ||
          rec.issue?.title?.toLowerCase().includes(query) ||
          rec.reason?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Pillar filter
      if (pillarFilter !== 'all' && rec.issue?.pillar !== pillarFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && rec.issue?.severity !== severityFilter) {
        return false;
      }

      // Interpretation filter
      if (interpretationFilter !== 'all' && rec.issue?.interpretation !== interpretationFilter) {
        return false;
      }

      // Level filter
      if (levelFilter !== 'all' && rec.course?.level !== levelFilter) {
        return false;
      }

      return true;
    });
  }, [recommendations, searchQuery, pillarFilter, severityFilter, interpretationFilter, levelFilter]);

  const levelLabels: Record<string, string> = {
    BASICO: 'Básico',
    INTERMEDIARIO: 'Intermediário',
    AVANCADO: 'Avançado',
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros:</span>
        </div>
        
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por curso ou gargalo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={pillarFilter} onValueChange={setPillarFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Pilar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos pilares</SelectItem>
            {pillars.map(pillar => (
              <SelectItem key={pillar} value={pillar}>
                {PILLAR_INFO[pillar]?.name || pillar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Severidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {severities.map(severity => (
              <SelectItem key={severity} value={severity}>
                {SEVERITY_INFO[severity]?.label || severity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={interpretationFilter} onValueChange={setInterpretationFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Interpretação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {interpretations.map(interp => (
              <SelectItem key={interp} value={interp}>
                {INTERPRETATION_INFO[interp]?.label || interp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos níveis</SelectItem>
            {levels.map(level => (
              <SelectItem key={level} value={level}>
                {levelLabels[level] || level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredRecommendations.length} de {recommendations.length} recomendações
      </div>

      {/* Recommendations list */}
      {filteredRecommendations.length > 0 ? (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhuma recomendação encontrada com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
}
