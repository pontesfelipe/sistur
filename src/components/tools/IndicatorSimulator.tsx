import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  FlaskConical, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';

interface Indicator {
  code: string;
  name: string;
  pillar: string;
  min_ref: number | null;
  max_ref: number | null;
  direction: string;
  normalization: string;
  weight: number;
}

export function IndicatorSimulator() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<string>('');
  const [value, setValue] = useState<number>(50);
  const [result, setResult] = useState<{
    score: number;
    status: string;
    impact: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      fetchIndicators();
    }
  }, [open]);

  const fetchIndicators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('indicators')
        .select('code, name, pillar, min_ref, max_ref, direction, normalization, weight')
        .order('pillar, name');

      if (error) throw error;
      setIndicators(data || []);
    } catch (error) {
      console.error('Error fetching indicators:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulate = () => {
    const indicator = indicators.find(i => i.code === selectedIndicator);
    if (!indicator) return;

    const min = indicator.min_ref || 0;
    const max = indicator.max_ref || 100;
    
    let score = 0;

    if (indicator.normalization === 'MIN_MAX') {
      if (indicator.direction === 'HIGH_IS_BETTER') {
        score = Math.max(0, Math.min(1, (value - min) / (max - min)));
      } else {
        score = Math.max(0, Math.min(1, (max - value) / (max - min)));
      }
    } else if (indicator.normalization === 'BINARY') {
      score = value > 0 ? 1 : 0;
    } else if (indicator.normalization === 'BANDS') {
      const range = max - min;
      const third = range / 3;
      if (indicator.direction === 'HIGH_IS_BETTER') {
        if (value >= min + 2 * third) score = 0.83;
        else if (value >= min + third) score = 0.5;
        else score = 0.17;
      } else {
        if (value <= min + third) score = 0.83;
        else if (value <= min + 2 * third) score = 0.5;
        else score = 0.17;
      }
    }

    let status = '';
    if (score >= 0.67) status = 'BOM';
    else if (score >= 0.34) status = 'MODERADO';
    else status = 'CRITICO';

    const weightedImpact = score * indicator.weight;
    let impact = '';
    if (weightedImpact > 0.5) impact = 'Alto impacto positivo no pilar';
    else if (weightedImpact > 0.2) impact = 'Impacto moderado no pilar';
    else impact = 'Baixo impacto no pilar';

    setResult({ score, status, impact });
  };

  const currentIndicator = indicators.find(i => i.code === selectedIndicator);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BOM':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Adequado</Badge>;
      case 'MODERADO':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Atenção</Badge>;
      case 'CRITICO':
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return null;
    }
  };

  const getPillarColor = (pillar: string) => {
    switch (pillar) {
      case 'OE': return 'bg-blue-500/20 text-blue-700';
      case 'AO': return 'bg-green-500/20 text-green-700';
      case 'RA': return 'bg-amber-500/20 text-amber-700';
      default: return 'bg-gray-500/20 text-gray-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <FlaskConical className="h-4 w-4 mr-2" />
          Simular Indicador
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Simulador de Indicadores
          </DialogTitle>
          <DialogDescription>
            Simule o impacto de um valor em um indicador específico
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Indicador</Label>
                <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um indicador" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {indicators.map((ind) => (
                      <SelectItem key={ind.code} value={ind.code}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getPillarColor(ind.pillar)} text-xs`}>
                            {ind.pillar}
                          </Badge>
                          <span className="truncate">{ind.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentIndicator && (
                <>
                  <Card className="bg-muted/30">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Direção:</span>
                          <div className="flex items-center gap-1 mt-1">
                            {currentIndicator.direction === 'HIGH_IS_BETTER' ? (
                              <>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                <span>Maior é Melhor</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                <span>Menor é Melhor</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Peso:</span>
                          <p className="font-medium mt-1">{currentIndicator.weight}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ref. Mínimo:</span>
                          <p className="font-medium mt-1">{currentIndicator.min_ref ?? 0}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ref. Máximo:</span>
                          <p className="font-medium mt-1">{currentIndicator.max_ref ?? 100}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Valor Simulado</Label>
                      <span className="text-2xl font-bold text-primary">{value}</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(v) => setValue(v[0])}
                      min={currentIndicator.min_ref || 0}
                      max={currentIndicator.max_ref || 100}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{currentIndicator.min_ref ?? 0}</span>
                      <span>{currentIndicator.max_ref ?? 100}</span>
                    </div>
                  </div>

                  <Button onClick={simulate} className="w-full">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Calcular
                  </Button>
                </>
              )}

              {result && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Resultado da Simulação
                      {getStatusBadge(result.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">
                        {(result.score * 100).toFixed(1)}%
                      </div>
                      <p className="text-sm text-muted-foreground">Score Normalizado</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">{result.impact}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
