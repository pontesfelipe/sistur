import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { tx } from '@/i18n/t';

interface Props {
  assessmentId: string;
  indicatorValues: any[];
}

/**
 * Explica, na Linhagem dos Dados, por que indicadores pré-preenchidos
 * (fontes oficiais / automáticas) estão ausentes ou incompletos.
 */
export function PrefillExplanation({ assessmentId, indicatorValues }: Props) {
  const { data } = useQuery({
    queryKey: ['prefill-explanation', assessmentId],
    queryFn: async () => {
      const { data: a } = await supabase
        .from('assessments')
        .select('diagnostic_type, status, calculated_at, destination:destinations(id, ibge_code)')
        .eq('id', assessmentId)
        .maybeSingle();
      const dest: any = (a as any)?.destination;
      if ((a as any)?.diagnostic_type === 'enterprise') {
        const { data: prof } = await supabase
          .from('enterprise_profiles')
          .select('id')
          .eq('destination_id', dest?.id)
          .limit(1);
        return { type: 'enterprise', hasSource: (prof || []).length > 0, ibge: null, available: 0, calculated_at: (a as any)?.calculated_at };
      }
      let available = 0;
      if (dest?.ibge_code) {
        const { count } = await supabase
          .from('external_indicator_values')
          .select('id', { count: 'exact', head: true })
          .eq('municipality_ibge_code', dest.ibge_code)
          .neq('source_code', 'MANUAL')
          .not('raw_value', 'is', null);
        available = count || 0;
      }
      return { type: 'territorial', hasSource: available > 0, ibge: dest?.ibge_code ?? null, available, calculated_at: (a as any)?.calculated_at };
    },
  });

  if (!data) return null;
  const autoCount = (indicatorValues || []).filter(
    (v) => !v.is_ignored && !/^manual$/i.test(String(v.source || '')) && v.source,
  ).length;
  const ignored = (indicatorValues || []).filter((v) => v.is_ignored).length;
  if (autoCount > 0 && ignored === 0) return null;

  const reasons: string[] = [];
  if (data.type === 'territorial') {
    if (!data.ibge) reasons.push(tx('O destino não tem código IBGE cadastrado, então as fontes oficiais não podem ser consultadas. Edite o destino e informe o código IBGE.'));
    else if (!data.available) reasons.push(tx('Nenhuma fonte oficial retornou dados para este município até agora. Use "Atualizar agora" na Saúde das Ingestões ou preencha manualmente.'));
    else reasons.push(tx('Existem {{v0}} dados oficiais para este município. Se não aparecem aqui, o diagnóstico foi calculado antes de eles serem incorporados — clique em "Editar Dados" e recalcule para incluí-los.', { v0: data.available }));
  } else {
    if (!data.hasSource) reasons.push(tx('O perfil do empreendimento ainda não foi criado, então as buscas automáticas (avaliações, tarifas, clima, conectividade etc.) não rodaram. Complete o perfil no passo 4.'));
    else reasons.push(tx('As buscas automáticas do perfil existem mas não foram transferidas para esta rodada. Use "Recuperar valores automáticos" para incluí-las.'));
  }
  if (ignored > 0) reasons.push(tx('{{v0}} indicador(es) foram recusados pelo usuário e ficam de fora de propósito.', { v0: ignored }));

  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>{tx('Por que há poucos dados pré-preenchidos?')}</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
