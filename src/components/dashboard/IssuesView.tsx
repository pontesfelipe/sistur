import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueCard } from '@/components/dashboard/IssueCard';
import { Search, Filter, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Issue } from '@/types/sistur';

interface IssuesViewProps {
  issues: Issue[];
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

export function IssuesView({ issues }: IssuesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pillarFilter, setPillarFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [themeFilter, setThemeFilter] = useState('all');
  const [interpretationFilter, setInterpretationFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get unique themes from issues
  const availableThemes = useMemo(() => {
    const themes = new Set<string>();
    issues.forEach(issue => {
      if (issue.theme) {
        themes.add(issue.theme);
      }
    });
    return Array.from(themes).sort();
  }, [issues]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = searchQuery === '' ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.theme.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPillar = pillarFilter === 'all' || 
        issue.pillar.toLowerCase() === pillarFilter;

      const matchesSeverity = severityFilter === 'all' || 
        issue.severity === severityFilter;

      const matchesTheme = themeFilter === 'all' || 
        issue.theme === themeFilter;

      const matchesInterpretation = interpretationFilter === 'all' || 
        issue.interpretation === interpretationFilter;

      return matchesSearch && matchesPillar && matchesSeverity && matchesTheme && matchesInterpretation;
    });
  }, [issues, searchQuery, pillarFilter, severityFilter, themeFilter, interpretationFilter]);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pillarFilter, severityFilter, themeFilter, interpretationFilter, itemsPerPage]);

  // Pagination
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);
  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIssues.slice(start, start + itemsPerPage);
  }, [filteredIssues, currentPage, itemsPerPage]);

  const criticalCount = filteredIssues.filter(i => i.severity === 'CRITICO').length;
  const moderateCount = filteredIssues.filter(i => i.severity === 'MODERADO').length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-card rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-severity-critical/10">
            <AlertTriangle className="h-6 w-6 text-severity-critical" />
          </div>
          <div>
            <h3 className="font-display font-semibold">
              {criticalCount} gargalos críticos
              {moderateCount > 0 && `, ${moderateCount} moderados`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {filteredIssues.length} de {issues.length} gargalos exibidos
            </p>
          </div>
        </div>
      </div>

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
              placeholder="Buscar gargalo..."
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
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="CRITICO">Crítico</SelectItem>
              <SelectItem value="MODERADO">Moderado</SelectItem>
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
          <Select value={interpretationFilter} onValueChange={setInterpretationFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Interpretação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ESTRUTURAL">Estrutural</SelectItem>
              <SelectItem value="GESTAO">Gestão</SelectItem>
              <SelectItem value="ENTREGA">Entrega</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues List */}
      {paginatedIssues.length > 0 ? (
        <div className="space-y-3">
          {paginatedIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {issues.length === 0 
            ? 'Nenhum gargalo identificado.' 
            : 'Nenhum gargalo encontrado com os filtros selecionados.'}
        </div>
      )}

      {/* Pagination */}
      {filteredIssues.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages || 1}
            </div>
            <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={String(opt)}>{opt}/pág</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
