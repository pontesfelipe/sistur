import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { useLicense } from '@/contexts/LicenseContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectStudentsToEdu?: boolean;
  skipLicenseCheck?: boolean;
}

export function ProtectedRoute({ children, redirectStudentsToEdu = true, skipLicenseCheck = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { 
    needsOnboarding, 
    awaitingApproval, 
    initialized,
    profile,
    isEstudante,
    hasERPAccess,
    isAdmin 
  } = useProfileContext();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useTermsAcceptance();
  const { isLicenseValid, initialized: licenseInit, loading: licenseLoading } = useLicense();

  // Only show full-screen loading on truly initial app load (no data yet), not on navigation
  const isInitialLoad = (loading && user === null) || (!initialized && profile === null);
  const isWaitingForData = !!user && !initialized;
  const isWaitingForTerms = !!user && termsLoading && !hasAcceptedTerms;
  const isWaitingForLicense = !!user && !skipLicenseCheck && !licenseInit;

  if (isInitialLoad || isWaitingForData || isWaitingForTerms || isWaitingForLicense) {
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

  // Check terms acceptance before anything else
  if (!hasAcceptedTerms) {
    return <Navigate to="/termos" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (awaitingApproval) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check license - redirect to subscription if no valid license (admins bypass)
  if (!skipLicenseCheck && !isAdmin && !isLicenseValid) {
    return <Navigate to="/assinatura" replace />;
  }

  // Redirect students to EDU (they shouldn't see ERP dashboard)
  if (redirectStudentsToEdu && isEstudante && !hasERPAccess && !isAdmin) {
    return <Navigate to="/edu" replace />;
  }

  return <>{children}</>;
}
