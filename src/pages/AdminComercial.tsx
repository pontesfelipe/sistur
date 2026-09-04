import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { usePlans, formatPlanPrice } from '@/hooks/useEntitlements';
import { toast } from 'sonner';

interface OrgRow { id: string; name: string; org_kind: string | null }
interface SubscriptionRow {
  id: string; org_id: string | null; user_id: string | null; plan_id: string;
  status: string; seats: number; started_at: string; current_period_end: string | null;
  source: string; notes: string | null;
}
interface OverrideRow {
  id: string; org_id: string | null; user_id: string | null; feature: string;
  enabled: boolean; expires_at: string | null; reason: string | null;
}
interface BeniUsageRow {
  id: string; user_id: string; org_id: string | null; source: string;
  question_chars: number | null; created_at: string;
}
interface BeniQuotaRow {
  id: string; user_id: string; period: string; allowance: number; used: number;
}
interface BeniCreditRow {
  id: string; user_id: string | null; org_id: string | null; balance: number;
  source: string; expires_at: string; reason: string | null; created_at: string;
}

export default function AdminComercial() {
  const qc = useQueryClient();
  const { data: plans } = usePlans();

  const { data: orgs } = useQuery({
    queryKey: ['admin-orgs-comercial'],
    queryFn: async (): Promise<OrgRow[]> => {
      const { data, error } = await supabase.from('orgs').select('id, name, org_kind' as never).order('name');
      if (error) throw error;
      return (data as unknown as OrgRow[]) ?? [];
    },
  });

  const { data: subs, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await supabase.from('subscriptions' as never).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as SubscriptionRow[]) ?? [];
    },
  });

  const { data: overrides } = useQuery({
    queryKey: ['admin-entitlement-overrides'],
    queryFn: async (): Promise<OverrideRow[]> => {
      const { data, error } = await supabase.from('entitlement_overrides' as never).select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as OverrideRow[]) ?? [];
    },
  });

  const { data: beniUsage } = useQuery({
    queryKey: ['admin-beni-usage'],
    queryFn: async (): Promise<BeniUsageRow[]> => {
      const { data, error } = await supabase
        .from('beni_usage_log' as never)
        .select('id, user_id, org_id, source, question_chars, created_at' as never)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as BeniUsageRow[]) ?? [];
    },
  });

  const { data: beniQuotas } = useQuery({
    queryKey: ['admin-beni-quotas'],
    queryFn: async (): Promise<BeniQuotaRow[]> => {
      const { data, error } = await supabase
        .from('beni_quotas' as never)
        .select('id, user_id, period, allowance, used' as never)
        .order('used', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as BeniQuotaRow[]) ?? [];
    },
  });

  const { data: beniCredits } = useQuery({
    queryKey: ['admin-beni-credits'],
    queryFn: async (): Promise<BeniCreditRow[]> => {
      const { data, error } = await supabase
        .from('beni_credits' as never)
        .select('id, user_id, org_id, balance, source, expires_at, reason, created_at' as never)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as BeniCreditRow[]) ?? [];
    },
  });

  const [creditTarget, setCreditTarget] = useState<'org' | 'user'>('org');
  const [creditOrg, setCreditOrg] = useState('');
  const [creditUser, setCreditUser] = useState('');
  const [creditAmount, setCreditAmount] = useState('50');
  const [creditSource, setCreditSource] = useState('manual');
  const [creditReason, setCreditReason] = useState('');

  const grantCredits = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_grant_beni_credits', {
        _target_user: creditTarget === 'user' ? creditUser : null,
        _target_org: creditTarget === 'org' ? creditOrg : null,
        _amount: Number(creditAmount) || 0,
        _source: creditSource,
        _reason: creditReason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Créditos concedidos');
      setCreditReason('');
      qc.invalidateQueries({ queryKey: ['admin-beni-credits'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [orgId, setOrgId] = useState('');
  const [planId, setPlanId] = useState('');
  const [seats, setSeats] = useState('5');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  const createSub = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('subscriptions' as never).insert({
        org_id: orgId,
        plan_id: planId,
        seats: Number(seats) || 1,
        current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
        notes: notes || null,
        source: 'manual',
        status: 'active',
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assinatura registrada');
      setNotes(''); setPeriodEnd('');
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('subscriptions' as never).update({ status } as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Assinatura atualizada');
      qc.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [ovrOrg, setOvrOrg] = useState('');
  const [ovrFeature, setOvrFeature] = useState('');
  const createOverride = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('entitlement_overrides' as never).insert({
        org_id: ovrOrg, feature: ovrFeature, enabled: true, reason: 'Concessão administrativa',
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Concessão criada');
      setOvrFeature('');
      qc.invalidateQueries({ queryKey: ['admin-entitlement-overrides'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const orgName = (id: string | null) => orgs?.find(o => o.id === id)?.name ?? (id ? id.slice(0, 8) : '—');
  const planName = (id: string) => plans?.find(p => p.id === id)?.name ?? id.slice(0, 8);

  return (
    <AppLayout title="Comercial" subtitle="Planos, assinaturas e concessões">
      <Tabs defaultValue="assinaturas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="concessoes">Concessões</TabsTrigger>
          <TabsTrigger value="beni">Beni</TabsTrigger>
        </TabsList>

        <TabsContent value="assinaturas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova assinatura manual</CardTitle>
              <CardDescription>Use para contratos Territoriais (empenho) e ativações negociadas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Organização</Label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {orgs?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {plans?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assentos</Label>
                <Input type="number" min={1} value={seats} onChange={e => setSeats(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fim do período</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
              <Button
                disabled={!orgId || !planId || createSub.isPending}
                onClick={() => createSub.mutate()}
              >
                Registrar
              </Button>
              <div className="md:col-span-5 space-y-1.5">
                <Label>Observações (contrato, empenho, processo)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: Contrato 2026/014" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Assinaturas ativas e históricas</CardTitle></CardHeader>
            <CardContent>
              {subsLoading ? <Skeleton className="h-32" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organização</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead>Assentos</TableHead>
                      <TableHead>Vigência</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subs ?? []).map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{orgName(s.org_id)}</TableCell>
                        <TableCell>{planName(s.plan_id)}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                        </TableCell>
                        <TableCell>{s.seats}</TableCell>
                        <TableCell>
                          {s.current_period_end
                            ? new Date(s.current_period_end).toLocaleDateString('pt-BR')
                            : 'Sem prazo'}
                        </TableCell>
                        <TableCell>{s.source}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStatus.mutate({ id: s.id, status: s.status === 'active' ? 'suspended' : 'active' })}
                          >
                            {s.status === 'active' ? 'Suspender' : 'Reativar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!subs?.length && (
                      <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma assinatura registrada.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos">
          <Card>
            <CardHeader><CardTitle className="text-base">Catálogo vigente</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Público</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Recursos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(plans ?? []).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name} <span className="text-xs text-muted-foreground">v{p.version}</span></TableCell>
                      <TableCell>{p.audience}</TableCell>
                      <TableCell>{formatPlanPrice(p)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {Object.entries(p.features || {}).filter(([, v]) => v).map(([k]) => k).join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="concessoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova concessão</CardTitle>
              <CardDescription>Libera um recurso específico para a organização, independente do plano.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Organização</Label>
                <Select value={ovrOrg} onValueChange={setOvrOrg}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {orgs?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recurso</Label>
                <Input value={ovrFeature} onChange={e => setOvrFeature(e.target.value)} placeholder="ex.: reports" />
              </div>
              <Button disabled={!ovrOrg || !ovrFeature || createOverride.isPending} onClick={() => createOverride.mutate()}>
                Conceder
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Concessões vigentes</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Validade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overrides ?? []).map(o => (
                    <TableRow key={o.id}>
                      <TableCell>{orgName(o.org_id)}</TableCell>
                      <TableCell>{o.feature}</TableCell>
                      <TableCell>{o.enabled ? 'Liberado' : 'Bloqueado'}</TableCell>
                      <TableCell>{o.expires_at ? new Date(o.expires_at).toLocaleDateString('pt-BR') : 'Sem prazo'}</TableCell>
                    </TableRow>
                  ))}
                  {!overrides?.length && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">Nenhuma concessão registrada.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beni" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conceder créditos do Professor Beni</CardTitle>
              <CardDescription>
                Créditos valem 12 meses e são consumidos após a cota mensal. Pacotes: 50 (R$ 14,90), 150 (R$ 34,90), org 500 (R$ 99).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={creditTarget} onValueChange={(v) => setCreditTarget(v as 'org' | 'user')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org">Organização</SelectItem>
                    <SelectItem value="user">Usuário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {creditTarget === 'org' ? (
                <div className="space-y-1.5">
                  <Label>Organização</Label>
                  <Select value={creditOrg} onValueChange={setCreditOrg}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {orgs?.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>ID do usuário</Label>
                  <Input value={creditUser} onChange={e => setCreditUser(e.target.value)} placeholder="uuid" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={creditSource} onValueChange={setCreditSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="pack_50">Pacote 50</SelectItem>
                    <SelectItem value="pack_150">Pacote 150</SelectItem>
                    <SelectItem value="pack_org_500">Pacote org 500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                disabled={grantCredits.isPending || (creditTarget === 'org' ? !creditOrg : !creditUser) || !(Number(creditAmount) > 0)}
                onClick={() => grantCredits.mutate()}
              >
                Conceder
              </Button>
              <div className="md:col-span-5 space-y-1.5">
                <Label>Motivo</Label>
                <Input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Ex.: Compra pacote 50 — pedido #123" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Créditos ativos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destino</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(beniCredits ?? []).map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.org_id ? orgName(c.org_id) : `Usuário ${c.user_id?.slice(0, 8)}`}</TableCell>
                      <TableCell>{c.balance}</TableCell>
                      <TableCell>{c.source}</TableCell>
                      <TableCell>{new Date(c.expires_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.reason ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!beniCredits?.length && (
                    <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum crédito concedido.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cotas do período (top consumidores)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Usado</TableHead>
                    <TableHead>Cota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(beniQuotas ?? []).map(q => (
                    <TableRow key={q.id}>
                      <TableCell>{q.user_id.slice(0, 8)}</TableCell>
                      <TableCell>{q.period === 'trial' ? 'Teste' : q.period}</TableCell>
                      <TableCell>{q.used}</TableCell>
                      <TableCell>{q.allowance}</TableCell>
                    </TableRow>
                  ))}
                  {!beniQuotas?.length && (
                    <TableRow><TableCell colSpan={4} className="text-muted-foreground">Nenhum consumo registrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Uso recente</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Organização</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Caracteres</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(beniUsage ?? []).map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{new Date(u.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{u.user_id.slice(0, 8)}</TableCell>
                      <TableCell>{u.org_id ? orgName(u.org_id) : '—'}</TableCell>
                      <TableCell>{u.source}</TableCell>
                      <TableCell>{u.question_chars ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                  {!beniUsage?.length && (
                    <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhum uso registrado.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
