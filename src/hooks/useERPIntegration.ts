/**
 * SISTUR EDU LMS - ERP Integration
 * Handles diagnostics, prescriptions, and event logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface ERPDiagnostic {
  diagnostic_id: string;
  org_id: string | null;
  entity_ref: string;
  entity_type: 'municipality' | 'government' | 'company' | null;
  pillar_priority: 'RA' | 'OE' | 'AO' | null;
  indicators_data: Record<string, unknown> | null;
  igma_warnings: Record<string, unknown>[] | null;
  created_at: string;
}

export interface LearningPrescription {
  prescription_id: string;
  diagnostic_id: string;
  recommended_track_id: string | null;
  recommended_courses: string[] | null;
  target_roles: string[] | null;
  reasoning: string | null;
  created_at: string;
}

export interface ERPEventLog {
  event_id: string;
  org_id: string | null;
  event_type: 'diagnostic_received' | 'prescription_sent' | 'certification_status_sent' | 'progress_update_sent';
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================
// ERP DIAGNOSTICS
// ============================================

export function useERPDiagnostics() {
  return useQuery({
    queryKey: ['erp-diagnostics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_diagnostics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as ERPDiagnostic[];
    },
  });
}

export function useERPDiagnostic(diagnosticId?: string) {
  return useQuery({
    queryKey: ['erp-diagnostic', diagnosticId],
    queryFn: async () => {
      if (!diagnosticId) return null;
      
      const { data: diagnostic, error: diagError } = await supabase
        .from('erp_diagnostics')
        .select('*')
        .eq('diagnostic_id', diagnosticId)
        .single();
      
      if (diagError) throw diagError;
      
      // Get associated prescriptions
      const { data: prescriptions, error: presError } = await supabase
        .from('learning_prescriptions_lms')
        .select('*')
        .eq('diagnostic_id', diagnosticId);
      
      if (presError) throw presError;
      
      return {
        ...diagnostic,
        prescriptions: prescriptions || [],
      } as ERPDiagnostic & { prescriptions: LearningPrescription[] };
    },
    enabled: !!diagnosticId,
  });
}

// ============================================
// ERP DIAGNOSTIC MUTATIONS
// ============================================

export function useERPDiagnosticMutations() {
  const queryClient = useQueryClient();

  const receiveDiagnostic = useMutation({
    mutationFn: async (diagnostic: Omit<ERPDiagnostic, 'diagnostic_id' | 'created_at'>) => {
      // Insert diagnostic
      const { data, error } = await supabase
        .from('erp_diagnostics')
        .insert([diagnostic])
        .select()
        .single();
      
      if (error) throw error;
      
      // Log event
      await supabase.from('erp_event_log').insert([{
        org_id: diagnostic.org_id,
        event_type: 'diagnostic_received',
        payload: {
          diagnostic_id: data.diagnostic_id,
          entity_ref: diagnostic.entity_ref,
          pillar_priority: diagnostic.pillar_priority,
        },
      });
      
      return data as ERPDiagnostic;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-diagnostics'] });
      toast.success('Diagnóstico recebido');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const generatePrescriptions = useMutation({
    mutationFn: async (diagnosticId: string) => {
      // Get diagnostic
      const { data: diagnostic } = await supabase
        .from('erp_diagnostics')
        .select('*')
        .eq('diagnostic_id', diagnosticId)
        .single();
      
      if (!diagnostic) throw new Error('Diagnostic not found');
      
      // Find matching tracks based on pillar priority
      const { data: tracks } = await supabase
        .from('edu_tracks')
        .select('id, name')
        .limit(3);
      
      // Find matching courses
      let coursesQuery = supabase
        .from('edu_trainings')
        .select('training_id, title')
        .eq('active', true)
        .limit(5);
      
      if (diagnostic.pillar_priority) {
        coursesQuery = coursesQuery.eq('pillar', diagnostic.pillar_priority);
      }
      
      const { data: courses } = await coursesQuery;
      
      // Create prescription
      const prescription = {
        diagnostic_id: diagnosticId,
        recommended_track_id: tracks?.[0]?.id || null,
        recommended_courses: courses?.map(c => c.training_id) || null,
        target_roles: ['GESTORES', 'TECNICOS'],
        reasoning: `Baseado no diagnóstico do ${diagnostic.entity_ref}, identificamos prioridade no pilar ${diagnostic.pillar_priority || 'INTEGRADO'}. Recomendamos a capacitação nos temas relacionados para melhoria dos indicadores.`,
      };
      
      const { data: newPrescription, error } = await supabase
        .from('learning_prescriptions_lms')
        .insert(prescription)
        .select()
        .single();
      
      if (error) throw error;
      
      // Log event
      await supabase.from('erp_event_log').insert({
        org_id: diagnostic.org_id,
        event_type: 'prescription_sent',
        payload: {
          diagnostic_id: diagnosticId,
          prescription_id: newPrescription.prescription_id,
          recommended_track: tracks?.[0]?.name,
          recommended_courses_count: courses?.length || 0,
        },
      });
      
      return newPrescription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-diagnostic'] });
      queryClient.invalidateQueries({ queryKey: ['erp-prescriptions'] });
      toast.success('Prescrições geradas');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { receiveDiagnostic, generatePrescriptions };
}

// ============================================
// LEARNING PRESCRIPTIONS
// ============================================

export function useLearningPrescriptions() {
  return useQuery({
    queryKey: ['erp-prescriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_prescriptions_lms')
        .select('*, erp_diagnostics(entity_ref, pillar_priority)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// ============================================
// ERP EVENT LOG
// ============================================

export function useERPEventLog(limit: number = 50) {
  return useQuery({
    queryKey: ['erp-event-log', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_event_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ERPEventLog[];
    },
  });
}

export function useERPEventStats() {
  return useQuery({
    queryKey: ['erp-event-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_event_log')
        .select('event_type, created_at');
      
      if (error) throw error;
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const stats = {
        total: data.length,
        thisMonth: data.filter(e => new Date(e.created_at) >= thisMonth).length,
        byType: {
          diagnostic_received: data.filter(e => e.event_type === 'diagnostic_received').length,
          prescription_sent: data.filter(e => e.event_type === 'prescription_sent').length,
          certification_status_sent: data.filter(e => e.event_type === 'certification_status_sent').length,
          progress_update_sent: data.filter(e => e.event_type === 'progress_update_sent').length,
        },
      };
      
      return stats;
    },
  });
}

// ============================================
// CERTIFICATION STATUS SYNC
// ============================================

export function useCertificationStatusSync() {
  const queryClient = useQueryClient();

  const syncCertificationStatus = useMutation({
    mutationFn: async ({ diagnosticId, entityRef }: { diagnosticId: string; entityRef: string }) => {
      // Get all certificates for users associated with this entity
      // This is a simplified version - in production, you'd have entity-user mappings
      const { data: certificates } = await supabase
        .from('lms_certificates')
        .select('certificate_id, user_id, course_id, issued_at, pillar_scope, status')
        .eq('status', 'active')
        .order('issued_at', { ascending: false })
        .limit(100);
      
      // Log the sync event
      const { data: event, error } = await supabase
        .from('erp_event_log')
        .insert({
          event_type: 'certification_status_sent',
          payload: {
            diagnostic_id: diagnosticId,
            entity_ref: entityRef,
            certificates_count: certificates?.length || 0,
            certificates: certificates?.map(c => ({
              certificate_id: c.certificate_id,
              course_id: c.course_id,
              issued_at: c.issued_at,
              pillar: c.pillar_scope,
            })),
          },
        })
        .select()
        .single();
      
      if (error) throw error;
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-event-log'] });
      toast.success('Status de certificação sincronizado');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { syncCertificationStatus };
}
