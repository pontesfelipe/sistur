import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, Save, Loader2, Trash2, Building2, Globe2 } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  org_id: string | null;
  scope: "territorial" | "enterprise" | "both";
  name: string;
  description: string | null;
  context: string;
  active: boolean;
  version: number;
  updated_at: string;
};

type Org = { id: string; name: string };

export function ReportContextPanel() {
  const { isAdmin, profile } = useProfile();
  const [items, setItems] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [profilesRes, orgsRes] = await Promise.all([
      supabase.from("report_context_profiles").select("*").order("org_id", { ascending: true, nullsFirst: true }).order("scope"),
      isAdmin
        ? supabase.from("orgs").select("id, name").order("name")
        : Promise.resolve({ data: profile?.org_id ? [{ id: profile.org_id, name: "Minha organização" }] : [], error: null } as any),
    ]);
    if (profilesRes.error) toast.error("Erro ao carregar contextos", { description: profilesRes.error.message });
    else setItems(profilesRes.data as any);
    if (!orgsRes.error && orgsRes.data) setOrgs(orgsRes.data as any);
    if (!activeId && profilesRes.data?.[0]) setActiveId((profilesRes.data as any)[0].id);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [isAdmin]);

  const update = (id: string, patch: Partial<Profile>) =>
    setItems(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const save = async (p: Profile) => {
    setSaving(p.id);
    const { error } = await supabase
      .from("report_context_profiles")
      .update({
        name: p.name,
        description: p.description,
        context: p.context,
        scope: p.scope,
        active: p.active,
        version: p.version + 1,
      })
      .eq("id", p.id);
    setSaving(null);
    if (error) toast.error("Erro ao salvar", { description: error.message });
    else { toast.success("Contexto atualizado — vale para os próximos relatórios."); load(); }
  };

  const createForOrg = async (orgId: string | null, scope: "territorial" | "enterprise") => {
    const base = items.find(p => p.org_id === null && p.scope === scope);
    const { data, error } = await supabase
      .from("report_context_profiles")
      .insert({
        org_id: orgId,
        scope,
        name: `Contexto ${scope === "territorial" ? "Territorial" : "Enterprise"} — ${orgs.find(o => o.id === orgId)?.name ?? "Global"}`,
        description: "Contexto editorial específico desta organização.",
        context: base?.context ?? "Persona: ...\nAudiência: ...\nTom: ...\nFoco: ...\nRestrições: ...",
        active: true,
      })
      .select()
      .single();
    if (error) return toast.error("Erro ao criar contexto", { description: error.message });
    toast.success("Contexto criado");
    setActiveId((data as any).id);
    load();
  };

  const remove = async (p: Profile) => {
    if (!p.org_id) return toast.error("Contextos globais não podem ser removidos — apenas desativados.");
    if (!confirm(`Remover contexto "${p.name}"?`)) return;
    const { error } = await supabase.from("report_context_profiles").delete().eq("id", p.id);
    if (error) toast.error("Erro ao remover", { description: error.message });
    else { toast.success("Contexto removido"); load(); }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Profile[]>();
    items.forEach(p => {
      const k = p.org_id ?? "__global__";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    });
    return map;
  }, [items]);

  if (loading) {
    return <Card><CardContent className="py-8 flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando contextos…
    </CardContent></Card>;
  }

  const orgName = (id: string | null) => id ? (orgs.find(o => o.id === id)?.name ?? "Organização") : "Global (padrão)";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Camada de Contexto do Relatório
        </CardTitle>
        <CardDescription>
          Define a <strong>persona, audiência, tom e prioridades editoriais</strong> que o agente de IA aplica em TODO relatório gerado.
          O contexto da organização (quando existir) prevalece sobre o contexto global. É usado junto com a camada semântica, a estrutura canônica e os dados do diagnóstico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeId} onValueChange={setActiveId}>
          <TabsList className="flex flex-wrap h-auto">
            {items.map(p => (
              <TabsTrigger key={p.id} value={p.id} className="gap-2">
                {p.org_id ? <Building2 className="h-3 w-3" /> : <Globe2 className="h-3 w-3" />}
                <Badge variant="outline" className="text-[10px] uppercase">{p.scope}</Badge>
                <span className="truncate max-w-[160px]">{p.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {items.map(p => (
            <TabsContent key={p.id} value={p.id} className="space-y-3 mt-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={p.org_id ? "default" : "secondary"}>
                  {p.org_id ? <Building2 className="h-3 w-3 mr-1" /> : <Globe2 className="h-3 w-3 mr-1" />}
                  {orgName(p.org_id)}
                </Badge>
                <Badge variant="outline">v{p.version}</Badge>
                <Badge variant={p.active ? "default" : "outline"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => update(p.id, { active: !p.active })}>
                  {p.active ? "Desativar" : "Ativar"}
                </Button>
                {p.org_id && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(p)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <Input value={p.name} onChange={e => update(p.id, { name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Escopo</label>
                  <Select value={p.scope} onValueChange={(v: any) => update(p.id, { scope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="territorial">Territorial</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <Input value={p.description ?? ""} onChange={e => update(p.id, { description: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Contexto (persona, audiência, tom, foco, prioridades, restrições)
                </label>
                <Textarea
                  value={p.context}
                  onChange={e => update(p.id, { context: e.target.value })}
                  rows={16}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sugestão de seções: <strong>Persona</strong>, <strong>Audiência</strong>, <strong>Tom</strong>, <strong>Foco analítico</strong>, <strong>Prioridades editoriais</strong>, <strong>Restrições</strong>.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save(p)} disabled={saving === p.id}>
                  {saving === p.id
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando…</>
                    : <><Save className="h-4 w-4 mr-1" /> Salvar contexto</>}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium">Criar contexto para uma organização</p>
          <p className="text-xs text-muted-foreground">
            Quando uma organização tem contexto próprio, ele substitui o global ao gerar relatórios daquela org.
          </p>
          <CreateContextRow orgs={orgs} onCreate={createForOrg} isAdmin={isAdmin} myOrgId={profile?.org_id ?? null} existing={items} />
        </div>
      </CardContent>
    </Card>
  );
}

function CreateContextRow({
  orgs, onCreate, isAdmin, myOrgId, existing,
}: {
  orgs: Org[];
  onCreate: (orgId: string | null, scope: "territorial" | "enterprise") => void;
  isAdmin: boolean;
  myOrgId: string | null;
  existing: Profile[];
}) {
  const [orgId, setOrgId] = useState<string>(isAdmin ? (orgs[0]?.id ?? "") : (myOrgId ?? ""));
  const [scope, setScope] = useState<"territorial" | "enterprise">("territorial");
  const dup = existing.some(p => p.org_id === orgId && p.scope === scope);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-muted-foreground">Organização</label>
        <Select value={orgId} onValueChange={setOrgId} disabled={!isAdmin}>
          <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
          <SelectContent>
            {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Escopo</label>
        <Select value={scope} onValueChange={(v: any) => setScope(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="territorial">Territorial</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => onCreate(orgId || null, scope)} disabled={!orgId || dup}>
        <Plus className="h-4 w-4 mr-1" /> {dup ? "Já existe" : "Criar contexto"}
      </Button>
    </div>
  );
}