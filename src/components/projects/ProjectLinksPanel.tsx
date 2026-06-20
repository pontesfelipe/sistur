import { useMemo, useState } from "react";
import {
  useProjectExternalLinks,
  useCreateExternalLink,
  useDeleteExternalLink,
  useLinkCandidates,
  LINK_TYPE_LABELS,
  type ExternalLinkType,
} from "@/hooks/useProjectExternalLinks";
import { useProject } from "@/hooks/useProjects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Plus, Trash2, AlertTriangle, TrendingUp, Users, Bug, Loader2 } from "lucide-react";

const ICONS: Record<ExternalLinkType, any> = {
  investment_opportunity: TrendingUp,
  consortium: Users,
  observatory_alert: AlertTriangle,
  issue: Bug,
};

export function ProjectLinksPanel({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const { data: links = [], isLoading } = useProjectExternalLinks(projectId);
  const { data: candidates } = useLinkCandidates(project?.org_id, project?.destination_id);
  const create = useCreateExternalLink();
  const remove = useDeleteExternalLink();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExternalLinkType>("observatory_alert");
  const [externalId, setExternalId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const linkedIds = useMemo(() => new Set(links.map((l) => `${l.link_type}::${l.external_id}`)), [links]);

  const options = useMemo(() => {
    if (!candidates) return [] as { id: string; label: string }[];
    const list = candidates[type] ?? [];
    return list
      .filter((it: any) => !linkedIds.has(`${type}::${it.id}`))
      .map((it: any) => {
        let label = "";
        if (type === "investment_opportunity") label = `${it.title} · ${it.status}`;
        else if (type === "consortium") label = it.name;
        else if (type === "observatory_alert") label = `[${it.severity}] ${it.message?.slice(0, 80) ?? ""}`;
        else label = `[${it.severity}] ${it.title}`;
        return { id: it.id, label };
      });
  }, [candidates, type, linkedIds]);

  const submit = async () => {
    if (!externalId) return;
    const selected = options.find((o) => o.id === externalId);
    await create.mutateAsync({
      project_id: projectId,
      link_type: type,
      external_id: externalId,
      label: selected?.label,
      notes: notes || undefined,
    });
    setOpen(false); setExternalId(""); setNotes("");
  };

  const grouped = useMemo(() => {
    const g: Record<ExternalLinkType, typeof links> = {
      investment_opportunity: [], consortium: [], observatory_alert: [], issue: [],
    };
    links.forEach((l) => g[l.link_type]?.push(l));
    return g;
  }, [links]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Link2 className="h-5 w-5" /> Vínculos Externos</CardTitle>
            <CardDescription>
              Conecte este projeto a oportunidades de investimento, consórcios regionais, alertas do observatório e issues do diagnóstico.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo vínculo</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : links.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum vínculo registrado.</p>
          ) : (
            (Object.keys(grouped) as ExternalLinkType[]).map((t) => {
              const items = grouped[t];
              if (items.length === 0) return null;
              const Icon = ICONS[t];
              return (
                <div key={t}>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                    <Icon className="h-4 w-4" /> {LINK_TYPE_LABELS[t]} ({items.length})
                  </div>
                  <div className="space-y-2">
                    {items.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 border rounded-lg p-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.label ?? l.external_id}</p>
                          {l.notes && <p className="text-xs text-muted-foreground mt-0.5">{l.notes}</p>}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 font-mono">{l.external_id.slice(0, 8)}</Badge>
                        <Button size="icon" variant="ghost" className="text-destructive shrink-0" onClick={() => remove.mutate({ id: l.id, projectId })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo vínculo externo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => { setType(v as ExternalLinkType); setExternalId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(LINK_TYPE_LABELS) as ExternalLinkType[]).map((t) => (
                    <SelectItem key={t} value={t}>{LINK_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item ({options.length} disponíveis)</Label>
              <Select value={externalId} onValueChange={setExternalId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">Nenhum item disponível</div>
                  ) : options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Por que este item se relaciona ao projeto?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!externalId || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
