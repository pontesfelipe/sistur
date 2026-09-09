import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Coins, Infinity as InfinityIcon, Gift, Search, Ban, Plus, ArrowUpDown } from 'lucide-react';

type SortField = 'name' | 'org' | 'used' | 'user_credits' | 'org_credits' | 'status';
interface SortState { field: SortField; dir: 'asc' | 'desc' }

function SortHead({
  field,
  label,
  sort,
  onSort,
}: { field: SortField; label: string; sort: SortState; onSort: (f: SortField) => void }) {
  const active = sort.field === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${active ? 'text-foreground font-medium' : ''}`}
      >
        {label}
        <ArrowUpDown className="h-3 w-3 opacity-60" />
        {active && <span className="text-xs">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </TableHead>
  );
}

interface OverviewRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  org_id: string | null;
  org_name: string | null;
  period: string;
  allowance: number;
  used: number;
  user_credits: number;
  org_credits: number;
  unlimited: boolean;
  unlimited_expires_at: string | null;
}

interface OrgRow { id: string; name: string }

interface UnlimitedRow {
  id: string;
  user_id: string | null;
  org_id: string | null;
  expires_at: string | null;
  reason: string | null;
  campaign: string | null;
  revoked_at: string | null;
  created_at: string;
}

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export function BeniCreditsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // formulário de concessão
  const [target, setTarget] = useState<'user' | 'org'>('user');
  const [targetUser, setTargetUser] = useState('');
  const [targetOrg, setTargetOrg] = useState('');
  const [grantKind, setGrantKind] = useState<'credits' | 'unlimited'>('credits');
  const [amount, setAmount] = useState('50');
  const [source, setSource] = useState('manual');
  const [campaign, setCampaign] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [indefinite, setIndefinite] = useState(true);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['beni-overview', appliedSearch],
    queryFn: async (): Promise<OverviewRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('admin_beni_overview', {
        _search: appliedSearch || null,
        _limit: 200,
      });
      if (error) throw error;
      return (data as OverviewRow[]) ?? [];
    },
  });

  const { data: orgs } = useQuery({
    queryKey: ['beni-credits-orgs'],
    queryFn: async (): Promise<OrgRow[]> => {
      const { data, error } = await supabase.from('orgs').select('id, name').order('name');
      if (error) throw error;
      return (data as unknown as OrgRow[]) ?? [];
    },
  });

  const { data: unlimitedGrants } = useQuery({
    queryKey: ['beni-unlimited-grants'],
    queryFn: async (): Promise<UnlimitedRow[]> => {
      const { data, error } = await supabase
        .from('beni_unlimited_grants' as never)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as UnlimitedRow[]) ?? [];
    },
  });

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    overview?.forEach((r) => m.set(r.user_id, r.full_name || r.email || r.user_id));
    return m;
  }, [overview]);
  const nameByOrg = useMemo(() => {
    const m = new Map<string, string>();
    orgs?.forEach((o) => m.set(o.id, o.name));
    return m;
  }, [orgs]);

  const resetForm = () => {
    setAmount('50');
    setCampaign('');
    setReason('');
    setExpiresAt('');
  };

  const grant = useMutation({
    mutationFn: async () => {
      const _target_user = target === 'user' ? targetUser.trim() || null : null;
      const _target_org = target === 'org' ? targetOrg || null : null;
      const iso = !indefinite && expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null;

      if (grantKind === 'unlimited') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('admin_grant_beni_unlimited', {
          _target_user,
          _target_org,
          _expires_at: iso,
          _reason: reason || null,
          _campaign: campaign || null,
        });
        if (error) throw error;
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_grant_beni_credits', {
        _target_user,
        _target_org,
        _amount: Number(amount),
        _source: source,
        _reason: reason || null,
        _expires_at: iso,
        _campaign: campaign || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(grantKind === 'unlimited' ? 'Acesso ilimitado concedido' : 'Créditos concedidos');
      resetForm();
      qc.invalidateQueries({ queryKey: ['beni-overview'] });
      qc.invalidateQueries({ queryKey: ['beni-unlimited-grants'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('admin_revoke_beni_unlimited', { _grant_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Acesso ilimitado revogado');
      qc.invalidateQueries({ queryKey: ['beni-overview'] });
      qc.invalidateQueries({ queryKey: ['beni-unlimited-grants'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // tabela: filtro por organização, ordenação e concessão por linha/lote
  const [orgFilter, setOrgFilter] = useState('all');
  const [sort, setSort] = useState<SortState>({ field: 'name', dir: 'asc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowAmounts, setRowAmounts] = useState<Record<string, string>>({});
  const [bulkAmount, setBulkAmount] = useState('50');

  const toggleSort = (field: SortField) =>
    setSort((p) => (p.field === field ? { field, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' }));

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const orgOptions = useMemo(() => {
    const m = new Map<string, string>();
    overview?.forEach((r) => { if (r.org_id) m.set(r.org_id, r.org_name || 'Organização'); });
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [overview]);

  const rows = useMemo(() => {
    let list = overview ?? [];
    if (orgFilter === 'none') list = list.filter((r) => !r.org_id);
    else if (orgFilter !== 'all') list = list.filter((r) => r.org_id === orgFilter);
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = (r: OverviewRow) => {
      switch (sort.field) {
        case 'org': return (r.org_name || '').toLowerCase();
        case 'used': return r.used;
        case 'user_credits': return r.user_credits;
        case 'org_credits': return r.org_credits;
        case 'status': return r.unlimited ? 1 : 0;
        default: return (r.full_name || r.email || '').toLowerCase();
      }
    };
    return [...list].sort((a, b) => {
      const ka = key(a); const kb = key(b);
      if (ka === kb) return 0;
      return ka > kb ? dir : -dir;
    });
  }, [overview, orgFilter, sort]);

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.user_id));

  const grantCredits = async (userId: string, value: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('admin_grant_beni_credits', {
      _target_user: userId,
      _target_org: null,
      _amount: value,
      _source: 'manual',
      _reason: 'ajuste rápido no painel',
      _expires_at: null,
      _campaign: null,
    });
    if (error) throw error;
  };

  const refreshOverview = () => qc.invalidateQueries({ queryKey: ['beni-overview'] });

  const rowGrant = useMutation({
    mutationFn: async ({ userId, amount: value }: { userId: string; amount: number }) => {
      if (!value || value <= 0) throw new Error('Informe uma quantidade maior que zero');
      await grantCredits(userId, value);
      return userId;
    },
    onSuccess: (userId) => {
      toast.success('Créditos adicionados');
      setRowAmounts((p) => ({ ...p, [userId]: '' }));
      refreshOverview();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkGrant = useMutation({
    mutationFn: async () => {
      const value = Number(bulkAmount);
      if (!value || value <= 0) throw new Error('Informe uma quantidade maior que zero');
      for (const id of selectedIds) await grantCredits(id, value);
      return selectedIds.size;
    },
    onSuccess: (count) => {
      toast.success(`Créditos adicionados para ${count} usuário(s)`);
      setSelectedIds(new Set());
      refreshOverview();
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const canSubmit =
    (target === 'user' ? !!targetUser.trim() : !!targetOrg) &&
    (grantKind === 'unlimited' || Number(amount) > 0) &&
    (indefinite || !!expiresAt);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Créditos do Professor Beni
          </CardTitle>
          <CardDescription>
            Acompanhe as perguntas usadas por pessoa, conceda créditos promocionais para um usuário ou para toda a
            organização e libere acesso ilimitado por um período ou por tempo indeterminado.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" /> Nova concessão
          </CardTitle>
          <CardDescription>
            Créditos entram depois que a cota mensal do plano acaba. O acesso ilimitado ignora qualquer cota enquanto
            estiver válido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={grantKind} onValueChange={(v) => setGrantKind(v as 'credits' | 'unlimited')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credits">Créditos (quantidade de perguntas)</SelectItem>
                  <SelectItem value="unlimited">Acesso ilimitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destino</Label>
              <Select value={target} onValueChange={(v) => setTarget(v as 'user' | 'org')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="org">Organização inteira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {target === 'org' ? (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Organização</Label>
                <Select value={targetOrg} onValueChange={setTargetOrg}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {orgs?.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Usuário</Label>
                <Select value={targetUser} onValueChange={setTargetUser}>
                  <SelectTrigger><SelectValue placeholder="Selecione na lista abaixo" /></SelectTrigger>
                  <SelectContent>
                    {overview?.map((r) => (
                      <SelectItem key={r.user_id} value={r.user_id}>
                        {r.full_name || r.email || r.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {grantKind === 'credits' && (
              <>
                <div className="space-y-1.5">
                  <Label>Quantidade de perguntas</Label>
                  <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Origem</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual / promocional</SelectItem>
                      <SelectItem value="pack_50">Pacote 50</SelectItem>
                      <SelectItem value="pack_150">Pacote 150</SelectItem>
                      <SelectItem value="pack_org_500">Pacote organização 500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Select value={indefinite ? 'indefinite' : 'date'} onValueChange={(v) => setIndefinite(v === 'indefinite')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">
                    {grantKind === 'unlimited' ? 'Por tempo indeterminado' : 'Padrão (12 meses)'}
                  </SelectItem>
                  <SelectItem value="date">Até uma data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {!indefinite && (
              <div className="space-y-1.5">
                <Label>Vence em</Label>
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Campanha (opcional)</Label>
              <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Ex.: Lançamento 2026" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: cortesia promocional" />
          </div>

          <div className="flex justify-end">
            <Button disabled={!canSubmit || grant.isPending} onClick={() => grant.mutate()}>
              {grantKind === 'unlimited' ? 'Liberar acesso ilimitado' : 'Conceder créditos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base">Créditos por usuário</CardTitle>
            <CardDescription>
              Consumo do mês atual, créditos disponíveis e liberações ilimitadas. Clique nos títulos das colunas para
              ordenar, filtre por organização e adicione créditos direto na linha ou para vários de uma vez.
            </CardDescription>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(search)}
                placeholder="Buscar por nome, e-mail ou organização"
              />
              <Button variant="outline" onClick={() => setAppliedSearch(search)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="md:w-72"><SelectValue placeholder="Todas as organizações" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as organizações</SelectItem>
                <SelectItem value="none">Sem organização</SelectItem>
                {orgOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/40 p-3">
              <div className="text-sm text-muted-foreground">
                {selectedIds.size} selecionado(s)
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Adicionar créditos</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-32"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={bulkGrant.isPending || Number(bulkAmount) <= 0}
                onClick={() => bulkGrant.mutate()}
              >
                <Plus className="h-4 w-4 mr-1" /> Aplicar a todos
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) =>
                          setSelectedIds(v ? new Set(rows.map((r) => r.user_id)) : new Set())
                        }
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <SortHead field="name" label="Pessoa" sort={sort} onSort={toggleSort} />
                    <SortHead field="org" label="Organização" sort={sort} onSort={toggleSort} />
                    <SortHead field="used" label="Uso no mês" sort={sort} onSort={toggleSort} />
                    <SortHead field="user_credits" label="Créditos próprios" sort={sort} onSort={toggleSort} />
                    <SortHead field="org_credits" label="Créditos da organização" sort={sort} onSort={toggleSort} />
                    <SortHead field="status" label="Situação" sort={sort} onSort={toggleSort} />
                    <TableHead className="text-right">Adicionar créditos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(r.user_id)}
                          onCheckedChange={() => toggleSelected(r.user_id)}
                          aria-label="Selecionar usuário"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.full_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.org_name || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {r.unlimited ? 'Ilimitado' : `${r.used} de ${r.allowance}`}
                      </TableCell>
                      <TableCell className="text-sm">{r.user_credits}</TableCell>
                      <TableCell className="text-sm">{r.org_credits}</TableCell>
                      <TableCell>
                        {r.unlimited ? (
                          <Badge className="gap-1">
                            <InfinityIcon className="h-3 w-3" />
                            {r.unlimited_expires_at ? `até ${fmtDate(r.unlimited_expires_at)}` : 'sem prazo'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Cota do plano</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-20"
                            value={rowAmounts[r.user_id] ?? ''}
                            placeholder="50"
                            onChange={(e) => setRowAmounts((p) => ({ ...p, [r.user_id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rowGrant.isPending}
                            onClick={() =>
                              rowGrant.mutate({
                                userId: r.user_id,
                                amount: Number(rowAmounts[r.user_id] || 50),
                              })
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!rows.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <InfinityIcon className="h-4 w-4 text-primary" /> Liberações ilimitadas
          </CardTitle>
          <CardDescription>Promoções e cortesias com acesso sem limite de perguntas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destino</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unlimitedGrants?.map((g) => {
                  const expired = !!g.expires_at && new Date(g.expires_at) <= new Date();
                  const active = !g.revoked_at && !expired;
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="text-sm">
                        {g.user_id
                          ? nameByUser.get(g.user_id) || 'Usuário'
                          : `Organização: ${nameByOrg.get(g.org_id || '') || '—'}`}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.expires_at ? `até ${fmtDate(g.expires_at)}` : 'Indeterminada'}
                      </TableCell>
                      <TableCell className="text-sm">{g.campaign || '—'}</TableCell>
                      <TableCell className="text-sm">{g.reason || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={active ? 'default' : 'outline'}>
                          {g.revoked_at ? 'Revogada' : expired ? 'Expirada' : 'Ativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={revoke.isPending}
                            onClick={() => revoke.mutate(g.id)}
                          >
                            <Ban className="h-4 w-4 mr-1" /> Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!unlimitedGrants?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground">Nenhuma liberação registrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
