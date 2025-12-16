import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndicatorScore {
  id: string;
  score: number;
  indicator: {
    id: string;
    code: string;
    name: string;
    pillar: string;
    theme: string;
    description: string | null;
  } | null;
}

interface IndicatorScoresViewProps {
  indicatorScores: IndicatorScore[];
}

export function IndicatorScoresView({ indicatorScores }: IndicatorScoresViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique themes from indicators
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    indicatorScores.forEach(score => {
      if (score.indicator?.theme) {
        themes.add(score.indicator.theme);
      }
    });
    return Array.from(themes).sort();
  }, [indicatorScores]);

  // Filter indicator scores
  const filteredScores = useMemo(() => {
    return indicatorScores.filter(score => {
      const indicator = score.indicator;
      if (!indicator) return false;

      // Search filter
      const matchesSearch = searchQuery === '' ||
        indicator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        indicator.code.toLowerCase().includes(searchQuery.toLowerCase());

      // Pillar filter
      const matchesPillar = pillarFilter === 'all' || 
        indicator.pillar.toLowerCase() === pillarFilter;

      // Theme filter
      const matchesTheme = themeFilter === 'all' || 
        indicator.theme === themeFilter;

      // Status filter (by score severity)
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'critico') {
          matchesStatus = score.score < 0.34;
        } else if (statusFilter === 'moderado') {
          matchesStatus = score.score >= 0.34 && score.score < 0.67;
        } else if (statusFilter === 'bom') {
          matchesStatus = score.score >= 0.67;
        }
      }

      return matchesSearch && matchesPillar && matchesTheme && matchesStatus;
    });
  }, [indicatorScores, searchQuery, pillarFilter, themeFilter, statusFilter]);

  return (
    <div className="bg-card rounded-xl border p-6 space-y-4">
      <h3 className="text-lg font-display font-semibold">
        Scores por Indicador
      </h3>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filtros:</span>
        </div>
        <div className="flex flex-wrap gap-3 flex-1">
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar indicador..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue placeholder="Pilar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ra">IRA</SelectItem>
              <SelectItem value="oe">IOE</SelectItem>
              <SelectItem value="ao">IAO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={themeFilter} onValueChange={setThemeFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Tema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os temas</SelectItem>
              {availableThemes.map(theme => (
                <SelectItem key={theme} value={theme}>{theme}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="moderado">Moderado</SelectItem>
              <SelectItem value="bom">Bom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground self-center">
          {filteredScores.length} de {indicatorScores.length}
        </div>
      </div>

      {/* Indicator List */}
      {filteredScores.length > 0 ? (
        <div className="space-y-4">
          {filteredScores.map((score) => {
            const indicator = score.indicator;
            return (
              <div key={score.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        (indicator?.pillar?.toLowerCase() || 'ra') as 'ra' | 'oe' | 'ao'
                      }
                    >
                      {indicator?.pillar || '—'}
                    </Badge>
                    <span className="font-medium text-sm">
                      {indicator?.name || 'Indicador'}
                    </span>
                    {indicator?.theme && (
                      <span className="text-xs text-muted-foreground">
                        · {indicator.theme}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold',
                      score.score >= 0.67
                        ? 'text-severity-good'
                        : score.score >= 0.34
                        ? 'text-severity-moderate'
                        : 'text-severity-critical'
                    )}
                  >
                    {Math.round(score.score * 100)}%
                  </span>
                </div>
                <Progress
                  value={score.score * 100}
                  className={cn(
                    'h-2',
                    score.score >= 0.67
                      ? '[&>div]:bg-severity-good'
                      : score.score >= 0.34
                      ? '[&>div]:bg-severity-moderate'
                      : '[&>div]:bg-severity-critical'
                  )}
                />
                {indicator?.description && (
                  <p className="text-xs text-muted-foreground">
                    {indicator.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">
          {indicatorScores.length === 0 
            ? 'Nenhum indicador calculado.' 
            : 'Nenhum indicador encontrado com os filtros selecionados.'}
        </p>
      )}
    </div>
  );
}
