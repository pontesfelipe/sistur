import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  BarChart3,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  HelpCircle,
  MessageCircleQuestion,
  BookMarked,
  Activity,
  Menu,
  Bot,
  MessageSquarePlus,
} from 'lucide-react';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';

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
  { name: 'Monitoramento ERP', href: '/erp', icon: Activity, requiresERP: true },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3, requiresERP: true },
  { name: 'SISTUR EDU', href: '/edu', icon: GraduationCap, requiresEDU: true },
  { name: 'Relatórios', href: '/relatorios', icon: FileText, requiresERP: true },
  { name: 'Professor Beni', href: '/professor-beni', icon: Bot },
  { name: 'Metodologia', href: '/metodologia', icon: BookMarked },
];

const bottomNavigation: NavItem[] = [
  { name: 'FAQ', href: '/faq', icon: MessageCircleQuestion },
  { name: 'Ajuda', href: '/ajuda', icon: HelpCircle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, requiresAdmin: true },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isProfessor, hasERPAccess, hasEDUAccess } = useProfile();

  // Determine the home route based on user access
  const homeRoute = (hasERPAccess || isAdmin) ? '/' : '/edu';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    onOpenChange(false);
    navigate('/auth');
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

  const filterNavItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (item.requiresAdmin && !isAdmin) return false;
      if (item.requiresProfessor && !isProfessor && !isAdmin) return false;
      if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
      if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
      return true;
    });
  };

  const filteredNavigation = filterNavItems(navigation);
  const filteredBottomNavigation = bottomNavigation.filter((item) => {
    if (item.requiresAdmin && !isAdmin) return false;
    if (item.requiresProfessor && !isProfessor && !isAdmin) return false;
    if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
    if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
    return true;
  });

  const NavItem = ({ item }: { item: typeof navigation[0] }) => {
    const isActive = location.pathname === item.href || 
      (item.href !== '/' && location.pathname.startsWith(item.href));
    
    return (
      <SheetClose asChild>
        <Link
          to={item.href}
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium text-sm">{item.name}</span>
        </Link>
      </SheetClose>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 bg-background">
        {/* Logo */}
        <SheetHeader className="flex h-16 items-center px-4 border-b border-border">
          <SheetClose asChild>
            <Link to={homeRoute} className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">S</span>
              </div>
              <span className="font-display font-bold text-lg">SISTUR</span>
            </Link>
          </SheetClose>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
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
