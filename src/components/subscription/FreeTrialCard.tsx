import { tx } from '@/i18n/t';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GraduationCap, BarChart3, Bot, Lock, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLicense } from '@/contexts/LicenseContext';
import { useQueryClient } from '@tanstack/react-query';

const INCLUDED = [
  {
    icon: GraduationCap,
    title: tx('Curso base do SISTUR EDU'),
    detail: tx('Acesso completo ao curso introdutório da metodologia.'),
  },
  {
    icon: BarChart3,
    title: tx('1 diagnóstico de teste'),
    detail: tx('Rode uma avaliação e veja os resultados em prévia.'),
  },
  {
    icon: Bot,
    title: tx('10 perguntas ao Professor Beni'),
    detail: tx('Converse com a inteligência do SISTUR e teste as respostas.'),
  },
];

const LIMITED = [
  tx('Demais cursos, trilhas e certificados'),
  tx('Resultados completos dos pilares RA, OE e AO'),
  tx('Relatórios executivos e planos de ação'),
  tx('Projetos, Observatório e Consórcios'),
];

/**
 * Degustação gratuita: alternativa à assinatura para quem quer experimentar
 * antes de contratar. Ativa uma licença de avaliação com acesso limitado.
 */
export function FreeTrialCard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { refetchLicense } = useLicense();
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    try {
      setActivating(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('activate_my_trial');
      if (error) {
        const msg = String(error.message || '');
        if (/paid_license_exists/.test(msg)) {
          toast.info(tx('Você já tem um plano ativo na sua conta.'));
          return;
        }
        if (/trial_already_used/.test(msg)) {
          toast.info(tx('Sua avaliação gratuita já foi utilizada. Escolha um plano para continuar.'));
          return;
        }
        throw new Error(msg);
      }

      await refetchLicense();
      await queryClient.invalidateQueries();
      toast.success(tx('Avaliação gratuita ativada. Bom uso!'));
      navigate('/');
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((err as any)?.message || tx('Não foi possível ativar a avaliação gratuita'));
    } finally {
      setActivating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/40 bg-primary/5 overflow-hidden">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold">
                  {tx('Quer experimentar primeiro?')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xl">
                  {tx('Ative a degustação gratuita e conheça o SISTUR por 7 dias, com acesso limitado e sem precisar de cartão.')}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">{tx('Grátis')}</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INCLUDED.map((item) => (
              <div key={item.title} className="rounded-xl border border-border/60 bg-background/50 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-semibold">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {tx('Exclusivo dos planos pagos')}
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {LIMITED.map((item) => (
                <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-50" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button onClick={handleActivate} disabled={activating} className="gap-2">
              {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {activating ? tx('Ativando...') : tx('Começar avaliação gratuita')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {tx('Ou escolha um dos planos abaixo para liberar tudo desde o primeiro dia.')}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
