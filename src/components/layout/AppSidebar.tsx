import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useLicense } from '@/contexts/LicenseContext';
import { useForumNotifications, useMarkForumAsSeen } from '@/hooks/useForumNotifications';
import {
  ScrollText,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  GraduationCap,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  HelpCircle,
  MessageCircleQuestion,
  BookMarked,
  BookOpen,
  Bot,
  MessageSquarePlus,
  MessageSquare,
  FolderKanban,
  Gamepad2,
  Shield,
  CreditCard,
  Lock,
  Library,
  Briefcase,
  Lightbulb,
  Award,
  Map,
  Sparkles,
  HelpingHand,
} from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiresERP?: boolean;
  requiresEDU?: boolean;
  requiresProfessor?: boolean;
  requiresAdmin?: boolean;
  requiredFeature?: string;
}

interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'ERP',
    icon: Briefcase,
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, requiresERP: true },
      { name: 'Diagnósticos', href: '/diagnosticos', icon: ClipboardList, requiresERP: true },
      { name: 'Projetos', href: '/projetos', icon: FolderKanban, requiresERP: true },
      { name: 'Relatórios', href: '/relatorios', icon: FileText, requiresERP: true, requiredFeature: 'reports' },
      { name: 'Base de Conhecimento', href: '/base-conhecimento', icon: Library, requiresERP: true },
    ],
  },
  {
    label: 'Educação',
    icon: GraduationCap,
    items: [
      { name: 'SISTUR EDU', href: '/edu', icon: GraduationCap, requiresEDU: true },
      { name: 'Trilhas', href: '/edu/trilhas', icon: Map, requiresEDU: true },
      { name: 'Minhas Provas', href: '/edu/historico', icon: ScrollText, requiresEDU: true },
      { name: 'Meus Certificados', href: '/certificados', icon: Award, requiresEDU: true },
      { name: 'Treinamento Sob Demanda', href: '/edu/solicitacoes', icon: Sparkles, requiresEDU: true },
      { name: 'Gestão de Treinamentos', href: '/professor', icon: BookOpen, requiresProfessor: true },
      { name: 'Admin EDU', href: '/admin/edu', icon: Shield, requiresAdmin: true },
    ],
  },
  {
    label: 'Recursos',
    icon: Lightbulb,
    items: [
      { name: 'Professor Beni', href: '/professor-beni', icon: Bot },
      { name: 'Social Turismo', href: '/forum', icon: MessageSquare },
      { name: 'Jogos Educacionais', href: '/game', icon: Gamepad2 },
      { name: 'Metodologia', href: '/metodologia', icon: BookMarked, requiresAdmin: true },
    ],
  },
];

const bottomNavigation: NavItem[] = [
  { name: 'Planos', href: '/assinatura', icon: CreditCard },
  { name: 'FAQ', href: '/faq', icon: MessageCircleQuestion },
  { name: 'Ajuda & Tutorial', href: '/ajuda', icon: HelpCircle },
  { name: 'Licenças', href: '/admin/licencas', icon: Shield, requiresAdmin: true },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

const staticBottomNavItems = bottomNavigation.filter(item =>
  !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin
);

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isOrgAdmin, isProfessor, isAnalyst, hasERPAccess, hasEDUAccess, isEstudante, initialized, loading } = useProfileContext();
  const { hasFeature, isTrialActive } = useLicense();
  const { data: forumNotifications } = useForumNotifications();
  const markForumAsSeen = useMarkForumAsSeen();
  const [collapsed, setCollapsed] = useState(false);

  // Determine which groups are open. Auto-open the group containing the active route.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const homeRoute = (hasERPAccess || isAdmin) ? '/' : '/edu';

  useEffect(() => {
    if (location.pathname === '/forum') {
      markForumAsSeen.mutate();
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth');
  };

  const canSeeItem = useCallback((item: NavItem) => {
    if (!initialized) {
      return !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin;
    }
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresProfessor && !isProfessor && !isAdmin && !isOrgAdmin && !(hasERPAccess && isAnalyst)) return false;
    if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
    if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
    return true;
  }, [initialized, isAdmin, isOrgAdmin, isAnalyst, isProfessor, hasERPAccess, hasEDUAccess]);

  // Filter groups — only show groups that have at least one visible item
  const filteredGroups = useMemo(() => {
    return navGroups
      .map(group => ({
        ...group,
        items: group.items.filter(canSeeItem),
      }))
      .filter(group => group.items.length > 0);
  }, [canSeeItem]);

  // Auto-open group containing active route
  useEffect(() => {
    const activeGroup = filteredGroups.find(g =>
      g.items.some(item =>
        location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
      )
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.label]: true }));
    }
  }, [location.pathname, filteredGroups]);

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

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/' && location.pathname.startsWith(item.href));
    
    const isLocked = !isAdmin && item.requiredFeature && !hasFeature(item.requiredFeature);
    const showBadge = item.href === '/forum' && (forumNotifications?.unreadCount ?? 0) > 0;
    
    const content = (
      <Link
        to={isLocked ? '/assinatura' : item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
          collapsed ? 'justify-center' : 'pl-9',
          isLocked
            ? 'text-muted-foreground/50 hover:bg-muted/30 cursor-not-allowed'
            : isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-glow'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <div className="relative">
          <item.icon className={cn(
            'h-4.5 w-4.5 flex-shrink-0 transition-transform',
            !isActive && !isLocked && 'group-hover:scale-110'
          )} />
          {showBadge && collapsed && (
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" />
          )}
        </div>
        {!collapsed && (
          <span className="font-medium text-sm truncate flex-1">{item.name}</span>
        )}
        {isLocked && !collapsed && (
          <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        )}
        {showBadge && !collapsed && !isLocked && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
            {(forumNotifications?.unreadCount ?? 0) > 99 ? '99+' : forumNotifications?.unreadCount}
          </Badge>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium flex items-center gap-2">
            {item.name}
            {showBadge && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {(forumNotifications?.unreadCount ?? 0) > 99 ? '99+' : forumNotifications?.unreadCount}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  const BottomNavItem = ({ item }: { item: NavItem }) => {
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
        {!collapsed && <span className="font-medium text-sm truncate">{item.name}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.name}</TooltipContent>
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

      {/* Grouped Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scroll-momentum">
        {filteredGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          const GroupIcon = group.icon;
          const hasActiveItem = group.items.some(item =>
            location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
          );

          if (collapsed) {
            // In collapsed mode, show items flat with their own icons
            return (
              <div key={group.label} className="space-y-0.5 mb-2">
                {group.items.map(item => (
                  <NavItemComponent key={item.name} item={item} />
                ))}
              </div>
            );
          }

          return (
            <div key={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors',
                  hasActiveItem
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-sidebar-foreground'
                )}
              >
                <GroupIcon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown className={cn(
                  'h-3.5 w-3.5 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )} />
              </button>
              <div className={cn(
                'overflow-hidden transition-all duration-200',
                isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              )}>
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map(item => (
                    <NavItemComponent key={item.name} item={item} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        {filteredBottomNavigation.map((item) => (
          <BottomNavItem key={item.name} item={item} />
        ))}
        
        {/* Feedback */}
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
            <TooltipContent side="right" className="font-medium">Feedback</TooltipContent>
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
        
        {/* Sign out */}
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
            <TooltipContent side="right" className="font-medium">Sair</TooltipContent>
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
        
        {/* Collapse toggle */}
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
