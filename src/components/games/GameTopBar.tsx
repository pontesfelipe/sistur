import type { ReactNode } from 'react';
import { ArrowLeft, HelpCircle, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameFeedback } from '@/game/audio/useGameFeedback';

interface GameTopBarProps {
  title: string;
  /** Título curto exibido em telas pequenas */
  shortTitle?: string;
  icon?: ReactNode;
  onBack: () => void;
  onRestart?: () => void;
  onHelp?: () => void;
  /** Conteúdo extra (status, pontuação) no centro/direita */
  children?: ReactNode;
  className?: string;
}

const btn =
  'inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-300 hover:text-slate-50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors';

/**
 * Barra superior padrão dos jogos educacionais:
 * voltar, título, ações (reiniciar/ajuda) e controle de som.
 */
export function GameTopBar({
  title,
  shortTitle,
  icon,
  onBack,
  onRestart,
  onHelp,
  children,
  className,
}: GameTopBarProps) {
  const { muted, toggleMute, play } = useGameFeedback();

  return (
    <header
      className={cn(
        'relative z-20 flex items-center gap-2 px-2 sm:px-3 py-2 bg-black/50 backdrop-blur-xl border-b border-white/10',
        className,
      )}
    >
      <button type="button" onClick={onBack} aria-label="Voltar aos jogos" className={btn}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-1.5 min-w-0">
        {icon}
        <h1 className="text-sm font-bold text-amber-300 drop-shadow truncate">
          {shortTitle ? (
            <>
              <span className="sm:hidden">{shortTitle}</span>
              <span className="hidden sm:inline">{title}</span>
            </>
          ) : (
            title
          )}
        </h1>
      </div>

      {children && <div className="flex-1 min-w-0 flex items-center justify-end gap-2">{children}</div>}
      {!children && <div className="flex-1" />}

      <div className="flex items-center gap-0.5">
        {onRestart && (
          <button type="button" onClick={onRestart} aria-label="Reiniciar jogo" className={btn}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            toggleMute();
            if (muted) play('click');
          }}
          aria-label={muted ? 'Ativar som' : 'Desativar som'}
          aria-pressed={muted}
          className={btn}
        >
          {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
        </button>
        {onHelp && (
          <button type="button" onClick={onHelp} aria-label="Como jogar" className={btn}>
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
