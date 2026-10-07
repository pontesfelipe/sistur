import { tx } from '@/i18n/t';
import { useMemo, useState } from "react";
import {
  useProjectBudget,
  useUpsertBudgetLine,
  useDeleteBudgetLine,
  BUDGET_CATEGORIES,
  BUDGET_STATUS,
  FUNDING_SOURCES,
  summarizeByFundingSource,
  type BudgetLine,
} from "@/hooks/useProjectBudget";
import { useProjectPhases, useCreateMilestone } from "@/hooks/useProjects";
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
import { computeRoi } from "@/lib/revenueIntelligence";
import { ConvenioImportDialog } from "./ConvenioImportDialog";

const BRL = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export function ProjectBudgetPanel({ projectId }: { projectId: string }) {
  const { data: lines = [], isLoading } = useProjectBudget(projectId);
  const { data: phases = [] } = useProjectPhases(projectId);
  const upsert = useUpsertBudgetLine();
  const remove = useDeleteBudgetLine();
  const createMilestone = useCreateMilestone();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BudgetLine> | null>(null);
  const [deadline, setDeadline] = useState("");

  const totals = useMemo(() => {
    const planned = lines.reduce((s, l) => s + Number(l.planned_amount || 0), 0);
    const actual = lines.reduce((s, l) => s + Number(l.actual_amount || 0), 0);
    return { planned, actual, variance: planned - actual, executionPct: planned > 0 ? (actual / planned) * 100 : 0 };
  }, [lines]);
  const bySource = useMemo(() => summarizeByFundingSource(lines), [lines]);

  const openNew = () => {
    setEditing({ project_id: projectId, category: BUDGET_CATEGORIES[0], status: "planned", planned_amount: 0, actual_amount: 0, currency: "BRL" });
    setDeadline("");
    setOpen(true);
  };
  const openEdit = (l: BudgetLine) => { setEditing(l); setDeadline(""); setOpen(true); };

  const submit = async () => {
    if (!editing?.description) return;
    await upsert.mutateAsync({
      ...editing,
      project_id: projectId,
      planned_amount: Number(editing.planned_amount ?? 0),
      actual_amount: Number(editing.actual_amount ?? 0),
    } as any);
    if (deadline) {
      await createMilestone.mutateAsync({
        project_id: projectId,
        name: `Prestação de contas: ${editing.description}`,
        description: editing.funding_source ? `Fonte: ${editing.funding_source}` : null,
        target_date: deadline,
        completed_date: null,
        status: "pending",
      } as any);
    }
    setOpen(false); setEditing(null); setDeadline("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{tx('Planejado')}</p><p className="text-xl font-bold">{BRL(totals.planned)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{tx('Realizado')}</p><p className="text-xl font-bold text-emerald-600">{BRL(totals.actual)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{tx('Saldo')}</p><p className={cn("text-xl font-bold", totals.variance < 0 ? "text-red-600" : "text-foreground")}>{BRL(totals.variance)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">{tx('Execução')}</p><p className="text-xl font-bold">{totals.executionPct.toFixed(1)}%</p></CardContent></Card>
      </div>
      <ProjectRoiCard projectId={projectId} investment={totals.actual || totals.planned} />
      {bySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{tx('Por fonte de financiamento')}</CardTitle>
            <CardDescription>{tx('Quanto cada fonte cobre do previsto e quanto já foi gasto')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {bySource.map((s) => (
              <div key={s.source} className="flex items-center justify-between gap-3 border rounded-lg p-2">
                <span className="text-sm font-medium">{tx(s.source)}</span>
                <span className="text-xs text-muted-foreground">
                  {totals.planned > 0 ? Math.round((s.planned / totals.planned) * 100) : 0}% {tx('do previsto')}
                </span>
                <span className="text-sm font-semibold">{BRL(s.planned)} <span className="text-muted-foreground">/</span> {BRL(s.actual)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5" /> {tx("Linhas de Orçamento")}</CardTitle>
            <CardDescription>{tx('Planejamento e execução financeira por categoria e fase')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <ConvenioImportDialog projectId={projectId} lines={lines} />
            <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" /> {tx("Nova linha")}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{tx('Nenhuma linha cadastrada ainda.')}</p>
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
                        <Badge variant="secondary" className="text-xs">{tx(String(statusLabel ?? ""))}</Badge>
                        {phase && <span className="text-xs text-muted-foreground">{tx("Fase: {{v0}}", { v0: phase.name })}</span>}
                        {l.funding_source && <span className="text-xs text-muted-foreground">{tx("Fonte: {{v0}}", { v0: l.funding_source })}</span>}
                      </div>
                      <p className="font-medium text-sm mt-1 truncate">{tx(l.description)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{tx('Plan / Real')}</p>
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
          <DialogHeader><DialogTitle>{editing?.id ? tx("Editar linha") : tx("Nova linha de orçamento")}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>{tx('Descrição')}</Label>
                <Input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{tx('Categoria')}</Label>
                  <Select value={editing.category ?? BUDGET_CATEGORIES[0]} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{tx('Status')}</Label>
                  <Select value={editing.status ?? "planned"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUDGET_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{tx(s.label)}</SelectItem>)}</SelectContent>
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
                  <Label>{tx("Fase (opcional)")}</Label>
                  <Select value={editing.phase_id ?? "_none"} onValueChange={(v) => setEditing({ ...editing, phase_id: v === "_none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder={tx('Sem fase')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{tx('Sem fase')}</SelectItem>
                      {phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{tx('Fonte de financiamento')}</Label>
                  <Select
                    value={!editing.funding_source ? "_none" : FUNDING_SOURCES.includes(editing.funding_source) ? editing.funding_source : "Outra"}
                    onValueChange={(v) => setEditing({ ...editing, funding_source: v === "_none" ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{tx('Não informada')}</SelectItem>
                      {FUNDING_SOURCES.map((f) => <SelectItem key={f} value={f}>{tx(f)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editing.funding_source && !FUNDING_SOURCES.slice(0, -1).includes(editing.funding_source) && (
                    <Input className="mt-2" value={editing.funding_source === "Outra" ? "" : editing.funding_source} placeholder={tx('Qual fonte?')} onChange={(e) => setEditing({ ...editing, funding_source: e.target.value || "Outra" })} />
                  )}
                </div>
              </div>
              {editing.funding_source === "Fundo municipal (FUMTUR)" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{tx('Nº do empenho')}</Label>
                    <Input value={(editing as any).commitment_number ?? ""} onChange={(e) => setEditing({ ...editing, commitment_number: e.target.value || null } as any)} />
                  </div>
                  <div>
                    <Label>{tx('Etapa da despesa')}</Label>
                    <Select value={(editing as any).execution_stage ?? "_none"} onValueChange={(v) => setEditing({ ...editing, execution_stage: v === "_none" ? null : v } as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">—</SelectItem>
                        <SelectItem value="empenhado">{tx('Empenhado')}</SelectItem>
                        <SelectItem value="liquidado">{tx('Liquidado')}</SelectItem>
                        <SelectItem value="pago">{tx('Pago')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div>
                <Label>{tx('Prazo de prestação de contas (opcional)')}</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">{tx('Ao salvar, vira um marco do projeto para não perder o prazo.')}</p>
              </div>
              <div>
                <Label>{tx('Notas')}</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tx('Cancelar')}</Button>
            <Button onClick={submit} disabled={upsert.isPending}>{upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectRoiCard({ projectId, investment }: { projectId: string; investment: number }) {
  const key = `sistur-roi-${projectId}`;
  const [annual, setAnnual] = useState<number>(() => Number(localStorage.getItem(key) ?? 0));
  const [years, setYears] = useState(3);
  const { roi, paybackMonths } = computeRoi(investment, annual, years);
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{tx("Retorno do investimento (ROI)")}</CardTitle>
        <CardDescription>Investimento considerado: {brl(investment)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4 items-end">
        <div className="space-y-1">
          <Label>Retorno anual esperado (R$)</Label>
          <Input type="number" value={annual || ""} onChange={(e) => { const v = Number(e.target.value); setAnnual(v); localStorage.setItem(key, String(v)); }} />
        </div>
        <div className="space-y-1">
          <Label>{tx("Horizonte (anos)")}</Label>
          <Input type="number" min={1} max={10} value={years} onChange={(e) => setYears(Math.max(1, Number(e.target.value)))} />
        </div>
        <div><p className="text-xs text-muted-foreground">{tx("ROI")}</p><p className="text-2xl font-semibold">{roi == null ? "—" : `${Math.round(roi)}%`}</p></div>
        <div><p className="text-xs text-muted-foreground">{tx('Payback')}</p><p className="text-2xl font-semibold">{paybackMonths == null ? "—" : `${Math.ceil(paybackMonths)} meses`}</p></div>
      </CardContent>
    </Card>
  );
}
