import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface Destination {
  id: string;
  name: string;
}

interface DestinationTrendProps {
  destinations: Destination[];
}

const PILLAR_LABELS: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

const PILLAR_COLORS: Record<string, string> = {
  RA: 'hsl(var(--primary))',
  OE: 'hsl(var(--accent))',
  AO: 'hsl(142 76% 36%)',
};

const STORAGE_KEY = 'sistur-destination-trend-selection';

export function DestinationTrend({ destinations }: DestinationTrendProps) {
  const [selectedDestination, setSelectedDestination] = useState<string | undefined>(() => {
    // Initialize from localStorage, fallback to first destination
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return saved;
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    return destinations[0]?.id;
  });

  // Validate that selected destination still exists
  useEffect(() => {
    if (destinations.length > 0) {
      const validIds = destinations.map(d => d.id);
      if (selectedDestination && !validIds.includes(selectedDestination)) {
        setSelectedDestination(destinations[0]?.id);
      } else if (!selectedDestination) {
        setSelectedDestination(destinations[0]?.id);
      }
    }
  }, [destinations]);

  // Persist selection to localStorage
  useEffect(() => {
    if (selectedDestination) {
      try {
        localStorage.setItem(STORAGE_KEY, selectedDestination);
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  }, [selectedDestination]);

  // Fetch historical data for selected destination
  const { data: trendData, isLoading } = useQuery({
    queryKey: ['destination-trend', selectedDestination],
    queryFn: async () => {
      if (!selectedDestination) return null;

      // Get all calculated assessments for this destination, ordered by date
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, calculated_at, created_at')
        .eq('destination_id', selectedDestination)
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: true });

      if (!assessments || assessments.length === 0) return null;

      // Get pillar scores for each assessment
      const assessmentIds = assessments.map(a => a.id);
      const { data: pillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (!pillarScores) return null;

      // Group scores by assessment
      const scoresByAssessment: Record<string, Record<string, number>> = {};
      pillarScores.forEach(ps => {
        if (!scoresByAssessment[ps.assessment_id]) {
          scoresByAssessment[ps.assessment_id] = {};
        }
        scoresByAssessment[ps.assessment_id][ps.pillar] = ps.score;
      });

      // Build chart data
      const chartData = assessments.map((assessment, index) => {
        const scores = scoresByAssessment[assessment.id] || {};
        const date = assessment.calculated_at || assessment.created_at;
        
        return {
          name: `Ciclo ${index + 1}`,
          fullDate: date ? format(new Date(date), "dd/MM/yyyy", { locale: ptBR }) : '',
          title: assessment.title,
          RA: scores.RA ? Math.round(scores.RA * 100) : null,
          OE: scores.OE ? Math.round(scores.OE * 100) : null,
          AO: scores.AO ? Math.round(scores.AO * 100) : null,
        };
      });

      // Calculate trends (comparing last two assessments)
      const trends: Record<string, 'up' | 'down' | 'stable'> = {};
      if (chartData.length >= 2) {
        const last = chartData[chartData.length - 1];
        const prev = chartData[chartData.length - 2];
        
        ['RA', 'OE', 'AO'].forEach(pillar => {
          const lastVal = last[pillar as keyof typeof last] as number | null;
          const prevVal = prev[pillar as keyof typeof prev] as number | null;
          
          if (lastVal !== null && prevVal !== null) {
            const diff = lastVal - prevVal;
            if (diff > 2) trends[pillar] = 'up';
            else if (diff < -2) trends[pillar] = 'down';
            else trends[pillar] = 'stable';
          }
        });
      }

      return { chartData, trends, totalCycles: assessments.length };
    },
    enabled: !!selectedDestination,
  });

  const chartConfig = {
    RA: { label: PILLAR_LABELS.RA, color: PILLAR_COLORS.RA },
    OE: { label: PILLAR_LABELS.OE, color: PILLAR_COLORS.OE },
    AO: { label: PILLAR_LABELS.AO, color: PILLAR_COLORS.AO },
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' | undefined }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-severity-good" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-severity-critical" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendLabel = (trend: 'up' | 'down' | 'stable' | undefined) => {
    if (trend === 'up') return 'Evolução';
    if (trend === 'down') return 'Regressão';
    return 'Estável';
  };

  const getTrendVariant = (trend: 'up' | 'down' | 'stable' | undefined) => {
    if (trend === 'up') return 'default';
    if (trend === 'down') return 'destructive';
    return 'secondary';
  };

  if (destinations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução Temporal
          </CardTitle>
          <CardDescription>
            Acompanhe a evolução dos pilares ao longo dos ciclos de diagnóstico
          </CardDescription>
        </div>
        <Select 
          value={selectedDestination} 
          onValueChange={setSelectedDestination}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Selecionar destino" />
          </SelectTrigger>
          <SelectContent>
            {destinations.map((dest) => (
              <SelectItem key={dest.id} value={dest.id}>
                {dest.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : trendData && trendData.chartData.length >= 2 ? (
          <>
            {/* Trend indicators */}
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3 mb-4">
              {(['RA', 'OE', 'AO'] as const).map(pillar => (
                <div 
                  key={pillar}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: PILLAR_COLORS[pillar] }}
                  />
                  <span className="text-sm font-medium">{pillar}</span>
                  <TrendIcon trend={trendData.trends[pillar]} />
                  <Badge variant={getTrendVariant(trendData.trends[pillar]) as any} className="text-xs">
                    {getTrendLabel(trendData.trends[pillar])}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Chart */}
            <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
              <LineChart data={trendData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => [`${value}%`, chartConfig[name as keyof typeof chartConfig]?.label ?? name]}
                      labelFormatter={(label, payload) => {
                        const data = payload?.[0]?.payload;
                        return data ? `${data.title} (${data.fullDate})` : label;
                      }}
                    />
                  } 
                />
                <Legend 
                  formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label ?? value}
                />
                <Line 
                  type="monotone" 
                  dataKey="RA" 
                  stroke={PILLAR_COLORS.RA}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="OE" 
                  stroke={PILLAR_COLORS.OE}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="AO" 
                  stroke={PILLAR_COLORS.AO}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Total de {trendData.totalCycles} ciclo(s) de diagnóstico
            </p>
          </>
        ) : trendData && trendData.chartData.length === 1 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm text-center">
              Este destino possui apenas 1 ciclo de diagnóstico.
              <br />
              Execute mais diagnósticos para visualizar a evolução temporal.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">Nenhum diagnóstico calculado para este destino.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
