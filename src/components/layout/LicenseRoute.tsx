import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useLicense } from '@/contexts/LicenseContext';
import { useTermsAcceptance } from '@/hooks/useTermsAcceptance';
import { Loader2 } from 'lucide-react';

interface LicenseRouteProps {
  children: React.ReactNode;
  requiredFeature?: string;
  allowExpired?: boolean;
}

export function LicenseRoute({ children, requiredFeature, allowExpired = false }: LicenseRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, initialized: profileInit } = useProfileContext();
  const { loading: licenseLoading, initialized: licenseInit, isLicenseValid, hasFeature } = useLicense();
  const { hasAccepted: hasAcceptedTerms, isLoading: termsLoading } = useTermsAcceptance();

  const isInitialLoad = (authLoading && user === null) || !profileInit || !licenseInit || (!!user && termsLoading);

  if (isInitialLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando licença...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAcceptedTerms) return <Navigate to="/termos" replace />;
  if (isAdmin) return <>{children}</>;
  if (!isLicenseValid && !allowExpired) return <Navigate to="/assinatura" replace />;
  if (requiredFeature && !hasFeature(requiredFeature)) return <Navigate to="/assinatura" replace />;

  return <>{children}</>;
}
