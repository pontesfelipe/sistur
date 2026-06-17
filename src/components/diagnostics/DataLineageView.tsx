import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Database, Calculator, PenLine, Layers, Gauge, ArrowRight } from 'lucide-react';
import { isDerivedIndicator } from '@/data/derivedIndicators';

interface PillarScore {
  pillar: string;
  score: number;
  severity?: string;
}

interface Props {
  auditRows: any[];
  indicatorValues?: any[];
  pillarScores?: PillarScore[];
  finalScore?: number | null;
}

type SourceKind = 'OFFICIAL' | 'DERIVED' | 'MANUAL';

const PILLAR_LABEL: Record<string, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

const SOURCE_META: Record<SourceKind, { label: string; icon: any; tone: string; ring: string }> = {
  OFFICIAL: {
    label: 'Fontes Oficiais',
    icon: Database,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    ring: 'ring-emerald-500/40',
  },
  DERIVED: {
    label: 'Indicadores Derivados',
    icon: Calculator,
    tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
    ring: 'ring-blue-500/40',
  },
  MANUAL: {
    label: 'Preenchimento Manual',
    icon: PenLine,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
    ring: 'ring-amber-500/40',
  },
};

const OFFICIAL_TOKENS = ['IBGE', 'CADASTUR', 'STN', 'DATASUS', 'MAPA_TURISMO', 'MAPA DO TURISMO', 'INEP', 'ANATEL', 'TSE', 'ANA', 'ANAC', 'CADUNICO', 'RAIS', 'CAGED'];

/**
 * Commercial / full names shown to the user instead of acronyms.
 */
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  IBGE: 'IBGE — Instituto Brasileiro de Geografia e Estatística',
  CADASTUR: 'CADASTUR — Cadastro dos Prestadores de Serviços Turísticos (MTur)',
  STN: 'STN — Secretaria do Tesouro Nacional',
  DATASUS: 'DATASUS — Ministério da Saúde',
  MAPA_TURISMO: 'Mapa do Turismo Brasileiro (MTur)',
  'MAPA DO TURISMO': 'Mapa do Turismo Brasileiro (MTur)',
  INEP: 'INEP — Instituto Nacional de Estudos e Pesquisas Educacionais',
  ANATEL: 'ANATEL — Agência Nacional de Telecomunicações',
  TSE: 'TSE — Tribunal Superior Eleitoral',
  ANA: 'ANA — Agência Nacional de Águas e Saneamento',
  ANAC: 'ANAC — Agência Nacional de Aviação Civil',
  CADUNICO: 'CadÚnico — Ministério do Desenvolvimento Social',
  RAIS: 'RAIS — Relação Anual de Informações Sociais (MTE)',
  CAGED: 'CAGED — Cadastro Geral de Empregados e Desempregados (MTE)',
};

function displaySourceName(token: string): string {
  return SOURCE_DISPLAY_NAMES[token.toUpperCase()] || token;
}

function classifyRow(row: any): { kind: SourceKind; sourceName: string } {
  const code = String(row.indicator_code || '');
  const type = String(row.source_type || '').toUpperCase();
  const detail = String(row.source_detail || '').toUpperCase();

  if (type.startsWith('DERIVED') || isDerivedIndicator(code)) {
    return { kind: 'DERIVED', sourceName: 'Cálculo Interno' };
  }
  if (type.startsWith('OFFICIAL_API') || type === 'AUTOMATICA') {
    const token = OFFICIAL_TOKENS.find((t) => detail.includes(t));
    return { kind: 'OFFICIAL', sourceName: token ? displaySourceName(token) : 'Fonte Oficial' };
  }
  const token = OFFICIAL_TOKENS.find((t) => detail.includes(t));
  if (token) return { kind: 'OFFICIAL', sourceName: displaySourceName(token) };
  if (type === 'ESTIMADA') return { kind: 'DERIVED', sourceName: 'Estimativa' };
  return { kind: 'MANUAL', sourceName: 'Equipe local' };
}

export function DataLineageView({ auditRows, pillarScores = [], finalScore = null }: Props) {
  const lineage = useMemo(() => {
    const sources = new Map<string, { kind: SourceKind; count: number; codes: string[] }>();
    const byPillar: Record<string, { OFFICIAL: number; DERIVED: number; MANUAL: number; total: number }> = {};
    const kindTotals = { OFFICIAL: 0, DERIVED: 0, MANUAL: 0 };

    (auditRows || []).forEach((r) => {
      const { kind, sourceName } = classifyRow(r);
      kindTotals[kind] += 1;
      const key = `${kind}::${sourceName}`;
      const entry = sources.get(key) || { kind, count: 0, codes: [] };
      entry.count += 1;
      if (entry.codes.length < 8 && r.indicator_code) entry.codes.push(r.indicator_code);
      sources.set(key, entry);

      const pillar = String(r.pillar || 'OUTROS').trim().toUpperCase();
      if (!byPillar[pillar]) byPillar[pillar] = { OFFICIAL: 0, DERIVED: 0, MANUAL: 0, total: 0 };
      byPillar[pillar][kind] += 1;
      byPillar[pillar].total += 1;
    });

    const sourceList = Array.from(sources.entries())
      .map(([key, v]) => ({ key, name: key.split('::')[1], ...v }))
      .sort((a, b) => b.count - a.count);

    return { sourceList, byPillar, kindTotals, total: (auditRows || []).length };
  }, [auditRows]);

  if (!lineage.total) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-40" />
          A linhagem dos dados estará disponível após o recálculo do diagnóstico.
        </CardContent>
      </Card>
    );
  }

  const pillarKeys = pillarScores.length
    ? pillarScores.map((p) => String(p.pillar).trim().toUpperCase())
    : Object.keys(lineage.byPillar);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Linhagem dos Dados (Data Lineage)
          </CardTitle>
          <CardDescription>
            Rastreio visual desde a fonte original até o score final do diagnóstico — {lineage.total} indicadores processados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 4-column flow: Sources → Indicators by kind → Pillars → Score */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_auto_1.1fr_auto_1fr_auto_0.8fr] gap-3 lg:gap-2 items-stretch">
            {/* Col 1 — Fontes */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Fontes
              </p>
              <div className="space-y-1.5 max-h-[420px] overflow-auto pr-1">
                {lineage.sourceList.map((s) => {
                  const meta = SOURCE_META[s.kind];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={s.key}
                      className={`rounded-lg border px-2.5 py-2 ${meta.tone} flex items-center gap-2`}
                      title={s.codes.join(', ')}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-medium truncate flex-1">{s.name}</span>
                      <span className="text-[10px] tabular-nums font-bold opacity-80">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArrowConnector />

            {/* Col 2 — Indicadores agrupados por tipo */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Indicadores
              </p>
              <div className="space-y-2">
                {(['OFFICIAL', 'DERIVED', 'MANUAL'] as SourceKind[]).map((k) => {
                  const meta = SOURCE_META[k];
                  const Icon = meta.icon;
                  const count = lineage.kindTotals[k];
                  const pct = lineage.total > 0 ? Math.round((count / lineage.total) * 100) : 0;
                  return (
                    <div
                      key={k}
                      className={`rounded-lg border ${meta.tone} p-3`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-semibold">{meta.label}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums">{count}</span>
                        <span className="text-[10px] opacity-70">indicadores · {pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-background/60 overflow-hidden">
                        <div
                          className="h-full bg-current opacity-70 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArrowConnector />

            {/* Col 3 — Pilares */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Pilares
              </p>
              <div className="space-y-2">
                {pillarKeys.map((pk) => {
                  const stats = lineage.byPillar[pk] || { OFFICIAL: 0, DERIVED: 0, MANUAL: 0, total: 0 };
                  const score = pillarScores.find((p) => p.pillar === pk)?.score;
                  return (
                    <div key={pk} className="rounded-lg border bg-card p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">{pk}</span>
                        {score !== undefined && (
                          <Badge variant="outline" className="ml-auto text-[10px] tabular-nums">
                            {Math.round(score * 100)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2 truncate">
                        {PILLAR_LABEL[pk] || pk}
                      </p>
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        {(['OFFICIAL', 'DERIVED', 'MANUAL'] as SourceKind[]).map((k) => {
                          const pct = stats.total > 0 ? (stats[k] / stats.total) * 100 : 0;
                          if (pct === 0) return null;
                          const bg =
                            k === 'OFFICIAL'
                              ? 'bg-emerald-500'
                              : k === 'DERIVED'
                                ? 'bg-blue-500'
                                : 'bg-amber-500';
                          return <div key={k} className={bg} style={{ width: `${pct}%` }} title={`${k}: ${stats[k]}`} />;
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {stats.total} indicadores
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <ArrowConnector />

            {/* Col 4 — Score final */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Resultado
              </p>
              <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 h-full flex flex-col items-center justify-center text-center shadow-[0_0_24px_hsl(var(--primary)/0.15)]">
                <Gauge className="h-6 w-6 text-primary mb-1.5" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Score Final
                </span>
                <span className="text-3xl font-bold tabular-nums text-primary mt-1">
                  {finalScore !== null && finalScore !== undefined
                    ? `${Math.round(finalScore * 100)}%`
                    : '—'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-2">
                  Média ponderada dos pilares
                </span>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-6 pt-4 border-t flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="font-medium">Legenda:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Oficial (IBGE, CADASTUR, STN…)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Derivado (cálculo interno)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Manual (equipe local)
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ArrowConnector() {
  return (
    <div className="hidden lg:flex items-center justify-center text-muted-foreground/50">
      <ArrowRight className="h-5 w-5" />
    </div>
  );
}