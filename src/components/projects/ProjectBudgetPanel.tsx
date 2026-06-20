import { useMemo, useState } from "react";
import {
  useProjectBudget,
  useUpsertBudgetLine,
  useDeleteBudgetLine,
  BUDGET_CATEGORIES,
  BUDGET_STATUS,
  type BudgetLine,
} from "@/hooks/useProjectBudget";
import { useProjectPhases } from "@/hooks/useProjects";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wallet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function ProjectBudgetPanel({ projectId }: { projectId: string }) {
  const { data: lines = [], isLoading } = useProjectBudget(projectId);
  const { data: phases = [] } = useProjectPhases(projectId);
  const upsert = useUpsertBudgetLine();
  const remove = useDeleteBudgetLine();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BudgetLine> | null>(null);

  const totals = useMemo(() => {
    const planned = lines.reduce((s, l) => s + Number(l.planned_amount || 0), 0);
    const actual = lines.reduce((s, l) => s + Number(l.actual_amount || 0), 0);
    return { planned, actual, variance: planned - actual, executionPct: planned > 0 ? (actual / planned) * 100 : 0 };
  }, [lines]);

  const openNew = () => {
    setEditing({ project_id: projectId, category: BUDGET_CATEGORIES[0], status: "planned", planned_amount: 0, actual_amount: 0, currency: "BRL" });
    setOpen(true);
  };
  const openEdit = (l: BudgetLine) => { setEditing(l); setOpen(true); };

  const submit = async () => {
    if (!editing?.description) return;
    await upsert.mutateAsync({
      ...editing,
      project_id: projectId,
      planned_amount: Number(editing.planned_amount ?? 0),
      actual_amount: Number(editing.actual_amount ?? 0),
    } as any);
    setOpen(false); setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Planejado</p><p className="text-xl font-bold">{BRL(totals.planned)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Realizado</p><p className="text-xl font-bold text-emerald-600">{BRL(totals.actual)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Saldo</p><p className={cn("text-xl font-bold", totals.variance < 0 ? "text-red-600" : "text-foreground")}>{BRL(totals.variance)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Execução</p><p className="text-xl font-bold">{totals.executionPct.toFixed(1)}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5" /> Linhas de Orçamento</CardTitle>
            <CardDescription>Planejamento e execução financeira por categoria e fase</CardDescription>
          </div>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nova linha</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma linha cadastrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => {
                const phase = phases.find((p) => p.id === l.phase_id);
                const statusLabel = BUDGET_STATUS.find((s) => s.value === l.status)?.label ?? l.status;
                return (
                  <div key={l.id} className="flex items-center gap-3 border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{l.category}</Badge>
                        <Badge variant="secondary" className="text-xs">{statusLabel}</Badge>
                        {phase && <span className="text-xs text-muted-foreground">Fase: {phase.name}</span>}
                        {l.funding_source && <span className="text-xs text-muted-foreground">Fonte: {l.funding_source}</span>}
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{l.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Plan / Real</p>
                      <p className="text-sm font-semibold">{BRL(Number(l.planned_amount))} <span className="text-muted-foreground">/</span> {BRL(Number(l.actual_amount))}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove.mutate({ id: l.id, projectId })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar linha" : "Nova linha de orçamento"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Descrição</Label>
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={editing.category ?? BUDGET_CATEGORIES[0]} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status ?? "planned"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGET_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Planejado (R$)</Label>
                  <Input type="number" step="0.01" value={editing.planned_amount ?? 0} onChange={(e) => setEditing({ ...editing, planned_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Realizado (R$)</Label>
                  <Input type="number" step="0.01" value={editing.actual_amount ?? 0} onChange={(e) => setEditing({ ...editing, actual_amount: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fase (opcional)</Label>
                  <Select value={editing.phase_id ?? "_none"} onValueChange={(v) => setEditing({ ...editing, phase_id: v === "_none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Sem fase" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sem fase</SelectItem>
                      {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fonte de financiamento</Label>
                  <Input value={editing.funding_source ?? ""} placeholder="Ex.: Tesouro, FUNGETUR..." onChange={(e) => setEditing({ ...editing, funding_source: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
