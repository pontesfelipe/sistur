import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useForumNotifications, useMarkForumAsSeen } from '@/hooks/useForumNotifications';
import { useHaptic } from '@/hooks/useHaptic';
import {
  LayoutDashboard,
  GraduationCap,
  Bot,
  MessageSquare,
  Menu,
} from 'lucide-react';
import { useMemo, useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  requiresERP?: boolean;
  requiresEDU?: boolean;
  requiresAdmin?: boolean;
}

const bottomNavItems: NavItem[] = [
  { name: 'Início', href: '/', icon: LayoutDashboard, requiresERP: true },
  { name: 'EDU', href: '/edu', icon: GraduationCap, requiresEDU: true },
  { name: 'Beni', href: '/professor-beni', icon: Bot },
  { name: 'Social', href: '/forum', icon: MessageSquare },
];

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const location = useLocation();
  const { isAdmin, hasERPAccess, hasEDUAccess, initialized } = useProfileContext();
  const { data: forumNotifications } = useForumNotifications();
  const markForumAsSeen = useMarkForumAsSeen();
  const { selection } = useHaptic();

  // Mark forum as seen when navigating to it
  useEffect(() => {
    if (location.pathname === '/forum') {
      markForumAsSeen.mutate();
    }
  }, [location.pathname]);

  const filteredItems = useMemo(() => {
    if (!initialized) return bottomNavItems.filter(item => !item.requiresERP && !item.requiresEDU && !item.requiresAdmin);
    
    return bottomNavItems.filter((item) => {
      if (item.requiresAdmin && !isAdmin) return false;
      if (item.requiresERP && !hasERPAccess && !isAdmin) return false;
      if (item.requiresEDU && !hasEDUAccess && !isAdmin) return false;
      return true;
    });
  }, [initialized, isAdmin, hasERPAccess, hasEDUAccess]);

  // Limit to 4 items + menu
  const displayItems = filteredItems.slice(0, 4);

  const handleNavClick = () => {
    selection();
  };

  const handleMenuClick = () => {
    selection();
    onMenuClick();
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {displayItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/' && location.pathname.startsWith(item.href));
          
          // Show badge for forum notifications (only when count > 0)
          const showBadge = item.href === '/forum' && (forumNotifications?.unreadCount ?? 0) > 0;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 touch-target no-tap-highlight mobile-active relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <item.icon className={cn(
                  'h-5 w-5 transition-transform',
                  isActive && 'scale-110'
                )} />
                {showBadge && (
                  <span className="absolute -top-1 -right-1.5 h-4 min-w-4 flex items-center justify-center bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full px-1">
                    {forumNotifications.unreadCount > 9 ? '9+' : forumNotifications.unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
        
        {/* Menu button */}
        <button
          onClick={handleMenuClick}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 touch-target no-tap-highlight mobile-active text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
}
