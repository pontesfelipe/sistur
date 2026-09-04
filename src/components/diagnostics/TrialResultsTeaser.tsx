import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, Leaf, Building2, Cog } from 'lucide-react';

const PILLARS = [
  { key: 'RA', label: 'Relações Ambientais', icon: Leaf, width: '72%' },
  { key: 'OE', label: 'Organização Estrutural', icon: Building2, width: '48%' },
  { key: 'AO', label: 'Ações Operacionais', icon: Cog, width: '61%' },
];

/**
 * Teaser de resultados do trial por consumo (Fase 4).
 * Organizações em teste executam 1 diagnóstico, mas o resultado
 * completo fica bloqueado até a contratação de um plano.
 */
export function TrialResultsTeaser() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          {/* Prévia borrada dos pilares */}
          <div className="p-8 space-y-6 blur-md select-none pointer-events-none" aria-hidden>
            <div className="h-6 w-56 bg-muted rounded" />
            {PILLARS.map((p) => (
              <div key={p.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <p.icon className="h-4 w-4 text-muted-foreground" />
                  <div className="h-4 w-44 bg-muted rounded" />
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: p.width }} />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-4 pt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg" />
              ))}
            </div>
          </div>

          {/* Overlay de bloqueio */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="max-w-md text-center space-y-4 p-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-display font-semibold">
                Diagnóstico calculado com sucesso
              </h3>
              <p className="text-sm text-muted-foreground">
                Sua rodada de teste foi concluída. Os resultados completos — scores dos pilares
                RA, OE e AO, gargalos, prescrições EDU e relatórios — ficam disponíveis
                ao contratar um plano.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button asChild>
                  <Link to="/assinatura">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Ver planos e liberar resultados
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/edu">Conhecer o SISTUR EDU</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
