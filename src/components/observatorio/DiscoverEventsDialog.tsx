import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCreateObservatoryEvent } from "@/hooks/useObservatorio";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Candidate {
  name: string;
  start_date: string;
  end_date: string;
  description?: string;
  category?: string;
  source_url?: string;
}

interface Props {
  orgId: string | undefined;
  year: number;
  disabled?: boolean;
}

export function DiscoverEventsDialog({ orgId, year, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sources, setSources] = useState<string[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);
  const createEvent = useCreateObservatoryEvent();

  const runSearch = async () => {
    if (!orgId) return;
    setLoading(true);
    setCandidates([]);
    setSelected(new Set());
    setSources([]);
    try {
      const { data, error } = await supabase.functions.invoke("discover-municipal-events", {
        body: { org_id: orgId, year },
      });
      if (error) throw error;
      setCandidates(data?.candidates ?? []);
      setSources(data?.sources_consulted ?? []);
      setSearchedQuery(data?.query ?? null);
      if ((data?.candidates ?? []).length === 0) {
        toast.info("Nenhum evento encontrado nas fontes consultadas");
      } else {
        toast.success(`${data.candidates.length} sugestões encontradas`);
      }
    } catch (e: any) {
      toast.error("Erro ao buscar: " + (e.message ?? "desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  };

  const importSelected = async () => {
    const items = Array.from(selected).map((i) => candidates[i]).filter(Boolean);
    if (items.length === 0) return;
    let ok = 0, fail = 0;
    for (const c of items) {
      try {
        await createEvent.mutateAsync({
          name: c.name,
          description: c.description ? `${c.description}${c.source_url ? `\n\nFonte: ${c.source_url}` : ""}` : (c.source_url ? `Fonte: ${c.source_url}` : undefined),
          category: c.category || "cultural",
          start_date: c.start_date,
          end_date: c.end_date,
        });
        ok++;
      } catch { fail++; }
    }
    toast.success(`${ok} evento(s) importado(s)${fail ? ` · ${fail} falha(s)` : ""}`);
    setOpen(false);
    setCandidates([]);
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !orgId}>
          <Sparkles className="h-4 w-4 mr-2" /> Buscar eventos do município
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Descoberta automática de eventos</DialogTitle>
          <DialogDescription>
            Consulta sites oficiais (prefeitura, secretaria de turismo) para sugerir eventos de {year}. Revise antes de importar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {candidates.length === 0 && !loading && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Clique em "Buscar agora" para consultar fontes públicas via Firecrawl.
              </p>
              <Button onClick={runSearch}>
                <Sparkles className="h-4 w-4 mr-2" /> Buscar agora
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Buscando e extraindo eventos…</p>
            </div>
          )}

          {!loading && candidates.length > 0 && (
            <>
              {searchedQuery && (
                <p className="text-xs text-muted-foreground">
                  Busca: <code className="text-xs">{searchedQuery}</code>
                </p>
              )}
              <ScrollArea className="h-96 border rounded-md p-2">
                <div className="space-y-2">
                  {candidates.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/40 cursor-pointer"
                      onClick={() => toggle(i)}
                    >
                      <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.category && <Badge variant="secondary" className="text-[10px] capitalize">{c.category}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(c.start_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })} – {format(new Date(c.end_date + "T00:00:00"), "dd 'de' MMM yyyy", { locale: ptBR })}
                        </p>
                        {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
                        {c.source_url && (
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary inline-flex items-center gap-1 mt-1 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Fonte
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {sources.length > 0 && (
                <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Sugestões automáticas — revise datas e nomes antes de importar. Fontes consultadas: {sources.length}.
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          {candidates.length > 0 && (
            <>
              <Button variant="outline" onClick={runSearch} disabled={loading}>Nova busca</Button>
              <Button onClick={importSelected} disabled={selected.size === 0 || createEvent.isPending}>
                {createEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Importar {selected.size > 0 ? `(${selected.size})` : ""}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}