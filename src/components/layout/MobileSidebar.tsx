import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useLicense } from '@/contexts/LicenseContext';
import { useForumNotifications, useMarkForumAsSeen } from '@/hooks/useForumNotifications';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  HelpCircle,
  MessageCircleQuestion,
  BookMarked,
  ScrollText,
  BookOpen,
  Menu,
  Bot,
  MessageSquarePlus,
  MessageSquare,
  FolderKanban,
  Gamepad2,
  CreditCard,
  Lock,
  Award,
  Map,
  Sparkles,
  HelpingHand,
  Shield,
} from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { useMemo, useCallback, useEffect } from 'react';
import { useHaptic } from '@/hooks/useHaptic';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

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

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, requiresERP: true },
  { name: 'Diagnósticos', href: '/diagnosticos', icon: ClipboardList, requiresERP: true },
  { name: 'Projetos', href: '/projetos', icon: FolderKanban, requiresERP: true },
  
  { name: 'SISTUR EDU', href: '/edu', icon: GraduationCap, requiresEDU: true },
  { name: 'Trilhas', href: '/edu/trilhas', icon: Map, requiresEDU: true },
  { name: 'Minhas Provas', href: '/edu/historico', icon: ScrollText, requiresEDU: true },
  { name: 'Meus Certificados', href: '/certificados', icon: Award, requiresEDU: true },
  { name: 'Treinamento Sob Demanda', href: '/edu/solicitacoes', icon: Sparkles, requiresEDU: true },
  { name: 'Gestão de Treinamentos', href: '/professor', icon: BookOpen, requiresProfessor: true },
  { name: 'Quizzes', href: '/admin/quizzes', icon: HelpingHand, requiresAdmin: true },
  { name: 'Admin EDU', href: '/admin/edu', icon: Shield, requiresAdmin: true },
  { name: 'Relatórios', href: '/relatorios', icon: FileText, requiresERP: true, requiredFeature: 'reports' },
  { name: 'Professor Beni', href: '/professor-beni', icon: Bot },
  { name: 'Social Turismo', href: '/forum', icon: MessageSquare },
  { name: 'Metodologia', href: '/metodologia', icon: BookMarked, requiresAdmin: true },
  { name: 'Jogos Educacionais', href: '/game', icon: Gamepad2 },
];

const bottomNavigation: NavItem[] = [
  { name: 'Planos', href: '/assinatura', icon: CreditCard },
  { name: 'FAQ', href: '/faq', icon: MessageCircleQuestion },
  { name: 'Ajuda & Tutorial', href: '/ajuda', icon: HelpCircle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

// Static items that always show
const staticNavItems = navigation.filter(item => 
  !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin
);

const staticBottomNavItems = bottomNavigation.filter(item =>
  !item.requiresERP && !item.requiresEDU && !item.requiresProfessor && !item.requiresAdmin
);

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isProfessor, hasERPAccess, hasEDUAccess, initialized } = useProfileContext();
  const { hasFeature } = useLicense();
  const { data: forumNotifications } = useForumNotifications();
  const markForumAsSeen = useMarkForumAsSeen();
  const { lightTap, selection } = useHaptic();

  // Determine the home route based on user access
  const homeRoute = (hasERPAccess || isAdmin) ? '/' : '/edu';

  // Mark forum as seen when navigating to it
  useEffect(() => {
    if (location.pathname === '/forum') {
      markForumAsSeen.mutate();
    }
  }, [location.pathname]);

  // Swipe to close sidebar
  const handleSwipeClose = useCallback(() => {
    lightTap();
    onOpenChange(false);
  }, [lightTap, onOpenChange]);

  const { bind: swipeBind } = useSwipeGesture({
    onSwipeLeft: handleSwipeClose,
    threshold: 50,
    preventScroll: true,
  });

  const handleSignOut = async () => {
    lightTap();
    await signOut();
    toast.success('Você saiu da sua conta');
    onOpenChange(false);
    navigate('/auth');
  };

  const handleNavClick = () => {
    selection();
    onOpenChange(false);
  };

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

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/' && location.pathname.startsWith(item.href));
    
    const isLocked = !isAdmin && item.requiredFeature && !hasFeature(item.requiredFeature);
    
    // Show badge for forum notifications (only when count > 0)
    const showBadge = item.href === '/forum' && (forumNotifications?.unreadCount ?? 0) > 0;
    
    return (
      <SheetClose asChild>
        <Link
          to={isLocked ? '/assinatura' : item.href}
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-200 touch-target active:scale-[0.98]',
            isLocked
              ? 'text-muted-foreground/50'
              : isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted active:bg-muted/80'
          )}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium text-sm flex-1">{item.name}</span>
          {isLocked && (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
          )}
          {showBadge && !isLocked && (
            <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
              {forumNotifications.unreadCount > 99 ? '99+' : forumNotifications.unreadCount}
            </Badge>
          )}
        </Link>
      </SheetClose>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-72 p-0 bg-background"
        {...swipeBind()}
      >
        {/* Logo */}
        <SheetHeader className="flex h-16 items-center px-4 border-b border-border">
          <SheetClose asChild>
            <Link to={homeRoute} className="flex items-center gap-2" onClick={() => selection()}>
              <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">S</span>
              </div>
              <span className="font-display font-bold text-lg">SISTUR</span>
            </Link>
          </SheetClose>
        </SheetHeader>

        {/* Navigation - with touch-friendly spacing */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)] overscroll-contain">
          {filteredNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          {filteredBottomNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          
          {/* Feedback button */}
          <FeedbackDialog
            trigger={
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-3 py-3 h-auto text-foreground hover:bg-muted"
              >
                <MessageSquarePlus className="h-5 w-5" />
                <span className="font-medium text-sm">Feedback</span>
              </Button>
            }
          />
          
          {/* Sign Out */}
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 px-3 py-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm">Sair</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function MobileMenuTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden"
      onClick={onClick}
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}
