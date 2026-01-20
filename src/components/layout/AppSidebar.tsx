import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  GraduationCap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  HelpCircle,
  MessageCircleQuestion,
  BookMarked,
  Activity,
  Bot,
  MessageSquarePlus,
  MessageSquare,
  FolderKanban,
} from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiresERP?: boolean;
  requiresEDU?: boolean;
  requiresProfessor?: boolean;
  requiresAdmin?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, requiresERP: true },
  { name: 'Destinos', href: '/destinos', icon: MapPin, requiresERP: true },
  { name: 'Diagnósticos', href: '/diagnosticos', icon: ClipboardList, requiresERP: true },
  { name: 'Projetos', href: '/projetos', icon: FolderKanban, requiresERP: true },
  { name: 'Monitoramento ERP', href: '/erp', icon: Activity, requiresERP: true },
  { name: 'SISTUR EDU', href: '/edu', icon: GraduationCap, requiresEDU: true },
  { name: 'Relatórios', href: '/relatorios', icon: FileText, requiresERP: true },
  { name: 'Professor Beni', href: '/professor-beni', icon: Bot },
  { name: 'Social Turismo', href: '/forum', icon: MessageSquare },
  { name: 'Metodologia', href: '/metodologia', icon: BookMarked },
];

const bottomNavigation: NavItem[] = [
  { name: 'FAQ', href: '/faq', icon: MessageCircleQuestion },
  { name: 'Ajuda', href: '/ajuda', icon: HelpCircle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, requiresAdmin: true },
];

// Static items that always show (no permission check needed)
const staticNavItems = navigation.filter(item => 
  !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin
);

const staticBottomNavItems = bottomNavigation.filter(item =>
  !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin
);

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isProfessor, hasERPAccess, hasEDUAccess, isEstudante, initialized, loading } = useProfileContext();
  const [collapsed, setCollapsed] = useState(false);

  // Determine the home route based on user access
  const homeRoute = (hasERPAccess || isAdmin) ? '/' : '/edu';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth');
  };

  // Memoize filtered items to prevent recalculation
  const filteredNavigation = useMemo(() => {
    if (!initialized) return staticNavItems;
    
    return navigation.filter((item) => {
      if (item.requiresAdmin && !isAdmin) return false;
      if (item.requiresProfessor && !isProfessor && !isAdmin) return false;
      if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
      if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
      return true;
    });
  }, [initialized, isAdmin, isProfessor, hasERPAccess, hasEDUAccess]);

  const filteredBottomNavigation = useMemo(() => {
    if (!initialized) return staticBottomNavItems;
    
    return bottomNavigation.filter((item) => {
      if (item.requiresAdmin && !isAdmin) return false;
      if (item.requiresProfessor && !isProfessor && !isAdmin) return false;
      if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
      if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
      return true;
    });
  }, [initialized, isAdmin, isProfessor, hasERPAccess, hasEDUAccess]);

  const NavItem = ({ item }: { item: NavItem }) => {
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
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <Link to={homeRoute} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-lg text-sidebar-foreground">SISTUR</span>
          </Link>
        )}
        {collapsed && (
          <Link to={homeRoute} className="h-8 w-8 mx-auto rounded-lg gradient-hero flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">S</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        {filteredBottomNavigation.map((item) => (
          <NavItem key={item.name} item={item} />
        ))}
        
        {/* Feedback button */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div>
                <FeedbackDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <MessageSquarePlus className="h-5 w-5" />
                    </Button>
                  }
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Feedback
            </TooltipContent>
          </Tooltip>
        ) : (
          <FeedbackDialog
            trigger={
              <Button
                variant="ghost"
                className="w-full justify-start px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <MessageSquarePlus className="h-5 w-5 mr-3" />
                <span className="text-sm">Feedback</span>
              </Button>
            }
          />
        )}
        
        {/* Sign out button */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Sair
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="text-sm">Sair</span>
          </Button>
        )}
        
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
