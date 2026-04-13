/**
 * SISTUR EDU - Session Tracker & Anti-Fraud System
 * Tracks presence (heartbeat), interactions, idle time, and flags suspicious behavior.
 * Designed for AVA compliance and future MEC certification.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30s heartbeat
const IDLE_THRESHOLD_MS = 120_000; // 2 min without interaction = idle
const INTERACTION_BATCH_SIZE = 20;
const INTERACTION_FLUSH_MS = 10_000; // flush every 10s

export type SessionType = 'training' | 'exam' | 'track' | 'general';
export type InteractionType =
  | 'click'
  | 'page_view'
  | 'video_play'
  | 'video_pause'
  | 'video_seek'
  | 'video_progress'
  | 'answer_select'
  | 'scroll'
  | 'focus_gain'
  | 'focus_loss'
  | 'tab_switch'
  | 'exam_start'
  | 'exam_submit';

interface Interaction {
  interaction_type: InteractionType;
  element_id?: string;
  element_label?: string;
  page_url?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface UseEduSessionTrackerOptions {
  sessionType: SessionType;
  entityType?: string;
  entityId?: string;
  enabled?: boolean;
}

export function useEduSessionTracker(options: UseEduSessionTrackerOptions) {
  const { sessionType, entityType, entityId, enabled = true } = options;
  const { user } = useAuth();
  const { profile } = useProfileContext();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interactionBuffer = useRef<Interaction[]>([]);
  const lastActivityRef = useRef<number>(Date.now());
  const activeSecondsRef = useRef(0);
  const idleSecondsRef = useRef(0);
  const isIdleRef = useRef(false);
  const idleCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Start session
  const startSession = useCallback(async () => {
    if (!user?.id || !enabled || sessionIdRef.current) return;

    try {
      const { data, error } = await supabase
        .from('edu_learning_sessions')
        .insert({
          user_id: user.id,
          org_id: profile?.org_id || null,
          session_type: sessionType,
          entity_type: entityType || null,
          entity_id: entityId || null,
          user_agent: navigator.userAgent,
          device_info: {
            screen_width: screen.width,
            screen_height: screen.height,
            language: navigator.language,
            platform: navigator.platform,
            touch: 'ontouchstart' in window,
          },
        } as never)
        .select('id')
        .single();

      if (error) {
        console.error('Failed to start session:', error);
        return;
      }

      sessionIdRef.current = data.id;
      setSessionId(data.id);
      setIsTracking(true);
      lastActivityRef.current = Date.now();

      // Log initial page view
      logInteraction('page_view', undefined, undefined, { url: window.location.pathname });
    } catch (err) {
      console.error('Session start error:', err);
    }
  }, [user?.id, enabled, profile?.org_id, sessionType, entityType, entityId]);

  // End session
  const endSession = useCallback(async () => {
    if (!sessionIdRef.current) return;

    // Flush remaining interactions
    await flushInteractions();

    try {
      await supabase
        .from('edu_learning_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          active_seconds: activeSecondsRef.current,
          idle_seconds: idleSecondsRef.current,
          duration_seconds: activeSecondsRef.current + idleSecondsRef.current,
        } as never)
        .eq('id', sessionIdRef.current);
    } catch (err) {
      console.error('Session end error:', err);
    }

    sessionIdRef.current = null;
    setSessionId(null);
    setIsTracking(false);
  }, []);

  // Heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('edu_learning_sessions')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          active_seconds: activeSecondsRef.current,
          idle_seconds: idleSecondsRef.current,
          duration_seconds: activeSecondsRef.current + idleSecondsRef.current,
        } as never)
        .eq('id', sessionIdRef.current);
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }, []);

  // Log interaction
  const logInteraction = useCallback((
    type: InteractionType,
    elementId?: string,
    elementLabel?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!sessionIdRef.current) return;

    lastActivityRef.current = Date.now();
    isIdleRef.current = false;

    interactionBuffer.current.push({
      interaction_type: type,
      element_id: elementId,
      element_label: elementLabel,
      page_url: window.location.pathname,
      timestamp: new Date().toISOString(),
      metadata,
    });

    // Flush if buffer is full
    if (interactionBuffer.current.length >= INTERACTION_BATCH_SIZE) {
      flushInteractions();
    }
  }, []);

  // Flush interaction buffer to DB
  const flushInteractions = useCallback(async () => {
    if (!sessionIdRef.current || interactionBuffer.current.length === 0) return;

    const batch = interactionBuffer.current.splice(0);
    const rows = batch.map(i => ({
      session_id: sessionIdRef.current,
      user_id: user?.id,
      interaction_type: i.interaction_type,
      element_id: i.element_id || null,
      element_label: i.element_label || null,
      page_url: i.page_url || null,
      timestamp: i.timestamp,
      metadata: i.metadata || {},
    }));

    try {
      await supabase.from('edu_interaction_logs').insert(rows as never);
    } catch (err) {
      console.error('Flush interactions error:', err);
      // Re-add failed items back
      interactionBuffer.current.unshift(...batch);
    }
  }, [user?.id]);

  // Idle tracking
  useEffect(() => {
    if (!isTracking) return;

    idleCheckRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastActivityRef.current) / 1000);

      if (elapsed >= IDLE_THRESHOLD_MS / 1000) {
        if (!isIdleRef.current) {
          isIdleRef.current = true;
          logInteraction('focus_loss', undefined, undefined, { reason: 'idle_timeout' });
        }
        idleSecondsRef.current += 1;
      } else {
        activeSecondsRef.current += 1;
      }
    }, 1000);

    return () => {
      if (idleCheckRef.current) clearInterval(idleCheckRef.current);
    };
  }, [isTracking, logInteraction]);

  // Heartbeat interval
  useEffect(() => {
    if (!isTracking) return;

    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isTracking, sendHeartbeat]);

  // Flush interval
  useEffect(() => {
    if (!isTracking) return;

    flushRef.current = setInterval(flushInteractions, INTERACTION_FLUSH_MS);
    return () => {
      if (flushRef.current) clearInterval(flushRef.current);
    };
  }, [isTracking, flushInteractions]);

  // Tab visibility tracking
  useEffect(() => {
    if (!isTracking) return;

    const handleVisibility = () => {
      if (document.hidden) {
        logInteraction('tab_switch', undefined, undefined, { hidden: true });
      } else {
        logInteraction('focus_gain', undefined, undefined, { returned: true });
        lastActivityRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      endSession();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTracking, logInteraction, endSession]);

  // Global click/scroll tracking (throttled)
  useEffect(() => {
    if (!isTracking) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const label = target.textContent?.slice(0, 50) || target.tagName;
      const id = target.id || target.closest('[data-track]')?.getAttribute('data-track') || undefined;
      logInteraction('click', id, label);
    };

    const handleScroll = () => {
      if (scrollTimeout) return;
      scrollTimeout = setTimeout(() => {
        logInteraction('scroll', undefined, undefined, { scrollY: window.scrollY });
        scrollTimeout = null;
      }, 2000);
    };

    document.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isTracking, logInteraction]);

  // Auto start/end on mount/unmount
  useEffect(() => {
    if (enabled && user?.id) {
      startSession();
    }
    return () => {
      endSession();
    };
  }, [enabled, user?.id]);

  return {
    sessionId,
    isTracking,
    logInteraction,
    startSession,
    endSession,
  };
}
