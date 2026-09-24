import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLicense } from '@/contexts/LicenseContext';

/** Liberado para Pro/Enterprise, trial ativo, admins ou feature `revenue_intelligence`. */
export function RevenueIntelligenceGate({ title, children }: { title: string; children: ReactNode }) {
  const { hasFeature, plan, isTrialActive, loading } = useLicense();
  if (loading) return null;
  const allowed = hasFeature('revenue_intelligence') || plan === 'pro' || plan === 'enterprise' || isTrialActive;
  if (allowed) return <>{children}</>;
  return (
    <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
      <Lock className="h-6 w-6 mx-auto text-muted-foreground" />
      <p className="font-medium">{title} faz parte dos planos Pro e Enterprise</p>
      <p className="text-sm text-muted-foreground">Faça o upgrade para usar esta ferramenta.</p>
      <Button asChild size="sm"><Link to="/assinatura">Ver planos</Link></Button>
    </div>
  );
}
