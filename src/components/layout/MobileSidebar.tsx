import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  BarChart3,
  Upload,
  GraduationCap,
  FileText,
  Settings,
  LogOut,
  BookOpen,
  HelpCircle,
  MessageCircleQuestion,
  BookMarked,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Destinos', href: '/destinos', icon: MapPin },
  { name: 'Diagnósticos', href: '/diagnosticos', icon: ClipboardList },
  { name: 'Monitoramento ERP', href: '/erp', icon: Activity },
  { name: 'Indicadores', href: '/indicadores', icon: BarChart3 },
  { name: 'Importações', href: '/importacoes', icon: Upload },
  { name: 'SISTUR EDU', href: '/edu', icon: GraduationCap },
  { name: 'Admin Cursos', href: '/admin/cursos', icon: BookOpen },
  { name: 'Relatórios', href: '/relatorios', icon: FileText },
  { name: 'Metodologia', href: '/metodologia', icon: BookMarked },
];

const bottomNavigation = [
  { name: 'FAQ', href: '/faq', icon: MessageCircleQuestion },
  { name: 'Ajuda', href: '/ajuda', icon: HelpCircle },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
];

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    onOpenChange(false);
    navigate('/auth');
  };

  const handleNavClick = () => {
    onOpenChange(false);
  };

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
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-sm">S</span>
            </div>
            <span className="font-display font-bold text-lg">SISTUR</span>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* Bottom navigation */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          {bottomNavigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
          
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
