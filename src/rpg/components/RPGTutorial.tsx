import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TutorialStep {
  title: string;
  emoji: string;
  text: string;
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Bem-vindo à Missão Bioma!',
    emoji: '🌿',
    text: 'Você é um agente de restauração ambiental! Sua missão é restaurar o bioma escolhido tomando as melhores decisões ao longo da jornada.',
    tip: 'Cada bioma tem sua própria história e desafios únicos!',
  },
  {
    title: 'Escolha seu Bioma',
    emoji: '🗺️',
    text: 'Existem 5 biomas para explorar:\n🌳 Amazônia — floresta tropical\n🏖️ Litoral — ecossistema costeiro\n🌾 Cerrado — savana brasileira\n⛰️ Serra — região montanhosa\n🌵 Caatinga — semiárido nordestino',
    tip: 'Cada bioma tem desafios e histórias completamente diferentes!',
  },
  {
    title: 'As 4 Barras Vitais',
    emoji: '📊',
    text: '🦎 Biodiversidade — saúde dos ecossistemas\n🏭 Poluição — quanto menor, melhor!\n👥 Comunidade — bem-estar das pessoas\n💎 Recursos — materiais disponíveis',
    tip: 'Mantenha as barras equilibradas para um final feliz!',
  },
  {
    title: 'Tipos de Escolha',
    emoji: '🎭',
    text: '🌱 Sustentável — protege o bioma a longo prazo\n⚡ Arriscado — ganho rápido, mas pode prejudicar\n⚖️ Neutro — caminho seguro, sem extremos',
    tip: 'Escolhas sustentáveis nem sempre são as mais fáceis, mas valem a pena!',
  },
  {
    title: 'Finais da História',
    emoji: '🏁',
    text: 'Suas decisões determinam o destino do bioma:\n🌟 Restaurado — você salvou o bioma!\n💀 Degradado — o bioma não resistiu\n😐 Neutro — sobreviveu, mas poderia ser melhor',
    tip: 'Tente alcançar o final "Restaurado" em todos os biomas! 🏆',
  },
  {
    title: 'Pronto para a missão!',
    emoji: '🚀',
    text: 'Leia cada capítulo com atenção, pense nas consequências e escolha com sabedoria. O futuro do bioma está nas suas mãos!',
    tip: 'Boa sorte, agente restaurador! 🌍',
  },
];

interface RPGTutorialProps {
  onComplete: () => void;
}

export function RPGTutorial({ onComplete }: RPGTutorialProps) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  const next = useCallback(() => {
    if (isLast) onComplete();
    else setStep(s => s + 1);
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    setStep(s => Math.max(0, s - 1));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === step ? 'w-6 bg-emerald-500' : i < step ? 'w-2 bg-emerald-500/40' : 'w-2 bg-muted'
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
            <div className="mt-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-2.5">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">💡 {current.tip}</p>
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
                : 'bg-gradient-to-r from-emerald-500 to-teal-600'
            )}
          >
            {isLast ? '🌿 Começar!' : 'Próximo ➡️'}
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
