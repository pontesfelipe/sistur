import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { tx } from "@/i18n/t";
import { parseBalancete, reconcileBalancete, type ReconcileExpense, type ReconcileResult } from "@/lib/fumturIntegrations";

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Confere o balancete/extrato da contabilidade com as despesas FUMTUR do SISTUR, pelo nº de empenho. Nada é gravado. */
export function BalanceteReconcile({ expenses }: { expenses: ReconcileExpense[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [res, setRes] = useState<ReconcileResult | null>(null);

  const onFile = async (f: File) => {
    const buf = await f.arrayBuffer();
    let text = new TextDecoder("utf-8").decode(buf);
    if (text.includes("\uFFFD")) text = new TextDecoder("windows-1252").decode(buf);
    const { rows, error } = parseBalancete(text);
    if (error) { toast.error(tx(error)); return; }
    setRes(reconcileBalancete(rows, expenses));
  };

  const Row = ({ l, r, tone }: { l: string; r: string; tone?: "destructive" }) => (
    <div className={`flex justify-between text-sm border-b py-1 ${tone ? "text-destructive" : ""}`}><span>{l}</span><span>{r}</span></div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{tx("Conferir com o balancete da prefeitura")}</CardTitle>
          <CardDescription>{tx("Envie o CSV da contabilidade com as colunas \"Empenho\" e \"Valor pago\". O SISTUR compara pelo número de empenho e não altera nada.")}</CardDescription>
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => ref.current?.click()}><Upload className="h-4 w-4" />{tx("Enviar CSV")}</Button>
        <input ref={ref} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </CardHeader>
      {res && (
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{tx("Conferem")}: {res.matched.length}</Badge>
            <Badge variant={res.divergent.length ? "destructive" : "secondary"}>{tx("Valor diferente")}: {res.divergent.length}</Badge>
            <Badge variant={res.missingInSistur.length ? "destructive" : "secondary"}>{tx("Só no balancete")}: {res.missingInSistur.length}</Badge>
            <Badge variant={res.missingInBalancete.length ? "destructive" : "secondary"}>{tx("Só no SISTUR")}: {res.missingInBalancete.length}</Badge>
          </div>
          {res.divergent.map((d) => <Row key={d.expense.id} tone="destructive" l={`${d.expense.project_name ?? ""} · ${d.expense.description} · ${tx("Empenho")} ${d.expense.commitment_number}`} r={`${tx("balancete")} ${BRL(d.valor)} × SISTUR ${BRL(Number(d.expense.actual_amount))}`} />)}
          {res.missingInSistur.map((m) => <Row key={m.empenho} tone="destructive" l={`${tx("Empenho")} ${m.empenho}${m.historico ? ` · ${m.historico}` : ""} — ${tx("não lançado no SISTUR")}`} r={BRL(m.valor)} />)}
          {res.missingInBalancete.map((e) => <Row key={e.id} tone="destructive" l={`${e.project_name ?? ""} · ${e.description} — ${e.commitment_number ? tx("empenho não está no balancete") : tx("sem nº de empenho")}`} r={BRL(Number(e.actual_amount))} />)}
          {res.matched.map((m) => <Row key={m.expense.id} l={`${m.expense.project_name ?? ""} · ${m.expense.description} · ${tx("Empenho")} ${m.expense.commitment_number}`} r={BRL(m.valor)} />)}
        </CardContent>
      )}
    </Card>
  );
}
