import { motion } from 'framer-motion';
import { BIOME_INFO, type BiomeId } from '../types';

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

interface BiomeSelectorProps {
  onSelect: (biome: BiomeId) => void;
}

const biomes: BiomeId[] = ['floresta', 'praia', 'cerrado', 'montanha', 'caatinga'];

export function BiomeSelector({ onSelect }: BiomeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          🌍 Missão Bioma
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Escolha um bioma para iniciar sua missão de restauração
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {biomes.map((biomeId, i) => {
          const info = BIOME_INFO[biomeId];
          return (
            <motion.button
              key={biomeId}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(biomeId)}
              className="relative overflow-hidden rounded-2xl border border-border/50 p-6 text-left text-white shadow-lg hover:shadow-xl transition-shadow group min-h-[180px]"
            >
              <img src={BIOME_IMAGES[biomeId]} alt={info.name} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/60 group-hover:via-black/20 transition-colors" />
              <div className="relative z-10 flex flex-col justify-end h-full">
                <span className="text-4xl mb-2 block drop-shadow-lg">{info.emoji}</span>
                <h3 className="text-xl font-bold mb-1 drop-shadow-lg">{info.name}</h3>
                <p className="text-sm text-white/90 leading-relaxed drop-shadow">{info.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
