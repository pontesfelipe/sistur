import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { Loader2 } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isOrgAdmin, loading: profileLoading, initialized, needsOnboarding, awaitingApproval, profile } = useProfileContext();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useTermsAcceptance();

  const isInitialLoad = (authLoading && user === null) || (!initialized && profile === null) || (!!user && termsLoading);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-xl gradient-hero flex items-center justify-center animate-pulse">
            <span className="text-primary-foreground font-display font-bold text-xl">S</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAcceptedTerms) return <Navigate to="/termos" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (awaitingApproval) return <Navigate to="/pending-approval" replace />;
  if (!isAdmin && !isOrgAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
