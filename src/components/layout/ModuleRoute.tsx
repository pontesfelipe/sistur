import { Navigate } from "react-router-dom";
import { useOrgModulesContext, ModuleKey } from "@/contexts/OrgModulesContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ModuleRouteProps {
  module: ModuleKey;
  children: React.ReactNode;
  /** Se passado, redireciona para essa rota em vez de mostrar tela de bloqueio. */
  fallbackTo?: string;
}

/**
 * Bloqueia rotas quando o módulo está desabilitado no Empacotamento ERP.
 * ADMIN sempre passa. Default = habilitado.
 */
export function ModuleRoute({ module, children, fallbackTo }: ModuleRouteProps) {
  const { isModuleEnabled, loading } = useOrgModulesContext();

  if (loading) return <>{children}</>; // não bloqueia durante carregamento

  if (!isModuleEnabled(module)) {
    if (fallbackTo) return <Navigate to={fallbackTo} replace />;
    return (
      <AppLayout title="Módulo indisponível">
        <div className="max-w-xl mx-auto py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Módulo não habilitado
              </CardTitle>
              <CardDescription>
                Este módulo não está incluído no pacote contratado pela sua organização.
                Entre em contato com o administrador para solicitar a ativação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return <>{children}</>;
}