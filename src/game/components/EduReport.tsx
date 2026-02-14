import type { EduMetrics, ProfileScores, AvatarPreset } from '../types';
import { PROFILE_INFO, UNLOCKABLE_SKINS } from '../types';
import type { GameState } from '../types';

interface EduReportProps {
  metrics: EduMetrics;
  profileScores: ProfileScores;
  dominantProfile: AvatarPreset;
  turn: number;
  unlockedSkins: string[];
  state: GameState;
}

function getTendency(metrics: EduMetrics): { label: string; emoji: string; description: string } {
  const { proNatureDecisions, proInfraDecisions, proGovDecisions, excessiveBuilding, turnsInGreen, smartChoices, riskyChoices } = metrics;
  const total = proNatureDecisions + proInfraDecisions + proGovDecisions;
  if (total === 0) return { label: 'Iniciante', emoji: '🌱', description: 'Ainda começando a explorar!' };

  const naturePct = proNatureDecisions / total;
  const infraPct = proInfraDecisions / total;
  const govPct = proGovDecisions / total;

  if (excessiveBuilding > 5) return { label: 'Constrói Demais', emoji: '🏗️', description: 'Cuidado! Muita construção polui a natureza.' };
  if (naturePct > 0.5 && turnsInGreen > 5) return { label: 'Guardião da Natureza', emoji: '🌿', description: 'Você prioriza o meio ambiente! Excelente!' };
  if (govPct > 0.4 && smartChoices > riskyChoices) return { label: 'Líder Organizado', emoji: '👑', description: 'Boa governança e decisões inteligentes!' };
  if (infraPct > 0.5) return { label: 'Urbanista', emoji: '🏙️', description: 'Foca em infraestrutura. Lembre da natureza!' };

  const variance = Math.abs(naturePct - 0.33) + Math.abs(infraPct - 0.33) + Math.abs(govPct - 0.33);
  if (variance < 0.3) return { label: 'Equilibrado', emoji: '⚖️', description: 'Parabéns! Você mantém o equilíbrio!' };

  return { label: 'Estrategista', emoji: '🧠', description: 'Você analisa antes de decidir. Continue assim!' };
}

export function EduReport({ metrics, profileScores, dominantProfile, turn, unlockedSkins, state }: EduReportProps) {
  const tendency = getTendency(metrics);
  const totalDecisions = metrics.proNatureDecisions + metrics.proInfraDecisions + metrics.proGovDecisions;

  return (
    <div className="space-y-3">
      {/* Tendency */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{tendency.emoji}</span>
          <div>
            <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Tendência: {tendency.label}</p>
            <p className="text-[10px] text-blue-600 dark:text-blue-300">{tendency.description}</p>
          </div>
        </div>
      </div>

      {/* Decision breakdown */}
      <div className="bg-card/90 rounded-xl p-3 shadow-sm">
        <p className="text-xs font-bold mb-2">📊 Suas Decisões ({totalDecisions} total)</p>
        <div className="space-y-1.5">
          {[
            { label: '🌳 Pró-Natureza', value: metrics.proNatureDecisions, color: '#22c55e' },
            { label: '🏗️ Pró-Infraestrutura', value: metrics.proInfraDecisions, color: '#3b82f6' },
            { label: '🤝 Pró-Governança', value: metrics.proGovDecisions, color: '#a855f7' },
          ].map(item => {
            const pct = totalDecisions > 0 ? (item.value / totalDecisions) * 100 : 0;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[10px] w-28 truncate">{item.label}</span>
                <div className="flex-1 h-2 rounded-full bg-black/10 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                </div>
                <span className="text-[10px] w-6 text-right">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Choice types */}
      <div className="bg-card/90 rounded-xl p-3 shadow-sm">
        <p className="text-xs font-bold mb-2">🎲 Tipos de Escolha</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">🧠 {metrics.smartChoices}</div>
            <div className="text-[10px] text-muted-foreground">Inteligentes</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">⚡ {metrics.quickChoices}</div>
            <div className="text-[10px] text-muted-foreground">Rápidas</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">🎰 {metrics.riskyChoices}</div>
            <div className="text-[10px] text-muted-foreground">Arriscadas</div>
          </div>
        </div>
      </div>

      {/* Sustainability stats */}
      <div className="bg-card/90 rounded-xl p-3 shadow-sm">
        <p className="text-xs font-bold mb-2">🌍 Sustentabilidade</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-green-500">🟢</span>
            <span>Turnos no verde: <strong>{metrics.turnsInGreen}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-500">🔴</span>
            <span>Turnos no vermelho: <strong>{metrics.turnsInRed}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏗️</span>
            <span>Construções excessivas: <strong>{metrics.excessiveBuilding}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🏠</span>
            <span>Total construções: <strong>{metrics.totalBuildings}</strong></span>
          </div>
        </div>
      </div>

      {/* Unlocked skins */}
      <div className="bg-card/90 rounded-xl p-3 shadow-sm">
        <p className="text-xs font-bold mb-2">🎨 Skins Desbloqueadas ({unlockedSkins.length}/{UNLOCKABLE_SKINS.length})</p>
        <div className="grid grid-cols-2 gap-1.5">
          {UNLOCKABLE_SKINS.map(skin => {
            const unlocked = unlockedSkins.includes(skin.id);
            return (
              <div key={skin.id} className={`flex items-center gap-1.5 text-[10px] p-1.5 rounded-lg ${unlocked ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50 opacity-50'}`}>
                <span className="text-sm">{unlocked ? skin.emoji : '🔒'}</span>
                <div>
                  <p className="font-medium">{skin.name}</p>
                  <p className="text-muted-foreground">{skin.condition}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
