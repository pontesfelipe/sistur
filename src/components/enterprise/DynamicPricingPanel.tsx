import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { suggestPrices, computeLtv } from '@/lib/revenueIntelligence';
import type { SeasonalityMonth } from '@/hooks/useEnterpriseRevenue';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export function DynamicPricingPanel({ months }: { months: SeasonalityMonth[] }) {
  const [rules, setRules] = useState({ floor: 0, ceiling: 0, maxChangePct: 20, targetOccupancy: 70, marketAdr: 0 });
  const [events, setEvents] = useState<Record<number, number>>({});
  const [aiText, setAiText] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState(false);

  const suggestions = useMemo(() => {
    const input = Array.from({ length: 12 }, (_, i) => {
      const m = months.find((x) => x.month === i + 1);
      return {
        month: i + 1,
        occupancy: m?.occupancy_rate != null ? Number(m.occupancy_rate) : null,
        adr: m?.adr != null ? Number(m.adr) : null,
        events: events[i + 1] || 0,
      };
    });
    return suggestPrices(input, { ...rules, marketAdr: rules.marketAdr || null });
  }, [months, rules, events]);

  const hasData = months.some((m) => m.adr);

  const explain = async () => {
    setAiLoading(true);
    const { data, error } = await supabase.functions.invoke('pricing-justification', {
      body: { suggestions: suggestions.map((s) => ({ month: s.month, baseAdr: s.baseAdr, suggestedAdr: s.suggestedAdr, changePct: s.changePct, reasons: s.reasons })) },
    });
    setAiLoading(false);
    if (error || !data?.items) { toast.error('Não foi possível gerar as justificativas agora. Tente de novo em instantes.'); return; }
    setAiText(Object.fromEntries(data.items.map((i: any) => [i.month, i.text])));
  };
  const cur = suggestions.reduce((s, x) => s + (x.currentRevpar || 0), 0);
  const proj = suggestions.reduce((s, x) => s + (x.projectedRevpar || 0), 0);

  const field = (k: keyof typeof rules, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={rules[k] || ''} onChange={(e) => setRules({ ...rules, [k]: Number(e.target.value) })} />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sugestão de diária por mês com base em ocupação, eventos e referência de mercado. É só uma sugestão: nenhum preço é alterado em outros sistemas.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {field('floor', 'Piso (R$)')}
        {field('ceiling', 'Teto (R$)')}
        {field('maxChangePct', 'Variação máx. (%)')}
        {field('targetOccupancy', 'Meta ocupação (%)')}
        {field('marketAdr', 'Diária do mercado (R$)')}
      </div>
      {!hasData ? (
        <p className="text-sm text-muted-foreground">Preencha a diária média (ADR) na aba Sazonalidade para gerar sugestões.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant="outline">RevPAR somado atual: {brl(cur)}</Badge>
            <Badge variant="outline">RevPAR somado projetado: {brl(proj)}</Badge>
            <Button size="sm" variant="outline" onClick={explain} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Explicar com IA
            </Button>
          </div>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.month} className="grid grid-cols-12 gap-2 items-center rounded border p-2 text-sm">
                <span className="col-span-1 font-medium">{MONTHS[s.month - 1]}</span>
                <span className="col-span-2">{brl(s.baseAdr)}</span>
                <span className="col-span-2 font-semibold">
                  {brl(s.suggestedAdr)}{' '}
                  <span className={s.changePct >= 0 ? 'text-severity-good' : 'text-severity-critical'}>
                    ({s.changePct > 0 ? '+' : ''}{s.changePct}%)
                  </span>
                </span>
                <div className="col-span-2">
                  <Input type="number" min="0" placeholder="Eventos" value={events[s.month] || ''}
                    onChange={(e) => setEvents({ ...events, [s.month]: Number(e.target.value) })} />
                </div>
                <span className="col-span-5 text-xs text-muted-foreground">{aiText[s.month] || s.reasons.join(' · ')}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LtvPanel({ commissionPct }: { commissionPct: number }) {
  const [v, setV] = useState({ spendPerStay: 800, staysPerYear: 1, yearsRetained: 3, marginPct: 30, cac: Math.round(800 * (commissionPct || 0) / 100) });
  const r = computeLtv(v);
  const f = (k: keyof typeof v, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} />
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        LTV = gasto por estadia × estadias por ano × anos de relacionamento × margem. O custo de aquisição sugerido vem da comissão média dos canais.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {f('spendPerStay', 'Gasto por estadia (R$)')}
        {f('staysPerYear', 'Estadias por ano')}
        {f('yearsRetained', 'Anos de relacionamento')}
        {f('marginPct', 'Margem (%)')}
        {f('cac', 'Custo de aquisição (R$)')}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">LTV</p><p className="text-2xl font-bold">{brl(r.ltv)}</p></div>
        <div className="rounded border p-3"><p className="text-xs text-muted-foreground">CAC</p><p className="text-2xl font-bold">{brl(v.cac)}</p></div>
        <div className="rounded border p-3">
          <p className="text-xs text-muted-foreground">LTV / CAC</p>
          <p className="text-2xl font-bold">{r.ratio != null ? r.ratio.toFixed(1) : '—'}</p>
          {r.healthy === false && <p className="text-xs text-severity-critical">Abaixo de 3: aquisição cara para o retorno.</p>}
          {r.healthy && <p className="text-xs text-severity-good">Relação saudável.</p>}
        </div>
      </div>
    </div>
  );
}
