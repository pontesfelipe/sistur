import { motion } from 'framer-motion';
import type { BiomeId } from '../types';
import { getEmojiSprite } from '@/game/spriteMap';

// AI-generated biome background images
import florestaImg from '@/assets/biomes/floresta.jpg';
import praiaImg from '@/assets/biomes/praia.jpg';
import cerradoImg from '@/assets/biomes/cerrado.jpg';
import montanhaImg from '@/assets/biomes/montanha.jpg';
import caatingaImg from '@/assets/biomes/caatinga.jpg';

const BIOME_IMAGES: Record<string, string> = {
  floresta: florestaImg,
  praia: praiaImg,
  cerrado: cerradoImg,
  montanha: montanhaImg,
  caatinga: caatingaImg,
};

// Biome landscape configs - layered parallax scenes instead of random stickers
const BIOME_LANDSCAPES: Record<string, {
  sky: string;
  sunMoon: { emoji: string; y: string; glow: string };
  farBg: { shapes: { d: string; fill: string; y: number }[] };
  midBg: { shapes: { d: string; fill: string; y: number }[] };
  ground: { color: string; highlight: string };
  flora: { emoji: string; x: number; scale: number; sway: boolean }[];
  fauna: { emoji: string; x: number; y: number; float: boolean }[];
  particles: { emoji: string; count: number };
  atmosphere: string;
}> = {
  floresta: {
    sky: 'from-sky-300 via-emerald-200 to-emerald-300',
    sunMoon: { emoji: '☀️', y: '8%', glow: 'rgba(255,200,50,0.3)' },
    farBg: { shapes: [
      { d: 'M0,80 Q150,20 300,60 Q450,30 600,70 L600,200 L0,200Z', fill: '#2d6a4f', y: 0 },
    ]},
    midBg: { shapes: [
      { d: 'M0,100 Q100,50 200,80 Q350,40 500,90 Q550,60 600,85 L600,200 L0,200Z', fill: '#40916c', y: 0 },
    ]},
    ground: { color: '#52b788', highlight: '#74c69d' },
    flora: [
      { emoji: '🌳', x: 8, scale: 1.8, sway: true },
      { emoji: '🌴', x: 22, scale: 1.5, sway: true },
      { emoji: '🌳', x: 42, scale: 2.0, sway: true },
      { emoji: '🌿', x: 55, scale: 1.0, sway: true },
      { emoji: '🌳', x: 72, scale: 1.7, sway: true },
      { emoji: '🌴', x: 90, scale: 1.6, sway: true },
    ],
    fauna: [
      { emoji: '🦜', x: 30, y: 18, float: true },
      { emoji: '🐒', x: 78, y: 35, float: false },
      { emoji: '🦋', x: 60, y: 25, float: true },
    ],
    particles: { emoji: '🍃', count: 5 },
    atmosphere: 'rgba(52,211,153,0.08)',
  },
  praia: {
    sky: 'from-orange-200 via-amber-100 to-sky-200',
    sunMoon: { emoji: '🌅', y: '12%', glow: 'rgba(251,191,36,0.4)' },
    farBg: { shapes: [
      { d: 'M0,120 Q300,100 600,120 L600,200 L0,200Z', fill: '#0ea5e9', y: 0 },
    ]},
    midBg: { shapes: [
      { d: 'M0,140 Q150,125 300,135 Q450,120 600,140 L600,200 L0,200Z', fill: '#38bdf8', y: 0 },
    ]},
    ground: { color: '#fbbf24', highlight: '#fcd34d' },
    flora: [
      { emoji: '🌴', x: 10, scale: 1.8, sway: true },
      { emoji: '🌴', x: 85, scale: 1.6, sway: true },
      { emoji: '🐚', x: 35, scale: 0.8, sway: false },
      { emoji: '⛱️', x: 55, scale: 1.3, sway: false },
    ],
    fauna: [
      { emoji: '🦀', x: 45, y: 82, float: false },
      { emoji: '🐦', x: 25, y: 15, float: true },
      { emoji: '🐠', x: 65, y: 60, float: true },
    ],
    particles: { emoji: '🫧', count: 4 },
    atmosphere: 'rgba(56,189,248,0.08)',
  },
  cerrado: {
    sky: 'from-amber-200 via-orange-100 to-yellow-200',
    sunMoon: { emoji: '☀️', y: '6%', glow: 'rgba(245,158,11,0.4)' },
    farBg: { shapes: [
      { d: 'M0,90 Q150,70 300,85 Q450,65 600,90 L600,200 L0,200Z', fill: '#a16207', y: 0 },
    ]},
    midBg: { shapes: [
      { d: 'M0,110 Q200,85 400,100 Q500,90 600,110 L600,200 L0,200Z', fill: '#ca8a04', y: 0 },
    ]},
    ground: { color: '#d97706', highlight: '#f59e0b' },
    flora: [
      { emoji: '🌾', x: 12, scale: 1.3, sway: true },
      { emoji: '🌾', x: 30, scale: 1.5, sway: true },
      { emoji: '🌾', x: 50, scale: 1.2, sway: true },
      { emoji: '🌾', x: 70, scale: 1.4, sway: true },
      { emoji: '🌾', x: 88, scale: 1.3, sway: true },
    ],
    fauna: [
      { emoji: '🐺', x: 40, y: 78, float: false },
      { emoji: '🦅', x: 65, y: 12, float: true },
    ],
    particles: { emoji: '🍂', count: 4 },
    atmosphere: 'rgba(245,158,11,0.06)',
  },
  montanha: {
    sky: 'from-indigo-200 via-slate-200 to-sky-300',
    sunMoon: { emoji: '🌤️', y: '5%', glow: 'rgba(165,180,252,0.3)' },
    farBg: { shapes: [
      { d: 'M0,100 L80,40 L160,80 L250,25 L340,70 L420,35 L500,75 L600,50 L600,200 L0,200Z', fill: '#6366f1', y: 0 },
    ]},
    midBg: { shapes: [
      { d: 'M0,120 L100,65 L200,100 L320,55 L440,95 L540,70 L600,90 L600,200 L0,200Z', fill: '#818cf8', y: 0 },
    ]},
    ground: { color: '#6d7280', highlight: '#9ca3af' },
    flora: [
      { emoji: '🌲', x: 15, scale: 1.5, sway: true },
      { emoji: '🌲', x: 35, scale: 1.3, sway: true },
      { emoji: '🌲', x: 60, scale: 1.6, sway: true },
      { emoji: '🌲', x: 82, scale: 1.4, sway: true },
    ],
    fauna: [
      { emoji: '🦅', x: 50, y: 10, float: true },
      { emoji: '🐐', x: 70, y: 70, float: false },
    ],
    particles: { emoji: '☁️', count: 3 },
    atmosphere: 'rgba(129,140,248,0.06)',
  },
  caatinga: {
    sky: 'from-yellow-100 via-orange-100 to-rose-200',
    sunMoon: { emoji: '🔆', y: '5%', glow: 'rgba(239,68,68,0.3)' },
    farBg: { shapes: [
      { d: 'M0,100 Q150,80 300,95 Q450,75 600,100 L600,200 L0,200Z', fill: '#b45309', y: 0 },
    ]},
    midBg: { shapes: [
      { d: 'M0,115 Q200,95 400,110 Q500,100 600,115 L600,200 L0,200Z', fill: '#d97706', y: 0 },
    ]},
    ground: { color: '#ea580c', highlight: '#f97316' },
    flora: [
      { emoji: '🌵', x: 15, scale: 1.6, sway: false },
      { emoji: '🌵', x: 45, scale: 1.3, sway: false },
      { emoji: '🌵', x: 75, scale: 1.5, sway: false },
    ],
    fauna: [
      { emoji: '🦎', x: 55, y: 82, float: false },
      { emoji: '🦅', x: 30, y: 12, float: true },
    ],
    particles: { emoji: '🌬️', count: 3 },
    atmosphere: 'rgba(234,88,12,0.06)',
  },
};

// Scene-specific overlays that add context to the base landscape
const SCENE_OVERLAYS: Record<string, { elements: { emoji: string; x: number; y: number; scale: number; anim?: 'pulse' | 'float' | 'shake' }[]; tint?: string }> = {
  inicio: { elements: [
    { emoji: '🏠', x: 50, y: 72, scale: 1.4 },
    { emoji: '👤', x: 55, y: 82, scale: 1.0 },
  ]},
  patrulha: { elements: [
    { emoji: '🔦', x: 35, y: 65, scale: 1.2, anim: 'pulse' },
    { emoji: '👥', x: 50, y: 78, scale: 1.2 },
    { emoji: '⚠️', x: 70, y: 40, scale: 1.3, anim: 'pulse' },
  ]},
  investigacao: { elements: [
    { emoji: '🕵️', x: 40, y: 72, scale: 1.3 },
    { emoji: '📷', x: 48, y: 62, scale: 1.0, anim: 'pulse' },
    { emoji: '🚜', x: 72, y: 78, scale: 1.4 },
  ], tint: 'rgba(0,0,0,0.15)' },
  economia: { elements: [
    { emoji: '🏘️', x: 45, y: 68, scale: 1.5 },
    { emoji: '👩‍🌾', x: 30, y: 80, scale: 1.1 },
    { emoji: '👨‍🌾', x: 62, y: 82, scale: 1.1 },
    { emoji: '💬', x: 46, y: 55, scale: 1.0, anim: 'float' },
  ]},
  denuncia: { elements: [
    { emoji: '⚖️', x: 50, y: 30, scale: 1.5, anim: 'pulse' },
    { emoji: '📋', x: 35, y: 65, scale: 1.1 },
    { emoji: '🚔', x: 68, y: 72, scale: 1.4 },
  ]},
  confronto: { elements: [
    { emoji: '⚡', x: 50, y: 25, scale: 1.5, anim: 'shake' },
    { emoji: '😠', x: 35, y: 60, scale: 1.2 },
    { emoji: '🪓', x: 65, y: 65, scale: 1.2 },
  ], tint: 'rgba(239,68,68,0.1)' },
  replantio: { elements: [
    { emoji: '🌱', x: 25, y: 78, scale: 1.0, anim: 'float' },
    { emoji: '🌱', x: 40, y: 82, scale: 0.9, anim: 'float' },
    { emoji: '🌱', x: 58, y: 76, scale: 1.0, anim: 'float' },
    { emoji: '🌱', x: 75, y: 80, scale: 0.9, anim: 'float' },
    { emoji: '👩‍🌾', x: 32, y: 85, scale: 1.1 },
    { emoji: '👨‍🌾', x: 65, y: 86, scale: 1.1 },
  ]},
  ecoturismo: { elements: [
    { emoji: '🥾', x: 38, y: 78, scale: 1.2 },
    { emoji: '📸', x: 55, y: 68, scale: 1.1 },
    { emoji: '🗺️', x: 25, y: 55, scale: 1.3 },
  ]},
  cooperativa: { elements: [
    { emoji: '🫙', x: 30, y: 65, scale: 1.3 },
    { emoji: '🍯', x: 50, y: 60, scale: 1.1 },
    { emoji: '🤝', x: 45, y: 80, scale: 1.4, anim: 'pulse' },
  ]},
  reserva: { elements: [
    { emoji: '🛡️', x: 50, y: 30, scale: 1.5, anim: 'pulse' },
    { emoji: '📜', x: 50, y: 75, scale: 1.2 },
  ]},
  limpeza: { elements: [
    { emoji: '♻️', x: 35, y: 72, scale: 1.3, anim: 'pulse' },
    { emoji: '👥', x: 55, y: 78, scale: 1.2 },
  ]},
  esgoto: { elements: [
    { emoji: '🔬', x: 30, y: 60, scale: 1.2 },
    { emoji: '🚰', x: 55, y: 65, scale: 1.2 },
  ]},
  pescadores: { elements: [
    { emoji: '🚣', x: 45, y: 58, scale: 1.3 },
    { emoji: '👴', x: 30, y: 72, scale: 1.1 },
  ]},
  queimada: { elements: [
    { emoji: '🔥', x: 30, y: 55, scale: 1.4, anim: 'pulse' },
    { emoji: '🔥', x: 60, y: 50, scale: 1.2, anim: 'pulse' },
    { emoji: '🚒', x: 75, y: 78, scale: 1.3 },
  ], tint: 'rgba(239,68,68,0.12)' },
  nascente: { elements: [
    { emoji: '💧', x: 45, y: 55, scale: 1.2, anim: 'float' },
    { emoji: '💧', x: 55, y: 62, scale: 1.0, anim: 'float' },
  ]},
  seca: { elements: [
    { emoji: '💧', x: 50, y: 55, scale: 1.5, anim: 'float' },
  ], tint: 'rgba(234,88,12,0.1)' },
  final_restaurado: { elements: [
    { emoji: '🏆', x: 50, y: 25, scale: 2.0, anim: 'pulse' },
    { emoji: '🌈', x: 50, y: 12, scale: 1.8 },
    { emoji: '🎉', x: 30, y: 70, scale: 1.2, anim: 'float' },
    { emoji: '🎉', x: 70, y: 72, scale: 1.2, anim: 'float' },
  ]},
  final_degradado: { elements: [
    { emoji: '💔', x: 50, y: 30, scale: 1.8, anim: 'pulse' },
    { emoji: '🪵', x: 30, y: 70, scale: 1.3 },
    { emoji: '🪵', x: 65, y: 72, scale: 1.2 },
    { emoji: '😔', x: 50, y: 85, scale: 1.2 },
  ], tint: 'rgba(0,0,0,0.2)' },
  final_neutro: { elements: [
    { emoji: '⚖️', x: 50, y: 30, scale: 1.6, anim: 'pulse' },
    { emoji: '🤔', x: 50, y: 80, scale: 1.3 },
  ]},
};

const animVariants = {
  float: { y: [0, -10, 0], transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' as const } },
  pulse: { scale: [1, 1.15, 1], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const } },
  shake: { x: [-2, 2, -2, 2, 0], transition: { duration: 0.6, repeat: Infinity, repeatDelay: 2 } },
};

interface StoryIllustrationProps {
  sceneId: string;
  biomeId: BiomeId;
  biomeGradient: string;
}

export function StoryIllustration({ sceneId, biomeId, biomeGradient }: StoryIllustrationProps) {
  const landscape = BIOME_LANDSCAPES[biomeId] || BIOME_LANDSCAPES.floresta;
  const overlay = SCENE_OVERLAYS[sceneId];
  const bgImage = BIOME_IMAGES[biomeId];

  return (
    <motion.div
      key={sceneId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden"
    >
      {/* AI-generated biome background image */}
      {bgImage ? (
        <motion.img
          src={bgImage}
          alt={`Bioma ${biomeId}`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-b ${landscape.sky}`} />
      )}

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />

      {/* Scene-specific tint */}
      {overlay?.tint && (
        <motion.div
          className="absolute inset-0 z-[2]"
          style={{ background: overlay.tint }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
      )}

      {/* Subtle animated atmosphere particles (no sprites, just CSS dots) */}
      {Array.from({ length: 4 }, (_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute rounded-full bg-white/20 z-[3]"
          style={{
            width: 3 + i,
            height: 3 + i,
            left: `${15 + i * 20}%`,
            top: `${20 + i * 12}%`,
          }}
          animate={{
            x: [0, 15 + i * 5, -8, 0],
            y: [0, -6, 4, 0],
            opacity: [0.15, 0.35, 0.2, 0.15],
          }}
          transition={{ duration: 7 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: i * 1.2 }}
        />
      ))}

      {/* Atmosphere glow */}
      <div
        className="absolute inset-0 z-[4] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 80%, ${landscape.atmosphere}, transparent 70%)` }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 z-[5] pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.3)] rounded-2xl" />

      {/* Scene transition sweep */}
      <motion.div
        className="absolute inset-0 z-[6] bg-gradient-to-r from-white/10 via-white/20 to-transparent pointer-events-none"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{ duration: 1.8, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
