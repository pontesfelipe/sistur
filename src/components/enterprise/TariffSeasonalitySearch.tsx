import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Loader2, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface Analysis {
  seasonality_score: number; // 0-100 (quão pronunciada é a sazonalidade)
  amplitude_pct: number; // diferença pico vs baixa
  peak_months: string[];
  low_months: string[];
  pattern: 'baixa' | 'media' | 'alta' | 'extrema' | 'sem_dados';
  recommendations: string[];
  summary: string;
  sources: string[];
}

interface Props {
  pricingData: Record<string, any> | null;
  demandData: Record<string, any> | null;
  eventsData: Record<string, any> | null;
  onAutoFill?: (values: Record<string, number>) => void;
  onAnalysisCapture?: (a: Record<string, any>) => void;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function classifyPattern(amplitude: number): Analysis['pattern'] {
  if (amplitude >= 60) return 'extrema';
  if (amplitude >= 35) return 'alta';
  if (amplitude >= 15) return 'media';
  if (amplitude > 0) return 'baixa';
  return 'sem_dados';
}

function derive(pricing: any, demand: any, events: any): Analysis {
  const sources: string[] = [];
  const monthScores: Record<string, number> = {};
  MONTHS.forEach((m) => (monthScores[m] = 0));

  // Sinal 1: demanda orgânica (DemandTrendsSearch)
  if (demand?.seasonal_distribution) {
    sources.push('Demanda orgânica (busca pública)');
    const sd = demand.seasonal_distribution as Record<string, number>;
    const max = Math.max(1, ...Object.values(sd));
    MONTHS.forEach((m) => { monthScores[m] += ((sd[m] ?? 0) / max) * 50; });
  }
  // Sinal 2: eventos locais
  if (events?.monthly_distribution) {
    sources.push('Eventos locais');
    const md = events.monthly_distribution as Record<string, number>;
    const max = Math.max(1, ...Object.values(md));
    MONTHS.forEach((m, i) => {
      const key = String(i + 1).padStart(2, '0');
      monthScores[m] += ((md[key] ?? md[m] ?? 0) / max) * 30;
    });
  } else if (events?.peak_months_estimated) {
    sources.push('Eventos locais (picos)');
    (events.peak_months_estimated as string[]).forEach((m) => { monthScores[m] = (monthScores[m] ?? 0) + 30; });
  }
  // Sinal 3: preço médio por mês (PricingPositioningSearch)
  if (pricing?.monthly_adr) {
    sources.push('ADR mensal (OTAs)');
    const pa = pricing.monthly_adr as Record<string, number>;
    const max = Math.max(1, ...Object.values(pa));
    MONTHS.forEach((m) => { monthScores[m] += ((pa[m] ?? 0) / max) * 20; });
  } else if (pricing?.avg_daily_rate) {
    sources.push('ADR médio (OTAs)');
  }

  const values = Object.values(monthScores);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const amplitude = max > 0 ? Math.round(((max - min) / max) * 100) : 0;
  const sorted = MONTHS.map((m) => ({ m, s: monthScores[m] })).sort((a, b) => b.s - a.s);
  const peak_months = sorted.slice(0, 3).filter((x) => x.s > 0).map((x) => x.m);
  const low_months = sorted.slice(-3).filter((x) => x.s < max * 0.5).map((x) => x.m).reverse();
  const pattern = sources.length === 0 ? 'sem_dados' : classifyPattern(amplitude);
  const seasonality_score = Math.min(100, amplitude);

  const recommendations: string[] = [];
  if (pattern === 'extrema' || pattern === 'alta') {
    recommendations.push(`Sazonalidade ${pattern}: aplicar tarifa dinâmica agressiva nos meses de pico (${peak_months.join(', ')}) e pacotes promocionais em baixa (${low_months.join(', ')}).`);
    recommendations.push('Diversificar segmentos (corporativo, eventos, ecoturismo) para preencher meses baixos.');
  } else if (pattern === 'media') {
    recommendations.push('Sazonalidade moderada: yield management mensal e campanhas direcionadas aos meses de pico.');
  } else if (pattern === 'baixa') {
    recommendations.push('Sazonalidade baixa: operação estável favorece ocupação contínua — focar em fidelização.');
  } else {
    recommendations.push('Dados insuficientes para diagnosticar sazonalidade tarifária. Rode primeiro os blocos de Demanda, Eventos e Preço.');
  }

  return {
    seasonality_score,
    amplitude_pct: amplitude,
    peak_months,
    low_months,
    pattern,
    recommendations,
    sources,
    summary: pattern === 'sem_dados'
      ? 'Sazonalidade não pôde ser calculada — fontes upstream ausentes.'
      : `Sazonalidade ${pattern} (amplitude ${amplitude}%). Picos: ${peak_months.join(', ') || '—'}. Baixas: ${low_months.join(', ') || '—'}.`,
  };
}

const PATTERN_COLOR: Record<string, string> = {
  extrema: 'text-rose-600',
  alta: 'text-amber-600',
  media: 'text-cyan-600',
  baixa: 'text-emerald-600',
  sem_dados: 'text-muted-foreground',
};

export function TariffSeasonalitySearch({ pricingData, demandData, eventsData, onAutoFill, onAnalysisCapture }: Props) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const run = async () => {
    setLoading(true); setAnalysis(null);
    try {
      await new Promise((r) => setTimeout(r, 200)); // pequeno delay p/ aguardar estados upstream
      const a = derive(pricingData, demandData, eventsData);
      setAnalysis(a);
      onAnalysisCapture?.({ ...a, derivedAt: new Date().toISOString() });
      onAutoFill?.({ ENT_SAZONALIDADE_TARIFARIA: a.seasonality_score });
      if (a.pattern === 'sem_dados') {
        toast.warning('Sazonalidade: fontes upstream ausentes — rode Demanda/Eventos/Preço primeiro');
      } else {
        toast.success('Sazonalidade tarifária derivada');
      }
    } catch (e: any) {
      console.error(e); toast.error(e?.message || 'Falha ao derivar sazonalidade');
    } finally { setLoading(false); }
  };

  useAutoFillRunner('tariff-seasonality', run);

  return (
    <div className="space-y-4">
      <Button onClick={run} disabled={loading} className="w-full">
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
        {loading ? 'Derivando...' : 'Derivar Sazonalidade Tarifária'}
      </Button>

      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">{analysis.summary}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Amplitude</div>
              <div className="text-2xl font-bold">{analysis.amplitude_pct}<span className="text-sm font-normal text-muted-foreground">%</span></div>
              <Progress value={analysis.amplitude_pct} className="h-1 mt-2" />
              <Badge variant="outline" className={`mt-2 text-[10px] capitalize ${PATTERN_COLOR[analysis.pattern]}`}>{analysis.pattern.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="p-3 rounded-lg border bg-card space-y-2 text-xs">
              <div>
                <div className="text-muted-foreground flex items-center gap-1 mb-1"><Calendar className="h-3 w-3" /> Picos</div>
                <div className="flex flex-wrap gap-1">
                  {analysis.peak_months.length ? analysis.peak_months.map((m) => <Badge key={m} variant="secondary" className="text-[10px] capitalize">{m}</Badge>) : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Baixas</div>
                <div className="flex flex-wrap gap-1">
                  {analysis.low_months.length ? analysis.low_months.map((m) => <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>) : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          </div>

          {analysis.sources.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1">Fontes cruzadas</div>
              <div className="flex flex-wrap gap-1">
                {analysis.sources.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
              </div>
            </div>
          )}

          {analysis.recommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-xs font-medium mb-1">Recomendações</div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                {analysis.recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}