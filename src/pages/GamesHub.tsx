import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Swords, BookOpen, Map, Brain, Star, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { getEmojiSprite } from '@/game/spriteMap';

function SpriteOrEmoji({ emoji, className = 'w-12 h-12' }: { emoji: string; className?: string }) {
  const sprite = getEmojiSprite(emoji);
  return sprite ? (
    <img src={sprite} alt="" className={`${className} object-contain drop-shadow-lg`} draggable={false} />
  ) : (
    <span className="text-5xl">{emoji}</span>
  );
}

function FloatingBgParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: ['🌿', '🌍', '🦋', '🌊', '🌱', '🐠', '🍃', '🌸', '🦜', '☀️', '🌳', '💧'][i],
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 8,
      size: 14 + Math.random() * 10,
    })), []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      {particles.map(p => {
        const sprite = getEmojiSprite(p.emoji);
        return (
          <motion.span
            key={p.id}
            className="absolute select-none"
            style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: sprite ? undefined : p.size }}
            animate={{ y: [0, -40, -20, -50, 0], x: [0, 15, -10, 8, 0], opacity: [0, 0.5, 0.3, 0.6, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            {sprite ? (
              <img src={sprite} alt="" className="object-contain drop-shadow" style={{ width: p.size, height: p.size }} draggable={false} />
            ) : p.emoji}
          </motion.span>
        );
      })}
    </div>
  );
}

export default function GamesHub() {
  const navigate = useNavigate();

  const games = [
    {
      id: 'tcg',
      title: 'Guardião do Território',
      description: 'Jogo de cartas estratégico onde você defende seu destino turístico construindo, gerenciando recursos e enfrentando ameaças.',
      emoji: '🃏',
      icon: Swords,
      gradient: 'from-purple-900 via-violet-800 to-indigo-900',
      href: '/game/tcg',
      difficulty: 'Avançado',
      difficultyColor: 'bg-red-500/20 text-red-300 border-red-500/30',
      duration: '15-30 min',
      tag: 'Estratégia',
      tagColor: 'bg-violet-500/20 text-violet-300',
    },
    {
      id: 'rpg',
      title: 'Missão Bioma',
      description: 'RPG narrativo onde suas escolhas determinam o destino de biomas brasileiros. Restaure a natureza através de decisões estratégicas.',
      emoji: '🌍',
      icon: BookOpen,
      gradient: 'from-emerald-900 via-green-800 to-teal-900',
      href: '/game/rpg',
      difficulty: 'Médio',
      difficultyColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      duration: '10-20 min',
      tag: 'Narrativa',
      tagColor: 'bg-emerald-500/20 text-emerald-300',
    },
    {
      id: 'treasure',
      title: 'Caça ao Tesouro Ecológico',
      description: 'Explore mapas estilo campo minado, colete tesouros sustentáveis, evite armadilhas e resolva enigmas ambientais!',
      emoji: '🗺️',
      icon: Map,
      gradient: 'from-amber-900 via-orange-800 to-yellow-900',
      href: '/game/treasure',
      difficulty: 'Médio',
      difficultyColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      duration: '5-10 min',
      tag: 'Exploração',
      tagColor: 'bg-orange-500/20 text-orange-300',
    },
    {
      id: 'memory',
      title: 'Memória Ecológica',
      description: 'Jogo da memória ambiental! Associe imagens a descrições sobre fauna, flora e sustentabilidade dos biomas brasileiros.',
      emoji: '🧠',
      icon: Brain,
      gradient: 'from-pink-900 via-rose-800 to-fuchsia-900',
      href: '/game/memory',
      difficulty: 'Fácil',
      difficultyColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      duration: '3-5 min',
      tag: 'Memória',
      tagColor: 'bg-pink-500/20 text-pink-300',
    },
  ];

  return (
    <AppLayout title="Jogos Educacionais">
      <div className="max-w-4xl mx-auto relative">
        <FloatingBgParticles />

        <div className="mb-8 relative z-10">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <SpriteOrEmoji emoji="🎮" className="w-8 h-8" /> Jogos Educacionais
          </h1>
          <p className="text-muted-foreground mt-2">
            Aprenda sobre sustentabilidade e gestão territorial de forma divertida
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {games.map((game, i) => (
            <motion.button
              key={game.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(game.href)}
              className={`relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br ${game.gradient} p-8 text-left text-white shadow-xl hover:shadow-2xl transition-shadow group`}
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              {/* Shimmer effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
              />
              <div className="relative z-10">
                {/* Tags row */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${game.difficultyColor}`}>
                    <Star className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />{game.difficulty}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${game.tagColor}`}>
                    <Zap className="h-2.5 w-2.5 inline mr-0.5 -mt-px" />{game.tag}
                  </span>
                  <span className="text-[10px] text-white/50 flex items-center gap-0.5 ml-auto">
                    <Clock className="h-2.5 w-2.5" />{game.duration}
                  </span>
                </div>

                <div className="mb-4">
                  <SpriteOrEmoji emoji={game.emoji} className="w-14 h-14" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                <p className="text-sm text-white/80 leading-relaxed">{game.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur group-hover:bg-white/30 transition-colors">
                  <game.icon className="h-4 w-4" />
                  Jogar
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {getEmojiSprite(game.emoji) ? (
                  <img src={getEmojiSprite(game.emoji)!} alt="" className="w-32 h-32 object-contain" draggable={false} />
                ) : (
                  <span className="text-[120px]">{game.emoji}</span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
