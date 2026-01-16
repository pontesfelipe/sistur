import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface EduRouteProps {
  children: React.ReactNode;
  requireProfessor?: boolean;
}

export function EduRoute({ children, requireProfessor = false }: EduRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasEDUAccess, isProfessor, isAdmin, loading: profileLoading, needsOnboarding, awaitingApproval, profile } = useProfile();

  // Only show loading on initial load, not on navigation between routes
  const isInitialLoad = authLoading && user === null;
  const isProfileInitialLoad = profileLoading && profile === null;

  if (isInitialLoad || isProfileInitialLoad) {
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

  // Check if requires professor role
  if (requireProfessor && !isProfessor) {
    return <Navigate to="/edu" replace />;
  }

  // Check EDU access
  if (!hasEDUAccess) {
    // If user is logged in but doesn't have EDU enabled yet,
    // send them to onboarding to pick access rather than bouncing to home.
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
