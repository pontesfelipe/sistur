import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, History, Plus, Save, Trash2, Download, Upload, FileUp, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Info, ShieldCheck, FileText, Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type Entry = {
  id: string;
  key: string;
  category: string;
  scope: "global" | "org";
  title: string;
  content: string;
  section_header: string | null;
  applies_to: "territorial" | "enterprise" | "both";
  injection_order: number;
  active: boolean;
  version: number;
  updated_at: string;
};

type HistoryRow = {
  id: string;
  version: number;
  content_before: string | null;
  content_after: string;
  active_before: boolean | null;
  active_after: boolean;
  changed_at: string;
  changed_by: string | null;
};

const CATEGORIES = [
  "methodology",
  "classification",
  "sources",
  "bibliography",
  "glossary",
  "anti_hallucination",
  "formatting",
  "mst_extension",
  "indicator",
  "pillar",
  "other",
];

function emptyDraft(): Partial<Entry> {
  return {
    key: "",
    category: "methodology",
    scope: "global",
    title: "",
    content: "",
    section_header: "",
    applies_to: "both",
    injection_order: 100,
    active: true,
  };
}

// Exemplo canônico de uma regra/entrada válida da camada semântica.
// Usado para o botão "Inserir exemplo" e para o painel de referência.
const EXAMPLE_DRAFT: Partial<Entry> = {
  key: "classification.scale_5_levels",
  category: "classification",
  scope: "global",
  title: "Régua oficial de classificação (5 níveis)",
  section_header: "CLASSIFICAÇÃO (régua oficial 5 níveis)",
  applies_to: "both",
  injection_order: 200,
  active: true,
  content: `Use SEMPRE estes 5 níveis ao classificar indicadores e pilares:
- Crítico: 0–33%
- Atenção: 34–66%
- Adequado: 67–84%
- Bom: 85–94%
- Excelente: 95–100%

Regras:
1. Exiba sempre em percentual inteiro (ex.: 72%), nunca decimais.
2. Nunca invente categorias fora desta régua.
3. Não use rankings comparativos entre municípios.`,
};

const FIELD_HELP: Record<string, string> = {
  key: "Identificador único e estável. Use snake_case com prefixo da categoria. Ex.: methodology.beni_3_pilares, anti_hallucination.no_rankings.",
  category: "Tipo da regra. 'methodology' = base teórica; 'classification' = réguas/limiares; 'anti_hallucination' = regras de proibição; 'formatting' = formato de saída; 'sources' = fontes oficiais; 'glossary' = definições.",
  title: "Nome curto para a UI. Ex.: 'Régua oficial 5 níveis', 'Proibição de rankings'.",
  section_header: "Cabeçalho impresso no prompt do LLM antes do conteúdo. Opcional. Ex.: 'REGRAS ANTI-ALUCINAÇÃO:'.",
  content: "Texto/markdown injetado no prompt do gerador de relatórios. Seja imperativo e direto (use 'sempre', 'nunca', listas numeradas).",
  applies_to: "Em qual fluxo de relatório a regra entra: 'territorial' (destinos/municípios), 'enterprise' (empresas) ou 'both'.",
  injection_order: "Ordem de injeção no prompt (menor = mais cedo). Use 100 para metodologia, 200 para classificação, 300 para anti-alucinação, 400 para formatação.",
  active: "Se desligada, a regra é mantida no histórico mas não é usada nos próximos relatórios.",
};

export default function AdminSemanticLayer({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [draft, setDraft] = useState<Partial<Entry>>(emptyDraft());
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [importPreview, setImportPreview] = useState<{ rows: Partial<Entry>[]; format: "json" | "csv"; filename: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const LAST_IMPORT_KEY = "sistur.semantic.lastImport";
  const [lastImport, setLastImport] = useState<{ filename: string; date: string; count: number; mode: string } | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_IMPORT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const saveLastImport = (filename: string, count: number, mode: string) => {
    const record = { filename, date: new Date().toISOString(), count, mode };
    localStorage.setItem(LAST_IMPORT_KEY, JSON.stringify(record));
    setLastImport(record);
  };

  const clearLastImport = () => {
    localStorage.removeItem(LAST_IMPORT_KEY);
    setLastImport(null);
    toast.success("Histórico de importação removido.");
  };

  // ===== Auditoria de relatório =====
  type Finding = {
    rule_key: string;
    rule_title: string;
    status: "pass" | "warn" | "fail";
    evidence: string | null;
    explanation: string;
    suggested_fix: string | null;
  };
  type AuditResult = { summary: string; score: number; findings: Finding[] };
  const [auditText, setAuditText] = useState("");
  const [auditFileName, setAuditFileName] = useState<string>("");
  const [auditScope, setAuditScope] = useState<"both" | "territorial" | "enterprise">("both");
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditMeta, setAuditMeta] = useState<{ truncated: boolean; report_chars: number; rules_evaluated: number } | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const auditFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAuditFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const isTextual = /\.(txt|md|markdown|json|html|htm|csv|log)$/.test(name) || file.type.startsWith("text/");
    if (!isTextual) {
      toast.error("Formato não suportado para extração automática. Converta para .txt/.md ou cole o conteúdo na caixa abaixo.");
      return;
    }
    try {
      const text = await file.text();
      setAuditText(text);
      setAuditFileName(file.name);
      toast.success(`Arquivo ${file.name} carregado (${text.length.toLocaleString("pt-BR")} caracteres).`);
    } catch (e: any) {
      toast.error("Falha ao ler arquivo: " + (e?.message ?? String(e)));
    }
  };

  const runAudit = async () => {
    if (!auditText || auditText.trim().length < 30) {
      toast.error("Cole ou envie um relatório com no mínimo 30 caracteres.");
      return;
    }
    setAuditRunning(true);
    setAuditResult(null);
    setAuditMeta(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-report-semantic", {
        body: { reportText: auditText, reportName: auditFileName || null, appliesTo: auditScope },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Falha desconhecida");
      setAuditResult(data.result as AuditResult);
      setAuditMeta({ truncated: !!data.truncated, report_chars: data.report_chars, rules_evaluated: data.rules_evaluated });
      toast.success("Auditoria concluída.");
    } catch (e: any) {
      toast.error("Erro na auditoria: " + (e?.message ?? String(e)));
    } finally {
      setAuditRunning(false);
    }
  };

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only hide if leaving the document entirely, not entering a child
      if (!e.relatedTarget) setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    };
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [entries]);


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("report_semantic_entries")
      .select("*")
      .order("category", { ascending: true })
      .order("injection_order", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar camada semântica: " + error.message);
    } else {
      setEntries((data as Entry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) setDraft(selected);
  }, [selected]);

  const filtered = useMemo(() => {
    let r = entries;
    if (filter !== "all") r = r.filter((e) => e.category === filter);
    const q = search.trim().toLowerCase();
    if (q) r = r.filter((e) => e.key.toLowerCase().includes(q) || e.title.toLowerCase().includes(q));
    return r;
  }, [entries, filter, search]);

  const save = async () => {
    if (!draft.key || !draft.title || !draft.content) {
      toast.error("Preencha chave, título e conteúdo.");
      return;
    }
    if (creating) {
      const { error } = await supabase.from("report_semantic_entries").insert({
        key: draft.key,
        category: draft.category!,
        scope: draft.scope ?? "global",
        title: draft.title,
        content: draft.content,
        section_header: draft.section_header || null,
        applies_to: draft.applies_to ?? "both",
        injection_order: Number(draft.injection_order) || 100,
        active: draft.active ?? true,
        created_by: user?.id ?? null,
      });
      if (error) return toast.error("Erro ao criar: " + error.message);
      toast.success("Entrada criada");
      setCreating(false);
      setDraft(emptyDraft());
    } else if (selected) {
      const { error } = await supabase
        .from("report_semantic_entries")
        .update({
          title: draft.title,
          category: draft.category!,
          content: draft.content,
          section_header: draft.section_header || null,
          applies_to: draft.applies_to ?? "both",
          injection_order: Number(draft.injection_order) || 100,
          active: draft.active ?? true,
          updated_by: user?.id ?? null,
        })
        .eq("id", selected.id);
      if (error) return toast.error("Erro ao salvar: " + error.message);
      toast.success("Alterações salvas. O próximo relatório usará esta versão.");
    }
    await load();
    setSelected(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta entrada permanentemente?")) return;
    const { error } = await supabase.from("report_semantic_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entrada excluída");
    setSelected(null);
    await load();
  };

  const openHistory = async (id: string) => {
    const { data, error } = await supabase
      .from("report_semantic_entry_history")
      .select("id, version, content_before, content_after, active_before, active_after, changed_at, changed_by")
      .eq("entry_id", id)
      .order("changed_at", { ascending: false });
    if (error) return toast.error(error.message);
    setHistory((data as HistoryRow[]) || []);
    setShowHistory(true);
  };

  // ===== Export =====
  const EXPORT_FIELDS: (keyof Entry)[] = [
    "key", "category", "scope", "title", "content", "section_header",
    "applies_to", "injection_order", "active",
  ];

  const downloadBlob = (filename: string, mime: string, content: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const source = (filter === "all" && !search.trim()) ? entries : filtered;
    const payload = {
      schema: "sistur.report_semantic_entries",
      version: 1,
      exported_at: new Date().toISOString(),
      count: source.length,
      entries: source.map((e) => Object.fromEntries(EXPORT_FIELDS.map((k) => [k, (e as any)[k]]))),
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadBlob(`sistur-semantic-layer-${stamp}.json`, "application/json", JSON.stringify(payload, null, 2));
    toast.success(`${source.length} entrada(s) exportada(s) em JSON.`);
  };

  const csvEscape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCSV = () => {
    const source = (filter === "all" && !search.trim()) ? entries : filtered;
    const header = EXPORT_FIELDS.join(",");
    const lines = source.map((e) => EXPORT_FIELDS.map((k) => csvEscape((e as any)[k])).join(","));
    const csv = "\uFEFF" + [header, ...lines].join("\n");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    downloadBlob(`sistur-semantic-layer-${stamp}.csv`, "text/csv;charset=utf-8", csv);
    toast.success(`${source.length} entrada(s) exportada(s) em CSV.`);
  };

  // ===== Import =====
  const parseCSV = (text: string): Partial<Entry>[] => {
    // Strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n" || c === "\r") {
          if (c === "\r" && text[i + 1] === "\n") i++;
          cur.push(field); field = "";
          if (cur.length > 1 || cur[0] !== "") rows.push(cur);
          cur = [];
        } else field += c;
      }
    }
    if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
    if (rows.length === 0) return [];
    const header = rows[0].map((h) => h.trim());
    return rows.slice(1).map((r) => {
      const obj: any = {};
      header.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
      if (obj.injection_order !== undefined && obj.injection_order !== "") obj.injection_order = Number(obj.injection_order);
      if (obj.active !== undefined) obj.active = String(obj.active).toLowerCase() === "true" || obj.active === "1";
      return obj;
    });
  };

  const handleFile = async (file: File) => {
    const text = await file.text();
    let rows: Partial<Entry>[] = [];
    let format: "json" | "csv" = "json";
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        rows = parseCSV(text);
        format = "csv";
      } else {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : (parsed.entries ?? []);
        format = "json";
      }
    } catch (err: any) {
      toast.error("Falha ao ler o arquivo: " + err.message);
      return;
    }
    const valid = rows.filter((r) => r.key && r.title && r.content && r.category);
    if (valid.length === 0) {
      toast.error("Nenhuma entrada válida encontrada (campos obrigatórios: key, title, content, category).");
      return;
    }
    setImportPreview({ rows: valid, format, filename: file.name });
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    const rows = importPreview.rows;
    let inserted = 0, updated = 0, deactivated = 0, failed = 0;

    if (importMode === "replace") {
      const importedKeys = new Set(rows.map((r) => r.key));
      const toDeactivate = entries.filter((e) => e.active && !importedKeys.has(e.key));
      if (toDeactivate.length > 0) {
        const { error } = await supabase
          .from("report_semantic_entries")
          .update({ active: false, updated_by: user?.id ?? null })
          .in("id", toDeactivate.map((e) => e.id));
        if (error) toast.error("Erro ao desativar entradas removidas: " + error.message);
        else deactivated = toDeactivate.length;
      }
    }

    for (const r of rows) {
      const existing = entries.find((e) => e.key === r.key);
      const payload: any = {
        key: r.key,
        category: r.category,
        scope: r.scope ?? "global",
        title: r.title,
        content: r.content,
        section_header: r.section_header || null,
        applies_to: r.applies_to ?? "both",
        injection_order: Number(r.injection_order) || 100,
        active: r.active ?? true,
        updated_by: user?.id ?? null,
      };
      if (existing) {
        const { error } = await supabase
          .from("report_semantic_entries")
          .update(payload)
          .eq("id", existing.id);
        if (error) { failed++; console.error("update", r.key, error); } else updated++;
      } else {
        payload.created_by = user?.id ?? null;
        const { error } = await supabase.from("report_semantic_entries").insert(payload);
        if (error) { failed++; console.error("insert", r.key, error); } else inserted++;
      }
    }

    const msgs = [`${inserted} inserida(s)`, `${updated} atualizada(s)`];
    if (deactivated) msgs.push(`${deactivated} desativada(s)`);
    if (failed) msgs.push(`${failed} com erro`);
    if (failed > 0) toast.error("Importação concluída com erros: " + msgs.join(", "));
    else toast.success("Importação concluída: " + msgs.join(", "));
    saveLastImport(importPreview.filename, rows.length, importMode);
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
  };

  return (
    <div className={embedded ? "" : "container mx-auto px-4 py-8 max-w-7xl"}>
      <div className="flex items-center justify-between mb-6">
        <div>
          {!embedded && (
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/admin/audit">
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Link>
            </Button>
          )}
          {!embedded && (
            <>
              <h1 className="text-3xl font-display font-bold">Camada Semântica de Relatórios</h1>
              <p className="text-muted-foreground mt-1">
                Edite as peças de conhecimento (metodologia, régua, fontes, bibliografia, regras anti-alucinação) usadas para gerar os relatórios. Alterações entram em vigor no próximo relatório gerado.
              </p>
            </>
          )}
          {embedded && (
            <p className="text-sm text-muted-foreground">
              Edite as peças de conhecimento (metodologia, régua, fontes, bibliografia, regras anti-alucinação) usadas para gerar os relatórios. Alterações entram em vigor no próximo relatório gerado.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {(filter === "all" && !search.trim()) ? `Todas (${entries.length})` : `Filtradas (${filtered.length})`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportJSON}>JSON (backup completo)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>CSV (Excel/planilha)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button onClick={() => { setCreating(true); setSelected(null); setDraft(emptyDraft()); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova entrada
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules"><FileText className="h-4 w-4 mr-2" /> Regras</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-4 w-4 mr-2" /> Conferir relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-6">
          {/* Dropzone + last import history */}
          <div>
        <div
          ref={dropRef}
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          {isDragging ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <FileUp className="h-8 w-8" />
              <p className="font-medium">Solte o arquivo aqui para importar</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileUp className="h-6 w-6" />
              <p className="text-sm">
                Arraste e solte um arquivo JSON ou CSV aqui, ou use o botão <b>Importar</b> acima.
              </p>
              {lastImport && (
                <div className="mt-3 flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-xs text-foreground shadow-sm">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">Última importação</span>
                    <span className="text-muted-foreground">
                      {lastImport.filename} — {lastImport.count} entrada(s) — modo {lastImport.mode} —{" "}
                      {new Date(lastImport.date).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={clearLastImport}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Entradas</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setCreating(true); setSelected(null); setDraft(emptyDraft()); }}
                title="Adicionar nova regra"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[70vh] overflow-y-auto">
            {loading ? (
              [...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">Nenhuma entrada.</p>
            ) : filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelected(e); setCreating(false); }}
                className={`w-full text-left p-3 rounded-md border transition hover:bg-accent ${selected?.id === e.id ? "border-primary bg-accent" : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{e.title}</span>
                  {!e.active && <Badge variant="secondary" className="text-xs">inativa</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                  <code className="text-[10px] text-muted-foreground truncate">{e.key}</code>
                  <span className="text-[10px] text-muted-foreground ml-auto">v{e.version}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {creating ? "Nova entrada" : selected ? `Editar: ${selected.title}` : "Selecione uma entrada"}
            </CardTitle>
            {creating && (
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  Cada regra é injetada como bloco de texto no prompt do gerador de relatórios. Preencha os campos abaixo, ou clique em <b>Inserir exemplo</b> para carregar uma regra válida.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft({ ...EXAMPLE_DRAFT })}
                  title="Preencher o formulário com um exemplo válido"
                >
                  <Sparkles className="h-4 w-4 mr-2" /> Inserir exemplo
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(creating || selected) ? (
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="example">Exemplo</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Chave canônica</Label>
                      <Input
                        value={draft.key ?? ""}
                        disabled={!creating}
                        onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                        placeholder="ex.: classification.scale_5_levels"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.key}</p>
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.category}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.title}</p>
                  </div>
                  <div>
                    <Label>Cabeçalho da seção (opcional)</Label>
                    <Input
                      value={draft.section_header ?? ""}
                      onChange={(e) => setDraft({ ...draft, section_header: e.target.value })}
                      placeholder="ex.: CLASSIFICAÇÃO (régua oficial 5 níveis)"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.section_header}</p>
                  </div>
                  <div>
                    <Label>Conteúdo (markdown)</Label>
                    <Textarea
                      value={draft.content ?? ""}
                      onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                      rows={16}
                      className="font-mono text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.content}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Aplica-se a</Label>
                      <Select value={draft.applies_to} onValueChange={(v: any) => setDraft({ ...draft, applies_to: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">Ambos</SelectItem>
                          <SelectItem value="territorial">Territorial</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.applies_to}</p>
                    </div>
                    <div>
                      <Label>Ordem de injeção</Label>
                      <Input
                        type="number"
                        value={draft.injection_order ?? 100}
                        onChange={(e) => setDraft({ ...draft, injection_order: Number(e.target.value) })}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.injection_order}</p>
                    </div>
                    <div className="flex items-end gap-2">
                      <Switch
                        checked={draft.active ?? true}
                        onCheckedChange={(v) => setDraft({ ...draft, active: v })}
                      />
                      <Label>Ativa</Label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button onClick={save}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
                      {selected && !creating && (
                        <Button variant="outline" onClick={() => openHistory(selected.id)}>
                          <History className="h-4 w-4 mr-2" /> Histórico (v{selected.version})
                        </Button>
                      )}
                    </div>
                    {selected && !creating && (
                      <Button variant="ghost" className="text-destructive" onClick={() => remove(selected.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="preview" className="mt-4">
                  <div className="rounded-md border bg-muted/30 p-4 whitespace-pre-wrap font-mono text-sm">
                    {draft.section_header ? `${draft.section_header}:\n${draft.content ?? ""}` : (draft.content ?? "")}
                  </div>
                </TabsContent>
                <TabsContent value="example" className="mt-4 space-y-3">
                  <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs">
                    <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p>
                      Esta é uma <b>regra válida</b> de exemplo. Use como modelo. Para carregá-la no editor, clique em <b>Inserir exemplo</b> no topo do painel.
                    </p>
                  </div>
                  <div className="rounded-md border overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-xs font-medium">Campos do formulário</div>
                    <table className="w-full text-xs">
                      <tbody>
                        {([
                          ["Chave canônica", EXAMPLE_DRAFT.key],
                          ["Categoria", EXAMPLE_DRAFT.category],
                          ["Título", EXAMPLE_DRAFT.title],
                          ["Cabeçalho da seção", EXAMPLE_DRAFT.section_header],
                          ["Aplica-se a", EXAMPLE_DRAFT.applies_to],
                          ["Ordem de injeção", String(EXAMPLE_DRAFT.injection_order)],
                          ["Ativa", EXAMPLE_DRAFT.active ? "sim" : "não"],
                        ] as [string, any][]).map(([k, v]) => (
                          <tr key={k} className="border-t">
                            <td className="p-2 w-48 text-muted-foreground">{k}</td>
                            <td className="p-2 font-mono break-all">{v as string}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <Label className="text-xs">Conteúdo (markdown injetado no prompt)</Label>
                    <pre className="mt-1 rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">{EXAMPLE_DRAFT.content}</pre>
                  </div>
                  <div>
                    <Label className="text-xs">Equivalente em JSON (para importação em lote)</Label>
                    <pre className="mt-1 rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(EXAMPLE_DRAFT, null, 2)}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Selecione uma entrada na lista ou clique no botão abaixo para adicionar uma nova regra.</p>
                <Button
                  variant="outline"
                  onClick={() => { setCreating(true); setSelected(null); setDraft(emptyDraft()); }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Nova regra
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de alterações</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico.</p>
            ) : history.map((h) => (
              <div key={h.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>v{h.version} — {new Date(h.changed_at).toLocaleString("pt-BR")}</span>
                  <span>{h.active_after ? "ativa" : "inativa"}</span>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-medium">Ver conteúdo</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted/40 p-2 rounded">{h.content_after}</pre>
                </details>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importPreview} onOpenChange={(o) => !o && setImportPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização da importação</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Arquivo <code className="text-foreground">{importPreview.filename}</code> — formato <b>{importPreview.format.toUpperCase()}</b> — {importPreview.rows.length} entrada(s) válida(s).
              </div>

              <div className="rounded-md border max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Chave</th>
                      <th className="text-left p-2">Categoria</th>
                      <th className="text-left p-2">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.map((r, i) => {
                      const exists = entries.some((e) => e.key === r.key);
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{r.key}</td>
                          <td className="p-2">{r.category}</td>
                          <td className="p-2">
                            <Badge variant={exists ? "secondary" : "default"} className="text-[10px]">
                              {exists ? "atualizar" : "inserir"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <Label className="text-sm">Modo de importação</Label>
                <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)} className="mt-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="merge" id="imp-merge" className="mt-1" />
                    <Label htmlFor="imp-merge" className="font-normal cursor-pointer">
                      <span className="font-medium">Merge (recomendado)</span> — insere novas chaves e atualiza existentes. Entradas atuais não presentes no arquivo são mantidas.
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="replace" id="imp-replace" className="mt-1" />
                    <Label htmlFor="imp-replace" className="font-normal cursor-pointer">
                      <span className="font-medium">Substituir</span> — insere/atualiza do arquivo e <b>desativa</b> entradas ativas que não estão no arquivo (não exclui, permite reverter).
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>Cancelar</Button>
            <Button onClick={confirmImport}>
              <Upload className="h-4 w-4 mr-2" /> Confirmar importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}