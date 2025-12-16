import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'assessment_created' | 'assessment_calculated' | 'data_imported' | 'issue_detected';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  entityId?: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Fetch recent activity from assessments and issues
      const [assessmentsRes, issuesRes] = await Promise.all([
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
      ]);

      const notifications: Notification[] = [];

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
        });
      });

      // Sort by timestamp
      notifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return notifications.slice(0, 10);
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
