import { useMemo, useState } from "react";
import { Hotel, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useIsMobile } from "@/hooks/use-mobile";
import { useEnterpriseCategories, useEnterpriseIndicators } from "@/hooks/useEnterpriseIndicators";
import { cn } from "@/lib/utils";

type DiagnosisTier = "SMALL" | "MEDIUM" | "COMPLETE";

const tierLabel: Record<DiagnosisTier, string> = {
  SMALL: "Essencial",
  MEDIUM: "Estratégico",
  COMPLETE: "Integral",
};

export function EnterpriseIndicatorsPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<"all" | DiagnosisTier>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const isMobile = useIsMobile();
  const { data: indicators = [], isLoading } = useEnterpriseIndicators();
  const { data: categories = [] } = useEnterpriseCategories();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return indicators.filter((i) => {
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.category?.name || "").toLowerCase().includes(q);

      const matchesPillar = pillarFilter === "all" || i.pillar.toLowerCase() === pillarFilter;
      const matchesTier = tierFilter === "all" || i.minimum_tier === tierFilter;
      const matchesCategory = categoryFilter === "all" || i.category_id === categoryFilter;
      return matchesSearch && matchesPillar && matchesTier && matchesCategory;
    });
  }, [indicators, searchQuery, pillarFilter, tierFilter, categoryFilter]);

  const tierCounts = useMemo(() => {
    const counts: Record<DiagnosisTier, number> = { SMALL: 0, MEDIUM: 0, COMPLETE: 0 };
    indicators.forEach((i) => {
      counts[i.minimum_tier] += 1;
    });
    return counts;
  }, [indicators]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-display font-semibold">Indicadores Enterprise</h3>
          </div>
          <p className="text-sm text-muted-foreground">Catálogo ENT_* usado em diagnósticos de hotelaria.</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {filtered.length} de {indicators.length}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou categoria..."
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

        <Select value={String(tierFilter)} onValueChange={(v) => setTierFilter(v as any)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="SMALL">Essencial ({tierCounts.SMALL})</SelectItem>
            <SelectItem value="MEDIUM">Estratégico ({tierCounts.MEDIUM})</SelectItem>
            <SelectItem value="COMPLETE">Integral ({tierCounts.COMPLETE})</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-64 h-9">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isMobile ? (
          <div className="divide-y">
            {filtered.map((i) => (
              <div key={i.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{i.code}</div>
                    <div className="font-medium text-sm truncate">{i.name}</div>
                    {i.category?.name && (
                      <div className="text-xs text-muted-foreground truncate">{i.category.name}</div>
                    )}
                  </div>
                  <Badge variant={(i.pillar.toLowerCase() || "ra") as any}>{i.pillar}</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{tierLabel[i.minimum_tier]}</Badge>
                  <Badge variant="outline">Peso {(i.weight * 100).toFixed(0)}%</Badge>
                  <Badge variant="outline" className={cn(!i.unit && "text-muted-foreground")}>
                    {i.unit || "—"}
                  </Badge>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-10 text-center text-muted-foreground">
                Nenhum indicador encontrado com os filtros selecionados.
              </div>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Peso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-sm">{i.code}</TableCell>
                  <TableCell>
                    <div className="font-medium">{i.name}</div>
                    {i.description && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{i.category?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{i.category?.code || ""}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(i.pillar.toLowerCase() || "ra") as any}>{i.pillar}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{tierLabel[i.minimum_tier]}</Badge>
                  </TableCell>
                  <TableCell className={cn(!i.unit && "text-muted-foreground")}>{i.unit || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{(i.weight * 100).toFixed(0)}%</TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhum indicador encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
