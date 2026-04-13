/**
 * SISTUR EDU - Compliance & Anti-Fraud Queries
 * Provides hooks for session data, fraud flags, and compliance reports.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface LearningSession {
  id: string;
  user_id: string;
  org_id: string | null;
  session_type: string;
  entity_type: string | null;
  entity_id: string | null;
  started_at: string;
  last_heartbeat_at: string;
  ended_at: string | null;
  duration_seconds: number;
  active_seconds: number;
  idle_seconds: number;
  is_active: boolean;
  user_agent: string | null;
  device_info: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface FraudFlag {
  id: string;
  user_id: string;
  org_id: string | null;
  session_id: string | null;
  flag_type: string;
  severity: string;
  description: string;
  evidence: Record<string, unknown>;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  status: string;
  created_at: string;
}

export interface InteractionLog {
  id: string;
  session_id: string;
  user_id: string;
  interaction_type: string;
  element_id: string | null;
  element_label: string | null;
  page_url: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
}

// ============================================
// SESSION QUERIES
// ============================================

export function useStudentSessions(userId?: string, limit = 50) {
  return useQuery({
    queryKey: ['edu-sessions', userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('edu_learning_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as LearningSession[];
    },
    enabled: !!userId,
  });
}

export function useSessionInteractions(sessionId?: string) {
  return useQuery({
    queryKey: ['edu-session-interactions', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('edu_interaction_logs')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      if (error) throw error;
      return data as InteractionLog[];
    },
    enabled: !!sessionId,
  });
}

// ============================================
// FRAUD FLAGS
// ============================================

export function useFraudFlags(filters?: { userId?: string; status?: string }) {
  return useQuery({
    queryKey: ['edu-fraud-flags', filters],
    queryFn: async () => {
      let query = supabase
        .from('edu_fraud_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.userId) query = query.eq('user_id', filters.userId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data as FraudFlag[];
    },
  });
}

export function useReviewFraudFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ flagId, status, notes }: { flagId: string; status: 'dismissed' | 'confirmed'; notes?: string }) => {
      const { error } = await supabase
        .from('edu_fraud_flags')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        } as never)
        .eq('id', flagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edu-fraud-flags'] });
    },
  });
}

// ============================================
// COMPLIANCE STATS
// ============================================

export function useComplianceStats(userId?: string) {
  return useQuery({
    queryKey: ['edu-compliance-stats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const [sessionsResult, flagsResult] = await Promise.all([
        supabase
          .from('edu_learning_sessions')
          .select('duration_seconds, active_seconds, idle_seconds, session_type, started_at')
          .eq('user_id', userId)
          .eq('is_active', false),
        supabase
          .from('edu_fraud_flags')
          .select('id, flag_type, severity, status')
          .eq('user_id', userId),
      ]);

      if (sessionsResult.error) throw sessionsResult.error;
      if (flagsResult.error) throw flagsResult.error;

      const sessions = sessionsResult.data || [];
      const flags = flagsResult.data || [];

      const totalDuration = sessions.reduce((s, r) => s + (r.duration_seconds || 0), 0);
      const totalActive = sessions.reduce((s, r) => s + (r.active_seconds || 0), 0);
      const totalIdle = sessions.reduce((s, r) => s + (r.idle_seconds || 0), 0);

      return {
        totalSessions: sessions.length,
        totalDurationMinutes: Math.round(totalDuration / 60),
        totalActiveMinutes: Math.round(totalActive / 60),
        totalIdleMinutes: Math.round(totalIdle / 60),
        activePercent: totalDuration > 0 ? Math.round((totalActive / totalDuration) * 100) : 0,
        totalFlags: flags.length,
        pendingFlags: flags.filter(f => f.status === 'pending').length,
        confirmedFlags: flags.filter(f => f.status === 'confirmed').length,
        criticalFlags: flags.filter(f => f.severity === 'critical').length,
      };
    },
    enabled: !!userId,
  });
}
