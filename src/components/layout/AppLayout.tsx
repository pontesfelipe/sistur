import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileSidebar } from './MobileSidebar';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
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
        />
        <main className="p-3 sm:p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
