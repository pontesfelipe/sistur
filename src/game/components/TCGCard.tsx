import { cn } from '@/lib/utils';
import type { GameCard } from '../cardTypes';
import type { ThreatCard } from '../threatCards';
import { RARITY_COLORS, CATEGORY_COLORS, TYPE_LABELS } from '../cardTypes';
import { THREAT_TARGET_COLORS, THREAT_TYPE_ICONS } from '../threatCards';
import { getCardSprite, getThreatSprite } from '../spriteMap';
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
  animationDelay?: number;
  className?: string;
}

export function TCGPlayerCard({ 
  card, onClick, onDiscard, disabled, tooExpensive, selected, 
  inHand, onBoard, animateIn, animationDelay = 0, className 
}: TCGPlayerCardProps) {
  const rarity = RARITY_COLORS[card.rarity];
  const cat = CATEGORY_COLORS[card.category];
  const typeInfo = TYPE_LABELS[card.type];
  const sprite = getCardSprite(card.id);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={!disabled && !tooExpensive ? onClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative rounded-xl border-2 transition-all select-none group tcg-card-3d',
        'flex flex-col overflow-hidden',
        rarity.border,
        // Sizing
        inHand ? 'w-[110px] sm:w-[130px] h-[160px] sm:h-[185px]' : '',
        onBoard ? 'w-[80px] sm:w-[95px] h-[110px] sm:h-[130px]' : '',
        // Selection with animated glow
        selected ? 'tcg-selected-glow -translate-y-4 z-20 scale-110' : '',
        // Hand hover — lift + tilt
        inHand && !selected && !disabled ? 'hover:-translate-y-5 hover:z-10 hover:scale-[1.08] hover:rotate-[-2deg]' : '',
        disabled || tooExpensive ? 'opacity-50 cursor-not-allowed grayscale-[30%]' : 'cursor-pointer',
        // Animations
        animateIn && inHand ? 'animate-[cardSlideIn_0.6s_ease-out_backwards]' : '',
        animateIn && onBoard ? 'animate-[cardPlace_0.5s_ease-out]' : '',
        className,
      )}
      style={{
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, filter 0.2s ease',
        animationDelay: animateIn && inHand ? `${animationDelay}ms` : '0ms',
        boxShadow: isHovered && !disabled 
          ? `0 8px 25px -5px ${cat.gradient.includes('emerald') ? 'rgba(16,185,129,0.3)' : cat.gradient.includes('blue') ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)'}` 
          : selected ? '0 0 25px 5px rgba(234,179,8,0.4)' : 'none',
      }}
    >
      {/* Holographic shine effect on hover */}
      {isHovered && !disabled && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-xl">
          <div className="absolute -inset-full animate-[shine_1s_ease-in-out] bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
        </div>
      )}

      {/* Rarity glow ring for legendary */}
      {card.rarity === 'legendary' && (
        <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 opacity-60 blur-[3px] pointer-events-none animate-pulse" />
      )}

      {/* Card header */}
      <div className={cn('px-1.5 py-1 bg-gradient-to-r text-white flex-shrink-0 relative z-[1]', cat.gradient)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] sm:text-[9px] font-bold opacity-90 truncate">{typeInfo.emoji} {typeInfo.label}</span>
          <span className="text-[9px] sm:text-[10px] font-bold bg-black/20 rounded-full px-1.5 flex-shrink-0">💰{card.cost}</span>
        </div>
      </div>

      {/* Card body */}
      <div className={cn('flex-1 flex flex-col items-center justify-center p-1.5 gap-1 relative z-[1]', rarity.bg)}>
        {/* Sprite or emoji with hover bounce */}
        {sprite ? (
          <img
            src={sprite}
            alt={card.name}
            className={cn(
              'object-contain rounded-md drop-shadow-lg transition-all duration-300',
              inHand ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-8 h-8 sm:w-10 sm:h-10',
              isHovered && !disabled ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : '',
            )}
          />
        ) : (
          <div className={cn(
            'transition-all duration-300',
            inHand ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl',
            isHovered && !disabled ? 'scale-125 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : '',
          )}>
            {card.emoji}
          </div>
        )}

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

      {/* Rarity bar with glow */}
      <div className={cn('h-[4px] w-full flex-shrink-0 relative z-[1]', {
        'bg-slate-400': card.rarity === 'common',
        'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]': card.rarity === 'uncommon',
        'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]': card.rarity === 'rare',
        'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 shadow-[0_0_12px_rgba(234,179,8,0.6)]': card.rarity === 'legendary',
      })} />

      {/* Exhaust badge */}
      {card.exhaust && (
        <div className="absolute top-6 right-0.5 text-[7px] bg-red-500 text-white px-1 rounded-l font-bold z-[2]">
          1×
        </div>
      )}

      {/* Discard button */}
      {onDiscard && !disabled && inHand && (
        <button
          onClick={(e) => { e.stopPropagation(); onDiscard(); }}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/80 text-white text-[9px] font-bold flex items-center justify-center hover:bg-red-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-[3]"
          title="Descartar (+1💰)"
        >
          ✕
        </button>
      )}

      {/* Too expensive overlay */}
      {tooExpensive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl backdrop-blur-[1px] z-[2]">
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
  animationDelay?: number;
  className?: string;
}

export function TCGThreatCard({ threat, animateIn, animationDelay = 0, className }: TCGThreatCardProps) {
  const targetColor = THREAT_TARGET_COLORS[threat.target];
  const typeIcon = THREAT_TYPE_ICONS[threat.type];
  const sprite = getThreatSprite(threat.id);

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 border-red-800/60 overflow-hidden select-none',
        'w-[80px] sm:w-[95px] h-[110px] sm:h-[130px]',
        'flex flex-col',
        'bg-gradient-to-b from-gray-900 to-red-950',
        'shadow-lg', targetColor.glow,
        animateIn ? 'animate-[threatAppear_0.7s_ease-out_backwards]' : '',
        className,
      )}
      style={{
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Danger pulse with glow */}
      <div className="absolute inset-0 animate-[dangerPulse_2s_ease-in-out_infinite] bg-red-500/10 pointer-events-none rounded-xl" />

      {/* Animated border glow */}
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-red-500/40 to-transparent opacity-50 pointer-events-none animate-pulse" />

      {/* Header */}
      <div className={cn('px-1.5 py-1 bg-gradient-to-r text-white flex-shrink-0 relative z-[1]', targetColor.gradient)}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold">{typeIcon}</span>
          <span className="text-[10px] font-black bg-black/30 rounded-full px-1.5">⚔️{threat.power}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center p-1.5 gap-1 relative z-[1]">
        {sprite ? (
          <img src={sprite} alt={threat.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain rounded-md drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        ) : (
          <div className="text-2xl sm:text-3xl drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">{threat.emoji}</div>
        )}
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
      <div className="flex gap-0.5 justify-center pb-1 relative z-[1]">
        {Array.from({ length: threat.tier }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
        ))}
      </div>
    </div>
  );
}

// ── EFFECT PILL ──────────────────────────────────────

function EffectPill({ value, icon, positive }: { value: number; icon: string; positive: boolean }) {
  return (
    <span className={cn(
      'text-[8px] font-bold px-1 rounded transition-all',
      positive 
        ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' 
        : 'bg-red-200/80 text-red-800 dark:bg-red-900/60 dark:text-red-200',
    )}>
      {icon}{value > 0 ? '+' : ''}{value}
    </span>
  );
}
