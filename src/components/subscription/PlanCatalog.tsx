import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Sparkles } from 'lucide-react';
import { usePlans, useEntitlements, formatPlanPrice } from '@/hooks/useEntitlements';

const FEATURE_LABELS: Record<string, string> = {
  erp: 'SISTUR Analítico (territorial)',
  enterprise: 'Diagnóstico empresarial',
  edu: 'SISTUR EDU',
  projects: 'Gerenciamento de projetos',
  reports: 'Relatórios com IA',
  observatory: 'Observatório turístico',
  consortia: 'Consórcios regionais',
  classrooms: 'Turmas e acompanhamento',
  beni: 'Professor Beni (IA)',
};

const AUDIENCE_LABELS: Record<string, string> = {
  PUBLIC: 'Gestão pública',
  ENTERPRISE: 'Empresas e redes',
  STUDENT: 'Estudantes',
  TEACHER: 'Professores',
  INDEPENDENT: 'Profissionais autônomos',
};

export function PlanCatalog() {
  const { data: plans, isLoading } = usePlans();
  const { plan: currentPlanCode } = useEntitlements();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
    );
  }

  if (!plans?.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Catálogo de planos</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Planos vigentes do SISTUR. A contratação Territorial é feita por contrato/empenho.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isCurrent = currentPlanCode === p.code;
          const features = Object.entries(p.features || {}).filter(([, v]) => v === true);
          return (
            <Card key={p.id} className={isCurrent ? 'border-primary shadow-lg' : undefined}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {isCurrent && <Badge>Plano atual</Badge>}
                </div>
                <CardDescription>{AUDIENCE_LABELS[p.audience] ?? p.audience}</CardDescription>
                <p className="text-xl font-bold mt-2">{formatPlanPrice(p)}</p>
                {p.seat_based && (
                  <p className="text-xs text-muted-foreground">Mínimo de {p.min_seats} assentos</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                <ul className="space-y-1.5">
                  {features.map(([key]) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{FEATURE_LABELS[key] ?? key}</span>
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button
                    variant={p.quote_only ? 'outline' : 'default'}
                    className="w-full"
                    onClick={() =>
                      (window.location.href = `mailto:contato@sistur.com.br?subject=${encodeURIComponent(
                        `Interesse no plano ${p.name}`,
                      )}`)
                    }
                  >
                    {p.quote_only ? 'Falar com o time' : 'Quero contratar'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
