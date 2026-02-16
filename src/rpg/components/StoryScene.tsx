import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryScene as StorySceneType, StoryChoice } from '../types';
import { StoryIllustration } from './StoryIllustration';
import type { BiomeId } from '../types';
import { fireVictoryConfetti, fireDefeatEffect } from '@/game/vfx/confetti';
import { ScreenFlash } from '@/game/vfx/ScreenFlash';

interface StorySceneProps {
  scene: StorySceneType;
  chapter: number;
  onChoice: (choice: StoryChoice) => void;
  biomeName: string;
  biomeGradient: string;
  biomeId: BiomeId;
}

const choiceIcons = ['🅰️', '🅱️', '🅲'] as const;

const choiceTypeConfig = {
  sustentavel: {
    border: 'border-green-500/50',
    hoverBorder: 'hover:border-green-400',
    hoverBg: 'hover:bg-green-500/10',
    selectedBg: 'bg-green-500/20',
    selectedBorder: 'border-green-400',
    glow: '0 0 20px rgba(34,197,94,0.3)',
    label: '🌿 Sustentável',
    particleColor: 'bg-green-400',
  },
  arriscado: {
    border: 'border-amber-500/50',
    hoverBorder: 'hover:border-amber-400',
    hoverBg: 'hover:bg-amber-500/10',
    selectedBg: 'bg-amber-500/20',
    selectedBorder: 'border-amber-400',
    glow: '0 0 20px rgba(245,158,11,0.3)',
    label: '⚡ Arriscado',
    particleColor: 'bg-amber-400',
  },
  neutro: {
    border: 'border-blue-500/50',
    hoverBorder: 'hover:border-blue-400',
    hoverBg: 'hover:bg-blue-500/10',
    selectedBg: 'bg-blue-500/20',
    selectedBorder: 'border-blue-400',
    glow: '0 0 20px rgba(59,130,246,0.3)',
    label: '🔄 Neutro',
    particleColor: 'bg-blue-400',
  },
};

export function StoryScene({ scene, chapter, onChoice, biomeName, biomeGradient, biomeId }: StorySceneProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showEndingFlash, setShowEndingFlash] = useState(false);
  const endingTriggered = useRef(false);

  // VFX: ending confetti
  useEffect(() => {
    if (scene.isEnding && !endingTriggered.current) {
      endingTriggered.current = true;
      setShowEndingFlash(true);
      setTimeout(() => setShowEndingFlash(false), 500);
      if (scene.endingType === 'restaurado') {
        fireVictoryConfetti();
      } else if (scene.endingType === 'degradado') {
        fireDefeatEffect();
      }
    }
    if (!scene.isEnding) endingTriggered.current = false;
  }, [scene.isEnding, scene.endingType]);

  const handleChoice = (choice: StoryChoice, idx: number) => {
    setSelectedIdx(idx);
    setFeedbackText(choice.feedback);
    setShowFeedback(true);

    setTimeout(() => {
      onChoice(choice);
      setSelectedIdx(null);
      setShowFeedback(false);
      setHoveredIdx(null);
    }, 2500);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scene.id}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.5 }}
        className="space-y-5"
      >
        {/* Ending flash */}
        <ScreenFlash
          show={showEndingFlash}
          color={scene.endingType === 'restaurado' ? 'rgba(34,197,94,0.25)' : scene.endingType === 'degradado' ? 'rgba(239,68,68,0.25)' : 'rgba(250,204,21,0.2)'}
        />
        {/* Animated Illustration */}
        <StoryIllustration sceneId={scene.id} biomeId={biomeId} biomeGradient={biomeGradient} />

        {/* Chapter & Title */}
        <div>
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-bold uppercase tracking-widest text-primary/70"
          >
            Capítulo {scene.chapter}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-2xl md:text-3xl font-display font-bold text-foreground mt-1"
          >
            {scene.emoji} {scene.title}
          </motion.h2>
        </div>

        {/* Narrative */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative rounded-2xl p-6 bg-card border border-border overflow-hidden"
        >
          {/* Ambient shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'linear' }}
          />
          <p className="relative z-10 text-base md:text-lg leading-relaxed font-medium text-foreground">
            {scene.narrative}
          </p>
        </motion.div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {showFeedback && selectedIdx !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative bg-primary/10 border border-primary/30 rounded-xl p-5 text-center overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 rounded-xl bg-primary/5"
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute w-1.5 h-1.5 rounded-full ${choiceTypeConfig[scene.choices[selectedIdx]?.type || 'neutro'].particleColor}`}
                  initial={{ x: '50%', y: '50%', opacity: 1, scale: 0 }}
                  animate={{ x: `${20 + Math.random() * 60}%`, y: `${Math.random() * 100}%`, opacity: 0, scale: 1.5 }}
                  transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
                />
              ))}
              <p className="relative z-10 text-base font-medium text-foreground">{feedbackText}</p>
              <div className="relative z-10 mt-3 flex justify-center">
                <div className="h-1.5 w-32 bg-primary/20 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2, ease: 'easeInOut' }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Choices */}
        {!scene.isEnding && !showFeedback && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
            >
              O que você faz?
            </motion.p>
            {scene.choices.map((choice, idx) => {
              const cfg = choiceTypeConfig[choice.type];
              const isSelected = selectedIdx === idx;
              const isHovered = hoveredIdx === idx;
              const isDisabled = selectedIdx !== null;

              return (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -30, rotateY: -15 }}
                  animate={{
                    opacity: 1, x: 0, rotateY: 0,
                    scale: isSelected ? 1.03 : 1,
                    boxShadow: isSelected ? cfg.glow : isHovered ? cfg.glow.replace('0.3', '0.15') : 'none',
                  }}
                  transition={{ delay: 0.4 + idx * 0.12, type: 'spring', stiffness: 200, damping: 18 }}
                  whileHover={!isDisabled ? { scale: 1.02, x: 6 } : {}}
                  whileTap={!isDisabled ? { scale: 0.97 } : {}}
                  disabled={isDisabled}
                  onClick={() => handleChoice(choice, idx)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-colors duration-200 backdrop-blur relative overflow-hidden ${
                    isSelected
                      ? `${cfg.selectedBg} ${cfg.selectedBorder}`
                      : `bg-card/50 ${cfg.border} ${cfg.hoverBorder} ${cfg.hoverBg}`
                  } disabled:opacity-60`}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-xl border-2 border-current opacity-30"
                      initial={{ scale: 1 }}
                      animate={{ scale: 1.08, opacity: 0 }}
                      transition={{ duration: 0.8, repeat: 2 }}
                    />
                  )}
                  {isHovered && !isDisabled && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ duration: 0.6, ease: 'easeInOut' }}
                    />
                  )}
                  <div className="relative z-10 flex items-start gap-3">
                    <motion.span
                      className="text-lg mt-0.5"
                      animate={isHovered ? { scale: 1.2, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {choiceIcons[idx] || '🔘'}
                    </motion.span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm md:text-base">{choice.text}</p>
                      <motion.span
                        className="text-xs text-muted-foreground mt-1 inline-block"
                        animate={isSelected ? { scale: 1.05 } : {}}
                      >
                        {cfg.label}
                      </motion.span>
                    </div>
                    <motion.span
                      className="text-muted-foreground/50 self-center"
                      initial={{ opacity: 0, x: -5 }}
                      animate={isHovered && !isDisabled ? { opacity: 1, x: 0 } : { opacity: 0, x: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      →
                    </motion.span>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Ending */}
        {scene.isEnding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
            className={`text-center p-6 rounded-2xl border-2 relative overflow-hidden ${
              scene.endingType === 'restaurado'
                ? 'border-green-500/50 bg-green-500/10'
                : scene.endingType === 'degradado'
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-yellow-500/50 bg-yellow-500/10'
            }`}
          >
            {scene.endingType === 'restaurado' && [...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-green-400/60"
                initial={{ x: '50%', y: '80%', scale: 0 }}
                animate={{ x: `${10 + Math.random() * 80}%`, y: `${Math.random() * 60}%`, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, delay: 0.5 + i * 0.15, ease: 'easeOut' }}
              />
            ))}
            <motion.span
              className="text-5xl block mb-3"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
            >
              {scene.endingType === 'restaurado' ? '🏆' : scene.endingType === 'degradado' ? '💔' : '⚖️'}
            </motion.span>
            <motion.h3
              className="text-xl font-bold text-foreground mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              {scene.endingType === 'restaurado' ? 'Missão Cumprida!' : scene.endingType === 'degradado' ? 'Missão Fracassada' : 'Resultado Misto'}
            </motion.h3>
            <motion.p
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {scene.endingType === 'restaurado'
                ? 'Suas escolhas sustentáveis restauraram o bioma!'
                : scene.endingType === 'degradado'
                ? 'Escolhas arriscadas tiveram consequências graves.'
                : 'Houve progresso, mas há espaço para melhorar.'}
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
