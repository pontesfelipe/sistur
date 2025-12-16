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
        throw new Error(funcError.message);
      }

      if (data.error) {
        throw new Error(data.error);
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
