import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  emoji: string;
  text: string;
  tip?: string;
}

const STEPS: TutorialStep[] = [
  {
    title: 'Jogo da Memória Ecológico!',
    emoji: '🧠',
    text: 'Encontre os pares entre imagens e suas descrições ambientais! Cada carta-imagem tem uma carta-texto correspondente.',
    tip: 'Exercite a memória enquanto aprende sobre ecologia!',
  },
  {
    title: 'Como Jogar',
    emoji: '👆',
    text: 'Toque em uma carta para virá-la. Depois toque em outra carta. Se a imagem e a descrição combinarem, o par é revelado!',
    tip: 'Você só pode virar 2 cartas por vez.',
  },
  {
    title: 'Pares',
    emoji: '🔗',
    text: 'Cada par tem uma carta com emoji/nome e outra com a explicação sobre o tema ambiental. Associe a imagem ao conceito correto!',
    tip: 'Preste atenção ao virar — memorize as posições!',
  },
  {
    title: 'Erros',
    emoji: '❌',
    text: 'Você tem um número limitado de erros. Se errar demais, o jogo acaba! Pense bem antes de virar a segunda carta.',
    tip: 'Concentre-se e vá com calma!',
  },
  {
    title: 'Objetivo',
    emoji: '🏆',
    text: 'Encontre todos os pares antes do tempo acabar e sem exceder o limite de erros. Quanto menos erros e mais rápido, maior a pontuação!',
    tip: 'Boa sorte, ecologista! 🌍',
  },
];

export function MemoryTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const next = useCallback(() => {
    if (isLast) onComplete();
    else setStep(s => s + 1);
  }, [isLast, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('h-2 rounded-full transition-all duration-300', i === step ? 'w-6 bg-amber-500' : i < step ? 'w-2 bg-amber-500/40' : 'w-2 bg-muted')} />
          ))}
        </div>
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
        <div className="flex gap-2">
          {!isFirst && (
            <button onClick={() => setStep(s => s - 1)} className="px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors text-sm min-h-[48px]">
              ⬅️ Voltar
            </button>
          )}
          <button onClick={next} className={cn('flex-1 py-3 font-bold rounded-xl text-white text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform min-h-[48px]', isLast ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-amber-500 to-yellow-600')}>
            {isLast ? '🧠 Jogar!' : 'Próximo ➡️'}
          </button>
        </div>
        {!isLast && (
          <button onClick={onComplete} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            Pular tutorial
          </button>
        )}
      </div>
    </div>
  );
}
