import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { CycleEvolution } from '@/hooks/useERPMonitoring';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CycleEvolutionChartProps {
  data: CycleEvolution[] | undefined;
  isLoading: boolean;
  destinations?: { id: string; name: string }[];
  selectedDestination?: string;
  onDestinationChange?: (value: string) => void;
}

const chartConfig = {
  plansCreated: { label: 'Planos Criados', color: 'hsl(var(--primary))' },
  plansCompleted: { label: 'Planos Concluídos', color: 'hsl(142 76% 36%)' },
  avgPillarScore: { label: 'Score Médio (%)', color: 'hsl(var(--accent))' },
};

export function CycleEvolutionChart({ 
  data, 
  isLoading,
  destinations,
  selectedDestination,
  onDestinationChange,
}: CycleEvolutionChartProps) {
  const getEvolutionIcon = (state: string | null) => {
    switch (state) {
      case 'EVOLUTION':
        return <TrendingUp className="h-4 w-4 text-severity-good" />;
      case 'REGRESSION':
        return <TrendingDown className="h-4 w-4 text-severity-critical" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEvolutionLabel = (state: string | null) => {
    switch (state) {
      case 'EVOLUTION':
        return 'Evolução';
      case 'REGRESSION':
        return 'Regressão';
      case 'STAGNATION':
        return 'Estagnação';
      default:
        return 'Sem dados';
    }
  };

  const getEvolutionVariant = (state: string | null): "default" | "destructive" | "secondary" => {
    switch (state) {
      case 'EVOLUTION':
        return 'default';
      case 'REGRESSION':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data?.map(cycle => ({
    ...cycle,
    name: `Ciclo ${cycle.cycle}`,
    formattedDate: cycle.date 
      ? format(new Date(cycle.date), "dd/MM/yy", { locale: ptBR })
      : '',
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução dos Ciclos ERP
          </CardTitle>
          <CardDescription>
            Acompanhamento de planos de ação e scores por ciclo de diagnóstico
          </CardDescription>
        </div>
        {destinations && destinations.length > 0 && onDestinationChange && (
          <Select 
            value={selectedDestination || 'all'} 
            onValueChange={onDestinationChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os destinos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os destinos</SelectItem>
              {destinations.map((dest) => (
                <SelectItem key={dest.id} value={dest.id}>
                  {dest.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Nenhum ciclo de diagnóstico encontrado.</p>
          </div>
        ) : (
          <>
            {/* Evolution indicators for last cycle */}
            {chartData.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {chartData.slice(-3).map((cycle) => (
                  <div 
                    key={cycle.assessmentId}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30"
                  >
                    <span className="text-sm font-medium">{cycle.name}</span>
                    {getEvolutionIcon(cycle.evolutionState)}
                    <Badge variant={getEvolutionVariant(cycle.evolutionState)} className="text-xs">
                      {getEvolutionLabel(cycle.evolutionState)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({cycle.completionRate}% concluído)
                    </span>
                  </div>
                ))}
              </div>
            )}

            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Planos', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'Score', angle: 90, position: 'insideRight', fontSize: 11 }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => {
                        if (name === 'avgPillarScore') return [`${value}%`, 'Score Médio'];
                        return [value, chartConfig[name as keyof typeof chartConfig]?.label ?? name];
                      }}
                      labelFormatter={(label, payload) => {
                        const data = payload?.[0]?.payload;
                        return data ? `${data.title} (${data.formattedDate})` : label;
                      }}
                    />
                  } 
                />
                <Legend 
                  formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label ?? value}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="plansCreated" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="plansCreated"
                />
                <Bar 
                  yAxisId="left"
                  dataKey="plansCompleted" 
                  fill="hsl(142 76% 36%)"
                  radius={[4, 4, 0, 0]}
                  name="plansCompleted"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="avgPillarScore" 
                  stroke="hsl(var(--accent))"
                  strokeWidth={3}
                  dot={{ r: 5, fill: 'hsl(var(--accent))' }}
                  activeDot={{ r: 7 }}
                  name="avgPillarScore"
                />
              </ComposedChart>
            </ChartContainer>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Total de {chartData.length} ciclo(s) de diagnóstico
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
