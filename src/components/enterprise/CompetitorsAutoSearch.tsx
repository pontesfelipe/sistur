import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, Trophy, ExternalLink, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAutoFillRunner } from '@/lib/autoFillRunner';

interface Props {
  destinationId: string;
  businessName: string;
  location: string;
  propertyType?: string;
  onCaptured?: (count: number) => void;
}

export function CompetitorsAutoSearch({ destinationId, businessName, location, propertyType, onCaptured }: Props) {
  const [loading, setLoading] = useState(false);
  const [competitors, setCompetitors] = useState<any[] | null>(null);

  const run = async () => {
    if (!businessName || !location) {
      toast.error('Informe o nome do estabelecimento e a localização.');
      return;
    }
    setLoading(true);
    setCompetitors(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-competitors', {
        body: { destination_id: destinationId, business_name: businessName, location, property_type: propertyType, limit: 5 },
      });
      if (error) throw error;
      setCompetitors(data?.competitors || []);
      onCaptured?.(data?.count || 0);
      toast.success(`${data?.count || 0} concorrentes identificados`);
    } catch (e: any) {
      toast.error('Erro ao buscar concorrentes: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useAutoFillRunner('competitors', run);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Identifica automaticamente os principais concorrentes no destino com nota, volume de reviews e link da fonte.
        </p>
        <Button onClick={run} disabled={loading || !businessName || !location} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? 'Buscando...' : 'Buscar Concorrentes'}
        </Button>
      </div>

      {competitors && competitors.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            {competitors.map((c, i) => (
              <Card key={i}>
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Trophy className="h-3.5 w-3.5 text-amber-500" /> {c.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {c.rating != null && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {c.rating}
                        </Badge>
                      )}
                      {c.review_volume != null && <Badge variant="outline" className="text-[10px]">{c.review_volume} reviews</Badge>}
                      {c.source_name && <Badge variant="secondary" className="text-[10px]">{c.source_name}</Badge>}
                    </div>
                  </div>
                  {c.source_url && (
                    <a href={c.source_url} target="_blank" rel="noreferrer" className="text-primary hover:underline shrink-0">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {competitors && competitors.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum concorrente identificado nas buscas.</p>
      )}
    </div>
  );
}