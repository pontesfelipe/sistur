import { cn } from '@/lib/utils';
import type { GameCard } from '../cardTypes';
import type { ThreatCard } from '../threatCards';
import { RARITY_COLORS, CATEGORY_COLORS, TYPE_LABELS } from '../cardTypes';
import { THREAT_TARGET_COLORS, THREAT_TYPE_ICONS } from '../threatCards';
import { useState } from 'react';

// ── PLAYER CARD ──────────────────────────────────────

interface TCGPlayerCardProps {
  card: GameCard;
  onClick?: () => void;
  onDiscard?: () => void;
  disabled?: boolean;
  tooExpensive?: boolean;
  selected?: boolean;
  inHand?: boolean;
  onBoard?: boolean;
  animateIn?: boolean;
  className?: string;
}

export function TCGPlayerCard({ 
  card, onClick, onDiscard, disabled, tooExpensive, selected, 
  inHand, onBoard, animateIn, className 
}: TCGPlayerCardProps) {
  const rarity = RARITY_COLORS[card.rarity];
  const cat = CATEGORY_COLORS[card.category];
  const typeInfo = TYPE_LABELS[card.type];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={!disabled && !tooExpensive ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-lg border-2 transition-all select-none group',
        'flex flex-col overflow-hidden',
        rarity.border,
        // Sizing
        inHand ? 'w-[110px] sm:w-[130px] h-[160px] sm:h-[185px]' : '',
        onBoard ? 'w-[80px] sm:w-[95px] h-[110px] sm:h-[130px]' : '',
        // Interactions
        selected ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.5)] -translate-y-3 z-20 scale-110' : '',
        inHand && !selected && !disabled ? 'hover:-translate-y-4 hover:z-10 hover:scale-105 hover:shadow-xl' : '',
        disabled || tooExpensive ? 'opacity-50 cursor-not-allowed grayscale-[30%]' : 'cursor-pointer',
        // Animations
        animateIn ? 'animate-[cardSlideIn_0.4s_ease-out_forwards]' : '',
        onBoard ? 'animate-[cardPlace_0.3s_ease-out]' : '',
        className,
      )}
      style={{
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Shine effect on hover */}
      {isHovered && !disabled && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute -inset-full animate-[shine_1.5s_ease-in-out] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
        </div>
      )}

      {/* Card header */}
      <div className={cn('px-1.5 py-1 bg-gradient-to-r text-white flex-shrink-0', cat.gradient)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] sm:text-[9px] font-bold opacity-90 truncate">{typeInfo.emoji} {typeInfo.label}</span>
          <span className="text-[9px] sm:text-[10px] font-bold bg-black/20 rounded-full px-1.5 flex-shrink-0">💰{card.cost}</span>
        </div>
      </div>

      {/* Card body */}
      <div className={cn('flex-1 flex flex-col items-center justify-center p-1.5 gap-1', rarity.bg)}>
        {/* Big emoji */}
        <div className={cn(
          'transition-transform duration-300',
          inHand ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl',
          isHovered && !disabled ? 'scale-110' : '',
        )}>
          {card.emoji}
        </div>

        {/* Name */}
        <div className={cn(
          'font-bold text-center leading-tight',
          inHand ? 'text-[10px] sm:text-xs' : 'text-[8px] sm:text-[9px]',
        )}>
          {card.name}
        </div>

        {/* Effects pills */}
        <div className="flex flex-wrap gap-0.5 justify-center">
          {card.effects.ra !== 0 && (
            <EffectPill value={card.effects.ra} icon="🌳" positive={card.effects.ra > 0} />
          )}
          {card.effects.oe !== 0 && (
            <EffectPill value={card.effects.oe} icon="🏗️" positive={card.effects.oe > 0} />
          )}
          {card.effects.ao !== 0 && (
            <EffectPill value={card.effects.ao} icon="🤝" positive={card.effects.ao > 0} />
          )}
          {card.effects.coins && card.effects.coins !== 0 && (
            <EffectPill value={card.effects.coins} icon="💰" positive={card.effects.coins > 0} />
          )}
        </div>

        {/* Description (only in hand, on hover) */}
        {inHand && isHovered && (
          <p className="text-[8px] text-muted-foreground text-center leading-tight line-clamp-2 animate-in fade-in duration-200">
            {card.description}
          </p>
        )}
      </div>

      {/* Rarity bar */}
      <div className={cn('h-[3px] w-full flex-shrink-0', {
        'bg-slate-400': card.rarity === 'common',
        'bg-emerald-500': card.rarity === 'uncommon',
        'bg-blue-500': card.rarity === 'rare',
        'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400': card.rarity === 'legendary',
      })} />

      {/* Exhaust badge */}
      {card.exhaust && (
        <div className="absolute top-6 right-0.5 text-[7px] bg-red-500 text-white px-1 rounded-l font-bold">
          1×
        </div>
      )}

      {/* Discard button */}
      {onDiscard && !disabled && inHand && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/80 text-white text-[8px] font-bold flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Descartar (+1💰)"
        >
          ✕
        </button>
      )}

      {/* Too expensive overlay */}
      {tooExpensive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-[1px]">
          <span className="text-[9px] font-bold text-white bg-red-600/90 px-1.5 py-0.5 rounded">💰</span>
        </div>
      )}
    </div>
  );
}

// ── THREAT CARD ──────────────────────────────────────

interface TCGThreatCardProps {
  threat: ThreatCard;
  animateIn?: boolean;
  className?: string;
}

export function TCGThreatCard({ threat, animateIn, className }: TCGThreatCardProps) {
  const targetColor = THREAT_TARGET_COLORS[threat.target];
  const typeIcon = THREAT_TYPE_ICONS[threat.type];

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-red-800/60 overflow-hidden select-none',
        'w-[80px] sm:w-[95px] h-[110px] sm:h-[130px]',
        'flex flex-col',
        'bg-gradient-to-b from-gray-900 to-red-950',
        'shadow-lg', targetColor.glow,
        animateIn ? 'animate-[threatAppear_0.5s_ease-out]' : '',
        className,
      )}
    >
      {/* Danger pulse */}
      <div className="absolute inset-0 animate-[dangerPulse_2s_ease-in-out_infinite] bg-red-500/10 pointer-events-none rounded-lg" />

      {/* Header */}
      <div className={cn('px-1.5 py-1 bg-gradient-to-r text-white flex-shrink-0', targetColor.gradient)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold">{typeIcon}</span>
          <span className="text-[10px] font-black bg-black/30 rounded-full px-1.5">⚔️{threat.power}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-1.5 gap-1">
        <div className="text-2xl sm:text-3xl">{threat.emoji}</div>
        <div className="text-[8px] sm:text-[9px] font-bold text-red-200 text-center leading-tight">
          {threat.name}
        </div>
        
        {/* Damage indicators */}
        <div className="flex flex-wrap gap-0.5 justify-center">
          {threat.effects.ra !== 0 && (
            <span className="text-[8px] font-bold px-1 rounded bg-red-900/60 text-red-300">
              🌳{threat.effects.ra}
            </span>
          )}
          {threat.effects.oe !== 0 && (
            <span className="text-[8px] font-bold px-1 rounded bg-red-900/60 text-red-300">
              🏗️{threat.effects.oe}
            </span>
          )}
          {threat.effects.ao !== 0 && (
            <span className="text-[8px] font-bold px-1 rounded bg-red-900/60 text-red-300">
              🤝{threat.effects.ao}
            </span>
          )}
        </div>
      </div>

      {/* Tier indicator */}
      <div className="flex gap-0.5 justify-center pb-1">
        {Array.from({ length: threat.tier }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500" />
        ))}
      </div>
    </div>
  );
}

// ── EFFECT PILL ──────────────────────────────────────

function EffectPill({ value, icon, positive }: { value: number; icon: string; positive: boolean }) {
  return (
    <span className={cn(
      'text-[8px] font-bold px-1 rounded',
      positive 
        ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
        : 'bg-red-200/80 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    )}>
      {icon}{value > 0 ? '+' : ''}{value}
    </span>
  );
}
