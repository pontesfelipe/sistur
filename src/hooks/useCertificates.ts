/**
 * SISTUR EDU LMS - Certificate Management
 * Handles certificate generation, verification, and management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { fetchProfileNamesByIds } from '@/services/profiles';

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
      
      const certUserId = (cert as unknown as { user_id: string }).user_id;
      const profileMap = await fetchProfileNamesByIds([certUserId]);

      return {
        valid: true,
        certificate: {
          ...cert,
          student_name: profileMap.get(certUserId) || 'Nome não disponível',
        },
      };
    },
    enabled: !!verificationCode,
  });
}

// ============================================
// CERTIFICATE MUTATIONS (admin only)
// ============================================

export function useCertificateMutations() {
  const queryClient = useQueryClient();

  // Auto-issuance lives in the `submit_exam_attempt` / `finalize_essay_grading`
  // RPCs — there is no safe client-side path for minting a certificate
  // because the underlying table's write grants are revoked. Only revocation
  // remains here, gated by `revoke_certificate(text, text)`.
  const revokeCertificate = useMutation({
    mutationFn: async ({ certificateId, reason }: { certificateId: string; reason: string }) => {
      const { error } = await (supabase.rpc as any)('revoke_certificate', {
        _certificate_id: certificateId,
        _reason: reason,
      });
      if (error) throw error;
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

  return { revokeCertificate };
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
