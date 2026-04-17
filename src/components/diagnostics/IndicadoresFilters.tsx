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
  collectionCounts: { AUTOMATICA: number; MANUAL: number; ESTIMADA: number };
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
            placeholder="Buscar indicadores..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Select value={pillarFilter} onValueChange={onPillarFilterChange}>
          <SelectTrigger className="w-full xs:w-32">
            <SelectValue placeholder="Pilar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ra">IRA</SelectItem>
            <SelectItem value="oe">IOE</SelectItem>
            <SelectItem value="ao">IAO</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={onSourceFilterChange}>
          <SelectTrigger className="w-full xs:w-32">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="igma">IGMA</SelectItem>
            <SelectItem value="other">Outras</SelectItem>
          </SelectContent>
        </Select>
        <Select value={themeFilter} onValueChange={onThemeFilterChange}>
          <SelectTrigger className="w-full xs:w-44">
            <SelectValue placeholder="Tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os temas</SelectItem>
            {availableThemes.map(theme => (
              <SelectItem key={theme} value={theme}>{theme}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={onTierFilterChange}>
          <SelectTrigger className="w-full xs:w-36">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="SMALL">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-green-600" />
                Essencial ({tierCounts.SMALL})
              </div>
            </SelectItem>
            <SelectItem value="MEDIUM">
              <div className="flex items-center gap-2">
                <Gauge className="h-3 w-3 text-amber-600" />
                Estratégico ({tierCounts.MEDIUM})
              </div>
            </SelectItem>
            <SelectItem value="COMPLETE">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" />
                Integral ({tierCounts.COMPLETE})
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={onScopeFilterChange}>
          <SelectTrigger className="w-full xs:w-40">
            <SelectValue placeholder="Escopo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos escopos ({indicatorsTotal})</SelectItem>
            <SelectItem value="territorial">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-blue-600" />
                Territorial ({scopeCounts.territorial})
              </div>
            </SelectItem>
            <SelectItem value="enterprise">
              <div className="flex items-center gap-2">
                <Hotel className="h-3 w-3 text-amber-600" />
                Enterprise ({scopeCounts.enterprise})
              </div>
            </SelectItem>
            <SelectItem value="both">
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3 text-purple-600" />
                Ambos ({scopeCounts.both})
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={collectionFilter} onValueChange={onCollectionFilterChange}>
          <SelectTrigger className="w-full xs:w-40">
            <SelectValue placeholder="Coleta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas coletas</SelectItem>
            <SelectItem value="AUTOMATICA">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-severity-good" />
                API/Automático ({collectionCounts.AUTOMATICA})
              </div>
            </SelectItem>
            <SelectItem value="MANUAL">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-severity-moderate" />
                Manual ({collectionCounts.MANUAL})
              </div>
            </SelectItem>
            <SelectItem value="ESTIMADA">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-severity-critical" />
                Estimado ({collectionCounts.ESTIMADA})
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={mandalaFilter} onValueChange={onMandalaFilterChange}>
          <SelectTrigger className="w-full xs:w-44">
            <SelectValue placeholder="Mandala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({mandalaCounts.core + mandalaCounts.mandala})</SelectItem>
            <SelectItem value="core">
              <div className="flex items-center gap-2">
                <Landmark className="h-3 w-3 text-primary" />
                Núcleo SISTUR ({mandalaCounts.core})
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
        Novo Indicador
      </Button>
    </div>
  );
}
