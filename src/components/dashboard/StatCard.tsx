import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'warning' | 'success';
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, variant = 'default', className }: StatCardProps) {
  const variants = {
    default: 'bg-card border-border',
    primary: 'bg-primary/5 border-primary/20',
    warning: 'bg-severity-moderate/5 border-severity-moderate/20',
    success: 'bg-severity-good/5 border-severity-good/20',
  };

  const iconVariants = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-severity-moderate/10 text-severity-moderate',
    success: 'bg-severity-good/10 text-severity-good',
  };

  return (
    <div
      className={cn(
        'p-6 rounded-2xl border transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 animate-fade-in group',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide">{title}</p>
          <p className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'text-sm font-semibold flex items-center gap-1',
                trend.isPositive ? 'text-severity-good' : 'text-severity-critical'
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-muted-foreground font-normal ml-1">vs. anterior</span>
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-2xl transition-transform duration-300 group-hover:scale-110', iconVariants[variant])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
