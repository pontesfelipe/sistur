import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePlans, formatPlanPrice } from '@/hooks/useEntitlements';
import {
  Landmark,
  Building2,
  GraduationCap,
  User,
  Bot,
  ArrowRight,
  ArrowDown,
  CreditCard,
  Sparkles,
  BookOpen,
  ClipboardList,
  Lock,
  Infinity as InfinityIcon,
  Users,
  Coins,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';
import heroImage from '@/assets/business-rules-hero.jpg';

const PLAN_ICONS: Record<string, typeof Landmark> = {
  territorial: Landmark,
  empresarial: Building2,
  estudante: GraduationCap,
  professor: GraduationCap,
  independente: User,
};

function FlowStep({ icon: Icon, title, desc, tone = 'default' }: {
  icon: typeof Landmark; title: string; desc: string; tone?: 'default' | 'primary' | 'accent';
}) {
  const tones = {
    default: 'bg-muted border-border',
    primary: 'bg-primary/10 border-primary/30',
    accent: 'bg-accent/10 border-accent/30',
  };
  return (
    <div className={`flex flex-col items-center text-center gap-1.5 rounded-lg border p-3 ${tones[tone]}`}>
      <Icon className="h-5 w-5 text-primary" />
      <p className="text-sm font-semibold leading-tight">{title}</p>
      <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
    </div>
  );
}

function ArrowH() {
  return <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />;
}

export function BusinessRulesPanel() {
  const { data: plans = [], isLoading } = usePlans();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden">
        <img
          src={heroImage}
          alt="Ilustração do modelo de negócio SISTUR: destinos públicos, empreendimentos e educação conectados"
          className="w-full h-40 sm:h-52 object-cover"
          width={1536}
          height={640}
          loading="lazy"
        />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Como o SISTUR funciona
          </CardTitle>
          <CardDescription>
            Visão completa do modelo de acesso: planos, avaliação gratuita por consumo,
            cotas do Professor Beni e regras fixas da metodologia.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Jornada de acesso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jornada de acesso (fluxo)</CardTitle>
          <CardDescription>O caminho de todo usuário, do cadastro ao plano pago.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <FlowStep icon={User} title="Cadastro" desc="Conta criada e termos aceitos" />
            <ArrowH />
            <FlowStep icon={FlaskConical} title="Avaliação por uso" desc="Curso base + 10 perguntas ao Beni (grátis)" tone="primary" />
            <ArrowH />
            <FlowStep icon={BookOpen} title="Exploração" desc="Diagnóstico teaser para organizações" />
            <ArrowH />
            <FlowStep icon={CreditCard} title="Plano pago" desc="Assinatura desbloqueia módulos completos" tone="accent" />
          </div>
          <p className="text-xs text-muted-foreground">
            Não há trial por tempo (7 dias). O acesso de avaliação é por <strong>consumo</strong>:
            termina quando o usuário conclui o curso base e esgota as perguntas gratuitas — sem data de expiração.
          </p>
        </CardContent>
      </Card>

      {/* Planos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planos oficiais</CardTitle>
          <CardDescription>Catálogo único, o mesmo exibido em /assinatura e /planos.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando planos…</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((p) => {
                const Icon = PLAN_ICONS[p.code] ?? User;
                const features = (p.features ?? {}) as Record<string, unknown>;
                const beniQuota = typeof features.beni_monthly_quota === 'number' ? features.beni_monthly_quota : null;
                return (
                  <Card key={p.code} className="border-border/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Icon className="h-4 w-4 text-primary" />
                        {p.name}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {p.quote_only ? 'Sob consulta' : formatPlanPrice(p.price_cents)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {p.description && <p className="text-muted-foreground">{p.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {beniQuota != null && (
                          <Badge variant="secondary" className="gap-1">
                            <Bot className="h-3 w-3" /> {beniQuota} perguntas Beni/mês
                          </Badge>
                        )}
                        {features.erp && <Badge variant="outline">Analítico</Badge>}
                        {features.edu && <Badge variant="outline">EDU</Badge>}
                        {features.projects && <Badge variant="outline">Projetos</Badge>}
                      </div>
                      {p.code === 'empresarial' && (
                        <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                          Mínimo de 5 usuários, <strong>sem teto</strong>: o cliente expande
                          pagando o valor por usuário adicional (cobrança por assento).
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avaliação gratuita por consumo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Avaliação gratuita por consumo
          </CardTitle>
          <CardDescription>Substitui o antigo trial de 7 dias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Usuário individual
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>Curso base "Fundamentos do SISTUR" liberado</li>
                <li>10 perguntas gratuitas ao Professor Beni</li>
                <li>Demais trilhas bloqueadas após concluir o curso base</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Organização
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>1 diagnóstico completo permitido</li>
                <li>Resultado em modo teaser (pilares ofuscados + paywall)</li>
                <li>Projetos bloqueados até assinar</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <FlowStep icon={ClipboardList} title="Consome o trial" desc="Curso concluído / perguntas esgotadas / diagnóstico rodado" />
            <ArrowH />
            <FlowStep icon={Lock} title="Bloqueio suave" desc="CTA para planos nos módulos afetados" tone="primary" />
            <ArrowH />
            <FlowStep icon={CreditCard} title="Conversão" desc="Assinatura (online ou manual pelo admin)" tone="accent" />
          </div>
          <p className="text-xs text-muted-foreground">
            Toda a base anterior foi convertida automaticamente (grandfathering): usuários e
            organizações existentes não passam pelo trial.
          </p>
        </CardContent>
      </Card>

      {/* Beni */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Cotas e créditos do Professor Beni
          </CardTitle>
          <CardDescription>Como funciona a monetização do assistente de IA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Cota mensal
              </p>
              <p className="text-sm text-muted-foreground">
                30 perguntas/mês (60 no Empresarial), renovadas todo mês. Não acumula.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" /> Pacotes avulsos
              </p>
              <p className="text-sm text-muted-foreground">
                50 ou 150 créditos por usuário; pacote de 500 compartilhado pela organização.
                Validade de 12 meses.
              </p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="font-semibold text-sm flex items-center gap-2">
                <InfinityIcon className="h-4 w-4 text-primary" /> Exceções
              </p>
              <p className="text-sm text-muted-foreground">
                Administradores têm uso ilimitado. Em falha da IA, o token consumido é estornado automaticamente.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <FlowStep icon={Bot} title="Pergunta enviada" desc="1 token debitado antes da resposta" />
            <ArrowH />
            <FlowStep icon={Coins} title="Ordem de consumo" desc="Cota mensal → créditos do usuário → créditos da org" tone="primary" />
            <ArrowH />
            <FlowStep icon={RefreshCw} title="Saldo visível" desc="Contador no chat; pacotes na página Assinatura" tone="accent" />
          </div>
        </CardContent>
      </Card>

      {/* Regras fixas da metodologia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Regras fixas da metodologia
          </CardTitle>
          <CardDescription>Independem de plano — valem para todos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Pilares canônicos</p>
              <p className="text-muted-foreground">RA (Relações Ambientais), OE (Organização Estrutural), AO (Ações Operacionais). Nomenclatura fixa.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Motor de status</p>
              <p className="text-muted-foreground">Adequado ≥ 67% · Atenção 34–66% · Crítico ≤ 33%. Calculado pelo sistema, não editável.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Prescrições EDU</p>
              <p className="text-muted-foreground">Só existem com gatilho de diagnóstico (Atenção/Crítico) + pilar correspondente + interpretação territorial.</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-semibold">Privacidade competitiva</p>
              <p className="text-muted-foreground">Sem rankings públicos entre municípios; o índice I-SISTUR é apenas interno.</p>
            </div>
            <div className="rounded-lg border p-3 md:col-span-2">
              <p className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Multi-organização</p>
              <p className="text-muted-foreground">
                Dados isolados por organização (RLS). Papéis: ADMIN (global), ORG_ADMIN (escopo local),
                ANALYST, VIEWER, ESTUDANTE e PROFESSOR. O papel define os limites do plano.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Dúvidas comerciais? A página pública <span className="font-mono">/planos</span> e o painel
            Comercial (admin) refletem estas mesmas regras.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
