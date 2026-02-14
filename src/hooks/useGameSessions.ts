import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { GameState } from '@/game/types';

export interface GameSessionSummary {
  id: string;
  session_name: string;
  biome: string;
  turn: number;
  level: number;
  equilibrium: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useGameSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GameSessionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('id, session_name, biome, turn, level, equilibrium, is_active, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions((data as GameSessionSummary[]) || []);
    } catch (err) {
      console.error('Error fetching game sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(async (sessionName: string, gameState: GameState): Promise<string | null> => {
    if (!user) return null;
    try {
      const equilibrium = gameState.bars.ra * 0.4 + gameState.bars.oe * 0.3 + gameState.bars.ao * 0.3;
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName,
          biome: gameState.biome,
          avatar: gameState.avatar as any,
          game_state: {
            bars: gameState.bars,
            coins: gameState.coins,
            level: gameState.level,
            xp: gameState.xp,
            grid: gameState.grid,
            turn: gameState.turn,
            visitors: gameState.visitors,
            eventLog: gameState.eventLog,
            isGameOver: gameState.isGameOver,
            gameOverReason: gameState.gameOverReason,
            disasterCount: gameState.disasterCount,
          } as any,
          turn: gameState.turn,
          level: gameState.level,
          equilibrium,
        })
        .select('id')
        .single();

      if (error) throw error;
      await fetchSessions();
      return data?.id || null;
    } catch (err) {
      console.error('Error creating session:', err);
      toast.error('Erro ao criar sessão.');
      return null;
    }
  }, [user, fetchSessions]);

  const saveSession = useCallback(async (sessionId: string, gameState: GameState) => {
    if (!user) return;
    try {
      const equilibrium = gameState.bars.ra * 0.4 + gameState.bars.oe * 0.3 + gameState.bars.ao * 0.3;
      const { error } = await supabase
        .from('game_sessions')
        .update({
          biome: gameState.biome,
          avatar: gameState.avatar as any,
          game_state: {
            bars: gameState.bars,
            coins: gameState.coins,
            level: gameState.level,
            xp: gameState.xp,
            grid: gameState.grid,
            turn: gameState.turn,
            visitors: gameState.visitors,
            eventLog: gameState.eventLog,
            isGameOver: gameState.isGameOver,
            gameOverReason: gameState.gameOverReason,
            disasterCount: gameState.disasterCount,
          } as any,
          turn: gameState.turn,
          level: gameState.level,
          equilibrium,
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error saving session:', err);
    }
  }, [user]);

  const loadSession = useCallback(async (sessionId: string): Promise<Partial<GameState> | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('game_state, avatar, biome')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) return null;

      const gs = data.game_state as any;
      const avatar = data.avatar as any;

      return {
        bars: gs.bars,
        coins: gs.coins,
        level: gs.level,
        xp: gs.xp,
        grid: gs.grid,
        turn: gs.turn,
        visitors: gs.visitors,
        eventLog: gs.eventLog || [],
        biome: data.biome as any,
        avatar,
        isSetup: true,
        currentEvent: null,
        currentCouncil: null,
        isGameOver: gs.isGameOver || false,
        gameOverReason: gs.gameOverReason || null,
        disasterCount: gs.disasterCount || 0,
      };
    } catch (err) {
      console.error('Error loading session:', err);
      toast.error('Erro ao carregar sessão.');
      return null;
    }
  }, [user]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Sessão excluída!');
      await fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Erro ao excluir sessão.');
    }
  }, [user, fetchSessions]);

  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ session_name: newName })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchSessions();
    } catch (err) {
      console.error('Error renaming session:', err);
    }
  }, [user, fetchSessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    saveSession,
    loadSession,
    deleteSession,
    renameSession,
  };
}
