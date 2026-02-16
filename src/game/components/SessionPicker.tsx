import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Play, Trash2, Clock, MapPin, TrendingUp, ArrowLeft } from 'lucide-react';
import { BIOME_INFO } from '@/game/types';
import type { GameSessionSummary } from '@/hooks/useGameSessions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BiomeType } from '@/game/types';

interface SessionPickerProps {
  sessions: GameSessionSummary[];
  loading: boolean;
  onNewGame: () => void;
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function SessionPicker({ sessions, loading, onNewGame, onLoadSession, onDeleteSession }: SessionPickerProps) {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      onDeleteSession(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  const getEquilibriumColor = (eq: number) => {
    if (eq >= 60) return 'text-green-600 dark:text-green-400';
    if (eq >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Back to SISTUR */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao SISTUR
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">⚔️ Guardião do Território</h1>
          <p className="text-sm text-muted-foreground">Defenda seu destino turístico com cartas estratégicas!</p>
        </div>

        {/* New Game Button */}
        <Button
          onClick={onNewGame}
          className="w-full py-6 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Aventura
        </Button>

        {/* Sessions List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Sessões Salvas ({sessions.length})
            </h2>
            {sessions.map((session) => {
              const biomeInfo = BIOME_INFO[session.biome as BiomeType];
              return (
                <Card
                  key={session.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onLoadSession(session.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{biomeInfo?.emoji || '🌍'}</span>
                        <h3 className="font-bold text-sm truncate">{session.session_name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {biomeInfo?.name || session.biome}
                        </span>
                        <span>Turno {session.turn}</span>
                        <span>Nível {session.level}</span>
                        <span className={`font-semibold ${getEquilibriumColor(session.equilibrium)}`}>
                          <TrendingUp className="h-3 w-3 inline mr-0.5" />
                          {Math.round(session.equilibrium)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 bg-primary/90 hover:bg-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadSession(session.id);
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Jogar
                      </Button>
                    </div>
                  </div>
                  {deletingId === session.id && (
                    <p className="text-xs text-destructive mt-2 animate-pulse">
                      Clique novamente no 🗑️ para confirmar a exclusão
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-4xl mb-2">🗺️</p>
            <p className="text-sm">Nenhuma sessão salva ainda.</p>
            <p className="text-xs">Comece uma nova aventura!</p>
          </div>
        )}
      </div>
    </div>
  );
}
