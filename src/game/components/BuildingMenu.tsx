import type { GameLevel } from '../types';
import { BUILDINGS } from '../constants';
import { cn } from '@/lib/utils';

interface BuildingMenuProps {
  selectedBuilding: string | null;
  onSelect: (id: string | null) => void;
  coins: number;
  level: GameLevel;
  onEndTurn: () => void;
  onEvent: () => void;
  onCouncil: () => void;
}

export function BuildingMenu({ selectedBuilding, onSelect, coins, level, onEndTurn, onEvent, onCouncil }: BuildingMenuProps) {
  const categories = [
    { key: 'RA' as const, label: '🌳 Natureza', color: 'border-green-500' },
    { key: 'OE' as const, label: '🏗️ Conforto', color: 'border-blue-500' },
    { key: 'AO' as const, label: '🤝 Organização', color: 'border-purple-500' },
  ];

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onEndTurn}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
        >
          ⏭️ Passar Turno
        </button>
        <button
          onClick={onEvent}
          className="px-3 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
        >
          🎲
        </button>
        <button
          onClick={onCouncil}
          className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
        >
          🤝
        </button>
      </div>

      {/* Building categories */}
      {categories.map(cat => {
        const buildings = BUILDINGS.filter(b => b.category === cat.key);
        return (
          <div key={cat.key}>
            <h3 className="text-xs font-bold mb-1.5 text-muted-foreground">{cat.label}</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {buildings.map(b => {
                const locked = b.unlockLevel > level;
                const tooExpensive = b.cost > coins;
                const isSelected = selectedBuilding === b.id;

                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(isSelected ? null : b.id)}
                    disabled={locked || tooExpensive}
                    className={cn(
                      'p-2 rounded-lg text-left transition-all border-2 text-xs',
                      isSelected
                        ? `${cat.color} bg-accent shadow-md scale-[1.02]`
                        : 'border-transparent bg-card hover:bg-accent/50',
                      (locked || tooExpensive) && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{locked ? '🔒' : b.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{b.name}</div>
                        <div className="text-[10px] text-muted-foreground">💰{b.cost}</div>
                      </div>
                    </div>
                    {!locked && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {b.effects.ra !== 0 && (
                          <span className={cn('text-[9px] font-bold', b.effects.ra > 0 ? 'text-green-600' : 'text-red-500')}>
                            🌳{b.effects.ra > 0 ? '+' : ''}{b.effects.ra}
                          </span>
                        )}
                        {b.effects.oe !== 0 && (
                          <span className={cn('text-[9px] font-bold', b.effects.oe > 0 ? 'text-blue-600' : 'text-red-500')}>
                            🏗️{b.effects.oe > 0 ? '+' : ''}{b.effects.oe}
                          </span>
                        )}
                        {b.effects.ao !== 0 && (
                          <span className={cn('text-[9px] font-bold', b.effects.ao > 0 ? 'text-purple-600' : 'text-red-500')}>
                            🤝{b.effects.ao > 0 ? '+' : ''}{b.effects.ao}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedBuilding && (
        <p className="text-xs text-center text-muted-foreground animate-pulse">
          👆 Clique no mapa para construir!
        </p>
      )}
    </div>
  );
}
