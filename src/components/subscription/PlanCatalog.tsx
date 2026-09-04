import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Sparkles, Users } from 'lucide-react';
import { usePlans, useEntitlements, formatPlanPrice, type Plan } from '@/hooks/useEntitlements';

const FEATURE_LABELS: Record<string, string> = {
  consulting: 'Especialista em turismo dedicado',
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
  CONSULTING: 'Destinos e empresas',
  ENTERPRISE: 'Empresas e redes',
  STUDENT: 'Estudantes',
  TEACHER: 'Professores',
  INDEPENDENT: 'Profissionais autônomos',
};

const MAX_SEATS = 100;

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface PlanCatalogProps {
  /** Quando informado, o CTA do plano chama este callback (ex.: abrir formulário de interesse) */
  onSelectPlan?: (plan: { code: string; name: string }) => void;
  /** Quando informado, planos com preço online abrem o checkout em vez do formulário */
  onCheckout?: (plan: { code: string; name: string; priceId: string; quantity: number }) => void;
}

function PlanCard({
  plan: p,
  isCurrent,
  onSelectPlan,
  onCheckout,
}: { plan: Plan; isCurrent: boolean } & PlanCatalogProps) {
  const [seats, setSeats] = useState(p.min_seats || 1);
  const features = Object.entries(p.features || {}).filter(([, v]) => v === true);
  const onlinePriceId = !p.quote_only && p.price_cents ? p.stripe_price_id : null;
  const canCheckout = !!onlinePriceId && !!onCheckout;
  const quantity = p.seat_based ? seats : 1;
  const monthlyTotal = p.seat_based && p.price_cents ? p.price_cents * quantity : null;

  return (
    <Card className={isCurrent ? 'border-primary shadow-lg' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{p.name}</CardTitle>
          {isCurrent && <Badge>Plano atual</Badge>}
        </div>
        <CardDescription>{AUDIENCE_LABELS[p.audience] ?? p.audience}</CardDescription>
        <p className="text-xl font-bold mt-2">{formatPlanPrice(p)}</p>
        {p.code === 'professor' && (
          <p className="text-xs text-muted-foreground">
            Gratuito quando você tem 5 ou mais estudantes ativos que entraram pelo seu link de indicação.
          </p>
        )}
        {p.seat_based && (
          <p className="text-xs text-muted-foreground">
            A partir de {p.min_seats} usuários. Sem limite máximo — acrescente usuários quando precisar,
            pagando apenas o valor por usuário adicional.
          </p>
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

        {p.seat_based && !p.quote_only && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <Label htmlFor={`seats-${p.code}`} className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Usuários
            </Label>
            <Input
              id={`seats-${p.code}`}
              type="number"
              min={p.min_seats}
              max={MAX_SEATS}
              value={seats}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSeats(Number.isFinite(n) ? Math.min(MAX_SEATS, Math.max(p.min_seats, Math.floor(n))) : p.min_seats);
              }}
              className="h-9"
            />
            {monthlyTotal !== null && (
              <p className="text-xs text-muted-foreground">
                Total estimado: <strong className="text-foreground">{formatBRL(monthlyTotal)}/mês</strong> para {quantity} usuários.
                Acima de {MAX_SEATS} usuários, fale com o time comercial.
              </p>
            )}
          </div>
        )}

        {!isCurrent && (
          <Button
            variant={p.quote_only ? 'outline' : 'default'}
            className="w-full"
            onClick={() => {
              if (canCheckout) {
                onCheckout!({ code: p.code, name: p.name, priceId: onlinePriceId!, quantity });
                return;
              }
              if (onSelectPlan) {
                onSelectPlan({ code: p.code, name: p.name });
                return;
              }
              window.location.href = `mailto:contato@sistur.com.br?subject=${encodeURIComponent(
                `Interesse no plano ${p.name}`,
              )}`;
            }}
          >
            {p.quote_only ? 'Falar com o time' : canCheckout ? 'Assinar agora' : 'Quero contratar'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PlanCatalog({ onSelectPlan, onCheckout }: PlanCatalogProps = {}) {
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
        <h3 className="text-lg font-bold">Planos SISTUR</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Preços vigentes. O plano Territorial (gestão pública) é contratado por proposta/empenho; os demais
        podem ser assinados online e alterados a qualquer momento.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            isCurrent={currentPlanCode === p.code}
            onSelectPlan={onSelectPlan}
            onCheckout={onCheckout}
          />
        ))}
      </div>
    </div>
  );
}
