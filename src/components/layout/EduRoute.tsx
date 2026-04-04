import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { useLicense } from '@/contexts/LicenseContext';
import { Loader2 } from 'lucide-react';

interface EduRouteProps {
  children: React.ReactNode;
  requireProfessor?: boolean;
}

export function EduRoute({ children, requireProfessor = false }: EduRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasEDUAccess, isProfessor, isAdmin, isOrgAdmin, initialized, needsOnboarding, awaitingApproval, profile } = useProfileContext();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useTermsAcceptance();
  const { isLicenseValid, initialized: licenseInit } = useLicense();

  const isInitialLoad = (authLoading && user === null) || (!initialized && profile === null) || (!!user && termsLoading && !hasAcceptedTerms) || (!!user && !licenseInit);

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

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAcceptedTerms) return <Navigate to="/termos" replace />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (awaitingApproval) return <Navigate to="/pending-approval" replace />;
  if (isAdmin) return <>{children}</>;
  if (!isLicenseValid) return <Navigate to="/assinatura" replace />;
  if (requireProfessor && !isProfessor) return <Navigate to="/edu" replace />;
  if (!hasEDUAccess) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
}
