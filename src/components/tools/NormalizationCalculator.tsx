import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, ArrowRight, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface NormalizationResult {
  score: number;
  status: 'CRITICO' | 'MODERADO' | 'BOM';
  formula: string;
}

export function NormalizationCalculator() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string>('');
  const [minRef, setMinRef] = useState<string>('0');
  const [maxRef, setMaxRef] = useState<string>('100');
  const [normType, setNormType] = useState<'MIN_MAX' | 'BANDS' | 'BINARY'>('MIN_MAX');
  const [direction, setDirection] = useState<'HIGH_IS_BETTER' | 'LOW_IS_BETTER'>('HIGH_IS_BETTER');
  const [result, setResult] = useState<NormalizationResult | null>(null);

  const calculate = () => {
    const val = parseFloat(value);
    const min = parseFloat(minRef);
    const max = parseFloat(maxRef);

    if (isNaN(val) || isNaN(min) || isNaN(max)) {
      return;
    }

    let score = 0;
    let formula = '';

    if (normType === 'MIN_MAX') {
      if (direction === 'HIGH_IS_BETTER') {
        score = Math.max(0, Math.min(1, (val - min) / (max - min)));
        formula = `(${val} - ${min}) / (${max} - ${min}) = ${score.toFixed(4)}`;
      } else {
        score = Math.max(0, Math.min(1, (max - val) / (max - min)));
        formula = `(${max} - ${val}) / (${max} - ${min}) = ${score.toFixed(4)}`;
      }
    } else if (normType === 'BINARY') {
      score = val > 0 ? 1 : 0;
      formula = `${val} > 0 ? 1 : 0 = ${score}`;
    } else if (normType === 'BANDS') {
      const range = max - min;
      const third = range / 3;
      if (direction === 'HIGH_IS_BETTER') {
        if (val >= min + 2 * third) score = 0.83;
        else if (val >= min + third) score = 0.5;
        else score = 0.17;
      } else {
        if (val <= min + third) score = 0.83;
        else if (val <= min + 2 * third) score = 0.5;
        else score = 0.17;
      }
      formula = `Faixa: ${score.toFixed(2)}`;
    }

    let status: 'CRITICO' | 'MODERADO' | 'BOM';
    if (score >= 0.67) status = 'BOM';
    else if (score >= 0.34) status = 'MODERADO';
    else status = 'CRITICO';

    setResult({ score, status, formula });
  };

  const getStatusBadge = (status: 'CRITICO' | 'MODERADO' | 'BOM') => {
    switch (status) {
      case 'BOM':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Adequado</Badge>;
      case 'MODERADO':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Atenção</Badge>;
      case 'CRITICO':
        return <Badge variant="destructive">Crítico</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Calculator className="h-4 w-4 mr-2" />
          Abrir Calculadora
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora de Normalização
          </DialogTitle>
          <DialogDescription>
            Simule o cálculo de normalização de indicadores SISTUR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="normType">Tipo de Normalização</Label>
              <Select value={normType} onValueChange={(v) => setNormType(v as typeof normType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIN_MAX">MIN_MAX (Linear)</SelectItem>
                  <SelectItem value="BANDS">BANDS (Faixas)</SelectItem>
                  <SelectItem value="BINARY">BINARY (Sim/Não)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direção</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH_IS_BETTER">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Maior é Melhor
                    </div>
                  </SelectItem>
                  <SelectItem value="LOW_IS_BETTER">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Menor é Melhor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor Bruto</Label>
              <Input
                id="value"
                type="number"
                placeholder="Ex: 75"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minRef">Ref. Mínimo</Label>
              <Input
                id="minRef"
                type="number"
                placeholder="0"
                value={minRef}
                onChange={(e) => setMinRef(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxRef">Ref. Máximo</Label>
              <Input
                id="maxRef"
                type="number"
                placeholder="100"
                value={maxRef}
                onChange={(e) => setMaxRef(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={calculate} className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" />
            Calcular
          </Button>

          {result && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">Score Normalizado</span>
                  {getStatusBadge(result.status)}
                </div>
                <div className="text-4xl font-bold text-center mb-2">
                  {result.score.toFixed(4)}
                </div>
                <div className="text-xs text-muted-foreground text-center font-mono bg-muted/50 p-2 rounded">
                  {result.formula}
                </div>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Adequado:</strong> Score ≥ 0.67</p>
                    <p><strong>Atenção:</strong> 0.34 ≤ Score &lt; 0.67</p>
                    <p><strong>Crítico:</strong> Score ≤ 0.33</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
