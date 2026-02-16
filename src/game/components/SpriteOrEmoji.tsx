import { getEmojiSprite } from '../spriteMap';
import { cn } from '@/lib/utils';

interface SpriteOrEmojiProps {
  emoji: string;
  size?: string; // tailwind size class e.g. 'w-6 h-6'
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a pixel-art sprite if available, otherwise falls back to the emoji.
 * Used across all games for consistent visual upgrades.
 */
export function SpriteOrEmoji({ emoji, size = 'w-6 h-6', className, style }: SpriteOrEmojiProps) {
  const sprite = getEmojiSprite(emoji);
  
  if (sprite) {
    return (
      <img
        src={sprite}
        alt={emoji}
        className={cn('object-contain drop-shadow-md', size, className)}
        style={style}
        draggable={false}
      />
    );
  }
  
  return (
    <span className={cn('select-none', className)} style={style}>
      {emoji}
    </span>
  );
}
