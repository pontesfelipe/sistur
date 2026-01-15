import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

export type AuditEventType = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_SIGNUP'
  | 'PASSWORD_CHANGED'
  | 'PAGE_VIEW'
  | 'FEATURE_USED'
  | 'ASSESSMENT_CREATED'
  | 'ASSESSMENT_CALCULATED'
  | 'ASSESSMENT_VIEWED'
  | 'DESTINATION_CREATED'
  | 'DESTINATION_VIEWED'
  | 'REPORT_GENERATED'
  | 'DATA_EXPORTED'
  | 'COURSE_ENROLLED'
  | 'COURSE_COMPLETED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_BLOCKED'
  | 'USER_UNBLOCKED'
  | 'USER_DELETED'
  | 'ORG_USER_ADDED'
  | 'ORG_USER_REMOVED'
  | 'SETTINGS_CHANGED';

export interface AuditEventMetadata {
  page?: string;
  feature?: string;
  action?: string;
  target_user_id?: string;
  target_org_id?: string;
  details?: Json;
  ip_address?: string;
  user_agent?: string;
}

export function useAuditLogger() {
  const { user } = useAuth();

  const logEvent = useCallback(async (
    eventType: AuditEventType,
    entityType?: string,
    entityId?: string,
    metadata?: AuditEventMetadata
  ) => {
    if (!user?.id) return;

    try {
      // Get the user's org_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.org_id) return;

      const eventMetadata = {
        ...metadata,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      await supabase.from('audit_events').insert([{
        org_id: profile.org_id,
        user_id: user.id,
        event_type: eventType,
        entity_type: entityType || null,
        entity_id: entityId || null,
        metadata: eventMetadata,
      }]);
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }, [user?.id]);

  // Convenience methods
  const logPageView = useCallback((page: string) => {
    return logEvent('PAGE_VIEW', 'page', undefined, { page });
  }, [logEvent]);

  const logFeatureUsed = useCallback((feature: string, action?: string) => {
    return logEvent('FEATURE_USED', 'feature', undefined, { feature, action });
  }, [logEvent]);

  const logLogin = useCallback(() => {
    return logEvent('USER_LOGIN', 'user', user?.id);
  }, [logEvent, user?.id]);

  const logLogout = useCallback(() => {
    return logEvent('USER_LOGOUT', 'user', user?.id);
  }, [logEvent, user?.id]);

  const logUserAction = useCallback((
    action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_BLOCKED' | 'USER_UNBLOCKED' | 'USER_DELETED',
    targetUserId: string,
    details?: Json
  ) => {
    return logEvent(action, 'user', targetUserId, { target_user_id: targetUserId, details });
  }, [logEvent]);

  const logOrgAction = useCallback((
    action: 'ORG_USER_ADDED' | 'ORG_USER_REMOVED',
    targetUserId: string,
    targetOrgId: string,
    details?: Json
  ) => {
    return logEvent(action, 'organization', targetOrgId, { 
      target_user_id: targetUserId, 
      target_org_id: targetOrgId,
      details 
    });
  }, [logEvent]);

  const logDataExport = useCallback((exportType: string, details?: Json) => {
    return logEvent('DATA_EXPORTED', 'export', undefined, { feature: exportType, details });
  }, [logEvent]);

  return {
    logEvent,
    logPageView,
    logFeatureUsed,
    logLogin,
    logLogout,
    logUserAction,
    logOrgAction,
    logDataExport,
  };
}
