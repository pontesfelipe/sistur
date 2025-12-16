import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'assessment_created' | 'assessment_calculated' | 'data_imported' | 'issue_detected' | 'regression_alert';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  entityId?: string;
  severity?: 'info' | 'warning' | 'critical';
  alertId?: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Fetch recent activity from assessments, issues, and alerts
      const [assessmentsRes, issuesRes, alertsRes] = await Promise.all([
        supabase
          .from('assessments')
          .select('id, title, status, created_at, calculated_at, destinations(name)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('issues')
          .select('id, title, severity, created_at, assessment_id')
          .eq('severity', 'CRITICO')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('alerts')
          .select('id, pillar, consecutive_cycles, message, created_at, is_read, is_dismissed, destination_id, destinations(name)')
          .eq('is_dismissed', false)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const notifications: Notification[] = [];

      // Convert regression alerts to notifications (highest priority)
      alertsRes.data?.forEach(alert => {
        const destination = alert.destinations as { name: string } | null;
        notifications.push({
          id: `alert-${alert.id}`,
          type: 'regression_alert',
          title: `Regressão Consecutiva: ${alert.pillar}`,
          description: `${destination?.name || 'Destino'}: ${alert.consecutive_cycles} ciclos de regressão no pilar ${alert.pillar}`,
          timestamp: alert.created_at,
          read: alert.is_read,
          entityId: alert.destination_id,
          severity: alert.consecutive_cycles >= 3 ? 'critical' : 'warning',
          alertId: alert.id,
        });
      });

      // Convert assessments to notifications
      assessmentsRes.data?.forEach(assessment => {
        const destination = assessment.destinations as { name: string } | null;
        
        if (assessment.status === 'CALCULATED' && assessment.calculated_at) {
          notifications.push({
            id: `calc-${assessment.id}`,
            type: 'assessment_calculated',
            title: 'Diagnóstico calculado',
            description: `${assessment.title} - ${destination?.name || 'Destino'} foi calculado`,
            timestamp: assessment.calculated_at,
            read: false,
            entityId: assessment.id,
            severity: 'info',
          });
        } else {
          notifications.push({
            id: `created-${assessment.id}`,
            type: 'assessment_created',
            title: 'Novo diagnóstico',
            description: `${assessment.title} - ${destination?.name || 'Destino'} criado`,
            timestamp: assessment.created_at,
            read: false,
            entityId: assessment.id,
            severity: 'info',
          });
        }
      });

      // Convert issues to notifications
      issuesRes.data?.forEach(issue => {
        notifications.push({
          id: `issue-${issue.id}`,
          type: 'issue_detected',
          title: 'Gargalo crítico detectado',
          description: issue.title,
          timestamp: issue.created_at,
          read: false,
          entityId: issue.assessment_id,
          severity: 'warning',
        });
      });

      // Sort by timestamp
      notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return notifications.slice(0, 15);
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({ is_dismissed: true })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRegressionAlerts() {
  return useQuery({
    queryKey: ['regression-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          destinations(name),
          assessments(title)
        `)
        .eq('alert_type', 'REGRESSION')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}
