import { tx } from '@/i18n/t';
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { getEmojiSprite } from '@/game/spriteMap';

interface TutorialStep {
  title: string;
  emoji: string;
  text: string;
  tip?: string;
}

const STEPS: TutorialStep[] = [
  {
    title: tx('Caça ao Tesouro Ecológico!'),
    emoji: '🗺️',
    text: 'Explore o mapa, colete tesouros sustentáveis, evite armadilhas de poluição e resolva enigmas ambientais!',
    tip: 'Cada bioma tem seus próprios tesouros e perigos!',
  },
  {
    title: tx('Exploração'),
    emoji: '🧭',
    text: 'Toque nas células adjacentes para se mover. Células não exploradas ficam cobertas por névoa — revele o mapa passo a passo!',
    tip: 'Você só pode andar para cima, baixo, esquerda ou direita.',
  },
  {
    title: tx('Tesouros'),
    emoji: '💎',
    text: 'Colete todos os 5 tesouros ecológicos escondidos no mapa! Cada um representa um recurso natural valioso do bioma.',
    tip: 'Tesouros valem pontos — colete todos para a pontuação máxima!',
  },
  {
    title: tx('Armadilhas'),
    emoji: '☠️',
    text: 'Cuidado com armadilhas ambientais! Desmatamento, poluição e mineração ilegal causam dano à sua saúde.',
    tip: 'Se sua saúde chegar a zero, a missão falha!',
  },
  {
    title: tx('Enigmas'),
    emoji: '🧩',
    text: 'Ao encontrar um enigma, responda corretamente para ganhar pontos bônus! Errar não tira vida, mas você perde a recompensa.',
    tip: 'Os enigmas ensinam sobre sustentabilidade e ecologia!',
  },
  {
    title: tx('Objetivo'),
    emoji: '🏁',
    text: 'Colete o máximo de tesouros e chegue à saída 🚪 no canto inferior direito do mapa. Quanto mais tesouros, melhor sua pontuação!',
    tip: 'Boa sorte, explorador ecológico! 🌍',
  },
];

export function TreasureTutorial({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const next = useCallback(() => {
    if (isLast) onComplete();
    else setStep(s => s + 1);
  }, [isLast, onComplete]);

  const sprite = getEmojiSprite(current.emoji);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div key={i} className={cn('h-2 rounded-full transition-all duration-300', i === step ? 'w-6 bg-amber-500' : i < step ? 'w-2 bg-amber-500/40' : 'w-2 bg-muted')} />
          ))}
        </div>
        <div className="text-center mb-5">
          <div className="block mb-3 flex justify-center">
            {sprite ? (
              <img src={sprite} alt="" className="w-14 h-14 object-contain drop-shadow-lg" draggable={false} />
            ) : (
              <span className="text-5xl">{current.emoji}</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{tx(current.title)}</h2>
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
              {tx('⬅️ Voltar')}
            </button>
          )}
          <button onClick={next} className={cn('flex-1 py-3 font-bold rounded-xl text-white text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform min-h-[48px]', isLast ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-amber-500 to-yellow-600')}>
            {isLast ? '🗺️ Explorar!' : 'Próximo ➡️'}
          </button>
        </div>
        {!isLast && (
          <button onClick={onComplete} className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
            {tx('Pular tutorial')}
          </button>
        )}
      </div>
    </div>
  );
}
