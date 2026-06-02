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
import { ArrowLeft, History, Plus, Save, Trash2, Download, Upload } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

export default function AdminSemanticLayer() {
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
    setImportPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await load();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to="/admin/audit">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Link>
          </Button>
          <h1 className="text-3xl font-display font-bold">Camada Semântica de Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Edite as peças de conhecimento (metodologia, régua, fontes, bibliografia, regras anti-alucinação) usadas para gerar os relatórios. Alterações entram em vigor no próximo relatório gerado.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas</CardTitle>
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
          </CardHeader>
          <CardContent>
            {(creating || selected) ? (
              <Tabs defaultValue="edit">
                <TabsList>
                  <TabsTrigger value="edit">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
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
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Título</Label>
                    <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cabeçalho da seção (opcional)</Label>
                    <Input
                      value={draft.section_header ?? ""}
                      onChange={(e) => setDraft({ ...draft, section_header: e.target.value })}
                      placeholder="ex.: CLASSIFICAÇÃO (régua oficial 5 níveis)"
                    />
                  </div>
                  <div>
                    <Label>Conteúdo (markdown)</Label>
                    <Textarea
                      value={draft.content ?? ""}
                      onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                      rows={16}
                      className="font-mono text-sm"
                    />
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
                    </div>
                    <div>
                      <Label>Ordem de injeção</Label>
                      <Input
                        type="number"
                        value={draft.injection_order ?? 100}
                        onChange={(e) => setDraft({ ...draft, injection_order: Number(e.target.value) })}
                      />
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
              </Tabs>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione uma entrada na lista ou clique em "Nova entrada".</p>
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
    </div>
  );
}