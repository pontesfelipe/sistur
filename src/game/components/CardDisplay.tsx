import { cn } from '@/lib/utils';
import type { GameCard } from '../cardTypes';
import { RARITY_COLORS, CATEGORY_COLORS, TYPE_LABELS } from '../cardTypes';

interface CardDisplayProps {
  card: GameCard;
  onClick?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
  tooExpensive?: boolean;
  small?: boolean;
  selected?: boolean;
  className?: string;
}

export function CardDisplay({ card, onClick, onDiscard, disabled, tooExpensive, small, selected, className }: CardDisplayProps) {
  const rarity = RARITY_COLORS[card.rarity];
  const cat = CATEGORY_COLORS[card.category];
  const typeInfo = TYPE_LABELS[card.type];

  return (
    <div
      onClick={!disabled && !tooExpensive ? onClick : undefined}
      className={cn(
        'relative rounded-xl border-2 transition-all duration-200 select-none',
        'flex flex-col overflow-hidden',
        rarity.border,
        selected ? 'ring-2 ring-primary scale-105 shadow-xl' : '',
        disabled || tooExpensive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-lg active:scale-[0.98]',
        small ? 'w-28 h-40' : 'w-36 sm:w-40 h-52 sm:h-56',
        className,
      )}
    >
      {/* Card header with gradient */}
      <div className={cn('px-2 py-1.5 bg-gradient-to-r text-white', cat.gradient)}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold opacity-90">{typeInfo.emoji} {typeInfo.label}</span>
          <span className="text-xs font-bold bg-white/20 rounded-full px-1.5">💰{card.cost}</span>
        </div>
      </div>

      {/* Card body */}
      <div className={cn('flex-1 flex flex-col items-center justify-between p-2', rarity.bg)}>
        {/* Emoji icon */}
        <div className={cn(small ? 'text-2xl' : 'text-3xl sm:text-4xl', 'my-1')}>{card.emoji}</div>

        {/* Name */}
        <div className={cn('font-bold text-center leading-tight', small ? 'text-[10px]' : 'text-xs')}>
          {card.name}
        </div>

        {/* Effects */}
        <div className="flex flex-wrap gap-1 justify-center mt-1">
          {card.effects.ra !== 0 && (
            <span className={cn('text-[9px] font-bold px-1 rounded', card.effects.ra > 0 ? 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200')}>
              🌳{card.effects.ra > 0 ? '+' : ''}{card.effects.ra}
            </span>
          )}
          {card.effects.oe !== 0 && (
            <span className={cn('text-[9px] font-bold px-1 rounded', card.effects.oe > 0 ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200')}>
              🏗️{card.effects.oe > 0 ? '+' : ''}{card.effects.oe}
            </span>
          )}
          {card.effects.ao !== 0 && (
            <span className={cn('text-[9px] font-bold px-1 rounded', card.effects.ao > 0 ? 'bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200')}>
              🤝{card.effects.ao > 0 ? '+' : ''}{card.effects.ao}
            </span>
          )}
          {card.effects.coins && card.effects.coins !== 0 && (
            <span className="text-[9px] font-bold px-1 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              💰{card.effects.coins > 0 ? '+' : ''}{card.effects.coins}
            </span>
          )}
        </div>

        {/* Description */}
        {!small && (
          <p className="text-[9px] text-muted-foreground text-center mt-1 leading-tight line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Tags */}
        {card.exhaust && (
          <span className="text-[8px] bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 px-1.5 rounded-full mt-0.5 font-bold">
            USO ÚNICO
          </span>
        )}
      </div>

      {/* Rarity indicator */}
      <div className={cn('h-1 w-full', {
        'bg-slate-400': card.rarity === 'common',
        'bg-emerald-500': card.rarity === 'uncommon',
        'bg-blue-500': card.rarity === 'rare',
        'bg-amber-500': card.rarity === 'legendary',
      })} />

      {/* Discard button */}
      {onDiscard && !disabled && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-[10px] font-bold flex items-center justify-center hover:bg-red-600 transition-colors"
          title="Descartar (+1💰)"
        >
          ✕
        </button>
      )}

      {/* Too expensive overlay */}
      {tooExpensive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
          <span className="text-xs font-bold text-white bg-red-500/80 px-2 py-1 rounded">💰 Sem moedas</span>
        </div>
      )}
    </div>
  );
}
