interface EventLogProps {
  log: string[];
}

export function EventLog({ log }: EventLogProps) {
  if (log.length === 0) return null;

  const recent = log.slice(-5).reverse();

  return (
    <div className="bg-card/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
      <h3 className="text-xs font-bold text-muted-foreground mb-2">📜 Histórico</h3>
      <div className="space-y-1">
        {recent.map((entry, i) => (
          <p key={i} className="text-xs text-foreground/80" style={{ opacity: 1 - i * 0.15 }}>
            {entry}
          </p>
        ))}
      </div>
    </div>
  );
}
