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

export function useCalculateAssessment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculate = async (assessmentId: string): Promise<CalculationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('calculate-assessment', {
        body: { assessment_id: assessmentId },
      });

      if (funcError) {
        console.error('Calculate assessment edge function error:', {
          assessmentId,
          errorMessage: funcError.message,
          timestamp: new Date().toISOString(),
        });
        throw new Error(funcError.message);
      }

      if (!data) {
        throw new Error('Resposta vazia do serviço de cálculo');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success !== true) {
        throw new Error('O serviço de cálculo não sinalizou sucesso — verifique os dados do diagnóstico.');
      }

      if (typeof data.issues_created !== 'number' || typeof data.recommendations_created !== 'number') {
        throw new Error('Resposta inválida do cálculo: contadores ausentes.');
      }

      toast.success('Cálculo realizado com sucesso!', {
        description: `${data.issues_created} gargalos identificados, ${data.recommendations_created} recomendações geradas`,
      });

      return data as CalculationResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular diagnóstico';
      setError(message);
      toast.error('Erro no cálculo', { description: message });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { calculate, loading, error };
}
