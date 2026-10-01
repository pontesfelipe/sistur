import { tx } from '@/i18n/t';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Zap,
  Gauge,
  Target,
  Landmark,
  Hotel,
  Globe,
  Sparkles,
  Calculator,
} from 'lucide-react';

interface IndicadoresFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  pillarFilter: string;
  onPillarFilterChange: (value: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (value: string) => void;
  themeFilter: string;
  onThemeFilterChange: (value: string) => void;
  tierFilter: string;
  onTierFilterChange: (value: string) => void;
  scopeFilter: string;
  onScopeFilterChange: (value: string) => void;
  collectionFilter: string;
  onCollectionFilterChange: (value: string) => void;
  mandalaFilter: string;
  onMandalaFilterChange: (value: string) => void;
  availableThemes: string[];
  tierCounts: { SMALL: number; MEDIUM: number; COMPLETE: number };
  scopeCounts: { territorial: number; enterprise: number; both: number };
  collectionCounts: { AUTOMATICA: number; DERIVED: number; MANUAL: number; ESTIMADA: number };
  mandalaCounts: { core: number; mandala: number };
  indicatorsTotal: number;
  onNewIndicator: () => void;
}

export function IndicadoresFilters({
  searchQuery,
  onSearchChange,
  pillarFilter,
  onPillarFilterChange,
  sourceFilter,
  onSourceFilterChange,
  themeFilter,
  onThemeFilterChange,
  tierFilter,
  onTierFilterChange,
  scopeFilter,
  onScopeFilterChange,
  collectionFilter,
  onCollectionFilterChange,
  mandalaFilter,
  onMandalaFilterChange,
  availableThemes,
  tierCounts,
  scopeCounts,
  collectionCounts,
  mandalaCounts,
  indicatorsTotal,
  onNewIndicator,
}: IndicadoresFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-between">
      <div className="flex gap-3 flex-1 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={tx('Buscar indicadores...')}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={pillarFilter} onValueChange={onPillarFilterChange}>
          <SelectTrigger className="w-full xs:w-32">
            <SelectValue placeholder={tx('Pilar')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx('Todos')}</SelectItem>
            <SelectItem value="ra">{tx("IRA")}</SelectItem>
            <SelectItem value="oe">{tx("IOE")}</SelectItem>
            <SelectItem value="ao">{tx("IAO")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-full xs:w-32">
            <SelectValue placeholder={tx('Fonte')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx('Todas')}</SelectItem>
            <SelectItem value="igma">{tx("IGMA")}</SelectItem>
            <SelectItem value="other">{tx('Outras')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={themeFilter} onValueChange={onThemeFilterChange}>
          <SelectTrigger className="w-full xs:w-44">
            <SelectValue placeholder={tx('Tema')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx('Todos os temas')}</SelectItem>
            {availableThemes.map(theme => (
              <SelectItem key={theme} value={theme}>{theme}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={onTierFilterChange}>
          <SelectTrigger className="w-full xs:w-36">
            <SelectValue placeholder={tx('Tier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx('Todos os níveis')}</SelectItem>
            <SelectItem value="SMALL">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-green-600" />
                {tx("Essencial ({{v0}})", { v0: tierCounts.SMALL })}
              </div>
            </SelectItem>
            <SelectItem value="MEDIUM">
              <div className="flex items-center gap-2">
                <Gauge className="h-3 w-3 text-amber-600" />
                {tx("Estratégico ({{v0}})", { v0: tierCounts.MEDIUM })}
              </div>
            </SelectItem>
            <SelectItem value="COMPLETE">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" />
                {tx("Integral ({{v0}})", { v0: tierCounts.COMPLETE })}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={onScopeFilterChange}>
          <SelectTrigger className="w-full xs:w-40">
            <SelectValue placeholder={tx('Escopo')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx("Todos escopos ({{v0}})", { v0: indicatorsTotal })}</SelectItem>
            <SelectItem value="territorial">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-blue-600" />
                {tx("Territorial ({{v0}})", { v0: scopeCounts.territorial })}
              </div>
            </SelectItem>
            <SelectItem value="enterprise">
              <div className="flex items-center gap-2">
                <Hotel className="h-3 w-3 text-amber-600" />
                {tx("Enterprise ({{v0}})", { v0: scopeCounts.enterprise })}
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-purple-600" />
                {tx("Ambos ({{v0}})", { v0: scopeCounts.both })}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={collectionFilter} onValueChange={onCollectionFilterChange}>
          <SelectTrigger className="w-full xs:w-40">
            <SelectValue placeholder={tx('Coleta')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tx('Todas coletas')}</SelectItem>
            <SelectItem value="AUTOMATICA">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-severity-good" />
                {tx("API/Automático ({{v0}})", { v0: collectionCounts.AUTOMATICA })}
              </div>
            </SelectItem>
            <SelectItem value="DERIVED">
              <div className="flex items-center gap-2">
                <Calculator className="h-3 w-3 text-violet-600" />
                {tx("Calculado ({{v0}})", { v0: collectionCounts.DERIVED })}
              </div>
            </SelectItem>
            <SelectItem value="MANUAL">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-severity-moderate" />
                {tx("Manual ({{v0}})", { v0: collectionCounts.MANUAL })}
              </div>
            </SelectItem>
            <SelectItem value="ESTIMADA">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-severity-critical" />
                {tx("Estimado ({{v0}})", { v0: collectionCounts.ESTIMADA })}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={mandalaFilter} onValueChange={onMandalaFilterChange}>
          <SelectTrigger className="w-full xs:w-44">
            <SelectValue placeholder={tx('Mandala')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({mandalaCounts.core + mandalaCounts.mandala})</SelectItem>
            <SelectItem value="core">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-primary" />
                {tx("Núcleo SISTUR ({{v0}})", { v0: mandalaCounts.core })}
              </div>
            </SelectItem>
            <SelectItem value="mandala">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-accent-foreground" />
                🌀 Mandala MST ({mandalaCounts.mandala})
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onNewIndicator}>
        <Plus className="mr-2 h-4 w-4" />
        {tx('Novo Indicador')}
      </Button>
    </div>
  );
}
