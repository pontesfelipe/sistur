import { motion } from 'framer-motion';
import type { BiomeId } from '../types';

// Each scene gets a set of animated "illustration" elements that draw in
const SCENE_VISUALS: Record<string, { layers: { emoji: string; x: string; y: string; size: string; delay: number; animate?: 'float' | 'pulse' | 'sway' | 'glow' }[] }> = {
  // Floresta
  inicio: { layers: [
    { emoji: '🌳', x: '10%', y: '60%', size: '3rem', delay: 0, animate: 'sway' },
    { emoji: '🌿', x: '25%', y: '70%', size: '2rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌳', x: '75%', y: '55%', size: '3.5rem', delay: 0.2, animate: 'sway' },
    { emoji: '🏠', x: '45%', y: '75%', size: '2.5rem', delay: 0.4 },
    { emoji: '👤', x: '50%', y: '85%', size: '1.8rem', delay: 0.6 },
    { emoji: '🌅', x: '50%', y: '15%', size: '3rem', delay: 0.3, animate: 'pulse' },
    { emoji: '🦜', x: '65%', y: '30%', size: '1.5rem', delay: 0.8, animate: 'float' },
    { emoji: '🐒', x: '85%', y: '50%', size: '1.5rem', delay: 1.0 },
  ]},
  patrulha: { layers: [
    { emoji: '🌲', x: '5%', y: '50%', size: '3rem', delay: 0, animate: 'sway' },
    { emoji: '🌲', x: '90%', y: '45%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🔦', x: '30%', y: '70%', size: '2rem', delay: 0.3, animate: 'pulse' },
    { emoji: '👥', x: '45%', y: '80%', size: '2rem', delay: 0.5 },
    { emoji: '🪵', x: '65%', y: '75%', size: '2.5rem', delay: 0.4 },
    { emoji: '⚠️', x: '70%', y: '40%', size: '2rem', delay: 0.7, animate: 'pulse' },
    { emoji: '🦎', x: '20%', y: '85%', size: '1.2rem', delay: 0.9 },
  ]},
  investigacao: { layers: [
    { emoji: '🌑', x: '50%', y: '20%', size: '3rem', delay: 0, animate: 'glow' },
    { emoji: '🌲', x: '10%', y: '55%', size: '3rem', delay: 0.1 },
    { emoji: '🌲', x: '85%', y: '50%', size: '3rem', delay: 0.2 },
    { emoji: '🕵️', x: '35%', y: '75%', size: '2.2rem', delay: 0.4 },
    { emoji: '📷', x: '45%', y: '65%', size: '1.5rem', delay: 0.6, animate: 'pulse' },
    { emoji: '🚜', x: '70%', y: '80%', size: '2.5rem', delay: 0.5 },
    { emoji: '🪓', x: '75%', y: '65%', size: '1.5rem', delay: 0.7 },
  ]},
  economia: { layers: [
    { emoji: '🏘️', x: '40%', y: '65%', size: '3rem', delay: 0 },
    { emoji: '👩‍🌾', x: '25%', y: '80%', size: '2rem', delay: 0.3 },
    { emoji: '👨‍🌾', x: '60%', y: '82%', size: '2rem', delay: 0.4 },
    { emoji: '💬', x: '43%', y: '50%', size: '2rem', delay: 0.6, animate: 'float' },
    { emoji: '🌳', x: '8%', y: '55%', size: '2.5rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌳', x: '88%', y: '50%', size: '2.5rem', delay: 0.2, animate: 'sway' },
  ]},
  denuncia: { layers: [
    { emoji: '⚖️', x: '50%', y: '25%', size: '3rem', delay: 0, animate: 'glow' },
    { emoji: '📋', x: '30%', y: '60%', size: '2rem', delay: 0.3 },
    { emoji: '🚔', x: '65%', y: '70%', size: '2.5rem', delay: 0.5 },
    { emoji: '🌲', x: '10%', y: '50%', size: '2.5rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌲', x: '85%', y: '45%', size: '2.5rem', delay: 0.2, animate: 'sway' },
    { emoji: '✅', x: '50%', y: '55%', size: '2rem', delay: 0.8, animate: 'pulse' },
  ]},
  confronto: { layers: [
    { emoji: '⚡', x: '50%', y: '20%', size: '3rem', delay: 0, animate: 'pulse' },
    { emoji: '👥', x: '25%', y: '70%', size: '2.5rem', delay: 0.3 },
    { emoji: '🪓', x: '70%', y: '65%', size: '2.5rem', delay: 0.4 },
    { emoji: '😠', x: '35%', y: '55%', size: '1.8rem', delay: 0.6 },
    { emoji: '🔥', x: '80%', y: '50%', size: '2rem', delay: 0.5, animate: 'pulse' },
    { emoji: '🌲', x: '5%', y: '45%', size: '2.5rem', delay: 0.1 },
  ]},
  replantio: { layers: [
    { emoji: '🌱', x: '20%', y: '75%', size: '2rem', delay: 0, animate: 'float' },
    { emoji: '🌱', x: '40%', y: '80%', size: '1.8rem', delay: 0.2, animate: 'float' },
    { emoji: '🌱', x: '60%', y: '72%', size: '2rem', delay: 0.3, animate: 'float' },
    { emoji: '🌱', x: '80%', y: '78%', size: '1.5rem', delay: 0.4, animate: 'float' },
    { emoji: '👩‍🌾', x: '30%', y: '85%', size: '2rem', delay: 0.5 },
    { emoji: '👨‍🌾', x: '55%', y: '88%', size: '2rem', delay: 0.6 },
    { emoji: '☀️', x: '50%', y: '15%', size: '2.5rem', delay: 0.1, animate: 'pulse' },
    { emoji: '🐦', x: '70%', y: '30%', size: '1.5rem', delay: 0.8, animate: 'float' },
  ]},
  ecoturismo: { layers: [
    { emoji: '🗺️', x: '15%', y: '40%', size: '2.5rem', delay: 0 },
    { emoji: '🥾', x: '35%', y: '75%', size: '2rem', delay: 0.3 },
    { emoji: '📸', x: '55%', y: '65%', size: '2rem', delay: 0.4 },
    { emoji: '🌳', x: '75%', y: '50%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🦜', x: '80%', y: '30%', size: '1.8rem', delay: 0.7, animate: 'float' },
    { emoji: '🌿', x: '10%', y: '60%', size: '2rem', delay: 0.2, animate: 'sway' },
  ]},
  cooperativa: { layers: [
    { emoji: '🫙', x: '25%', y: '55%', size: '2.5rem', delay: 0 },
    { emoji: '🫐', x: '45%', y: '60%', size: '2rem', delay: 0.2 },
    { emoji: '🍯', x: '65%', y: '55%', size: '2rem', delay: 0.3 },
    { emoji: '🤝', x: '45%', y: '80%', size: '2.5rem', delay: 0.5, animate: 'pulse' },
    { emoji: '🌳', x: '8%', y: '45%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌳', x: '88%', y: '42%', size: '3rem', delay: 0.15, animate: 'sway' },
  ]},
  reserva: { layers: [
    { emoji: '🛡️', x: '50%', y: '25%', size: '3rem', delay: 0, animate: 'glow' },
    { emoji: '🌲', x: '15%', y: '55%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌲', x: '35%', y: '50%', size: '2.5rem', delay: 0.2, animate: 'sway' },
    { emoji: '🌲', x: '65%', y: '48%', size: '2.8rem', delay: 0.25, animate: 'sway' },
    { emoji: '🌲', x: '82%', y: '52%', size: '3rem', delay: 0.3, animate: 'sway' },
    { emoji: '📜', x: '50%', y: '75%', size: '2rem', delay: 0.6 },
  ]},
  // Generic endings
  final_restaurado: { layers: [
    { emoji: '🏆', x: '50%', y: '20%', size: '3.5rem', delay: 0, animate: 'glow' },
    { emoji: '🌳', x: '15%', y: '55%', size: '3rem', delay: 0.2, animate: 'sway' },
    { emoji: '🌳', x: '35%', y: '50%', size: '2.8rem', delay: 0.3, animate: 'sway' },
    { emoji: '🌳', x: '65%', y: '48%', size: '3rem', delay: 0.35, animate: 'sway' },
    { emoji: '🌳', x: '85%', y: '53%', size: '2.8rem', delay: 0.4, animate: 'sway' },
    { emoji: '🦜', x: '25%', y: '30%', size: '1.5rem', delay: 0.6, animate: 'float' },
    { emoji: '🐒', x: '75%', y: '35%', size: '1.5rem', delay: 0.7 },
    { emoji: '🌈', x: '50%', y: '10%', size: '3rem', delay: 0.8 },
    { emoji: '🎉', x: '30%', y: '70%', size: '2rem', delay: 1.0, animate: 'float' },
    { emoji: '🎉', x: '70%', y: '72%', size: '2rem', delay: 1.1, animate: 'float' },
  ]},
  final_degradado: { layers: [
    { emoji: '💔', x: '50%', y: '25%', size: '3rem', delay: 0, animate: 'pulse' },
    { emoji: '🪵', x: '20%', y: '65%', size: '2.5rem', delay: 0.2 },
    { emoji: '🪵', x: '50%', y: '70%', size: '2rem', delay: 0.3 },
    { emoji: '🪵', x: '75%', y: '68%', size: '2.5rem', delay: 0.4 },
    { emoji: '🔥', x: '35%', y: '50%', size: '2rem', delay: 0.5, animate: 'pulse' },
    { emoji: '💨', x: '60%', y: '40%', size: '2rem', delay: 0.6, animate: 'float' },
    { emoji: '😔', x: '50%', y: '85%', size: '2rem', delay: 0.8 },
  ]},
  final_neutro: { layers: [
    { emoji: '⚖️', x: '50%', y: '25%', size: '3rem', delay: 0, animate: 'pulse' },
    { emoji: '🌳', x: '20%', y: '55%', size: '2.5rem', delay: 0.2, animate: 'sway' },
    { emoji: '🪵', x: '50%', y: '70%', size: '2rem', delay: 0.3 },
    { emoji: '🌱', x: '75%', y: '65%', size: '2rem', delay: 0.4, animate: 'float' },
    { emoji: '🤔', x: '50%', y: '85%', size: '2rem', delay: 0.6 },
  ]},
  // Praia
  limpeza: { layers: [
    { emoji: '🏖️', x: '50%', y: '80%', size: '3rem', delay: 0 },
    { emoji: '🌊', x: '50%', y: '50%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '♻️', x: '30%', y: '70%', size: '2rem', delay: 0.3, animate: 'pulse' },
    { emoji: '👥', x: '60%', y: '75%', size: '2rem', delay: 0.5 },
    { emoji: '☀️', x: '50%', y: '15%', size: '2.5rem', delay: 0.2, animate: 'pulse' },
  ]},
  esgoto: { layers: [
    { emoji: '🏨', x: '70%', y: '50%', size: '3rem', delay: 0 },
    { emoji: '🌊', x: '40%', y: '65%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🔬', x: '25%', y: '55%', size: '2rem', delay: 0.4 },
    { emoji: '🚰', x: '55%', y: '60%', size: '2rem', delay: 0.3 },
    { emoji: '🪸', x: '35%', y: '80%', size: '2rem', delay: 0.5 },
  ]},
  pescadores: { layers: [
    { emoji: '🚣', x: '40%', y: '55%', size: '2.5rem', delay: 0 },
    { emoji: '🐟', x: '60%', y: '65%', size: '2rem', delay: 0.3, animate: 'float' },
    { emoji: '🌊', x: '50%', y: '75%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '👴', x: '25%', y: '70%', size: '2rem', delay: 0.5 },
    { emoji: '🌅', x: '50%', y: '15%', size: '3rem', delay: 0.2, animate: 'pulse' },
  ]},
  // Cerrado
  queimada: { layers: [
    { emoji: '🔥', x: '30%', y: '50%', size: '3rem', delay: 0, animate: 'pulse' },
    { emoji: '🔥', x: '60%', y: '55%', size: '2.5rem', delay: 0.2, animate: 'pulse' },
    { emoji: '🌾', x: '15%', y: '70%', size: '2.5rem', delay: 0.1 },
    { emoji: '💨', x: '50%', y: '30%', size: '2.5rem', delay: 0.4, animate: 'float' },
    { emoji: '🚒', x: '75%', y: '75%', size: '2.5rem', delay: 0.6 },
  ]},
  // Montanha
  nascente: { layers: [
    { emoji: '⛰️', x: '50%', y: '25%', size: '3.5rem', delay: 0 },
    { emoji: '💧', x: '45%', y: '55%', size: '2rem', delay: 0.3, animate: 'float' },
    { emoji: '💧', x: '55%', y: '65%', size: '1.5rem', delay: 0.4, animate: 'float' },
    { emoji: '🌿', x: '25%', y: '60%', size: '2rem', delay: 0.2, animate: 'sway' },
    { emoji: '🌿', x: '75%', y: '55%', size: '2rem', delay: 0.25, animate: 'sway' },
    { emoji: '🦅', x: '70%', y: '20%', size: '1.8rem', delay: 0.7, animate: 'float' },
  ]},
  // Caatinga
  seca: { layers: [
    { emoji: '🌵', x: '20%', y: '65%', size: '3rem', delay: 0 },
    { emoji: '🌵', x: '70%', y: '60%', size: '2.5rem', delay: 0.15 },
    { emoji: '☀️', x: '50%', y: '15%', size: '3rem', delay: 0.1, animate: 'pulse' },
    { emoji: '🏜️', x: '45%', y: '80%', size: '3rem', delay: 0.3 },
    { emoji: '💧', x: '50%', y: '50%', size: '2rem', delay: 0.6, animate: 'float' },
  ]},
};

// Biome-specific fallback visual
const BIOME_FALLBACK: Record<string, typeof SCENE_VISUALS[string]> = {
  floresta: { layers: [
    { emoji: '🌳', x: '15%', y: '55%', size: '3rem', delay: 0, animate: 'sway' },
    { emoji: '🌳', x: '50%', y: '50%', size: '3.5rem', delay: 0.15, animate: 'sway' },
    { emoji: '🌳', x: '80%', y: '52%', size: '3rem', delay: 0.25, animate: 'sway' },
    { emoji: '🌿', x: '30%', y: '75%', size: '2rem', delay: 0.3, animate: 'sway' },
    { emoji: '🐦', x: '65%', y: '25%', size: '1.5rem', delay: 0.6, animate: 'float' },
  ]},
  praia: { layers: [
    { emoji: '🌊', x: '50%', y: '55%', size: '3rem', delay: 0, animate: 'sway' },
    { emoji: '🏖️', x: '50%', y: '80%', size: '3rem', delay: 0.2 },
    { emoji: '☀️', x: '50%', y: '15%', size: '2.5rem', delay: 0.1, animate: 'pulse' },
    { emoji: '🐚', x: '30%', y: '85%', size: '1.5rem', delay: 0.4 },
    { emoji: '🦀', x: '70%', y: '83%', size: '1.5rem', delay: 0.5 },
  ]},
  cerrado: { layers: [
    { emoji: '🌾', x: '20%', y: '65%', size: '2.5rem', delay: 0, animate: 'sway' },
    { emoji: '🌾', x: '50%', y: '60%', size: '3rem', delay: 0.1, animate: 'sway' },
    { emoji: '🌾', x: '78%', y: '63%', size: '2.5rem', delay: 0.2, animate: 'sway' },
    { emoji: '🐺', x: '40%', y: '80%', size: '2rem', delay: 0.5 },
    { emoji: '☀️', x: '50%', y: '15%', size: '2.5rem', delay: 0.1, animate: 'pulse' },
  ]},
  montanha: { layers: [
    { emoji: '⛰️', x: '30%', y: '35%', size: '3.5rem', delay: 0 },
    { emoji: '⛰️', x: '70%', y: '30%', size: '3rem', delay: 0.15 },
    { emoji: '🌲', x: '20%', y: '65%', size: '2.5rem', delay: 0.3, animate: 'sway' },
    { emoji: '🌲', x: '75%', y: '60%', size: '2.5rem', delay: 0.35, animate: 'sway' },
    { emoji: '🦅', x: '55%', y: '15%', size: '2rem', delay: 0.6, animate: 'float' },
  ]},
  caatinga: { layers: [
    { emoji: '🌵', x: '20%', y: '60%', size: '3rem', delay: 0 },
    { emoji: '🌵', x: '75%', y: '55%', size: '2.5rem', delay: 0.15 },
    { emoji: '☀️', x: '50%', y: '12%', size: '3rem', delay: 0.1, animate: 'pulse' },
    { emoji: '🏜️', x: '50%', y: '80%', size: '3rem', delay: 0.3 },
    { emoji: '🦎', x: '55%', y: '75%', size: '1.5rem', delay: 0.5 },
  ]},
};

const floatVariants = {
  float: { y: [0, -8, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const } },
  pulse: { scale: [1, 1.15, 1], opacity: [1, 0.8, 1], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const } },
  sway: { rotate: [0, -5, 5, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const } },
  glow: { scale: [1, 1.1, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const } },
};

interface StoryIllustrationProps {
  sceneId: string;
  biomeId: BiomeId;
  biomeGradient: string;
}

export function StoryIllustration({ sceneId, biomeId, biomeGradient }: StoryIllustrationProps) {
  const visual = SCENE_VISUALS[sceneId] || BIOME_FALLBACK[biomeId] || BIOME_FALLBACK.floresta;

  return (
    <motion.div
      key={sceneId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-gradient-to-b ${biomeGradient}`}
    >
      {/* Sky / ambient layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/5" />

      {/* Ground line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/40 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      />

      {/* Drawing line effect — horizontal sweep */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/20 to-transparent"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Scene elements — each "draws in" with scale + opacity */}
      {visual.layers.map((layer, i) => (
        <motion.div
          key={`${sceneId}-${i}`}
          className="absolute select-none"
          style={{
            left: layer.x,
            top: layer.y,
            fontSize: layer.size,
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ opacity: 0, scale: 0, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{
            delay: layer.delay + 0.3,
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
        >
          <motion.span
            className="block"
            variants={floatVariants}
            animate={layer.animate || undefined}
          >
            {layer.emoji}
          </motion.span>
        </motion.div>
      ))}

      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.4)] rounded-2xl" />
    </motion.div>
  );
}
