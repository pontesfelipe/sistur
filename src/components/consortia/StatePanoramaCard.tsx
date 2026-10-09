import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tx } from '@/i18n/t';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Map } from 'lucide-react';
import { BR_STATES, summarizePanorama } from '@/lib/brStates';

const PILLARS = [
  { key: 'ra', label: 'RA — Relações Ambientais' },
  { key: 'oe', label: 'OE — Organização Estrutural' },
  { key: 'ao', label: 'AO — Ações Operacionais' },
] as const;

/** Panorama estadual consolidado (de baixo para cima): só municípios que aceitaram participar. */
export function StatePanoramaCard({ defaultUf }: { defaultUf?: string }) {
  const [uf, setUf] = useState(defaultUf || '');
  const { data = [], isLoading } = useQuery({
    queryKey: ['state-panorama', uf],
    enabled: !!uf,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_state_panorama', { _uf: uf });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
  const summary = summarizePanorama(data);
  const regions = Array.from(new Set(data.map((r) => r.tourism_region || tx('Sem região')))) as string[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Map className="h-5 w-5" /> {tx('Panorama do Estado')}</CardTitle>
          <CardDescription>
            {tx('Média dos municípios do estado que aceitaram participar dos seus consórcios. Visível só para os membros.')}
          </CardDescription>
        </div>
        <Select value={uf} onValueChange={setUf}>
          <SelectTrigger className="w-44"><SelectValue placeholder={tx('Estado')} /></SelectTrigger>
          <SelectContent>
            {BR_STATES.map((s) => <SelectItem key={s.uf} value={s.uf}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!uf ? (
          <p className="text-sm text-muted-foreground">{tx('Escolha um estado.')}</p>
        ) : isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tx('Nenhum município participante com diagnóstico calculado neste estado.')}</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {data.length} {tx('municípios')} · {regions.length} {tx('regiões turísticas')}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {PILLARS.map((p) => {
                const s = summary[p.key];
                return (
                  <div key={p.key} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{tx(p.label)}</div>
                    <div className="text-2xl font-display font-bold">
                      {s.avg == null ? '—' : `${Math.round(s.avg * 100)}%`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{tx('Adequado')}: {s.counts.ADEQUADO}</Badge>
                      <Badge variant="outline">{tx('Atenção')}: {s.counts.ATENCAO}</Badge>
                      <Badge variant="outline">{tx('Crítico')}: {s.counts.CRITICO}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
