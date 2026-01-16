import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { Loader2 } from 'lucide-react';

interface ERPRouteProps {
  children: React.ReactNode;
}

export function ERPRoute({ children }: ERPRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasERPAccess, isAdmin, initialized, needsOnboarding, awaitingApproval, profile } = useProfileContext();

  // Only show loading on initial load, not on navigation between routes
  const isInitialLoad = (authLoading && user === null) || (!initialized && profile === null);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl gradient-hero flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-display font-bold text-xl">S</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (awaitingApproval) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check ERP access
  if (!hasERPAccess) {
    return <Navigate to="/edu" replace />;
  }

  return <>{children}</>;
}
