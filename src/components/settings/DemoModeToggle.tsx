import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useProfile } from '@/hooks/useProfile';
import { Database, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function DemoModeToggle() {
  const { isAdmin, isViewingDemoData, toggleDemoMode, loading } = useProfile();
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    setToggling(true);
    const result = await toggleDemoMode(enabled);
    setToggling(false);
    
    if (result.success) {
      if (enabled) {
        toast.success('Modo Demo ativado! Você está visualizando dados de demonstração.');
      } else {
        toast.success('Modo Demo desativado. Visualizando dados da sua organização.');
      }
      // Reload the page to refresh all data
      window.location.reload();
    } else {
      toast.error('Erro ao alterar modo: ' + result.error);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isViewingDemoData ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Modo Demonstração
              {isViewingDemoData && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  <Eye className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Visualize dados de demonstração do SISTUR com diagnósticos pré-configurados
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="demo-mode" className="font-medium">
              Visualizar Dataset Demo
            </Label>
            <p className="text-sm text-muted-foreground">
              {isViewingDemoData 
                ? 'Você está visualizando dados de demonstração (Gramado, Bonito, Itanhaém)'
                : 'Ative para visualizar dados de demonstração com diagnósticos completos'
              }
            </p>
          </div>
          <Switch
            id="demo-mode"
            checked={isViewingDemoData}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>
        
        {isViewingDemoData && (
          <div className="mt-4 p-3 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Atenção:</strong> Os dados exibidos são de demonstração. 
              Para criar seus próprios diagnósticos, desative o modo demo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}