import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Save, ArrowUp, ArrowDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Section = { order: number; title: string; description: string };
type Template = {
  id: string;
  scope: "territorial" | "enterprise" | "both";
  template: string;
  name: string;
  description: string | null;
  sections: Section[];
  active: boolean;
  version: number;
  updated_at: string;
};

export function ReportStructurePanel() {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("report_structure_templates")
      .select("*")
      .order("scope", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar estruturas", { description: error.message });
    } else {
      const normalized = (data || []).map((t: any) => ({
        ...t,
        sections: Array.isArray(t.sections) ? t.sections : [],
      })) as Template[];
      setItems(normalized);
      if (normalized[0] && !activeTab) setActiveTab(normalized[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  const updateLocal = (id: string, patch: Partial<Template>) =>
    setItems(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));

  const updateSection = (id: string, idx: number, patch: Partial<Section>) => {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t;
      const sections = t.sections.map((s, i) => i === idx ? { ...s, ...patch } : s);
      return { ...t, sections };
    }));
  };

  const move = (id: string, idx: number, dir: -1 | 1) => {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t;
      const j = idx + dir;
      if (j < 0 || j >= t.sections.length) return t;
      const sections = [...t.sections];
      [sections[idx], sections[j]] = [sections[j], sections[idx]];
      return { ...t, sections: sections.map((s, i) => ({ ...s, order: i + 1 })) };
    }));
  };

  const remove = (id: string, idx: number) => {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t;
      const sections = t.sections.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 }));
      return { ...t, sections };
    }));
  };

  const add = (id: string) => {
    setItems(prev => prev.map(t => {
      if (t.id !== id) return t;
      const sections = [...t.sections, { order: t.sections.length + 1, title: "Nova seção", description: "Descreva o conteúdo obrigatório desta seção." }];
      return { ...t, sections };
    }));
  };

  const save = async (t: Template) => {
    setSaving(t.id);
    const sections = t.sections.map((s, i) => ({ order: i + 1, title: s.title.trim(), description: s.description.trim() }))
      .filter(s => s.title);
    const { error } = await supabase
      .from("report_structure_templates")
      .update({ name: t.name, description: t.description, sections, active: t.active, version: t.version + 1 })
      .eq("id", t.id);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Estrutura atualizada — vale para os próximos relatórios.");
      load();
    }
  };

  if (loading) {
    return (
      <Card><CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando estruturas…
      </CardContent></Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-muted-foreground">
        Nenhuma estrutura cadastrada.
      </CardContent></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Estrutura Canônica do Relatório
        </CardTitle>
        <CardDescription>
          Define a ordem fixa de seções que TODO relatório gerado deve seguir. O agente de IA recebe esta lista como contrato obrigatório — UMA passada, sem repetir nem voltar a seções já escritas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto">
            {items.map(t => (
              <TabsTrigger key={t.id} value={t.id} className="gap-2">
                <Badge variant="outline" className="text-xs uppercase">{t.scope}</Badge>
                {t.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {items.map(t => (
            <TabsContent key={t.id} value={t.id} className="space-y-4 mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <Input value={t.name} onChange={e => updateLocal(t.id, { name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Versão atual</label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge variant="secondary">v{t.version}</Badge>
                    <Badge variant={t.active ? "default" : "outline"}>{t.active ? "Ativa" : "Inativa"}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => updateLocal(t.id, { active: !t.active })}>
                      {t.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição (contrato)</label>
                <Textarea value={t.description ?? ""} onChange={e => updateLocal(t.id, { description: e.target.value })} rows={2} />
              </div>

              <div className="border rounded-lg divide-y">
                {t.sections.map((s, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                      <Input
                        value={s.title}
                        onChange={e => updateSection(t.id, idx, { title: e.target.value })}
                        placeholder="Título da seção"
                        className="font-medium"
                      />
                      <Button size="icon" variant="ghost" onClick={() => move(t.id, idx, -1)} disabled={idx === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => move(t.id, idx, 1)} disabled={idx === t.sections.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id, idx)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      value={s.description}
                      onChange={e => updateSection(t.id, idx, { description: e.target.value })}
                      placeholder="Descreva o que esta seção deve conter (tabelas, parágrafos, evidências…)"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => add(t.id)}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar seção
                </Button>
                <Button onClick={() => save(t)} disabled={saving === t.id}>
                  {saving === t.id
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando…</>
                    : <><Save className="h-4 w-4 mr-1" /> Salvar estrutura</>}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}