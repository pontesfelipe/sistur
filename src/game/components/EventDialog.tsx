import type { GameEvent, CouncilDecision } from '../types';
import { cn } from '@/lib/utils';

interface EventDialogProps {
  event: GameEvent | null;
  onResolve: (choiceIndex: number) => void;
}

export function EventDialog({ event, onResolve }: EventDialogProps) {
  if (!event) return null;

  const typeColors = {
    smart: 'from-green-500 to-emerald-600',
    quick: 'from-amber-500 to-orange-600',
    risky: 'from-red-500 to-rose-600',
  };
  const typeLabels = { smart: '🧠 Inteligente', quick: '⚡ Rápida', risky: '🎲 Arriscada' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-4">
          <span className="text-5xl block mb-2">{event.emoji}</span>
          <h2 className="text-xl font-bold text-foreground">{event.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
        </div>

        <div className="space-y-2">
          {event.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => onResolve(i)}
              className={cn(
                'w-full p-3 rounded-xl text-white text-left transition-all hover:scale-[1.02] shadow-lg',
                `bg-gradient-to-r ${typeColors[choice.type]}`
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{choice.emoji} {choice.label}</span>
                <span className="text-xs opacity-80">{typeLabels[choice.type]}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs opacity-90">
                {choice.effects.ra !== 0 && <span>🌳{choice.effects.ra > 0 ? '+' : ''}{choice.effects.ra}</span>}
                {choice.effects.oe !== 0 && <span>🏗️{choice.effects.oe > 0 ? '+' : ''}{choice.effects.oe}</span>}
                {choice.effects.ao !== 0 && <span>🤝{choice.effects.ao > 0 ? '+' : ''}{choice.effects.ao}</span>}
                {choice.effects.coins && <span>💰{choice.effects.coins > 0 ? '+' : ''}{choice.effects.coins}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CouncilDialogProps {
  decision: CouncilDecision | null;
  onResolve: (optionIndex: number) => void;
}

export function CouncilDialog({ decision, onResolve }: CouncilDialogProps) {
  if (!decision) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
        <div className="text-center mb-4">
          <span className="text-5xl block mb-2">{decision.emoji}</span>
          <h2 className="text-lg font-bold text-foreground">🤝 Conselho Mirim</h2>
          <p className="text-sm text-muted-foreground mt-2">{decision.question}</p>
        </div>

        <div className="space-y-2">
          {decision.options.map((option, i) => (
            <button
              key={i}
              onClick={() => onResolve(i)}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-2 border-purple-300 dark:border-purple-700 text-left transition-all hover:scale-[1.02] hover:border-purple-500"
            >
              <span className="font-bold text-sm">{option.label}</span>
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                {option.effects.ra !== 0 && <span className={option.effects.ra > 0 ? 'text-green-600' : 'text-red-500'}>🌳{option.effects.ra > 0 ? '+' : ''}{option.effects.ra}</span>}
                {option.effects.oe !== 0 && <span className={option.effects.oe > 0 ? 'text-blue-600' : 'text-red-500'}>🏗️{option.effects.oe > 0 ? '+' : ''}{option.effects.oe}</span>}
                {option.effects.ao !== 0 && <span className={option.effects.ao > 0 ? 'text-purple-600' : 'text-red-500'}>🤝{option.effects.ao > 0 ? '+' : ''}{option.effects.ao}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
