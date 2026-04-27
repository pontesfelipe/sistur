/**
 * MandalaDestino — Visual representation of the SISTUR diagnostic
 * as a Mandala (Mario Beni, 2007) extended with the
 * Mandala da Sustentabilidade no Turismo (Tasso et al., 2024).
 *
 * Shows the 3 systemic conjuntos (RA / OE / AO) as concentric arcs,
 * with their subsystems labeled radially. When `expandWithMandala`
 * is true, the outer ring shows the MST extra subsystems (Tecnologia,
 * Inclusão, TBC, Sensibilização).
 */
import { cn } from '@/lib/utils';
import type { Pillar, Severity } from '@/types/sistur';
import { Sparkles } from 'lucide-react';

interface PillarScore {
  pillar: Pillar;
  score: number;
  severity: Severity;
}

interface MandalaDestinoProps {
  pillarScores: PillarScore[];
  expandWithMandala?: boolean;
  destinationName?: string;
  className?: string;
}

// Subsystems per Mario Beni (2007) — Análise Estrutural do Turismo
const PILLAR_SUBSYSTEMS: Record<Pillar, string[]> = {
  RA: ['Ecológico', 'Social', 'Econômico', 'Cultural'],
  OE: ['Superestrutura', 'Infraestrutura'],
  AO: ['Mercado', 'Oferta', 'Demanda', 'Distribuição'],
};

// MST extra dimensions (Tasso, Silva & Nascimento, 2024)
const MST_EXTRA_DIMENSIONS = [
  'Tecnologia',
  'Inclusão',
  'TBC',
  'Sensibilização',
];

const PILLAR_LABEL: Record<Pillar, string> = {
  RA: 'Relações Ambientais',
  OE: 'Organização Estrutural',
  AO: 'Ações Operacionais',
};

const PILLAR_COLOR_VAR: Record<Pillar, string> = {
  RA: 'hsl(var(--pillar-ra))',
  OE: 'hsl(var(--pillar-oe))',
  AO: 'hsl(var(--pillar-ao))',
};

const SEVERITY_OPACITY: Record<Severity, number> = {
  EXCELENTE: 1,
  FORTE: 1,
  BOM: 1,
  MODERADO: 0.75,
  CRITICO: 0.5,
};

// SVG arc helper
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const polarToCartesian = (angle: number) => {
    const a = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };
  const start = polarToCartesian(endAngle);
  const end = polarToCartesian(startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function MandalaDestino({
  pillarScores,
  expandWithMandala = false,
  destinationName,
  className,
}: MandalaDestinoProps) {
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;

  // Pillars are evenly distributed in 120° sectors
  const pillars: Pillar[] = ['RA', 'OE', 'AO'];
  const sectorAngle = 360 / pillars.length;

  // Build a lookup
  const scoreByPillar = new Map<Pillar, PillarScore>();
  pillarScores.forEach(p => scoreByPillar.set(p.pillar, p));

  return (
    <div className={cn('rounded-2xl border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-foreground">
            Mandala do Destino
          </h3>
          {destinationName && (
            <p className="text-sm text-muted-foreground mt-1">{destinationName}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Visão sistêmica baseada em Mario Beni (2007)
            {expandWithMandala && ' + MST (Tasso et al., 2024)'}
          </p>
        </div>
        {expandWithMandala && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground border border-border">
            <Sparkles className="h-3 w-3" />
            🌀 MST
          </span>
        )}
      </div>

      <div className="flex justify-center">
        <svg
          width="100%"
          viewBox={`0 0 ${size} ${size}`}
          style={{ maxWidth: size }}
          className="overflow-visible"
        >
          {/* Outer guide ring (ambient) */}
          <circle
            cx={cx}
            cy={cy}
            r={220}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="2 4"
          />

          {/* MST outer ring labels (only if expanded) */}
          {expandWithMandala &&
            MST_EXTRA_DIMENSIONS.map((label, i) => {
              const angle = (i / MST_EXTRA_DIMENSIONS.length) * 360 - 90;
              const r = 230;
              const x = cx + r * Math.cos((angle * Math.PI) / 180);
              const y = cy + r * Math.sin((angle * Math.PI) / 180);
              return (
                <text
                  key={`mst-${label}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill="hsl(var(--accent-foreground))"
                  className="font-sans"
                >
                  🌀 {label}
                </text>
              );
            })}

          {/* Pillar sectors (3 arcs) */}
          {pillars.map((pillar, i) => {
            const startAngle = i * sectorAngle;
            const endAngle = startAngle + sectorAngle;
            const score = scoreByPillar.get(pillar);
            const fillColor = PILLAR_COLOR_VAR[pillar];
            const opacity = score ? SEVERITY_OPACITY[score.severity] : 0.25;
            const radius = 180;

            // Arc segment as a wedge (filled sector)
            const polarToCartesian = (angle: number, r: number) => {
              const a = ((angle - 90) * Math.PI) / 180;
              return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
            };
            const start = polarToCartesian(startAngle, radius);
            const end = polarToCartesian(endAngle, radius);
            const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
            const sectorPath = `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;

            // Pillar score arc (proportional to score) — fills from center outward
            const scoreRadius = score ? Math.max(score.score * radius, 1) : 0;
            const scoreEnd = polarToCartesian(endAngle, scoreRadius);
            const scoreStart = polarToCartesian(startAngle, scoreRadius);
            const scoreSectorPath = `M ${cx} ${cy} L ${scoreStart.x} ${scoreStart.y} A ${scoreRadius} ${scoreRadius} 0 ${largeArc} 1 ${scoreEnd.x} ${scoreEnd.y} Z`;

            // Mid-angle for label
            const midAngle = startAngle + sectorAngle / 2;
            const labelPos = polarToCartesian(midAngle, 200);

            return (
              <g key={pillar}>
                {/* Sector outline */}
                <path
                  d={sectorPath}
                  fill="hsl(var(--muted))"
                  fillOpacity="0.15"
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
                {/* Filled score area */}
                <path
                  d={scoreSectorPath}
                  fill={fillColor}
                  fillOpacity={opacity}
                  stroke={fillColor}
                  strokeWidth="2"
                />
                {/* Pillar label */}
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill={fillColor}
                  className="font-display"
                >
                  {pillar}
                </text>

                {/* Subsystems labels along the arc */}
                {PILLAR_SUBSYSTEMS[pillar].map((sub, j) => {
                  const subCount = PILLAR_SUBSYSTEMS[pillar].length;
                  const subAngle = startAngle + ((j + 0.5) / subCount) * sectorAngle;
                  const subPos = polarToCartesian(subAngle, 155);
                  return (
                    <text
                      key={`${pillar}-${sub}`}
                      x={subPos.x}
                      y={subPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="10"
                      fill="hsl(var(--foreground))"
                      fillOpacity="0.85"
                      className="font-sans"
                    >
                      {sub}
                    </text>
                  );
                })}
              </g>
            );
          })}

          {/* Center disc with overall score */}
          <circle
            cx={cx}
            cy={cy}
            r={42}
            fill="hsl(var(--background))"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fontWeight="600"
            fill="hsl(var(--muted-foreground))"
          >
            SISTUR
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="13"
            fontWeight="700"
            fill="hsl(var(--foreground))"
          >
            {pillarScores.length > 0
              ? `${Math.round(
                  (pillarScores.reduce((a, b) => a + b.score, 0) / pillarScores.length) * 100,
                )}%`
              : '—'}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        {pillars.map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: PILLAR_COLOR_VAR[p] }}
            />
            <span className="font-medium text-foreground">{p}</span>
            <span>— {PILLAR_LABEL[p]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
