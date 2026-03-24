import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { useLicense } from '@/contexts/LicenseContext';
import { Loader2 } from 'lucide-react';

interface LicenseRouteProps {
  children: React.ReactNode;
  /** Optional feature key to check (e.g. 'reports', 'integrations') */
  requiredFeature?: string;
  /** If true, allows access even with expired trial (for pages like subscription) */
  allowExpired?: boolean;
}

export function LicenseRoute({ children, requiredFeature, allowExpired = false }: LicenseRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, initialized: profileInit } = useProfileContext();
  const { loading: licenseLoading, initialized: licenseInit, isLicenseValid, hasFeature } = useLicense();

  const isInitialLoad = (authLoading && user === null) || !profileInit || !licenseInit;

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Admins always have access
  if (isAdmin) {
    return <>{children}</>;
  }

  // If license is expired and not allowExpired, redirect to subscription page
  if (!isLicenseValid && !allowExpired) {
    return <Navigate to="/assinatura" replace />;
  }

  // Check specific feature access
  if (requiredFeature && !hasFeature(requiredFeature)) {
    return <Navigate to="/assinatura" replace />;
  }

  return <>{children}</>;
}
