import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  BarChart3,
  Upload,
  GraduationCap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Destinos', href: '/destinos', icon: MapPin },
  { name: 'Diagnósticos', href: '/diagnosticos', icon: ClipboardList },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3 },
  { name: 'Importações', href: '/importacoes', icon: Upload },
  { name: 'EDU - Cursos', href: '/cursos', icon: GraduationCap },
  { name: 'Relatórios', href: '/relatorios', icon: FileText },
];

const bottomNavigation = [
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/' && location.pathname.startsWith(item.href));
    
    const content = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 flex-shrink-0 transition-transform',
          !isActive && 'group-hover:scale-110'
        )} />
        {!collapsed && (
          <span className="font-medium text-sm truncate">{item.name}</span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground">SISTUR</span>
          </Link>
        )}
        {collapsed && (
          <div className="h-8 w-8 mx-auto rounded-lg gradient-hero flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">S</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {bottomNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
        
        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            !collapsed && 'justify-start px-3'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
