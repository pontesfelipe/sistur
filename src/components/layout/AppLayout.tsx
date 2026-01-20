import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileSidebar } from './MobileSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function AppLayout({ children, title, subtitle, actions }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      
      {/* Mobile Sidebar */}
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
      
      <div className="md:pl-64 transition-all duration-300">
        <AppHeader 
          title={title} 
          subtitle={subtitle} 
          onMobileMenuClick={() => setMobileOpen(true)}
          actions={actions}
        />
        <main className="p-3 sm:p-4 md:p-6 pb-20 md:pb-6 animate-in fade-in-0 duration-300 ease-out scroll-momentum">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMenuClick={() => setMobileOpen(true)} />
    </div>
  );
}
