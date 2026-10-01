import { tx } from '@/i18n/t';
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
  annual,
}: { plan: Plan; isCurrent: boolean; annual: boolean } & PlanCatalogProps) {
  const [seats, setSeats] = useState(p.min_seats || 1);
  const features = Object.entries(p.features || {}).filter(([, v]) => v === true);
  const hasAnnual = !!p.stripe_price_id_annual && !!p.annual_price_cents;
  const useAnnual = annual && hasAnnual;
  const unitCents = useAnnual ? p.annual_price_cents! : p.price_cents;
  const onlinePriceId = !p.quote_only && p.price_cents
    ? (useAnnual ? p.stripe_price_id_annual : p.stripe_price_id)
    : null;
  const canCheckout = !!onlinePriceId && !!onCheckout;
  const quantity = p.seat_based ? seats : 1;
  const monthlyTotal = p.seat_based && unitCents ? unitCents * quantity : null;
  const periodLabel = useAnnual ? tx('ano') : tx('mês');

  return (
    <Card
      className={
        isCurrent
          ? 'border-primary ring-1 ring-primary/30 shadow-lg flex flex-col'
          : 'flex flex-col transition-all hover:border-primary/40 hover:shadow-md'
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tx(p.name)}</CardTitle>
          {isCurrent && <Badge>{tx("Plano atual")}</Badge>}
        </div>
        <CardDescription>{tx(AUDIENCE_LABELS[p.audience] ?? p.audience)}</CardDescription>
        {useAnnual ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-muted-foreground line-through">
              {formatBRL(p.price_cents! * 12)}{tx('/ano')}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-2xl font-bold tracking-tight">
                {formatBRL(p.annual_price_cents!)}{tx('/ano')}{p.seat_based ? ' ' + tx('por usuário') : ''}
              </p>
              <Badge variant="secondary">{tx("15% de desconto")}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {tx('Equivale a {{v}}/mês, pago uma vez por ano.', { v: formatBRL(Math.floor(p.annual_price_cents! / 1200) * 100) })}
            </p>
          </div>
        ) : (
          <p className="text-2xl font-bold mt-3 tracking-tight">{formatPlanPrice(p)}</p>
        )}
        {p.code === 'professor' && (
          <p className="text-xs text-muted-foreground">
            {tx("Gratuito quando você tem 5 ou mais estudantes ativos que entraram pelo seu link de indicação.")}
          </p>
        )}
        {p.seat_based && (
          <p className="text-xs text-muted-foreground">
            {tx('A partir de {{n}} usuários. Sem limite máximo — acrescente usuários quando precisar, pagando apenas o valor por usuário adicional.', { n: p.min_seats })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col flex-1">
        {p.description && <p className="text-sm text-muted-foreground">{tx(p.description)}</p>}
        <ul className="space-y-1.5">
          {features.map(([key]) => (
            <li key={key} className="flex items-start gap-2 text-sm">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>{tx(FEATURE_LABELS[key] ?? key)}</span>
            </li>
          ))}
        </ul>

        {p.seat_based && !p.quote_only && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <Label htmlFor={`seats-${p.code}`} className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> {tx("Usuários")}
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
                {tx("Total estimado:")} <strong className="text-foreground">{formatBRL(monthlyTotal)}/{periodLabel}</strong> {tx('para {{n}} usuários. Acima de {{max}} usuários, fale com o time comercial.', { n: quantity, max: MAX_SEATS })}
              </p>
            )}
          </div>
        )}

        {isCurrent && p.seat_based && canCheckout ? (
          <Button
            variant="outline"
            className="w-full mt-auto"
            onClick={() =>
              onCheckout!({ code: p.code, name: p.name, priceId: onlinePriceId!, quantity })
            }
          >
            {tx("Atualizar usuários")}
          </Button>
        ) : (
          !isCurrent && (
            <Button
              variant={p.quote_only ? 'outline' : 'default'}
              className="w-full mt-auto"
              onClick={() => {
                if (canCheckout) {
                  onCheckout!({ code: p.code, name: p.name, priceId: onlinePriceId!, quantity });
                  return;
                }
                if (onSelectPlan) {
                  onSelectPlan({ code: p.code, name: p.name });
                  return;
                }
                window.location.href = `/planos?contato=${encodeURIComponent(p.code)}&plano=${encodeURIComponent(p.name)}`;
              }}
            >
              {tx(p.quote_only ? tx('Falar com o time') : canCheckout ? tx('Assinar agora') : tx('Quero contratar'))}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}

export function PlanCatalog({ onSelectPlan, onCheckout }: PlanCatalogProps = {}) {
  const { data: plans, isLoading } = usePlans();
  const { plan: currentPlanCode } = useEntitlements();
  const [annual, setAnnual] = useState(false);

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
        <h3 className="text-lg font-bold">{tx("Planos SISTUR")}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {tx('Preços vigentes. O plano Territorial (gestão pública) é contratado por proposta/empenho; os demais podem ser assinados online e alterados a qualquer momento.')}
      </p>

      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full border border-border bg-muted/40 p-1" role="tablist" aria-label={tx("Período de cobrança")}>
          <Button size="sm" variant={annual ? 'ghost' : 'default'} className="rounded-full" onClick={() => setAnnual(false)} aria-pressed={!annual}>
            {tx("Mensal")}
          </Button>
          <Button size="sm" variant={annual ? 'default' : 'ghost'} className="rounded-full gap-2" onClick={() => setAnnual(true)} aria-pressed={annual}>
            {tx("Anual")} <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">-15%</Badge>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            isCurrent={currentPlanCode === p.code}
            onSelectPlan={onSelectPlan}
            onCheckout={onCheckout}
            annual={annual}
          />
        ))}
      </div>
    </div>
  );
}
