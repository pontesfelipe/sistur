import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CalculationResult {
  success: boolean;
  assessment_id: string;
  pillar_scores: Array<{
    pillar: string;
    score: number;
    severity: string;
  }>;
  critical_pillar: string;
  critical_score: number;
  issues_created: number;
  recommendations_created: number;
}

// Polling parameters
const POLL_INTERVAL_MS = 2000;       // checagem a cada 2s
const MAX_WAIT_MS = 5 * 60 * 1000;   // 5 minutos

export function useCalculateAssessment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async (assessmentId: string): Promise<CalculationResult | null> => {
    setLoading(true);
    setError(null);

    const toastId = toast.loading('Calculando diagnóstico…', {
      description: 'Isso pode levar até alguns minutos.',
    });

    try {
      // 1) Dispara o job (resposta imediata 202 com job_id)
      const { data: dispatchData, error: funcError } = await supabase.functions.invoke(
        'calculate-assessment',
        { body: { assessment_id: assessmentId } },
      );

      if (funcError) {
        console.error('Calculate assessment dispatch error:', funcError);
        throw new Error(funcError.message || 'Falha ao iniciar cálculo');
      }
      if (!dispatchData?.job_id) {
        // Compat retro: se o backend ainda for síncrono e devolver o resultado completo
        if (dispatchData?.success === true) {
          toast.success('Cálculo realizado com sucesso!', {
            id: toastId,
            description: `${dispatchData.issues_created} gargalos identificados, ${dispatchData.recommendations_created} recomendações geradas`,
          });
          return dispatchData as CalculationResult;
        }
        throw new Error('Resposta inválida do serviço de cálculo (sem job_id).');
      }

      const jobId: string = dispatchData.job_id;
      const startedAt = Date.now();

      // 2) Polling até completed/failed ou timeout
      while (Date.now() - startedAt < MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const { data: job, error: pollErr } = await supabase
          .from('assessment_calc_jobs')
          .select('status, error_message, result')
          .eq('id', jobId)
          .maybeSingle();

        if (pollErr) {
          console.warn('Polling error (will retry):', pollErr.message);
          continue;
        }
        if (!job) continue;

        if (job.status === 'failed') {
          throw new Error(job.error_message || 'O cálculo falhou no servidor.');
        }
        if (job.status === 'completed') {
          const result = (job.result || {}) as CalculationResult;
          if (result.success !== true) {
            throw new Error('O serviço de cálculo concluiu sem sinalizar sucesso.');
          }
          toast.success('Cálculo realizado com sucesso!', {
            id: toastId,
            description: `${result.issues_created ?? 0} gargalos identificados, ${result.recommendations_created ?? 0} recomendações geradas`,
          });
          return result;
        }
        // status pending/running → continua aguardando
      }

      throw new Error('Tempo limite excedido aguardando o cálculo (5 min). Tente novamente.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular diagnóstico';
      setError(message);
      toast.error('Erro no cálculo', { id: toastId, description: message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calculate, loading, error };
}
