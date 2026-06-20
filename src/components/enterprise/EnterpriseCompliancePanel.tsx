import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trash2, Loader2, ShieldCheck, AlertTriangle, Clock, FileCheck, Search, Plus } from 'lucide-react';
import { useComplianceItems, ComplianceItem } from '@/hooks/useEnterpriseCompliance';
import { useEnterpriseProfile } from '@/hooks/useEnterpriseProfiles';
import { useProfile } from '@/hooks/useProfile';

interface Props {
  destinationId: string;
  destinationName: string;
}

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'valido', label: 'Válido' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'nao_aplicavel', label: 'Não aplicável' },
];

function statusBadge(status: string, expires_at: string | null) {
  const effective = !expires_at || status === 'nao_aplicavel'
    ? status
    : new Date(expires_at).getTime() < Date.now() ? 'vencido' : 'valido';
  const map: Record<string, { label: string; cls: string }> = {
    valido: { label: 'Válido', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
    vencido: { label: 'Vencido', cls: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
    pendente: { label: 'Pendente', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    nao_aplicavel: { label: 'N/A', cls: 'bg-muted text-muted-foreground border-border' },
  };
  const m = map[effective] || map.pendente;
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function formatCnpj(s: string) {
  const d = s.replace(/\D/g, '').slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})/, '$1.$2.$3/$4').replace(/^(\d{2})(\d{3})(\d{3})/, '$1.$2.$3').replace(/^(\d{2})(\d{3})/, '$1.$2');
}

export function EnterpriseCompliancePanel({ destinationId, destinationName }: Props) {
  const { profile: user } = useProfile();
  const orgId = user?.org_id;
  const { profile: enterpriseProfile } = useEnterpriseProfile(destinationId);
  const profileId = enterpriseProfile?.id;

  const { items, isLoading, seedDefaults, upsertItem, removeItem, validateCnpj, stats } = useComplianceItems(profileId, orgId);

  const [cnpj, setCnpj] = useState('');
  const [cnpjResult, setCnpjResult] = useState<any>(null);
  const [newItem, setNewItem] = useState({ item_label: '', category: 'Outros' });

  const grouped = useMemo(() => {
    const m = new Map<string, ComplianceItem[]>();
    for (const it of items) {
      if (!m.has(it.category)) m.set(it.category, []);
      m.get(it.category)!.push(it);
    }
    return Array.from(m.entries());
  }, [items]);

  if (!orgId || !profileId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Conformidade Legal</CardTitle>
          <CardDescription>Cadastre primeiro o perfil do empreendimento para liberar o checklist de conformidade.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSeed = () => seedDefaults.mutate();

  const handleValidateCnpj = async () => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return;
    const r = await validateCnpj.mutateAsync(clean);
    setCnpjResult(r);
    // Auto-mark CADASTUR if cadastur_status indicates active
    const cadasturItem = items.find((i) => i.item_code === 'CADASTUR');
    if (cadasturItem && r?.data?.cadastur_status === 'ativo') {
      upsertItem.mutate({
        ...cadasturItem,
        status: 'valido',
        document_number: clean,
        auto_checked: true,
        auto_check_source: 'CADASTUR_API',
        validated_at: new Date().toISOString(),
      });
    }
  };

  const handleAddCustom = () => {
    if (!newItem.item_label.trim()) return;
    upsertItem.mutate({
      org_id: orgId,
      enterprise_profile_id: profileId,
      item_code: `CUSTOM_${Date.now()}`,
      item_label: newItem.item_label.trim(),
      category: newItem.category,
      status: 'pendente',
    });
    setNewItem({ item_label: '', category: 'Outros' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" /> Conformidade Legal — {destinationName}
        </CardTitle>
        <CardDescription>
          Checklist de licenças e documentos obrigatórios (CADASTUR, Alvará, AVCB, Sanitário, LGPD).
          Itens vencidos ou pendentes alimentam o indicador ENT_COMPLIANCE_RATE no diagnóstico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><FileCheck className="h-3 w-3" /> Taxa</div>
            <div className="text-2xl font-semibold">{stats.complianceRate.toFixed(0)}%</div>
            <Progress value={stats.complianceRate} className="h-1.5 mt-1" />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Válidos</div>
            <div className="text-2xl font-semibold text-emerald-600">{stats.validCount}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-red-500" /> Vencidos</div>
            <div className="text-2xl font-semibold text-red-600">{stats.expiredCount}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-amber-500" /> Pendentes</div>
            <div className="text-2xl font-semibold text-amber-600">{stats.pendingCount}</div>
          </div>
        </div>

        {/* CNPJ validation */}
        <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
          <Label className="text-sm font-medium">Validação automática via CNPJ</Label>
          <div className="flex gap-2">
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              maxLength={18}
            />
            <Button
              onClick={handleValidateCnpj}
              disabled={cnpj.replace(/\D/g, '').length !== 14 || validateCnpj.isPending}
            >
              {validateCnpj.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Validar</span>
            </Button>
          </div>
          {cnpjResult?.data && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div><strong>Razão social:</strong> {cnpjResult.data.razao_social || '—'}</div>
              <div><strong>Situação:</strong> {cnpjResult.data.situacao_cadastral || '—'}</div>
              <div><strong>CADASTUR:</strong> {cnpjResult.data.cadastur_status || 'não verificado'}</div>
            </div>
          )}
        </div>

        {/* Checklist */}
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Nenhum item no checklist ainda.</p>
            <Button onClick={handleSeed} disabled={seedDefaults.isPending}>
              {seedDefaults.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar checklist padrão
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, rows]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</div>
                {rows.map((it) => (
                  <div key={it.id} className="p-3 rounded-lg border bg-card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{it.item_label}</span>
                          {statusBadge(it.status, it.expires_at)}
                          {it.auto_checked && <Badge variant="secondary" className="text-xs">auto</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(it.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Select
                          value={it.status}
                          onValueChange={(v) => upsertItem.mutate({ ...it, status: v })}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Nº documento</Label>
                        <Input
                          className="h-8"
                          value={it.document_number || ''}
                          onChange={(e) => upsertItem.mutate({ ...it, document_number: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Vence em</Label>
                        <Input
                          type="date"
                          className="h-8"
                          value={it.expires_at || ''}
                          onChange={(e) => upsertItem.mutate({ ...it, expires_at: e.target.value || null })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Add custom item */}
            <div className="p-3 rounded-lg border border-dashed flex gap-2">
              <Input
                placeholder="Adicionar item customizado…"
                value={newItem.item_label}
                onChange={(e) => setNewItem({ ...newItem, item_label: e.target.value })}
              />
              <Input
                placeholder="Categoria"
                className="w-32"
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              />
              <Button onClick={handleAddCustom} disabled={!newItem.item_label.trim()}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}