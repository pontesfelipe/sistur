import { tx } from '@/i18n/t';
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
import { getIntlLocale } from '@/i18n/dateLocale';

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
  title: tx("Régua oficial de classificação (5 níveis)"),
  section_header: "CLASSIFICAÇÃO (régua oficial 5 níveis)",
  applies_to: "both",
  injection_order: 200,
  active: true,
  content: `Use SEMPRE estes 5 níveis ao classificar indicadores e pilares:
- Crítico: 0–33%
- Atenção: 34–66%
- Adequado: 67–79%
- Forte: 80–89%
- Excelente: 90–100%

Regras:
1. Exiba sempre em percentual inteiro (ex.: 72%), nunca decimais.
2. Nunca invente categorias fora desta régua.
3. Não use rankings comparativos entre municípios.`,
};

const FIELD_HELP: Record<string, string> = {
  key: "Identificador único e estável. Use snake_case com prefixo da categoria. Ex.: methodology.beni_3_pilares, anti_hallucination.no_rankings.",
  category: "Tipo da regra. 'methodology' = base teórica; 'classification' = réguas/limiares; 'anti_hallucination' = regras de proibição; 'formatting' = formato de saída; 'sources' = fontes oficiais; 'glossary' = definições.",
  title: tx("Nome curto para a UI. Ex.: 'Régua oficial 5 níveis', 'Proibição de rankings'."),
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
    toast.success(tx("Histórico de importação removido."));
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
  const [auditMeta, setAuditMeta] = useState<{ truncated: boolean; report_chars: number; rules_evaluated: number; segments: number } | null>(null);
  const [auditFilter, setAuditFilter] = useState<"all" | "fail" | "warn" | "pass">("all");
  const auditFileInputRef = useRef<HTMLInputElement | null>(null);
  type AuditHistoryRow = {
    id: string; report_name: string | null; score: number; fails: number; warns: number; passes: number;
    report_chars: number; segments: number; summary: string | null; findings: any; created_at: string;
  };
  const [auditHistory, setAuditHistory] = useState<AuditHistoryRow[]>([]);
  const loadAuditHistory = async () => {
    const { data } = await supabase
      .from("report_semantic_audits")
      .select("id, report_name, score, fails, warns, passes, report_chars, segments, summary, findings, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setAuditHistory((data as AuditHistoryRow[]) || []);
  };
  useEffect(() => { loadAuditHistory(); }, []);

  // v1.91.0 — Fase 8: carregar relatórios já gerados (Empresarial ou Territorial)
  // direto do banco para auditoria, sem precisar copiar/colar.
  type SavedReport = {
    id: string;
    assessment_id: string;
    destination_name: string | null;
    created_at: string;
    diagnostic_type: "territorial" | "enterprise" | null;
    report_content: string;
  };
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedScope, setSavedScope] = useState<"all" | "territorial" | "enterprise">("all");

  const loadSavedReports = async () => {
    setSavedLoading(true);
    try {
      // Join via assessment_id → assessments.diagnostic_type
      const { data, error } = await supabase
        .from("generated_reports")
        .select("id, assessment_id, destination_name, created_at, report_content, assessments!inner(diagnostic_type)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows: SavedReport[] = (data || []).map((r: any) => ({
        id: r.id,
        assessment_id: r.assessment_id,
        destination_name: r.destination_name,
        created_at: r.created_at,
        diagnostic_type: r.assessments?.diagnostic_type ?? null,
        report_content: r.report_content,
      }));
      setSavedReports(rows);
    } catch (e: any) {
      toast.error(tx("Erro ao carregar relatórios salvos: ") + (e?.message ?? String(e)));
    } finally {
      setSavedLoading(false);
    }
  };

  const loadSavedReportIntoAudit = (r: SavedReport) => {
    setAuditText(r.report_content || "");
    setAuditFileName(`${r.destination_name ?? "Relatório"} — ${new Date(r.created_at).toLocaleDateString(getIntlLocale())}`);
    if (r.diagnostic_type === "enterprise" || r.diagnostic_type === "territorial") setAuditScope(r.diagnostic_type);
    setAuditResult(null);
    setAuditMeta(null);
    toast.success(`Relatório carregado (${(r.report_content || "").length.toLocaleString("pt-BR")} chars).`);
  };

  const handleAuditFile = async (file: File) => {
    const name = file.name.toLowerCase();
    const isTextual = /\.(txt|md|markdown|json|html|htm|csv|log)$/.test(name) || file.type.startsWith("text/");
    if (!isTextual) {
      toast.error(tx("Formato não suportado para extração automática. Converta para .txt/.md ou cole o conteúdo na caixa abaixo."));
      return;
    }
    try {
      const text = await file.text();
      setAuditText(text);
      setAuditFileName(file.name);
      toast.success(`Arquivo ${file.name} carregado (${text.length.toLocaleString("pt-BR")} caracteres).`);
    } catch (e: any) {
      toast.error(tx("Falha ao ler arquivo: ") + (e?.message ?? String(e)));
    }
  };

  const runAudit = async () => {
    if (!auditText || auditText.trim().length < 30) {
      toast.error(tx("Cole ou envie um relatório com no mínimo 30 caracteres."));
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
      const res = data.result as AuditResult;
      setAuditResult(res);
      setAuditMeta({ truncated: false, report_chars: data.report_chars, rules_evaluated: data.rules_evaluated, segments: data.segments ?? 1 });
      const count = (s: string) => res.findings.filter((f) => f.status === s).length;
      const { error: saveErr } = await supabase.from("report_semantic_audits").insert({
        report_name: auditFileName || null,
        applies_to: auditScope,
        score: res.score,
        fails: count("fail"),
        warns: count("warn"),
        passes: count("pass"),
        report_chars: data.report_chars ?? auditText.length,
        segments: data.segments ?? 1,
        summary: res.summary,
        findings: res.findings as any,
        created_by: user?.id ?? null,
      });
      if (saveErr) console.error("save audit", saveErr);
      loadAuditHistory();
      toast.success(tx("Auditoria concluída."));
    } catch (e: any) {
      toast.error(tx("Erro na auditoria: ") + (e?.message ?? String(e)));
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
      toast.error(tx("Erro ao carregar camada semântica: ") + error.message);
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
      toast.error(tx("Preencha chave, título e conteúdo."));
      return;
    }
    const issues = findRuleConflicts(draft, entries, creating ? null : selected?.id ?? null);
    const blocking = issues.filter((i) => i.blocking);
    if (blocking.length) {
      toast.error(blocking.map((i) => i.message).join(" "));
      return;
    }
    if (issues.length && !window.confirm(tx("Possíveis conflitos encontrados:") + "\n\n- " + issues.map((i) => i.message).join("\n- ") + "\n\n" + tx("Salvar mesmo assim?"))) {
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
      if (error) return toast.error(tx("Erro ao criar: ") + error.message);
      toast.success(tx("Entrada criada"));
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
      if (error) return toast.error(tx("Erro ao salvar: ") + error.message);
      toast.success(tx("Alterações salvas. O próximo relatório usará esta versão."));
    }
    await load();
    setSelected(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta entrada permanentemente?")) return;
    const { error } = await supabase.from("report_semantic_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(tx("Entrada excluída"));
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
      toast.error(tx("Falha ao ler o arquivo: ") + err.message);
      return;
    }
    const valid = rows.filter((r) => r.key && r.title && r.content && r.category);
    if (valid.length === 0) {
      toast.error(tx("Nenhuma entrada válida encontrada (campos obrigatórios: key, title, content, category)."));
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
        if (error) toast.error(tx("Erro ao desativar entradas removidas: ") + error.message);
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
    if (failed > 0) toast.error(tx("Importação concluída com erros: ") + msgs.join(", "));
    else toast.success(tx("Importação concluída: ") + msgs.join(", "));
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
                <ArrowLeft className="h-4 w-4 mr-2" /> {tx("Voltar")}
              </Link>
            </Button>
          )}
          {!embedded && (
            <>
              <h1 className="text-3xl font-display font-bold">{tx("Camada Semântica de Relatórios")}</h1>
              <p className="text-muted-foreground mt-1">
                {tx("Edite as peças de conhecimento (metodologia, régua, fontes, bibliografia, regras anti-alucinação) usadas para gerar os relatórios. Alterações entram em vigor no próximo relatório gerado.")}
              </p>
            </>
          )}
          {embedded && (
            <p className="text-sm text-muted-foreground">
              {tx("Edite as peças de conhecimento (metodologia, régua, fontes, bibliografia, regras anti-alucinação) usadas para gerar os relatórios. Alterações entram em vigor no próximo relatório gerado.")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="h-4 w-4 mr-2" /> {tx("Exportar")}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {(filter === "all" && !search.trim()) ? `Todas (${entries.length})` : `Filtradas (${filtered.length})`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportJSON}>{tx("JSON (backup completo)")}</DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>{tx("CSV (Excel/planilha)")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> {tx("Importar")}
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
            <Plus className="h-4 w-4 mr-2" /> {tx("Nova entrada")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules"><FileText className="h-4 w-4 mr-2" /> {tx("Regras")}</TabsTrigger>
          <TabsTrigger value="audit"><ShieldCheck className="h-4 w-4 mr-2" /> {tx("Conferir relatório")}</TabsTrigger>
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
              <p className="font-medium">{tx("Solte o arquivo aqui para importar")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <FileUp className="h-6 w-6" />
              <p className="text-sm">
                {tx("Arraste e solte um arquivo JSON ou CSV aqui, ou use o botão")} <b>{tx("Importar")}</b> {tx("acima.")}
              </p>
              {lastImport && (
                <div className="mt-3 flex items-center gap-3 rounded-md border bg-background px-3 py-2 text-xs text-foreground shadow-sm">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{tx("Última importação")}</span>
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
              <CardTitle className="text-base">{tx("Entradas")}</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setCreating(true); setSelected(null); setDraft(emptyDraft()); }}
                title={tx("Adicionar nova regra")}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tx("Todas as categorias")}</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder={tx("Buscar…")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[70vh] overflow-y-auto">
            {loading ? (
              [...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">{tx("Nenhuma entrada.")}</p>
            ) : filtered.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelected(e); setCreating(false); }}
                className={`w-full text-left p-3 rounded-md border transition hover:bg-accent ${selected?.id === e.id ? "border-primary bg-accent" : "border-border"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{e.title}</span>
                  {!e.active && <Badge variant="secondary" className="text-xs">{tx("inativa")}</Badge>}
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
              {creating ? tx("Nova entrada") : selected ? `Editar: ${selected.title}` : tx("Selecione uma entrada")}
            </CardTitle>
            {creating && (
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-xs text-muted-foreground">
                  {tx("Cada regra é injetada como bloco de texto no prompt do gerador de relatórios. Preencha os campos abaixo, ou clique em")} <b>{tx("Inserir exemplo")}</b> {tx("para carregar uma regra válida.")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft({ ...EXAMPLE_DRAFT })}
                  title={tx("Preencher o formulário com um exemplo válido")}
                >
                  <Sparkles className="h-4 w-4 mr-2" /> {tx("Inserir exemplo")}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {(creating || selected) ? (
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">{tx("Editor")}</TabsTrigger>
                  <TabsTrigger value="preview">{tx("Preview")}</TabsTrigger>
                  <TabsTrigger value="example">{tx("Exemplo")}</TabsTrigger>
                </TabsList>
                <TabsContent value="edit" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>{tx("Chave canônica")}</Label>
                      <Input
                        value={draft.key ?? ""}
                        disabled={!creating}
                        onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                        placeholder={tx("ex.: classification.scale_5_levels")}
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.key}</p>
                    </div>
                    <div>
                      <Label>{tx("Categoria")}</Label>
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
                    <Label>{tx("Título")}</Label>
                    <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                    <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.title}</p>
                  </div>
                  <div>
                    <Label>{tx("Cabeçalho da seção (opcional)")}</Label>
                    <Input
                      value={draft.section_header ?? ""}
                      onChange={(e) => setDraft({ ...draft, section_header: e.target.value })}
                      placeholder={tx("ex.: CLASSIFICAÇÃO (régua oficial 5 níveis)")}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.section_header}</p>
                  </div>
                  <div>
                    <Label>{tx("Conteúdo (markdown)")}</Label>
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
                      <Label>{tx("Aplica-se a")}</Label>
                      <Select value={draft.applies_to} onValueChange={(v: any) => setDraft({ ...draft, applies_to: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="both">{tx("Ambos")}</SelectItem>
                          <SelectItem value="territorial">{tx("Territorial")}</SelectItem>
                          <SelectItem value="enterprise">{tx("Empresarial")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground mt-1">{FIELD_HELP.applies_to}</p>
                    </div>
                    <div>
                      <Label>{tx("Ordem de injeção")}</Label>
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
                      <Label>{tx("Ativa")}</Label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      <Button onClick={save}><Save className="h-4 w-4 mr-2" /> {tx("Salvar")}</Button>
                      {selected && !creating && (
                        <Button variant="outline" onClick={() => openHistory(selected.id)}>
                          <History className="h-4 w-4 mr-2" /> {tx("Histórico (v{{v0}})", { v0: selected.version })}
                        </Button>
                      )}
                    </div>
                    {selected && !creating && (
                      <Button variant="ghost" className="text-destructive" onClick={() => remove(selected.id)}>
                        <Trash2 className="h-4 w-4 mr-2" /> {tx("Excluir")}
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
                      {tx("Esta é uma")} <b>{tx("regra válida")}</b> {tx("de exemplo. Use como modelo. Para carregá-la no editor, clique em")} <b>{tx("Inserir exemplo")}</b> {tx("no topo do painel.")}
                    </p>
                  </div>
                  <div className="rounded-md border overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-xs font-medium">{tx("Campos do formulário")}</div>
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
                    <Label className="text-xs">{tx("Conteúdo (markdown injetado no prompt)")}</Label>
                    <pre className="mt-1 rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono">{EXAMPLE_DRAFT.content}</pre>
                  </div>
                  <div>
                    <Label className="text-xs">{tx("Equivalente em JSON (para importação em lote)")}</Label>
                    <pre className="mt-1 rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap font-mono overflow-x-auto">{JSON.stringify(EXAMPLE_DRAFT, null, 2)}</pre>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{tx("Selecione uma entrada na lista ou clique no botão abaixo para adicionar uma nova regra.")}</p>
                <Button
                  variant="outline"
                  onClick={() => { setCreating(true); setSelected(null); setDraft(emptyDraft()); }}
                >
                  <Plus className="h-4 w-4 mr-2" /> {tx("Nova regra")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> {tx("Auditoria semântica de relatório")}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {tx("Envie um relatório (arquivo texto ou colado abaixo) e a IA confronta o conteúdo com todas as regras")} <b>{tx("ativas")}</b> {tx("da camada semântica, retornando aprovações, alertas e violações com trechos citados.")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3 items-end">
                <div>
                  <Label className="text-xs">{tx("Arquivo do relatório")}</Label>
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => auditFileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> {tx("Selecionar arquivo")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { if (savedReports.length === 0) loadSavedReports(); else loadSavedReports(); }}>
                      <FileText className="h-4 w-4 mr-2" /> {tx("Carregar relatório salvo")}
                    </Button>
                    <input
                      ref={auditFileInputRef}
                      type="file"
                      accept=".txt,.md,.markdown,.json,.html,.htm,.csv,.log,text/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAuditFile(f); }}
                    />
                    {auditFileName && (
                      <span className="text-xs text-muted-foreground self-center truncate">
                        {auditFileName} — {auditText.length.toLocaleString("pt-BR")} chars
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {tx("Formatos suportados: .txt, .md, .json, .html, .csv. Para PDF/DOCX, copie o texto e cole na caixa abaixo.")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs">{tx("Escopo das regras")}</Label>
                  <Select value={auditScope} onValueChange={(v: any) => setAuditScope(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">{tx("Todas (territorial + enterprise)")}</SelectItem>
                      <SelectItem value="territorial">{tx("Apenas territorial")}</SelectItem>
                      <SelectItem value="enterprise">{tx("Apenas enterprise")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(savedLoading || savedReports.length > 0) && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-xs font-medium">{tx("Relatórios salvos (últimos 50)")}</Label>
                    <div className="flex items-center gap-2">
                      <Select value={savedScope} onValueChange={(v: any) => setSavedScope(v)}>
                        <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{tx("Todos")}</SelectItem>
                          <SelectItem value="territorial">{tx("Territorial")}</SelectItem>
                          <SelectItem value="enterprise">{tx("Empresarial")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setSavedReports([])}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {savedLoading ? (
                    <p className="text-xs text-muted-foreground">{tx("Carregando…")}</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-1">
                      {savedReports.filter(r => savedScope === "all" || r.diagnostic_type === savedScope).map((r) => (
                        <button
                          key={r.id}
                          onClick={() => loadSavedReportIntoAudit(r)}
                          className="w-full text-left text-xs rounded border bg-background hover:bg-accent px-2 py-1.5 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            <Badge variant="outline" className="text-[10px] mr-2 uppercase">{r.diagnostic_type ?? "?"}</Badge>
                            {r.destination_name ?? r.assessment_id.slice(0, 8)}
                          </span>
                          <span className="text-muted-foreground shrink-0">
                            {new Date(r.created_at).toLocaleDateString(getIntlLocale())} · {(r.report_content?.length ?? 0).toLocaleString("pt-BR")} chars
                          </span>
                        </button>
                      ))}
                      {savedReports.filter(r => savedScope === "all" || r.diagnostic_type === savedScope).length === 0 && (
                        <p className="text-xs text-muted-foreground">{tx("Nenhum relatório nesta categoria.")}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-xs">{tx("Conteúdo do relatório")}</Label>
                <Textarea
                  value={auditText}
                  onChange={(e) => { setAuditText(e.target.value); if (!e.target.value) setAuditFileName(""); }}
                  rows={12}
                  placeholder={tx("Cole aqui o conteúdo bruto do relatório (markdown, texto extraído de PDF, etc.)…")}
                  className="font-mono text-xs mt-1"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={runAudit} disabled={auditRunning || auditText.trim().length < 30}>
                  {auditRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  {auditRunning ? "Auditando…" : tx("Conferir conformidade")}
                </Button>
                {auditText && (
                  <Button variant="ghost" size="sm" onClick={() => { setAuditText(""); setAuditFileName(""); setAuditResult(null); setAuditMeta(null); }}>
                    <X className="h-4 w-4 mr-2" /> {tx("Limpar")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {auditHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{tx("Histórico de auditorias")}</CardTitle>
                <p className="text-[11px] text-muted-foreground">{tx("Compare a conformidade antes e depois de mudar as regras.")}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {auditHistory.map((h, i) => {
                  const prev = auditHistory.slice(i + 1).find((p) => p.report_name === h.report_name);
                  const delta = prev ? h.score - prev.score : null;
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-xs">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{h.report_name || tx("Relatório sem nome")}</div>
                        <div className="text-muted-foreground">
                          {new Date(h.created_at).toLocaleString(getIntlLocale())} · {h.fails} {tx("violações")} · {h.warns} {tx("alertas")} · {h.passes} {tx("aprovações")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold">{h.score}%</span>
                        {delta !== null && delta !== 0 && (
                          <Badge variant={delta > 0 ? "default" : "destructive"}>{delta > 0 ? `+${delta}` : delta}</Badge>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => {
                          setAuditResult({ summary: h.summary || "", score: h.score, findings: h.findings || [] });
                          setAuditMeta({ truncated: false, report_chars: h.report_chars, rules_evaluated: (h.findings || []).length, segments: h.segments });
                        }}>{tx("Ver")}</Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {auditResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base">{tx("Resultado da auditoria")}</CardTitle>
                    {auditMeta && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {auditMeta.rules_evaluated} regra(s) avaliada(s) · {auditMeta.report_chars.toLocaleString("pt-BR")} caracteres analisados
                        {auditMeta.segments > 1 ? ` · relatório completo auditado em ${auditMeta.segments} partes` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`text-2xl font-bold ${auditResult.score >= 85 ? "text-green-600" : auditResult.score >= 60 ? "text-yellow-600" : "text-destructive"}`}>
                      {Math.round(auditResult.score)}%
                    </div>
                    <div className="text-xs text-muted-foreground">{tx("conformidade")}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{auditResult.summary}</p>

                <div className="flex flex-wrap gap-2 text-xs">
                  {(["all", "fail", "warn", "pass"] as const).map((f) => {
                    const count = f === "all" ? auditResult.findings.length : auditResult.findings.filter((x) => x.status === f).length;
                    return (
                      <Button
                        key={f}
                        size="sm"
                        variant={auditFilter === f ? "default" : "outline"}
                        onClick={() => setAuditFilter(f)}
                      >
                        {f === "all" ? "Todas" : f === "fail" ? "Violações" : f === "warn" ? "Alertas" : "OK"} ({count})
                      </Button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {auditResult.findings
                    .filter((f) => auditFilter === "all" || f.status === auditFilter)
                    .sort((a, b) => {
                      const order = { fail: 0, warn: 1, pass: 2 } as const;
                      return order[a.status] - order[b.status];
                    })
                    .map((f, i) => {
                      const Icon = f.status === "pass" ? CheckCircle2 : f.status === "warn" ? AlertTriangle : XCircle;
                      const color =
                        f.status === "pass" ? "text-green-600 border-green-600/30 bg-green-50/40 dark:bg-green-950/20" :
                        f.status === "warn" ? "text-yellow-700 border-yellow-600/30 bg-yellow-50/40 dark:bg-yellow-950/20" :
                        "text-destructive border-destructive/30 bg-destructive/5";
                      return (
                        <div key={i} className={`rounded-md border p-3 ${color}`}>
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{f.rule_title}</span>
                                <code className="text-[10px] text-muted-foreground">{f.rule_key}</code>
                                <Badge variant="outline" className="text-[10px] uppercase">{tx(String(f.status ?? ""))}</Badge>
                              </div>
                              <p className="text-xs mt-1 text-foreground">{f.explanation}</p>
                              {f.evidence && (
                                <blockquote className="mt-2 border-l-2 border-current/40 pl-2 text-xs italic text-muted-foreground">
                                  "{f.evidence}"
                                </blockquote>
                              )}
                              {f.suggested_fix && (
                                <p className="mt-2 text-xs">
                                  <b>{tx("Sugestão:")}</b> {f.suggested_fix}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tx("Histórico de alterações")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx("Sem histórico.")}</p>
            ) : history.map((h) => (
              <div key={h.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>v{h.version} — {new Date(h.changed_at).toLocaleString("pt-BR")}</span>
                  <span>{h.active_after ? "ativa" : "inativa"}</span>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-medium">{tx("Ver conteúdo")}</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted/40 p-2 rounded">{h.content_after}</pre>
                </details>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>{tx("Fechar")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importPreview} onOpenChange={(o) => !o && setImportPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tx("Pré-visualização da importação")}</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {tx("Arquivo")} <code className="text-foreground">{importPreview.filename}</code> {tx("— formato")} <b>{importPreview.format.toUpperCase()}</b> — {importPreview.rows.length} entrada(s) válida(s).
              </div>

              <div className="rounded-md border max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">{tx("Chave")}</th>
                      <th className="text-left p-2">{tx("Categoria")}</th>
                      <th className="text-left p-2">{tx("Ação")}</th>
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
                <Label className="text-sm">{tx("Modo de importação")}</Label>
                <RadioGroup value={importMode} onValueChange={(v: any) => setImportMode(v)} className="mt-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="merge" id="imp-merge" className="mt-1" />
                    <Label htmlFor="imp-merge" className="font-normal cursor-pointer">
                      <span className="font-medium">{tx("Merge (recomendado)")}</span> {tx("— insere novas chaves e atualiza existentes. Entradas atuais não presentes no arquivo são mantidas.")}
                    </Label>
                  </div>
                  <div className="flex items-start gap-2">
                    <RadioGroupItem value="replace" id="imp-replace" className="mt-1" />
                    <Label htmlFor="imp-replace" className="font-normal cursor-pointer">
                      <span className="font-medium">{tx("Substituir")}</span> {tx("— insere/atualiza do arquivo e")} <b>{tx("desativa")}</b> {tx("entradas ativas que não estão no arquivo (não exclui, permite reverter).")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportPreview(null)}>{tx("Cancelar")}</Button>
            <Button onClick={confirmImport}>
              <Upload className="h-4 w-4 mr-2" /> {tx("Confirmar importação")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}