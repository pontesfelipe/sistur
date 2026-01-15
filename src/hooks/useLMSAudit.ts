/**
 * SISTUR EDU LMS - Audit Logging System
 * Immutable audit trail for government compliance
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface LMSAuditLog {
  log_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ENROLL'
  | 'COMPLETE_LESSON'
  | 'START_EXAM'
  | 'SUBMIT_EXAM'
  | 'GENERATE_CERTIFICATE'
  | 'REVOKE_CERTIFICATE'
  | 'ONDEMAND_REQUEST'
  | 'ONDEMAND_GENERATE';

export type AuditEntityType = 
  | 'user'
  | 'course'
  | 'module'
  | 'lesson'
  | 'enrollment'
  | 'exam'
  | 'exam_attempt'
  | 'certificate'
  | 'quiz'
  | 'ondemand_request'
  | 'track';

// ============================================
// AUDIT LOG QUERIES
// ============================================

export function useLMSAuditLogs(filters?: {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['lms-audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('lms_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }
      if (filters?.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      
      query = query.limit(filters?.limit || 100);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as LMSAuditLog[];
    },
  });
}

export function useEntityAuditTrail(entityType: AuditEntityType, entityId: string) {
  return useQuery({
    queryKey: ['entity-audit-trail', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as LMSAuditLog[];
    },
    enabled: !!entityType && !!entityId,
  });
}

export function useUserAuditHistory(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  
  return useQuery({
    queryKey: ['user-audit-history', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('lms_audit_logs')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as LMSAuditLog[];
    },
    enabled: !!targetUserId,
  });
}

// ============================================
// AUDIT LOG CREATION
// ============================================

export function useAuditLogger() {
  const { user } = useAuth();

  const logAction = useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
    }: {
      action: AuditAction;
      entityType: AuditEntityType;
      entityId: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('lms_audit_logs')
        .insert([{
          user_id: user?.id || null,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_values: oldValues || null,
          new_values: newValues || null,
          metadata: metadata || null,
          user_agent: navigator.userAgent,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Convenience methods
  const logEnrollment = async (courseId: string, enrollmentId: string) => {
    return logAction.mutateAsync({
      action: 'ENROLL',
      entityType: 'enrollment',
      entityId: enrollmentId,
      newValues: { course_id: courseId },
    });
  };

  const logLessonComplete = async (lessonId: string, timeSpent: number) => {
    return logAction.mutateAsync({
      action: 'COMPLETE_LESSON',
      entityType: 'lesson',
      entityId: lessonId,
      metadata: { time_spent_minutes: timeSpent },
    });
  };

  const logExamStart = async (examId: string, attemptId: string) => {
    return logAction.mutateAsync({
      action: 'START_EXAM',
      entityType: 'exam_attempt',
      entityId: attemptId,
      newValues: { exam_id: examId },
    });
  };

  const logExamSubmit = async (attemptId: string, score: number, result: string) => {
    return logAction.mutateAsync({
      action: 'SUBMIT_EXAM',
      entityType: 'exam_attempt',
      entityId: attemptId,
      newValues: { score_pct: score, result },
    });
  };

  const logCertificateGenerated = async (certificateId: string, courseId: string) => {
    return logAction.mutateAsync({
      action: 'GENERATE_CERTIFICATE',
      entityType: 'certificate',
      entityId: certificateId,
      newValues: { course_id: courseId },
    });
  };

  const logCertificateRevoked = async (certificateId: string, reason: string) => {
    return logAction.mutateAsync({
      action: 'REVOKE_CERTIFICATE',
      entityType: 'certificate',
      entityId: certificateId,
      metadata: { reason },
    });
  };

  const logOnDemandRequest = async (requestId: string, goalType: string, topicText: string) => {
    return logAction.mutateAsync({
      action: 'ONDEMAND_REQUEST',
      entityType: 'ondemand_request',
      entityId: requestId,
      newValues: { goal_type: goalType, topic_text: topicText },
    });
  };

  return {
    logAction: logAction.mutateAsync,
    logEnrollment,
    logLessonComplete,
    logExamStart,
    logExamSubmit,
    logCertificateGenerated,
    logCertificateRevoked,
    logOnDemandRequest,
  };
}

// ============================================
// AUDIT STATISTICS
// ============================================

export function useLMSAuditStats() {
  return useQuery({
    queryKey: ['lms-audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_audit_logs')
        .select('action, entity_type, created_at');
      
      if (error) throw error;
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today);
      thisWeek.setDate(thisWeek.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = {
        total: data.length,
        today: data.filter(l => new Date(l.created_at) >= today).length,
        thisWeek: data.filter(l => new Date(l.created_at) >= thisWeek).length,
        thisMonth: data.filter(l => new Date(l.created_at) >= thisMonth).length,
        byAction: {} as Record<string, number>,
        byEntityType: {} as Record<string, number>,
      };
      
      data.forEach(log => {
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        stats.byEntityType[log.entity_type] = (stats.byEntityType[log.entity_type] || 0) + 1;
      });
      
      return stats;
    },
  });
}
