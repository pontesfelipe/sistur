import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUpsertMeasurement } from "@/hooks/useObservatorio";

type Metric = { id: string; code: string; name: string; unit: string };

type ParsedRow = {
  line: number;
  metric_code: string;
  reference_year: number;
  reference_month: number | null;
  value: number;
  source: string;
  notes: string;
  error?: string;
  metric_id?: string;
  metric_name?: string;
};

const TEMPLATE_HEADERS = ["metric_code", "reference_year", "reference_month", "value", "source", "notes"];
const TEMPLATE_SAMPLE = [
  ["ocupacao_hoteleira", "2026", "1", "62.4", "FOHB — InFOHB Janeiro/2026", "Taxa de ocupação média mensal"],
  ["ocupacao_hoteleira", "2026", "2", "58.1", "FOHB — InFOHB Fevereiro/2026", ""],
  ["ocupacao_diaria_media", "2026", "1", "385.50", "FOHB — InFOHB Janeiro/2026", "Diária média em BRL"],
];

function parseCsv(text: string): string[][] {
  // Lightweight CSV parser — supports quoted fields and commas/semicolons
  const detected = (text.split("\n", 1)[0].includes(";") ? ";" : ",");
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === detected) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function toNumberBR(raw: string): number {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  return Number(s);
}

export function CsvImportDialog({ metrics }: { metrics: Metric[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upsert = useUpsertMeasurement();

  const metricByCode = useMemo(() => new Map(metrics.map((m) => [m.code, m])), [metrics]);

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.length - validCount;

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_SAMPLE.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "observatorio_modelo.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const grid = parseCsv(text);
    if (grid.length < 2) {
      toast.error("CSV vazio ou inválido");
      return;
    }
    const header = grid[0].map((h) => h.trim().toLowerCase());
    const idx = (name: string) => header.indexOf(name);
    const required = ["metric_code", "reference_year", "value"];
    for (const r of required) {
      if (idx(r) === -1) {
        toast.error(`Coluna obrigatória ausente: ${r}`);
        return;
      }
    }
    const parsed: ParsedRow[] = grid.slice(1).map((cols, i) => {
      const get = (n: string) => (idx(n) >= 0 ? (cols[idx(n)] ?? "").trim() : "");
      const code = get("metric_code");
      const year = parseInt(get("reference_year"), 10);
      const monthRaw = get("reference_month");
      const month = monthRaw === "" || monthRaw.toLowerCase() === "anual" ? null : parseInt(monthRaw, 10);
      const value = toNumberBR(get("value"));
      const source = get("source");
      const notes = get("notes");
      const metric = metricByCode.get(code);

      const row: ParsedRow = {
        line: i + 2,
        metric_code: code,
        reference_year: year,
        reference_month: month,
        value,
        source,
        notes,
        metric_id: metric?.id,
        metric_name: metric?.name,
      };
      if (!code) row.error = "metric_code vazio";
      else if (!metric) row.error = `métrica desconhecida: ${code}`;
      else if (!Number.isFinite(year) || year < 2000 || year > 2100) row.error = "ano inválido";
      else if (month !== null && (!Number.isFinite(month) || month < 1 || month > 12)) row.error = "mês inválido (use 1–12 ou vazio para anual)";
      else if (!Number.isFinite(value)) row.error = "valor inválido";
      return row;
    });
    setRows(parsed);
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r.error && r.metric_id);
    if (valid.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }
    setBusy(true);
    let ok = 0;
    let fail = 0;
    for (const r of valid) {
      try {
        await upsert.mutateAsync({
          metric_id: r.metric_id!,
          reference_year: r.reference_year,
          reference_month: r.reference_month,
          value: r.value,
          source: r.source || undefined,
          notes: r.notes || undefined,
        });
        ok++;
      } catch (e) {
        fail++;
      }
    }
    setBusy(false);
    if (fail === 0) {
      toast.success(`Importação concluída — ${ok} medições atualizadas`);
      setOpen(false);
      setRows([]);
    } else {
      toast.warning(`Importação parcial — ${ok} OK, ${fail} falharam`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4 mr-2" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar medições do Observatório por CSV</DialogTitle>
        </DialogHeader>

        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertTitle>Formato esperado</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <div>Colunas: <code>metric_code, reference_year, reference_month, value, source, notes</code></div>
            <div><code>reference_month</code> aceita 1–12 ou vazio (medição anual). <code>value</code> aceita vírgula ou ponto decimal.</div>
            <div>Use para importar FOHB (ocupação hoteleira), CGE/SECTUR estaduais ou qualquer outra fonte que não tenha API.</div>
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" /> Baixar modelo
          </Button>
          <Input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="max-w-xs"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-severity-good/15 text-severity-good border-severity-good/30">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {validCount} válidas
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-severity-critical/15 text-severity-critical border-severity-critical/30">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {errorCount} com erro
                </Badge>
              )}
            </div>
            <div className="rounded-md border max-h-[360px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">L#</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.line}>
                      <TableCell className="text-xs text-muted-foreground">{r.line}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.metric_name ?? r.metric_code}</div>
                        <div className="font-mono text-muted-foreground">{r.metric_code}</div>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">{r.reference_year || "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums">{r.reference_month ?? "anual"}</TableCell>
                      <TableCell className="text-xs tabular-nums text-right">
                        {Number.isFinite(r.value) ? r.value : "—"}
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[180px]">{r.source || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r.error ? (
                          <span className="text-severity-critical">{r.error}</span>
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-severity-good" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setOpen(false); setRows([]); }}>Cancelar</Button>
          <Button onClick={handleImport} disabled={busy || validCount === 0}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar {validCount > 0 ? `${validCount} linhas` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}