import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIndicators } from '@/hooks/useIndicators';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Target, Gauge, Zap, Landmark, Hotel, Globe, BarChart3 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type IndicatorScope = 'territorial' | 'enterprise' | 'both';
type DiagnosisTier = 'COMPLETE' | 'MEDIUM' | 'SMALL';
type Pillar = 'RA' | 'OE' | 'AO';

const scopeConfig: Record<IndicatorScope, { label: string; color: string; icon: typeof Landmark }> = {
  territorial: { label: 'Territorial', color: 'hsl(217, 91%, 60%)', icon: Landmark },
  enterprise: { label: 'Enterprise', color: 'hsl(38, 92%, 50%)', icon: Hotel },
  both: { label: 'Ambos', color: 'hsl(270, 50%, 60%)', icon: Globe },
};

const tierConfig: Record<DiagnosisTier, { label: string; color: string; icon: typeof Target }> = {
  SMALL: { label: 'Essencial', color: 'hsl(142, 71%, 45%)', icon: Zap },
  MEDIUM: { label: 'Estratégico', color: 'hsl(38, 92%, 50%)', icon: Gauge },
  COMPLETE: { label: 'Integral', color: 'hsl(221, 83%, 53%)', icon: Target },
};

const pillarConfig: Record<Pillar, { label: string; fullName: string; color: string }> = {
  RA: { label: 'I-RA', fullName: 'Relações Ambientais', color: 'hsl(142, 71%, 45%)' },
  OE: { label: 'I-OE', fullName: 'Organização Estrutural', color: 'hsl(217, 91%, 60%)' },
  AO: { label: 'I-AO', fullName: 'Ações Operacionais', color: 'hsl(38, 92%, 50%)' },
};

export function IndicatorDistributionReport() {
  const { indicators, isLoading } = useIndicators();

  const distributionData = useMemo(() => {
    if (!indicators.length) return null;

    // Initialize counters
    const matrix: Record<IndicatorScope, Record<Pillar, Record<DiagnosisTier, number>>> = {
      territorial: { RA: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, OE: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, AO: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 } },
      enterprise: { RA: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, OE: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, AO: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 } },
      both: { RA: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, OE: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 }, AO: { SMALL: 0, MEDIUM: 0, COMPLETE: 0 } },
    };

    // Count indicators
    indicators.forEach((ind: any) => {
      const scope = (ind.indicator_scope || 'territorial') as IndicatorScope;
      const pillar = ind.pillar as Pillar;
      const tier = (ind.minimum_tier || 'COMPLETE') as DiagnosisTier;
      
      if (matrix[scope] && matrix[scope][pillar]) {
        matrix[scope][pillar][tier]++;
      }
    });

    // Totals by scope
    const scopeTotals: Record<IndicatorScope, number> = {
      territorial: 0,
      enterprise: 0,
      both: 0,
    };

    // Totals by pillar
    const pillarTotals: Record<Pillar, number> = { RA: 0, OE: 0, AO: 0 };

    // Totals by tier
    const tierTotals: Record<DiagnosisTier, number> = { SMALL: 0, MEDIUM: 0, COMPLETE: 0 };

    Object.entries(matrix).forEach(([scope, pillars]) => {
      Object.entries(pillars).forEach(([pillar, tiers]) => {
        Object.entries(tiers).forEach(([tier, count]) => {
          scopeTotals[scope as IndicatorScope] += count;
          pillarTotals[pillar as Pillar] += count;
          tierTotals[tier as DiagnosisTier] += count;
        });
      });
    });

    // Chart data for pillars
    const pillarChartData = (['RA', 'OE', 'AO'] as Pillar[]).map(pillar => ({
      name: pillarConfig[pillar].label,
      Essencial: matrix.territorial[pillar].SMALL + matrix.enterprise[pillar].SMALL + matrix.both[pillar].SMALL,
      Estratégico: matrix.territorial[pillar].MEDIUM + matrix.enterprise[pillar].MEDIUM + matrix.both[pillar].MEDIUM,
      Integral: matrix.territorial[pillar].COMPLETE + matrix.enterprise[pillar].COMPLETE + matrix.both[pillar].COMPLETE,
    }));

    // Pie chart data for scope
    const scopePieData = Object.entries(scopeTotals)
      .filter(([, count]) => count > 0)
      .map(([scope, count]) => ({
        name: scopeConfig[scope as IndicatorScope].label,
        value: count,
        fill: scopeConfig[scope as IndicatorScope].color,
      }));

    return { matrix, scopeTotals, pillarTotals, tierTotals, pillarChartData, scopePieData };
  }, [indicators]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!distributionData) {
    return <div className="text-muted-foreground">Nenhum indicador encontrado.</div>;
  }

  const { matrix, scopeTotals, pillarTotals, tierTotals, pillarChartData, scopePieData } = distributionData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Distribuição de Indicadores</h2>
          <p className="text-sm text-muted-foreground">
            Relatório consolidado por Escopo, Pilar e Tier
          </p>
        </div>
        <Badge variant="outline" className="ml-auto text-lg px-3 py-1">
          {indicators.length} indicadores
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Scope */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Por Escopo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.entries(scopeTotals) as [IndicatorScope, number][]).map(([scope, count]) => {
              const Icon = scopeConfig[scope].icon;
              return (
                <div key={scope} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: scopeConfig[scope].color }} />
                    <span className="text-sm">{scopeConfig[scope].label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By Pillar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Por Pilar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.entries(pillarTotals) as [Pillar, number][]).map(([pillar, count]) => (
              <div key={pillar} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'} className="text-xs">
                    {pillarConfig[pillar].label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{pillarConfig[pillar].fullName}</span>
                </div>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By Tier */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Por Tier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.entries(tierTotals) as [DiagnosisTier, number][]).map(([tier, count]) => {
              const Icon = tierConfig[tier].icon;
              return (
                <div key={tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: tierConfig[tier].color }} />
                    <span className="text-sm">{tierConfig[tier].label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Pillars by Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indicadores por Pilar e Tier</CardTitle>
            <CardDescription>Distribuição de indicadores nos 3 pilares do SISTUR</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pillarChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={50} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="Essencial" stackId="a" fill={tierConfig.SMALL.color} />
                <Bar dataKey="Estratégico" stackId="a" fill={tierConfig.MEDIUM.color} />
                <Bar dataKey="Integral" stackId="a" fill={tierConfig.COMPLETE.color} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Scope Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Escopo</CardTitle>
            <CardDescription>Territorial vs Enterprise vs Ambos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={scopePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {scopePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Matrix Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matriz Detalhada: Escopo × Pilar × Tier</CardTitle>
          <CardDescription>Contagem de indicadores em cada combinação</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Escopo</TableHead>
                <TableHead className="w-24">Pilar</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3 text-green-600" />
                    Essencial
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Gauge className="h-3 w-3 text-amber-600" />
                    Estratégico
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-3 w-3 text-primary" />
                    Integral
                  </div>
                </TableHead>
                <TableHead className="text-center font-semibold">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(['territorial', 'enterprise', 'both'] as IndicatorScope[]).map((scope) => {
                const Icon = scopeConfig[scope].icon;
                const scopeTotal = scopeTotals[scope];
                
                return (['RA', 'OE', 'AO'] as Pillar[]).map((pillar, pillarIndex) => {
                  const rowData = matrix[scope][pillar];
                  const rowTotal = rowData.SMALL + rowData.MEDIUM + rowData.COMPLETE;
                  
                  return (
                    <TableRow key={`${scope}-${pillar}`}>
                      {pillarIndex === 0 && (
                        <TableCell rowSpan={3} className="align-middle border-r">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" style={{ color: scopeConfig[scope].color }} />
                            <div>
                              <div className="font-medium">{scopeConfig[scope].label}</div>
                              <div className="text-xs text-muted-foreground">({scopeTotal} total)</div>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={pillar.toLowerCase() as 'ra' | 'oe' | 'ao'}>
                          {pillarConfig[pillar].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={rowData.SMALL > 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {rowData.SMALL}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={rowData.MEDIUM > 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {rowData.MEDIUM}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={rowData.COMPLETE > 0 ? 'font-medium' : 'text-muted-foreground'}>
                          {rowData.COMPLETE}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold bg-muted/50">
                        {rowTotal}
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
              {/* Totals Row */}
              <TableRow className="bg-muted/30 font-semibold">
                <TableCell colSpan={2} className="text-right">Total Geral</TableCell>
                <TableCell className="text-center">{tierTotals.SMALL}</TableCell>
                <TableCell className="text-center">{tierTotals.MEDIUM}</TableCell>
                <TableCell className="text-center">{tierTotals.COMPLETE}</TableCell>
                <TableCell className="text-center bg-primary/10">{indicators.length}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
