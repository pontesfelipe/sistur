import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileSidebar } from './MobileSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { TrialBanner } from '@/components/TrialBanner';
import { useTrialNotifications } from '@/hooks/useTrialNotifications';
import { cn } from '@/lib/utils';
import { SubNav, type SubNavItem } from './SubNav';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  subNav?: SubNavItem[];
}

export function AppLayout({ children, title, subtitle, actions, subNav }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useTrialNotifications();

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Pular para o conteúdo
      </a>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      
      <div className="md:pl-64 transition-all duration-300">
        <TrialBanner />
        <AppHeader
          title={title}
          subtitle={subtitle}
          onMobileMenuClick={() => setMobileOpen(true)}
          actions={actions}
        />
        <main id="main-content" className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 animate-in fade-in-0 duration-300 ease-out scroll-momentum" role="main">
          {subNav && subNav.length > 0 && <SubNav items={subNav} />}
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
    </div>
  );
}
