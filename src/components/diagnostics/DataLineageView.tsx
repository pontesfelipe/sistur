import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Database, Calculator, PenLine, Layers, Gauge } from 'lucide-react';
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
  /** Optional catalog used to resolve pillar from indicator_code when auditRows lack it. */
  indicatorCatalogByCode?: Map<string, any>;
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

const KIND_COLOR: Record<SourceKind, string> = {
  OFFICIAL: 'hsl(160 70% 42%)', // emerald
  DERIVED: 'hsl(217 85% 56%)',  // blue
  MANUAL: 'hsl(38 92% 50%)',    // amber
};

const PILLAR_COLOR: Record<string, string> = {
  RA: 'hsl(160 60% 45%)',
  OE: 'hsl(217 80% 55%)',
  AO: 'hsl(280 65% 55%)',
};

function resolvePillar(row: any, catalog?: Map<string, any>): string {
  const direct = row?.pillar ? String(row.pillar).trim().toUpperCase() : '';
  if (direct) return direct;
  if (catalog && row?.indicator_code) {
    const ind = catalog.get(row.indicator_code);
    if (ind?.pillar) return String(ind.pillar).trim().toUpperCase();
  }
  // Fallback heuristic: indicator code prefix (e.g., "ra_…", "oe_…", "ao_…", "igma_ra_…")
  const code = String(row?.indicator_code || '').toLowerCase();
  if (/(^|_)ra(_|$)/.test(code)) return 'RA';
  if (/(^|_)oe(_|$)/.test(code)) return 'OE';
  if (/(^|_)ao(_|$)/.test(code)) return 'AO';
  return 'OUTROS';
}

export function DataLineageView({ auditRows, pillarScores = [], finalScore = null, indicatorCatalogByCode }: Props) {
  const lineage = useMemo(() => {
    const sources = new Map<string, { kind: SourceKind; count: number; codes: string[]; byPillar: Record<string, number> }>();
    const byPillar: Record<string, { OFFICIAL: number; DERIVED: number; MANUAL: number; total: number }> = {};
    const kindTotals = { OFFICIAL: 0, DERIVED: 0, MANUAL: 0 };
    /** kind → pillar → count, used to draw the Indicador → Pilar connections */
    const kindByPillar: Record<SourceKind, Record<string, number>> = {
      OFFICIAL: {}, DERIVED: {}, MANUAL: {},
    };

    (auditRows || []).forEach((r) => {
      const { kind, sourceName } = classifyRow(r);
      kindTotals[kind] += 1;
      const key = `${kind}::${sourceName}`;
      const entry = sources.get(key) || { kind, count: 0, codes: [], byPillar: {} };
      entry.count += 1;
      if (entry.codes.length < 8 && r.indicator_code) entry.codes.push(r.indicator_code);

      const pillar = resolvePillar(r, indicatorCatalogByCode);
      entry.byPillar[pillar] = (entry.byPillar[pillar] || 0) + 1;
      sources.set(key, entry);

      if (!byPillar[pillar]) byPillar[pillar] = { OFFICIAL: 0, DERIVED: 0, MANUAL: 0, total: 0 };
      byPillar[pillar][kind] += 1;
      byPillar[pillar].total += 1;
      kindByPillar[kind][pillar] = (kindByPillar[kind][pillar] || 0) + 1;
    });

    const sourceList = Array.from(sources.entries())
      .map(([key, v]) => ({ key, name: key.split('::')[1], ...v }))
      .sort((a, b) => b.count - a.count);

    return { sourceList, byPillar, kindTotals, kindByPillar, total: (auditRows || []).length };
  }, [auditRows, indicatorCatalogByCode]);

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

  const pillarKeysFromScores = pillarScores.map((p) => String(p.pillar).trim().toUpperCase());
  const pillarKeysFromData = Object.keys(lineage.byPillar);
  const pillarKeys = Array.from(new Set([...pillarKeysFromScores, ...pillarKeysFromData])).filter(Boolean);

  return (
    <LineageDiagram
      lineage={lineage}
      pillarKeys={pillarKeys}
      pillarScores={pillarScores}
      finalScore={finalScore}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Visualization with SVG connectors                                          */
/* -------------------------------------------------------------------------- */

interface DiagramProps {
  lineage: ReturnType<typeof buildEmptyLineage> & {
    sourceList: Array<{ key: string; name: string; kind: SourceKind; count: number; codes: string[]; byPillar: Record<string, number> }>;
    byPillar: Record<string, { OFFICIAL: number; DERIVED: number; MANUAL: number; total: number }>;
    kindTotals: { OFFICIAL: number; DERIVED: number; MANUAL: number };
    kindByPillar: Record<SourceKind, Record<string, number>>;
    total: number;
  };
  pillarKeys: string[];
  pillarScores: PillarScore[];
  finalScore: number | null;
}

function buildEmptyLineage() {
  return {} as any;
}

interface Anchor {
  x: number;
  y: number;
}

function LineageDiagram({ lineage, pillarKeys, pillarScores, finalScore }: DiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const kindRefs = useRef<Map<SourceKind, HTMLDivElement>>(new Map());
  const pillarRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const resultRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [tick, setTick] = useState(0);
  const [hover, setHover] = useState<
    | { type: 'source'; key: string }
    | { type: 'kind'; kind: SourceKind }
    | { type: 'pillar'; pillar: string }
    | null
  >(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      setTick((t) => t + 1);
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Recompute on data change.
    const id = requestAnimationFrame(() => setTick((t) => t + 1));
    return () => cancelAnimationFrame(id);
  }, [lineage, pillarKeys.length]);

  function anchorRight(el: HTMLElement | null | undefined): Anchor | null {
    if (!el || !containerRef.current) return null;
    const c = containerRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.right - c.left, y: r.top - c.top + r.height / 2 };
  }
  function anchorLeft(el: HTMLElement | null | undefined): Anchor | null {
    if (!el || !containerRef.current) return null;
    const c = containerRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top + r.height / 2 };
  }

  function curve(a: Anchor, b: Anchor): string {
    const dx = Math.max(40, (b.x - a.x) * 0.45);
    return `M ${a.x},${a.y} C ${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
  }

  // Build the three sets of connections.
  type Conn = { d: string; w: number; color: string; opacity: number; key: string };
  const connections: Conn[] = useMemo(() => {
    void tick;
    const list: Conn[] = [];
    if (!size.w) return list;

    const maxSourceCount = Math.max(1, ...lineage.sourceList.map((s) => s.count));
    const maxKindCount = Math.max(1, lineage.kindTotals.OFFICIAL, lineage.kindTotals.DERIVED, lineage.kindTotals.MANUAL);

    // 1) Source → Kind
    lineage.sourceList.forEach((s) => {
      const a = anchorRight(sourceRefs.current.get(s.key));
      const b = anchorLeft(kindRefs.current.get(s.kind));
      if (!a || !b) return;
      const w = 1.5 + (s.count / maxSourceCount) * 6;
      const active =
        !hover ||
        (hover.type === 'source' && hover.key === s.key) ||
        (hover.type === 'kind' && hover.kind === s.kind);
      list.push({
        d: curve(a, b),
        w,
        color: KIND_COLOR[s.kind],
        opacity: active ? 0.85 : 0.12,
        key: `s2k-${s.key}`,
      });
    });

    // 2) Kind → Pillar
    (Object.keys(lineage.kindByPillar) as SourceKind[]).forEach((kind) => {
      const perPillar = lineage.kindByPillar[kind];
      Object.entries(perPillar).forEach(([pillar, count]) => {
        const a = anchorRight(kindRefs.current.get(kind));
        const b = anchorLeft(pillarRefs.current.get(pillar));
        if (!a || !b) return;
        const w = 1.5 + ((count as number) / maxKindCount) * 6;
        const active =
          !hover ||
          (hover.type === 'kind' && hover.kind === kind) ||
          (hover.type === 'pillar' && hover.pillar === pillar);
        list.push({
          d: curve(a, b),
          w,
          color: KIND_COLOR[kind],
          opacity: active ? 0.7 : 0.1,
          key: `k2p-${kind}-${pillar}`,
        });
      });
    });

    // 3) Pillar → Result
    pillarKeys.forEach((pk) => {
      const a = anchorRight(pillarRefs.current.get(pk));
      const b = anchorLeft(resultRef.current);
      if (!a || !b) return;
      const stats = lineage.byPillar[pk] || { total: 0 };
      const w = 2 + ((stats.total || 0) / Math.max(1, lineage.total)) * 8;
      const active = !hover || (hover.type === 'pillar' && hover.pillar === pk);
      list.push({
        d: curve(a, b),
        w,
        color: PILLAR_COLOR[pk] || 'hsl(220 15% 55%)',
        opacity: active ? 0.85 : 0.15,
        key: `p2r-${pk}`,
      });
    });

    return list;
  }, [tick, size.w, lineage, pillarKeys, hover]);

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
            Passe o mouse sobre qualquer nó para destacar o fluxo correspondente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative">
            {/* SVG connectors layer */}
            <svg
              className="absolute inset-0 pointer-events-none hidden lg:block"
              width={size.w}
              height={size.h}
              style={{ overflow: 'visible' }}
            >
              {connections.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  fill="none"
                  stroke={c.color}
                  strokeWidth={c.w}
                  strokeOpacity={c.opacity}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-opacity 200ms ease' }}
                />
              ))}
            </svg>

            {/* 4-column flow */}
            <div className="relative grid grid-cols-1 lg:grid-cols-[1.15fr_1fr_1fr_0.85fr] gap-6 lg:gap-16 items-start">
              {/* Col 1 — Fontes */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Fontes ({lineage.sourceList.length})
              </p>
              <div className="space-y-1.5 max-h-[420px] overflow-auto pr-1">
                {lineage.sourceList.map((s) => {
                  const meta = SOURCE_META[s.kind];
                  const Icon = meta.icon;
                  const isHovered = hover?.type === 'source' && hover.key === s.key;
                  return (
                    <div
                      key={s.key}
                      ref={(el) => {
                        if (el) sourceRefs.current.set(s.key, el);
                        else sourceRefs.current.delete(s.key);
                      }}
                      onMouseEnter={() => setHover({ type: 'source', key: s.key })}
                      onMouseLeave={() => setHover(null)}
                      className={`rounded-lg border px-2.5 py-2 ${meta.tone} flex items-center gap-2 cursor-default transition-all ${
                        isHovered ? `ring-2 ${meta.ring} shadow-md` : ''
                      }`}
                      title={s.codes.join(', ')}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-medium flex-1 leading-snug">{s.name}</span>
                      <span className="text-[10px] tabular-nums font-bold opacity-80">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

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
                  const isHovered = hover?.type === 'kind' && hover.kind === k;
                  return (
                    <div
                      key={k}
                      ref={(el) => {
                        if (el) kindRefs.current.set(k, el);
                        else kindRefs.current.delete(k);
                      }}
                      onMouseEnter={() => setHover({ type: 'kind', kind: k })}
                      onMouseLeave={() => setHover(null)}
                      className={`rounded-lg border ${meta.tone} p-3 cursor-default transition-all ${
                        isHovered ? `ring-2 ${meta.ring} shadow-md` : ''
                      }`}
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

            {/* Col 3 — Pilares */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Pilares
              </p>
              <div className="space-y-2">
                {pillarKeys.map((pk) => {
                  const stats = lineage.byPillar[pk] || { OFFICIAL: 0, DERIVED: 0, MANUAL: 0, total: 0 };
                  const score = pillarScores.find((p) => p.pillar === pk)?.score;
                  const isHovered = hover?.type === 'pillar' && hover.pillar === pk;
                  return (
                    <div
                      key={pk}
                      ref={(el) => {
                        if (el) pillarRefs.current.set(pk, el);
                        else pillarRefs.current.delete(pk);
                      }}
                      onMouseEnter={() => setHover({ type: 'pillar', pillar: pk })}
                      onMouseLeave={() => setHover(null)}
                      className={`rounded-lg border bg-card p-3 cursor-default transition-all ${
                        isHovered ? 'ring-2 ring-primary/50 shadow-md' : ''
                      }`}
                      style={{ borderLeft: `4px solid ${PILLAR_COLOR[pk] || 'hsl(220 15% 55%)'}` }}
                    >
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
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{stats.total} indicadores</span>
                        <span className="flex items-center gap-1.5">
                          {stats.OFFICIAL > 0 && <span className="text-emerald-600 dark:text-emerald-400">{stats.OFFICIAL} of.</span>}
                          {stats.DERIVED > 0 && <span className="text-blue-600 dark:text-blue-400">{stats.DERIVED} der.</span>}
                          {stats.MANUAL > 0 && <span className="text-amber-600 dark:text-amber-400">{stats.MANUAL} man.</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Col 4 — Score final */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                Resultado
              </p>
              <div
                ref={resultRef}
                className="rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 flex flex-col items-center justify-center text-center shadow-[0_0_24px_hsl(var(--primary)/0.15)]"
              >
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
                {pillarScores.length > 0 && (
                  <div className="mt-3 w-full space-y-1 border-t pt-2">
                    {pillarScores.map((p) => {
                      const pk = String(p.pillar).trim().toUpperCase();
                      return (
                        <div key={pk} className="flex items-center justify-between text-[10px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: PILLAR_COLOR[pk] || 'hsl(220 15% 55%)' }} />
                            {pk}
                          </span>
                          <span className="tabular-nums font-medium">{Math.round((p.score || 0) * 100)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-8 pt-4 border-t flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
            <span className="ml-auto italic">
              A espessura das linhas é proporcional ao volume de indicadores.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}