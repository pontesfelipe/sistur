import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Search, Play, Upload, FileText, ArrowRight, ArrowLeft, BookOpen,
} from 'lucide-react';

interface Step {
  icon: typeof Sparkles;
  title: string;
  description: string;
  bullet: string[];
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Diagnóstico Enterprise',
    description: 'Em ~15 minutos você sai do zero para um diagnóstico operacional, reputacional e competitivo completo — sem digitar dados.',
    bullet: [
      '56 indicadores nos pilares RA, OE e AO',
      'Status determinístico (Adequado/Atenção/Crítico)',
      'Trilha de auditoria por indicador',
    ],
  },
  {
    icon: Search,
    title: 'Passo 1 — Identificação',
    description: 'Informe nome do empreendimento e CNPJ. O sistema valida na Receita e localiza o endereço automaticamente.',
    bullet: [
      'Validação CNPJ via Receita Federal',
      'Pré-preenchimento de tipo, porte e razão social',
      'Vincula automaticamente ao destino municipal',
    ],
  },
  {
    icon: Play,
    title: 'Passo 2 — Rodar os 21 blocos automáticos',
    description: 'Clique em "Rodar todos" e o SISTUR coleta dados de Google, Booking, TripAdvisor, ANAC, Anatel, DATASUS, IBGE e demais fontes públicas em paralelo.',
    bullet: [
      'Toast por bloco com origem (Google, Booking, ANAC…)',
      'Retry individual em caso de falha',
      'Progresso salvo — pode sair e voltar',
    ],
  },
  {
    icon: Upload,
    title: 'Passo 3 — Importar CSV do PMS (opcional)',
    description: 'No painel "Importação PMS/CSV", arraste o relatório mensal do seu PMS. Funciona com Opera, Cloudbeds, Stays ou qualquer planilha.',
    bullet: [
      '13 KPIs operacionais (ADR, RevPAR, GOPPAR, NPS…)',
      'Suporte UTF-8/Latin1 e vírgula decimal BR',
      'Validação de bounds antes do commit',
    ],
  },
  {
    icon: FileText,
    title: 'Passo 4 — Calcular e gerar relatório',
    description: 'Com ≥50% dos indicadores preenchidos, o status é calculado. Em seguida gere o Relatório AI em 17 seções com plano 90 dias.',
    bullet: [
      'PDF e DOCX em formato ABNT',
      'Concorrentes anonimizados (A/B/C)',
      'Recomendações EDU acopladas',
    ],
  },
];

const LS_KEY = 'sistur:enterprise:tour-seen-v1';

interface Props {
  destinationId?: string | null;
  /** Force open externally (botão "Tour do módulo"). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EnterpriseOnboardingTour({ destinationId, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(0);

  const isControlled = typeof open === 'boolean';
  const actualOpen = isControlled ? open! : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    if (typeof window === 'undefined') return;
    if (!destinationId) return;
    const seen = localStorage.getItem(LS_KEY);
    if (!seen) {
      const t = setTimeout(() => setInternalOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [destinationId, isControlled]);

  const close = (next: boolean) => {
    if (!next) {
      try { localStorage.setItem(LS_KEY, new Date().toISOString()); } catch {}
      setStep(0);
    }
    if (isControlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={actualOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="gap-1">
              <BookOpen className="h-3 w-3" /> Tour {step + 1} de {STEPS.length}
            </Badge>
          </div>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed pt-1">
            {current.description}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 py-2">
          {current.bullet.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-center gap-1.5 py-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`}
            />
          ))}
        </div>
        <DialogFooter className="flex !justify-between gap-2 sm:!justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => close(false)}>
              Pular
            </Button>
            {isLast ? (
              <Button size="sm" onClick={() => close(false)}>
                Começar
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="gap-1">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}