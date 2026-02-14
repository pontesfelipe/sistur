import type { GameLevel, PlacedBuilding } from '../types';
import { BUILDINGS, checkBuildingRequirements } from '../constants';
import { cn } from '@/lib/utils';
import { Lock, Link, Zap } from 'lucide-react';

interface BuildingMenuProps {
  selectedBuilding: string | null;
  onSelect: (id: string | null) => void;
  coins: number;
  level: GameLevel;
  grid: (PlacedBuilding | null)[][];
}

export function BuildingMenu({ selectedBuilding, onSelect, coins, level, grid }: BuildingMenuProps) {
  const categories = [
    { key: 'RA' as const, label: '🌳 Natureza', color: 'border-green-500' },
    { key: 'OE' as const, label: '🏗️ Conforto', color: 'border-blue-500' },
    { key: 'AO' as const, label: '🤝 Organização', color: 'border-purple-500' },
  ];

  return (
    <div className="space-y-3">

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
                const reqs = checkBuildingRequirements(b.id, grid);
                const missingDeps = !reqs.met;
                const isSelected = selectedBuilding === b.id;
                const disabled = locked || tooExpensive || missingDeps;

                const missingNames = reqs.missing.map(id => {
                  const dep = BUILDINGS.find(bd => bd.id === id);
                  return dep ? `${dep.emoji} ${dep.name}` : id;
                });

                return (
                  <button
                    key={b.id}
                    onClick={() => onSelect(isSelected ? null : b.id)}
                    disabled={disabled}
                    className={cn(
                      'p-2 rounded-lg text-left transition-all border-2 text-xs',
                      isSelected
                        ? `${cat.color} bg-accent shadow-md scale-[1.02]`
                        : 'border-transparent bg-card hover:bg-accent/50',
                      disabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{locked ? '🔒' : b.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{b.name}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">💰{b.cost}</span>
                          {b.maintenance ? (
                            <span className="text-[10px] text-muted-foreground">🔧{b.maintenance}/t</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Dependencies */}
                    {!locked && missingDeps && (
                      <div className="flex items-start gap-1 mt-1 text-[9px] text-orange-600 dark:text-orange-400">
                        <Link className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>Precisa: {missingNames.join(', ')}</span>
                      </div>
                    )}

                    {/* Synergies hint */}
                    {!locked && b.synergies && b.synergies.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 text-[9px] text-amber-600 dark:text-amber-400">
                        <Zap className="h-3 w-3" />
                        <span>Bônus perto de {b.synergies.map(s => {
                          const dep = BUILDINGS.find(bd => bd.id === s.withId);
                          return dep?.emoji || s.withId;
                        }).join(', ')}</span>
                      </div>
                    )}

                    {!locked && !missingDeps && (
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
