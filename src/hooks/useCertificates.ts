/**
 * SISTUR EDU LMS - Certificate Management
 * Handles certificate generation, verification, and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================
// TYPES
// ============================================

export interface LMSCertificate {
  certificate_id: string;
  user_id: string;
  course_id: string;
  course_version: number;
  attempt_id: string;
  issued_at: string;
  workload_minutes: number;
  pillar_scope: string;
  verification_code: string;
  qr_verify_url: string | null;
  pdf_uri: string | null;
  pdf_generated_at: string | null;
  status: 'active' | 'revoked' | 'expired';
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export interface CertificateWithDetails extends LMSCertificate {
  lms_courses?: {
    title: string;
    primary_pillar: string;
    description: string | null;
  };
  profiles?: {
    full_name: string;
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateVerificationCode(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// USER CERTIFICATES
// ============================================

export function useUserCertificates() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-certificates', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('lms_certificates')
        .select('*, lms_courses(title, primary_pillar, description)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });
      
      if (error) throw error;
      return data as CertificateWithDetails[];
    },
    enabled: !!user?.id,
  });
}

export function useCertificate(certificateId?: string) {
  return useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: async () => {
      if (!certificateId) return null;
      
      const { data, error } = await supabase
        .from('lms_certificates')
        .select('*, lms_courses(title, primary_pillar, description, workload_minutes)')
        .eq('certificate_id', certificateId)
        .single();
      
      if (error) throw error;
      return data as CertificateWithDetails;
    },
    enabled: !!certificateId,
  });
}

// ============================================
// PUBLIC VERIFICATION
// ============================================

export function useVerifyCertificate(verificationCode?: string) {
  return useQuery({
    queryKey: ['verify-certificate', verificationCode],
    queryFn: async () => {
      if (!verificationCode) return null;
      
      const { data: cert, error } = await supabase
        .from('lms_certificates')
        .select(`
          certificate_id,
          issued_at,
          workload_minutes,
          pillar_scope,
          status,
          verification_code,
          pdf_uri,
          lms_courses(title, primary_pillar)
        `)
        .eq('verification_code', verificationCode)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      
      if (!cert) {
        return {
          valid: false,
          message: 'Certificado não encontrado ou inválido',
        };
      }
      
      // Get user info separately (RLS may restrict access)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', (cert as unknown as { user_id: string }).user_id)
        .maybeSingle();
      
      return {
        valid: true,
        certificate: {
          ...cert,
          student_name: profile?.full_name || 'Nome não disponível',
        },
      };
    },
    enabled: !!verificationCode,
  });
}

// ============================================
// CERTIFICATE GENERATION
// ============================================

export function useCertificateMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const generateCertificate = useMutation({
    mutationFn: async ({ 
      attemptId, 
      courseId, 
      courseVersion 
    }: { 
      attemptId: string; 
      courseId: string; 
      courseVersion: number;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Get course details
      const { data: course, error: courseError } = await supabase
        .from('lms_courses')
        .select('*')
        .eq('course_id', courseId)
        .single();
      
      if (courseError || !course) throw new Error('Course not found');
      
      // Generate unique verification code
      let verificationCode = generateVerificationCode();
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabase
          .from('lms_certificates')
          .select('certificate_id')
          .eq('verification_code', verificationCode)
          .maybeSingle();
        
        if (!existing) break;
        verificationCode = generateVerificationCode();
        attempts++;
      }
      
      // Generate certificate ID using database function
      const { data: certIdResult, error: certIdError } = await supabase
        .rpc('generate_certificate_id');
      
      if (certIdError) throw certIdError;
      const certificateId = certIdResult || `CERT-${new Date().getFullYear()}-${Date.now()}`;
      
      // Create certificate
      const qrVerifyUrl = `${window.location.origin}/verify/${verificationCode}`;
      
      const { data: certificate, error: certError } = await supabase
        .from('lms_certificates')
        .insert({
          certificate_id: certificateId,
          user_id: user.id,
          course_id: courseId,
          course_version: courseVersion,
          attempt_id: attemptId,
          workload_minutes: course.workload_minutes || 60,
          pillar_scope: course.primary_pillar,
          verification_code: verificationCode,
          qr_verify_url: qrVerifyUrl,
          status: 'active',
        })
        .select()
        .single();
      
      if (certError) throw certError;
      
      return certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-certificates'] });
      toast.success('Certificado gerado com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao gerar certificado: ${error.message}`);
    },
  });

  const revokeCertificate = useMutation({
    mutationFn: async ({ 
      certificateId, 
      reason 
    }: { 
      certificateId: string; 
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('lms_certificates')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq('certificate_id', certificateId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['certificate'] });
      toast.success('Certificado revogado');
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return { generateCertificate, revokeCertificate };
}

// ============================================
// ADMIN CERTIFICATE STATS
// ============================================

export function useCertificateStats() {
  return useQuery({
    queryKey: ['certificate-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lms_certificates')
        .select('status, pillar_scope, issued_at');
      
      if (error) throw error;
      
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const stats = {
        total: data.length,
        active: data.filter(c => c.status === 'active').length,
        revoked: data.filter(c => c.status === 'revoked').length,
        thisMonth: data.filter(c => new Date(c.issued_at) >= thisMonth).length,
        lastMonth: data.filter(c => {
          const date = new Date(c.issued_at);
          return date >= lastMonth && date < thisMonth;
        }).length,
        byPillar: {
          RA: data.filter(c => c.pillar_scope === 'RA').length,
          OE: data.filter(c => c.pillar_scope === 'OE').length,
          AO: data.filter(c => c.pillar_scope === 'AO').length,
        },
      };
      
      return stats;
    },
  });
}
