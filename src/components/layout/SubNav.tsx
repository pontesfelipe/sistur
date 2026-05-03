import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SubNavItem {
  name: string;
  href: string;
  icon?: LucideIcon;
  exact?: boolean;
}

interface SubNavProps {
  items: SubNavItem[];
  className?: string;
}

/**
 * Sticky horizontal tab bar used inside grouped pages (EDU, Ajuda).
 * Lets us consolidate sidebar entries while keeping every existing route intact.
 */
export function SubNav({ items, className }: SubNavProps) {
  const { pathname } = useLocation();
  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-4 sm:-mx-6 mb-4 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className,
      )}
    >
      <nav className="flex gap-1 overflow-x-auto scrollbar-thin py-2">
        {items.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.exact}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}