import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Globe2 } from 'lucide-react';

interface Props {
  currentDestinationId: string;
}

const PILLAR_LABELS: Record<string, string> = { RA: 'I-RA', OE: 'I-OE', AO: 'I-AO' };
const MIN_N = 3; // privacidade: nunca expor benchmark com menos de 3 pares

function median(arr: number[]) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}
function quartile(arr: number[], q: number) {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return s[base + 1] !== undefined ? Math.round(s[base] + rest * (s[base + 1] - s[base])) : s[base];
}

/**
 * Fase 12.2 — Benchmark setorial anônimo Enterprise.
 * Compara o empreendimento contra a média/mediana/quartis de toda a base SISTUR
 * filtrada pelo MESMO `property_type` + faixa de `star_rating` (±1 estrela).
 * Estritamente anonimizado: sem nomes, sem ranking ordenado, e só exibe quando
 * há >= MIN_N pares no segmento — respeita `no-public-rankings` e LGPD.
 */
export function EnterpriseSectorBenchmark({ currentDestinationId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['enterprise-sector-benchmark', currentDestinationId],
    queryFn: async () => {
      const { data: myProfile } = await supabase
        .from('enterprise_profiles')
        .select('destination_id, property_type, star_rating')
        .eq('destination_id', currentDestinationId)
        .maybeSingle();
      if (!myProfile?.property_type) return { segment: null, peers: 0 };

      // Peers: same property_type, star_rating within ±1
      const minStar = (myProfile.star_rating ?? 0) - 1;
      const maxStar = (myProfile.star_rating ?? 0) + 1;
      let q = supabase
        .from('enterprise_profiles')
        .select('destination_id, property_type, star_rating')
        .eq('property_type', myProfile.property_type)
        .neq('destination_id', currentDestinationId);
      if (myProfile.star_rating != null) {
        q = q.gte('star_rating', minStar).lte('star_rating', maxStar);
      }
      const { data: peers } = await q;
      const peerIds = (peers ?? []).map((p) => p.destination_id).filter(Boolean) as string[];
      if (peerIds.length < MIN_N) {
        return { segment: `${myProfile.property_type}${myProfile.star_rating ? ` · ${myProfile.star_rating}★` : ''}`, peers: peerIds.length };
      }

      // Latest CALCULATED enterprise assessment per peer destination
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, destination_id, calculated_at')
        .in('destination_id', [currentDestinationId, ...peerIds])
        .eq('diagnostic_type', 'enterprise')
        .eq('status', 'CALCULATED')
        .order('calculated_at', { ascending: false })
        .limit(500);
      const latestByDest = new Map<string, string>();
      (assessments ?? []).forEach((a) => {
        if (a.destination_id && !latestByDest.has(a.destination_id)) {
          latestByDest.set(a.destination_id, a.id);
        }
      });
      const ids = Array.from(latestByDest.values());
      if (ids.length === 0) return { segment: myProfile.property_type, peers: peerIds.length };

      const { data: scores } = await supabase
        .from('pillar_scores')
        .select('assessment_id, pillar, score')
        .in('assessment_id', ids);

      const others: Record<string, number[]> = { RA: [], OE: [], AO: [] };
      let mine: Record<string, number> = {};
      latestByDest.forEach((aid, destId) => {
        const rows = (scores ?? []).filter((s) => s.assessment_id === aid);
        rows.forEach((s) => {
          const v = Math.round((Number(s.score) || 0) * 100);
          if (destId === currentDestinationId) mine[s.pillar] = v;
          else if (['RA', 'OE', 'AO'].includes(s.pillar)) others[s.pillar].push(v);
        });
      });
      return {
        segment: `${myProfile.property_type}${myProfile.star_rating ? ` · ${myProfile.star_rating}★` : ''}`,
        peers: others.RA.length,
        mine,
        others,
      };
    },
    enabled: !!currentDestinationId,
  });

  if (isLoading) return <Skeleton className="h-32" />;
  if (!data) return null;
  if (!data.segment) return null;

  if ((data.peers ?? 0) < MIN_N || !data.others) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe2 className="h-5 w-5 text-primary" />
            Benchmark setorial — {data.segment}
          </CardTitle>
          <CardDescription>
            Mínimo de {MIN_N} pares no segmento para exibir o comparativo (atualmente {data.peers}). Comparação 100% anônima — sem nomes nem ranking.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe2 className="h-5 w-5 text-primary" />
          Benchmark setorial — {data.segment}
        </CardTitle>
        <CardDescription>
          Comparação anônima contra {data.peers} empreendimentos do mesmo segmento (categoria + faixa de classificação ±1). Sem nomes, sem ranking.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3">
          {(['RA', 'OE', 'AO'] as const).map((p) => {
            const arr = data.others![p];
            const mine = data.mine?.[p] ?? 0;
            const avg = arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
            const med = arr.length ? Math.round(median(arr)) : 0;
            const q1 = arr.length ? quartile(arr, 0.25) : 0;
            const q3 = arr.length ? quartile(arr, 0.75) : 0;
            const diff = mine - avg;
            return (
              <div key={p} className="rounded-lg border p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{PILLAR_LABELS[p]}</span>
                  <Badge variant={diff >= 0 ? 'default' : 'secondary'}>
                    {diff >= 0 ? '+' : ''}{diff} pp vs média
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{mine}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Média: {avg}% · Mediana: {med}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Faixa interquartil: {q1}%–{q3}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}