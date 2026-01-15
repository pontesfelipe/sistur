import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Search, 
  MapPin, 
  Building2,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface IBGEResult {
  id: number;
  nome: string;
  microrregiao?: {
    nome: string;
    mesorregiao?: {
      nome: string;
      UF?: {
        sigla: string;
        nome: string;
      };
    };
  };
}

export function IBGESearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IBGEResult[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setResults([]);

      const { data, error } = await supabase.functions.invoke('search-ibge', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      setResults(data?.municipalities || []);
      
      if (data?.municipalities?.length === 0) {
        toast.info('Nenhum município encontrado');
      }
    } catch (error) {
      console.error('IBGE search error:', error);
      toast.error('Erro ao buscar municípios');
    } finally {
      setLoading(false);
    }
  };

  const formatMunicipality = (m: IBGEResult) => {
    const uf = m.microrregiao?.mesorregiao?.UF?.sigla || '';
    const micro = m.microrregiao?.nome || '';
    return { uf, micro };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Search className="h-4 w-4 mr-2" />
          Buscar no IBGE
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Buscar Municípios IBGE
          </DialogTitle>
          <DialogDescription>
            Pesquise municípios brasileiros na base do IBGE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">Município</Label>
              <Input
                id="search"
                placeholder="Digite o nome do município..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : results.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {results.map((m) => {
                  const { uf, micro } = formatMunicipality(m);
                  return (
                    <Card key={m.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                              <p className="font-medium">{m.nome}</p>
                              <p className="text-sm text-muted-foreground">
                                {micro && `${micro} • `}{uf}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Código IBGE: {m.id}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{uf}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          ) : query && !loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mb-4 opacity-20" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm">Tente um termo diferente</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p>Digite para pesquisar</p>
              <p className="text-sm">Busque por nome do município</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Fonte: API IBGE Localidades</span>
            <a 
              href="https://servicodados.ibge.gov.br/api/docs/localidades" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Documentação <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
