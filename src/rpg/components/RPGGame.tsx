import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, BookOpen, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BiomeSelector } from './BiomeSelector';
import { StoryScene } from './StoryScene';
import { RPGStatusBar } from './RPGStatusBar';
import { RPGTutorial } from './RPGTutorial';
import { BIOME_STORIES } from '../stories';
import { BIOME_INFO, INITIAL_STATS, type BiomeId, type RPGState, type StoryChoice, type BiomeStats } from '../types';
import { getEmojiSprite } from '@/game/spriteMap';

const initialState: RPGState = {
  biome: null,
  currentScene: 'inicio',
  stats: { ...INITIAL_STATS },
  history: [],
  choicesMade: 0,
  started: false,
  finished: false,
};

export function RPGGame({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<RPGState>(initialState);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(false);

  const handleSelectBiome = useCallback((biome: BiomeId) => {
    setState({
      ...initialState,
      biome,
      started: true,
    });
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  }, [tutorialSeen]);

  const handleChoice = useCallback((choice: StoryChoice) => {
    setState(prev => {
      const newStats: BiomeStats = {
        biodiversidade: Math.max(0, Math.min(100, prev.stats.biodiversidade + (choice.effects.biodiversidade || 0))),
        poluicao: Math.max(0, Math.min(100, prev.stats.poluicao + (choice.effects.poluicao || 0))),
        comunidade: Math.max(0, Math.min(100, prev.stats.comunidade + (choice.effects.comunidade || 0))),
        recursos: Math.max(0, Math.min(100, prev.stats.recursos + (choice.effects.recursos || 0))),
      };

      const story = BIOME_STORIES[prev.biome!];
      const nextScene = story?.scenes.find(s => s.id === choice.nextScene);
      const finished = nextScene?.isEnding || false;

      return {
        ...prev,
        currentScene: choice.nextScene,
        stats: newStats,
        history: [...prev.history, prev.currentScene],
        choicesMade: prev.choicesMade + 1,
        finished,
      };
    });
  }, []);

  const handleRestart = () => {
    setState(prev => ({
      ...initialState,
      biome: prev.biome,
      started: true,
    }));
  };

  const handleNewBiome = () => {
    setState(initialState);
  };

  // Biome selection screen
  if (!state.started || !state.biome) {
    return (
      <div className="relative">
        <div className="absolute top-4 left-4 z-10">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
        <BiomeSelector onSelect={handleSelectBiome} />
      </div>
    );
  }

  const story = BIOME_STORIES[state.biome];
  const currentScene = story?.scenes.find(s => s.id === state.currentScene);
  const biomeInfo = BIOME_INFO[state.biome];

  if (!story || !currentScene) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Erro ao carregar a história.</p>
      </div>
    );
  }

  const [diaryOpen, setDiaryOpen] = useState(false);

  // Progress bar based on story scenes visited
  const totalScenes = story.scenes.filter(s => !s.isEnding).length;
  const progressPct = Math.min(100, Math.round((state.history.length / Math.max(1, totalScenes)) * 100));

  return (
    <div className="min-h-screen bg-background relative">
      {/* Subtle biome-themed ambient gradient */}
      <div className={`fixed inset-0 pointer-events-none z-0 bg-gradient-to-b ${biomeInfo.gradient} opacity-[0.04]`} />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-sm font-bold flex items-center gap-1.5">
                  {getEmojiSprite(biomeInfo.emoji) ? (
                    <img src={getEmojiSprite(biomeInfo.emoji)!} alt="" className="w-4 h-4 object-contain" draggable={false} />
                  ) : biomeInfo.emoji}
                  {' '}{biomeInfo.name}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Capítulo {currentScene.chapter} • {state.choicesMade} decisões
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {state.finished && (
                <Button variant="outline" size="sm" onClick={handleNewBiome} className="gap-1.5 text-xs">
                  <BookOpen className="h-3.5 w-3.5" /> Outro Bioma
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleRestart} className="gap-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowTutorial(true)} className="h-8 w-8">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <RPGStatusBar stats={state.stats} />
          {/* Story progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary/60 rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 100 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{progressPct}%</span>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 relative z-10">
        <StoryScene
          scene={currentScene}
          chapter={currentScene.chapter}
          onChoice={handleChoice}
          biomeName={biomeInfo.name}
          biomeGradient={biomeInfo.gradient}
          biomeId={state.biome}
        />

        {/* Collapsible Narrative History */}
        {state.history.length > 0 && (
          <div className="mt-8 space-y-3">
            <button
              onClick={() => setDiaryOpen(!diaryOpen)}
              className="w-full flex items-center justify-between text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span className="flex items-center gap-2">
                📜 Diário da Jornada
                <span className="text-xs font-normal text-muted-foreground/60">({state.history.length} capítulos)</span>
              </span>
              {diaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            <AnimatePresence>
              {diaryOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-0 relative">
                    {/* Timeline connector line */}
                    <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-border/50 z-0" />
                    {state.history.map((sceneId, i) => {
                      const histScene = story.scenes.find(s => s.id === sceneId);
                      if (!histScene) return null;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex gap-3 py-2 relative"
                        >
                          {/* Timeline dot */}
                          <div className="flex-shrink-0 w-4 h-4 mt-1 rounded-full bg-primary/30 border-2 border-primary/50 z-10" />
                          <div className="flex-1 bg-muted/30 border border-border/50 rounded-xl p-3">
                            <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1 flex items-center gap-1">
                              Cap. {histScene.chapter} — {getEmojiSprite(histScene.emoji) ? (
                                <img src={getEmojiSprite(histScene.emoji)!} alt="" className="w-3.5 h-3.5 object-contain inline-block" draggable={false} />
                              ) : histScene.emoji} {histScene.title}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {histScene.narrative}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current scene indicator */}
            <div className="flex items-center gap-2 pt-2">
              <div className="h-px flex-1 bg-border/50" />
              <span className="text-xs bg-primary/20 px-3 py-1 rounded-full text-primary font-medium flex items-center gap-1">
                {getEmojiSprite(currentScene.emoji) ? (
                  <img src={getEmojiSprite(currentScene.emoji)!} alt="" className="w-3.5 h-3.5 object-contain" draggable={false} />
                ) : currentScene.emoji} Agora: {currentScene.title}
              </span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
          </div>
        )}
      </div>
      {showTutorial && (
        <RPGTutorial onComplete={() => { setShowTutorial(false); setTutorialSeen(true); }} />
      )}
    </div>
  );
}
