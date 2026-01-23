import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, X, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Destination {
  id: string;
  name: string;
}

interface PillarScore {
  pillar: 'RA' | 'OE' | 'AO';
  score: number;
  severity: string;
}

interface DestinationData {
  destinationId: string;
  destinationName: string;
  pillarScores: PillarScore[];
}

interface DestinationComparisonProps {
  destinations: Destination[];
  getDestinationData: (destinationId: string) => DestinationData | null;
  isLoading?: boolean;
}

const PILLAR_LABELS: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(142 76% 36%)', // green
  'hsl(38 92% 50%)',  // orange
  'hsl(280 65% 60%)', // purple
];

const STORAGE_KEY = 'sistur-destination-comparison-selection';

export function DestinationComparison({ 
  destinations, 
  getDestinationData,
  isLoading 
}: DestinationComparisonProps) {
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(() => {
    // Initialize from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    return [];
  });
  const [open, setOpen] = useState(false);

  // Filter out invalid destination IDs (destinations that no longer exist)
  useEffect(() => {
    if (destinations.length > 0) {
      const validIds = destinations.map(d => d.id);
      const filtered = selectedDestinations.filter(id => validIds.includes(id));
      if (filtered.length !== selectedDestinations.length) {
        setSelectedDestinations(filtered);
      }
    }
  }, [destinations]);

  // Persist selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedDestinations));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }, [selectedDestinations]);

  const toggleDestination = (destId: string) => {
    setSelectedDestinations(prev => 
      prev.includes(destId) 
        ? prev.filter(id => id !== destId)
        : prev.length < 5 
          ? [...prev, destId]
          : prev
    );
  };

  const removeDestination = (destId: string) => {
    setSelectedDestinations(prev => prev.filter(id => id !== destId));
  };

  // Prepare chart data
  const chartData = ['RA', 'OE', 'AO'].map(pillar => {
    const dataPoint: Record<string, string | number> = {
      pillar: PILLAR_LABELS[pillar],
      pillarCode: pillar,
    };
    
    selectedDestinations.forEach(destId => {
      const data = getDestinationData(destId);
      if (data) {
        const pillarScore = data.pillarScores.find(ps => ps.pillar === pillar);
        dataPoint[destId] = pillarScore ? Math.round(pillarScore.score * 100) : 0;
      }
    });
    
    return dataPoint;
  });

  // Build chart config
  const chartConfig: Record<string, { label: string; color: string }> = {};
  selectedDestinations.forEach((destId, index) => {
    const dest = destinations.find(d => d.id === destId);
    chartConfig[destId] = {
      label: dest?.name ?? 'Destino',
      color: COLORS[index % COLORS.length],
    };
  });

  if (destinations.length < 2) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo de Destinos
          </CardTitle>
          <CardDescription>
            Selecione até 5 destinos para comparar os índices dos pilares
          </CardDescription>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar destino
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Buscar destino..." />
              <CommandList>
                <CommandEmpty>Nenhum destino encontrado.</CommandEmpty>
                <CommandGroup>
                  {destinations.map((dest) => (
                    <CommandItem
                      key={dest.id}
                      value={dest.name}
                      onSelect={() => {
                        toggleDestination(dest.id);
                      }}
                      disabled={selectedDestinations.length >= 5 && !selectedDestinations.includes(dest.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedDestinations.includes(dest.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {dest.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        {/* Selected destinations badges */}
        {selectedDestinations.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedDestinations.map((destId, index) => {
              const dest = destinations.find(d => d.id === destId);
              return (
                <Badge 
                  key={destId} 
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                  style={{ 
                    backgroundColor: `${COLORS[index % COLORS.length]}20`,
                    borderColor: COLORS[index % COLORS.length],
                    color: COLORS[index % COLORS.length]
                  }}
                >
                  <span 
                    className="w-2 h-2 rounded-full mr-1" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {dest?.name}
                  <button 
                    onClick={() => removeDestination(destId)}
                    className="ml-1 hover:bg-muted rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Chart */}
        {selectedDestinations.length >= 2 ? (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                dataKey="pillar" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const destName = chartConfig[name as string]?.label ?? name;
                      return [`${value}%`, destName];
                    }}
                  />
                } 
              />
              <Legend 
                formatter={(value) => chartConfig[value]?.label ?? value}
              />
              {selectedDestinations.map((destId, index) => (
                <Bar 
                  key={destId}
                  dataKey={destId}
                  fill={COLORS[index % COLORS.length]}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              ))}
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              {selectedDestinations.length === 0 
                ? 'Selecione pelo menos 2 destinos para comparar'
                : 'Selecione mais 1 destino para iniciar a comparação'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
