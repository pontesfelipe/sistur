import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, BookOpen, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BiomeSelector } from './BiomeSelector';
import { StoryScene } from './StoryScene';
import { RPGStatusBar } from './RPGStatusBar';
import { RPGTutorial } from './RPGTutorial';
import { BIOME_STORIES } from '../stories';
import { BIOME_INFO, INITIAL_STATS, type BiomeId, type RPGState, type StoryChoice, type BiomeStats } from '../types';

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

  return (
    <div className="min-h-screen bg-background">
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
                  {biomeInfo.emoji} {biomeInfo.name}
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
        </div>
      </div>

      {/* Story Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <StoryScene
          scene={currentScene}
          chapter={currentScene.chapter}
          onChoice={handleChoice}
          biomeName={biomeInfo.name}
          biomeGradient={biomeInfo.gradient}
        />

        {/* History breadcrumb */}
        {state.history.length > 0 && (
          <div className="mt-8 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">📖 Sua jornada:</p>
            <div className="flex flex-wrap gap-1.5">
              {state.history.map((sceneId, i) => {
                const histScene = story.scenes.find(s => s.id === sceneId);
                return (
                  <span
                    key={i}
                    className="text-xs bg-muted/50 px-2 py-1 rounded-full text-muted-foreground"
                  >
                    {histScene?.emoji} {histScene?.title}
                  </span>
                );
              })}
              <span className="text-xs bg-primary/20 px-2 py-1 rounded-full text-primary font-medium">
                {currentScene.emoji} {currentScene.title}
              </span>
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
