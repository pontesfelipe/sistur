import { useState } from 'react';
import { tx } from '@/i18n/t';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { METHODOLOGY_INFO } from '@/hooks/useProjects';
import { adviseMethodology, MethodologyAnswers, MethodologyAdvice, METHODOLOGY_GUIDE, Methodology } from '@/lib/methodologyAdvisor';

const QUESTIONS: { key: keyof MethodologyAnswers; label: string; options: { value: string; label: string }[] }[] = [
  { key: 'scope', label: 'O escopo está bem definido ou pode mudar no caminho?', options: [{ value: 'fixed', label: 'Bem definido' }, { value: 'evolving', label: 'Pode mudar' }] },
  { key: 'fixedStages', label: 'Há convênio, emenda ou licitação com etapas fixas?', options: [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }] },
  { key: 'teamSize', label: 'Tamanho da equipe e parceiros envolvidos?', options: [{ value: 'small', label: 'Até 5 pessoas' }, { value: 'medium', label: '6 a 15 pessoas' }, { value: 'large', label: 'Mais de 15 ou vários órgãos' }] },
  { key: 'deliveryType', label: 'O que será entregue?', options: [{ value: 'physical', label: 'Obra ou estrutura física' }, { value: 'service', label: 'Serviço, campanha ou capacitação' }] },
  { key: 'meetingCadence', label: 'Com que frequência a equipe consegue se reunir?', options: [{ value: 'weekly', label: 'Toda semana' }, { value: 'monthly', label: 'Mensalmente ou menos' }] },
  { key: 'workFlow', label: 'Como o trabalho chega?', options: [{ value: 'deliverables', label: 'Em entregas com prazo' }, { value: 'continuous', label: 'Em fluxo contínuo (demandas, rotina)' }] },
];

interface Props {
  pillars?: string[];
  onApply: (m: Methodology, answers: MethodologyAnswers, advice: MethodologyAdvice) => void;
}

export function MethodologyAdvisor({ pillars, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const complete = QUESTIONS.every((q) => raw[q.key]);
  const answers = complete
    ? ({ ...raw, fixedStages: raw.fixedStages === 'true' } as unknown as MethodologyAnswers)
    : null;
  const advice = answers ? adviseMethodology(answers, { pillars }) : null;

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> {tx('Me ajude a escolher')}
      </Button>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="pt-4 space-y-4">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="space-y-2">
            <Label className="text-sm">{tx(q.label)}</Label>
            <RadioGroup value={raw[q.key] || ''} onValueChange={(v) => setRaw((r) => ({ ...r, [q.key]: v }))} className="flex flex-wrap gap-4">
              {q.options.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value={o.value} /> {tx(o.label)}
                </label>
              ))}
            </RadioGroup>
          </div>
        ))}
        {advice && (
          <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
            <p>
              <strong>{tx('Recomendamos')} {METHODOLOGY_INFO[advice.recommended].name}</strong>{' '}
              {tx('porque')} {advice.reasons.join(', ')}.
            </p>
            <p className="text-muted-foreground">
              {tx('Segunda opção')}: {METHODOLOGY_INFO[advice.alternative].name} — {tx(METHODOLOGY_GUIDE[advice.alternative].whenToUse)}
            </p>
            <Button type="button" size="sm" onClick={() => { onApply(advice.recommended, answers!, advice); setOpen(false); }}>
              {tx('Usar recomendação')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
