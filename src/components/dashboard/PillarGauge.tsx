import { cn } from '@/lib/utils';
import type { Pillar, Severity } from '@/types/sistur';
import { PILLAR_INFO, SEVERITY_INFO } from '@/types/sistur';

interface PillarGaugeProps {
  pillar: Pillar;
  score: number;
  severity: Severity;
  isCritical?: boolean;
}

export function PillarGauge({ pillar, score, severity, isCritical }: PillarGaugeProps) {
  const info = PILLAR_INFO[pillar];
  const severityInfo = SEVERITY_INFO[severity];
  const percentage = Math.round(score * 100);
  
  // Calculate stroke dasharray for the gauge
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score * circumference);

  // Color based on severity (traffic light: green=good, yellow=moderate, red=critical)
  const severityColors: Record<Severity, { stroke: string; bg: string }> = {
    BOM: { stroke: 'stroke-severity-good', bg: 'bg-severity-good' },
    MODERADO: { stroke: 'stroke-severity-moderate', bg: 'bg-severity-moderate' },
    CRITICO: { stroke: 'stroke-severity-critical', bg: 'bg-severity-critical' },
  };

  // Pillar indicator colors (for the dot)
  const pillarColors: Record<Pillar, string> = {
    RA: 'bg-pillar-ra',
    OE: 'bg-pillar-oe',
    AO: 'bg-pillar-ao',
  };

  return (
    <div
      className={cn(
        'relative p-6 rounded-xl border bg-card transition-all duration-300 hover:shadow-lg',
        isCritical && 'ring-2 ring-severity-critical ring-offset-2 ring-offset-background'
      )}
    >
      {isCritical && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-severity-critical text-destructive-foreground">
            Ponto Crítico
          </span>
        </div>
      )}

      <div className="flex flex-col items-center">
        {/* Gauge */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className={cn(severityColors[severity].stroke, 'animate-gauge-fill')}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: 'stroke-dashoffset 1s ease-out',
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold text-foreground">
              {percentage}%
            </span>
            <span className={cn('text-xs font-semibold', severityInfo.color)}>
              {severityInfo.label}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', pillarColors[pillar])} />
            <h3 className="font-display font-semibold text-lg text-foreground">
              {info.name}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {info.fullName}
          </p>
        </div>
      </div>
    </div>
  );
}
