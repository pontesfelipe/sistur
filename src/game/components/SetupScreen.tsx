import { useState } from 'react';
import type { AvatarConfig, AvatarPreset, BiomeType } from '../types';
import { BIOME_INFO } from '../types';
import { AVATAR_PRESETS, SKIN_COLORS, HAIR_COLORS, SHIRT_COLORS } from '../constants';
import { cn } from '@/lib/utils';

interface SetupScreenProps {
  onStart: (avatar: AvatarConfig, biome: BiomeType) => void;
}

export function SetupScreen({ onStart }: SetupScreenProps) {
  const [step, setStep] = useState<'avatar' | 'biome'>('avatar');
  const [avatar, setAvatar] = useState<AvatarConfig>({
    preset: 'explorador',
    skinColor: SKIN_COLORS[0],
    hairColor: HAIR_COLORS[0],
    shirtColor: SHIRT_COLORS[0],
  });
  const [biome, setBiome] = useState<BiomeType>('floresta');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 via-emerald-400 to-teal-500 flex items-center justify-center p-4">
      <div className="bg-white/95 dark:bg-slate-800/95 rounded-3xl shadow-2xl max-w-lg w-full p-8 backdrop-blur-sm">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🌍 Mapa do Tesouro</h1>
          <p className="text-sm text-muted-foreground mt-1">Construa Seu Mundo</p>
        </div>

        {step === 'avatar' ? (
          <>
            <h2 className="text-lg font-bold mb-4 text-center">👤 Crie seu Personagem</h2>

            {/* Preset */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.entries(AVATAR_PRESETS) as [AvatarPreset, typeof AVATAR_PRESETS.explorador][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setAvatar(prev => ({ ...prev, preset: key }))}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    avatar.preset === key ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-transparent bg-accent/50'
                  )}
                >
                  <span className="text-2xl">{val.emoji}</span>
                  <div className="text-sm font-bold mt-1">{val.name}</div>
                  <div className="text-xs text-muted-foreground">{val.description}</div>
                </button>
              ))}
            </div>

            {/* Avatar preview */}
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                {/* Body */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-12 rounded-t-xl" style={{ backgroundColor: avatar.shirtColor }} />
                {/* Head */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full" style={{ backgroundColor: avatar.skinColor }}>
                  {/* Hair */}
                  <div className="absolute top-0 left-1 right-1 h-5 rounded-t-full" style={{ backgroundColor: avatar.hairColor }} />
                  {/* Eyes */}
                  <div className="absolute top-6 left-3 w-1.5 h-1.5 rounded-full bg-slate-800" />
                  <div className="absolute top-6 right-3 w-1.5 h-1.5 rounded-full bg-slate-800" />
                  {/* Smile */}
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-1.5 border-b-2 border-slate-700 rounded-b-full" />
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Pele</label>
                <div className="flex gap-1.5 mt-1">
                  {SKIN_COLORS.map(c => (
                    <button key={c} onClick={() => setAvatar(prev => ({ ...prev, skinColor: c }))}
                      className={cn('w-7 h-7 rounded-full border-2 transition-transform', avatar.skinColor === c ? 'border-primary scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Cabelo</label>
                <div className="flex gap-1.5 mt-1">
                  {HAIR_COLORS.map(c => (
                    <button key={c} onClick={() => setAvatar(prev => ({ ...prev, hairColor: c }))}
                      className={cn('w-7 h-7 rounded-full border-2 transition-transform', avatar.hairColor === c ? 'border-primary scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Roupa</label>
                <div className="flex gap-1.5 mt-1">
                  {SHIRT_COLORS.map(c => (
                    <button key={c} onClick={() => setAvatar(prev => ({ ...prev, shirtColor: c }))}
                      className={cn('w-7 h-7 rounded-full border-2 transition-transform', avatar.shirtColor === c ? 'border-primary scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <button onClick={() => setStep('biome')} className="w-full mt-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl text-lg shadow-lg hover:scale-[1.02] transition-transform">
              Próximo ➡️
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4 text-center">🌎 Escolha seu Bioma</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {(Object.entries(BIOME_INFO) as [BiomeType, typeof BIOME_INFO.floresta][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setBiome(key as BiomeType)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    biome === key ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-transparent bg-accent/50'
                  )}
                >
                  <span className="text-2xl">{val.emoji}</span>
                  <div className="text-sm font-bold mt-1">{val.name}</div>
                  <div className="text-xs text-muted-foreground">{val.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('avatar')} className="px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/80 transition-colors">
                ⬅️ Voltar
              </button>
              <button onClick={() => onStart(avatar, biome)} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl text-lg shadow-lg hover:scale-[1.02] transition-transform">
                🚀 Começar!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
