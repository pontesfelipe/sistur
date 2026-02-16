import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Swords, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';

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
    },
    {
      id: 'rpg',
      title: 'Missão Bioma',
      description: 'RPG narrativo onde suas escolhas determinam o destino de biomas brasileiros. Restaure a natureza através de decisões estratégicas.',
      emoji: '🌍',
      icon: BookOpen,
      gradient: 'from-emerald-900 via-green-800 to-teal-900',
      href: '/game/rpg',
    },
  ];

  return (
    <AppLayout title="Jogos Educacionais">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            🎮 Jogos Educacionais
          </h1>
          <p className="text-muted-foreground mt-2">
            Aprenda sobre sustentabilidade e gestão territorial de forma divertida
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="relative z-10">
                <span className="text-5xl mb-4 block">{game.emoji}</span>
                <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                <p className="text-sm text-white/80 leading-relaxed">{game.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium backdrop-blur">
                  <game.icon className="h-4 w-4" />
                  Jogar
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 text-[120px] opacity-10 group-hover:opacity-20 transition-opacity">
                {game.emoji}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
