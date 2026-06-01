import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ERP_MODULES, useOrgModuleOverrides, useUpsertModuleOverride } from "@/hooks/useOrgModules";

export default function AdminEmpacotamento() {
  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs-empacotamento"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orgs")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [orgId, setOrgId] = useState<string>("");
  const { data: overrides = [] } = useOrgModuleOverrides(orgId || null);
  const upsert = useUpsertModuleOverride();

  const isEnabled = (key: string) => {
    const o = overrides.find((x) => x.module_key === key);
    return o ? o.enabled : true;
  };

  const handleToggle = (key: string, value: boolean) => {
    if (!orgId) return;
    upsert.mutate({ org_id: orgId, module_key: key, enabled: value });
  };

  return (
    <AppLayout title="Empacotamento ERP Modular">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" />
            Empacotamento ERP Modular
          </h1>
          <p className="text-muted-foreground mt-1">
            Habilite ou desabilite módulos do ERP individualmente por organização.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
            <CardDescription>Selecione para gerenciar o pacote contratado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {orgs.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {orgId && (
          <Card>
            <CardHeader>
              <CardTitle>Módulos contratados</CardTitle>
              <CardDescription>
                Por padrão, todos os módulos ficam habilitados. Desabilite para criar pacotes customizados (ex: ICP A apenas com Diagnóstico).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ERP_MODULES.map((m) => (
                <div key={m.key} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1 pr-4">
                    <Label className="text-base font-medium">{m.label}</Label>
                    <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled(m.key)}
                    onCheckedChange={(v) => handleToggle(m.key, v)}
                    disabled={upsert.isPending}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}