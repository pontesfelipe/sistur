import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryScene as StorySceneType, StoryChoice, BiomeStats } from '../types';
import { Button } from '@/components/ui/button';

interface StorySceneProps {
  scene: StorySceneType;
  chapter: number;
  onChoice: (choice: StoryChoice) => void;
  biomeName: string;
  biomeGradient: string;
}

export function StoryScene({ scene, chapter, onChoice, biomeName, biomeGradient }: StorySceneProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleChoice = (choice: StoryChoice, idx: number) => {
    setSelectedIdx(idx);
    setFeedbackText(choice.feedback);
    setShowFeedback(true);

    setTimeout(() => {
      onChoice(choice);
      setSelectedIdx(null);
      setShowFeedback(false);
    }, 2500);
  };

  const choiceTypeStyles = {
    sustentavel: 'border-green-500/50 hover:border-green-400 hover:bg-green-500/10',
    arriscado: 'border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/10',
    neutro: 'border-blue-500/50 hover:border-blue-400 hover:bg-blue-500/10',
  };

  const choiceTypeLabels = {
    sustentavel: '🌿 Sustentável',
    arriscado: '⚡ Arriscado',
    neutro: '🔄 Neutro',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={scene.id}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Chapter & Title */}
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary/70">
            Capítulo {scene.chapter}
          </span>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mt-1">
            {scene.emoji} {scene.title}
          </h2>
        </div>

        {/* Narrative */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`relative rounded-2xl p-6 bg-gradient-to-br ${biomeGradient} text-white overflow-hidden`}
        >
          <div className="absolute inset-0 bg-black/40" />
          <p className="relative z-10 text-base md:text-lg leading-relaxed font-medium">
            {scene.narrative}
          </p>
        </motion.div>

        {/* Feedback overlay */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center"
            >
              <p className="text-base font-medium text-foreground">{feedbackText}</p>
              <div className="mt-2 flex justify-center">
                <div className="h-1 w-24 bg-primary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.2 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Choices */}
        {!scene.isEnding && !showFeedback && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              O que você faz?
            </p>
            {scene.choices.map((choice, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.98 }}
                disabled={selectedIdx !== null}
                onClick={() => handleChoice(choice, idx)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all bg-card/50 backdrop-blur ${choiceTypeStyles[choice.type]} disabled:opacity-50`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{idx === 0 ? '🅰️' : idx === 1 ? '🅱️' : '🅲'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm md:text-base">{choice.text}</p>
                    <span className="text-xs text-muted-foreground mt-1 inline-block">
                      {choiceTypeLabels[choice.type]}
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Ending */}
        {scene.isEnding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-center p-6 rounded-2xl border-2 ${
              scene.endingType === 'restaurado'
                ? 'border-green-500/50 bg-green-500/10'
                : scene.endingType === 'degradado'
                ? 'border-red-500/50 bg-red-500/10'
                : 'border-yellow-500/50 bg-yellow-500/10'
            }`}
          >
            <span className="text-5xl block mb-3">
              {scene.endingType === 'restaurado' ? '🏆' : scene.endingType === 'degradado' ? '💔' : '⚖️'}
            </span>
            <h3 className="text-xl font-bold text-foreground mb-2">
              {scene.endingType === 'restaurado' ? 'Missão Cumprida!' : scene.endingType === 'degradado' ? 'Missão Fracassada' : 'Resultado Misto'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {scene.endingType === 'restaurado'
                ? 'Suas escolhas sustentáveis restauraram o bioma!'
                : scene.endingType === 'degradado'
                ? 'Escolhas arriscadas tiveram consequências graves.'
                : 'Houve progresso, mas há espaço para melhorar.'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
