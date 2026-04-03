import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  emoji: string;
  text: string;
  highlight?: 'hud' | 'world' | 'buildings' | 'actions';
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Bem-vindo ao Guardião do Território!',
    emoji: '⚔️',
    text: 'Você é o guardião de um território! Defenda-o de ameaças jogando cartas estratégicas e mantendo o equilíbrio entre os 3 pilares.',
    tip: 'É um jogo de cartas estilo TCG — pense antes de jogar!',
  },
  {
    title: 'Os 3 Pilares',
    emoji: '📊',
    text: '🌳 RA (Recursos Ambientais) — natureza e meio ambiente\n🏗️ OE (Oferta & Estrutura) — infraestrutura e conforto\n🤝 AO (Articulação & Organização) — governança e cooperação',
    highlight: 'hud',
    tip: 'Se qualquer pilar cair a zero, você perde!',
  },
  {
    title: 'Suas Cartas',
    emoji: '🃏',
    text: 'Você recebe 5 cartas por turno e pode jogar até 3. Cada carta tem custo em moedas 💰 e fortalece um pilar do seu território.',
    highlight: 'buildings',
    tip: 'Descarte cartas que não precisa para ganhar +1 moeda!',
  },
  {
    title: 'O Campo de Batalha',
    emoji: '🏟️',
    text: 'O tabuleiro tem 3 fileiras (RA, OE, AO) para suas cartas e uma Zona de Ameaça no topo com os perigos ativos.',
    highlight: 'hud',
    tip: 'Cartas jogadas ficam no campo — planeje sua formação!',
  },
  {
    title: 'Ameaças & Eventos',
    emoji: '🎲',
    text: 'A cada turno, novas ameaças surgem! Eventos aleatórios e o Conselho Mirim testam suas decisões estratégicas.',
    highlight: 'actions',
    tip: 'Ameaças causam dano real aos seus pilares — não ignore!',
  },
  {
    title: 'Recompensas',
    emoji: '🎁',
    text: 'Ao derrotar ameaças ou fazer boas escolhas, você ganha recompensas: cartas raras, moedas extras e pontos de vitória!',
    highlight: 'actions',
    tip: 'Cartas lendárias são poderosas — escolha com sabedoria!',
  },
  {
    title: 'Vitória',
    emoji: '🏆',
    text: 'Alcance 300 pontos de vitória mantendo equilíbrio ≥ 50% entre os pilares. O segredo não é força bruta — é estratégia!',
    tip: 'Boa sorte, guardião! ⚔️🌟',
  },
];

interface GameTutorialProps {
  onComplete: () => void;
}

export function GameTutorial({ onComplete }: GameTutorialProps) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setStep(s => s + 1);
    }
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/40' : 'w-2 bg-muted'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-5">
          <span className="text-5xl block mb-3">{current.emoji}</span>
          <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{current.text}</p>
          {current.tip && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">💡 {current.tip}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          {!isFirst && (
            <button
              onClick={prev}
              className="px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors text-sm min-h-[48px]"
            >
              ⬅️ Voltar
            </button>
          )}
          <button
            onClick={next}
            className={cn(
              'flex-1 py-3 font-bold rounded-xl text-white text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform min-h-[48px]',
              isLast
                ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                : 'bg-gradient-to-r from-primary to-blue-600'
            )}
          >
            {isLast ? '🎮 Jogar!' : 'Próximo ➡️'}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Pular tutorial
          </button>
        )}
      </div>
    </div>
  );
}
