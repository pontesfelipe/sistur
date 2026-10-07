import { useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tx } from "@/i18n/t";
import { useAuth } from "@/hooks/useAuth";
import { useCreateMilestone } from "@/hooks/useProjects";
import type { BudgetLine } from "@/hooks/useProjectBudget";
import { accountabilityDeadline, convenioToBudgetLine, type Convenio } from "@/lib/fumturIntegrations";

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ConvenioImportDialog({ projectId, lines }: { projectId: string; lines: BudgetLine[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const createMilestone = useCreateMilestone();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<Convenio[] | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const notes = lines.map((l) => l.notes);

  const load = async () => {
    setOpen(true); setLoading(true); setList(null); setNeedsKey(false);
    const { data, error } = await supabase.functions.invoke("fetch-mtur-convenios", { body: { project_id: projectId } });
    setLoading(false);
    if (error) {
      const d = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
      let msg = d; try { msg = JSON.parse(d).error ?? d; } catch { /* */ }
      toast.error(msg); setList([]); return;
    }
    if (data?.needs_key) { setNeedsKey(true); setList([]); return; }
    setList(data.convenios ?? []);
    setSel(new Set());
  };

  const importSel = async () => {
    setSaving(true);
    let n = 0;
    for (const c of (list ?? []).filter((c) => sel.has(c.numero))) {
      const line = convenioToBudgetLine(c, projectId, notes);
      if (!line) continue;
      const { error } = await (supabase as any).from("project_budget_lines").insert({ ...line, created_by: user?.id });
      if (error) { toast.error(error.message); continue; }
      const prazo = accountabilityDeadline(c.fim_vigencia);
      if (prazo) await createMilestone.mutateAsync({ project_id: projectId, name: `Prestação de contas: Convênio ${c.numero}`, description: c.objeto.slice(0, 200), target_date: prazo, completed_date: null, status: "pending" } as any);
      n++;
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["project-budget", projectId] });
    toast.success(tx("{{v0}} convênio(s) importado(s)", { v0: n }));
    setOpen(false);
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={load} className="gap-1"><Landmark className="h-4 w-4" />{tx("Buscar convênios do MTur")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tx("Convênios do Ministério do Turismo")}</DialogTitle>
            <DialogDescription>{tx("Dados públicos do Portal da Transparência para o município do projeto. Cada convênio vira uma linha de orçamento e o prazo de prestação de contas (60 dias após o fim da vigência) vira um marco.")}</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            : needsKey ? <p className="text-sm text-muted-foreground">{tx("A consulta ao Portal da Transparência ainda não foi ativada pelo administrador do SISTUR.")}</p>
            : list && list.length === 0 ? <p className="text-sm text-muted-foreground">{tx("Nenhum convênio do MTur encontrado para este município.")}</p>
            : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {(list ?? []).map((c) => {
                  const done = notes.some((n) => n?.includes(`Convênio ${c.numero}`));
                  return (
                    <label key={c.numero} className="flex gap-3 border rounded-lg p-2 text-sm cursor-pointer">
                      <Checkbox disabled={done} checked={done || sel.has(c.numero)} onCheckedChange={(v) => { const s = new Set(sel); v ? s.add(c.numero) : s.delete(c.numero); setSel(s); }} />
                      <span className="flex-1">
                        <span className="font-medium">{c.numero}</span> · {c.situacao}{done ? ` · ${tx("já importado")}` : ""}
                        <span className="block text-muted-foreground">{c.objeto}</span>
                        <span className="block">{BRL(c.valor)} · {tx("liberado")} {BRL(c.valor_liberado)}{c.fim_vigencia ? ` · ${tx("vigência até")} ${c.fim_vigencia.split("-").reverse().join("/")}` : ""}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          <DialogFooter>
            <Button disabled={!sel.size || saving} onClick={importSel}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{tx("Importar selecionados")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
