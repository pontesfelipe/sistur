import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, UserCheck, Clock, AlertTriangle, Crown, X, Check, RefreshCw, Plus, Building2, Users, ArrowRightLeft, FlaskConical, Ban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { LicensePlan, LicenseStatus } from '@/contexts/LicenseContext';
import { TrialControlPanel } from '@/components/admin/TrialControlPanel';
import { filterBusinessOrganizations } from '@/lib/organizationVisibility';
import { AdminCancelLicenseDialog } from '@/components/admin/AdminCancelLicenseDialog';

interface LicenseRow {
  id: string;
  user_id: string;
  org_id: string | null;
  plan: LicensePlan;
  status: LicenseStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  activated_at: string;
  expires_at: string | null;
  max_users: number;
  features: Record<string, boolean>;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  profile?: { full_name: string | null; org_id: string };
  email?: string;
  org_name?: string;
}

interface OrgQuota {
  id: string;
  org_id: string;
  plan: LicensePlan;
  max_licenses: number;
  notes: string | null;
  org_name?: string;
}

interface OrgInfo {
  id: string;
  name: string;
}

const PLAN_CONFIG: Record<LicensePlan, { label: string; color: string; icon: string }> = {
  trial: { label: 'Avaliação', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '⏳' },
  estudante: { label: 'Estudante', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: '🎓' },
  professor: { label: 'Professor', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '📖' },
  basic: { label: 'Básico', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '📦' },
  pro: { label: 'Pro', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '⭐' },
  enterprise: { label: 'Enterprise', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '👑' },
};

const STATUS_CONFIG: Record<LicenseStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'bg-emerald-500/20 text-emerald-400' },
  expired: { label: 'Expirado', color: 'bg-red-500/20 text-red-400' },
  cancelled: { label: 'Cancelado', color: 'bg-slate-500/20 text-slate-400' },
  suspended: { label: 'Suspenso', color: 'bg-amber-500/20 text-amber-400' },
};

const DEFAULT_FEATURES: Record<LicensePlan, Record<string, boolean>> = {
  trial: { erp: true, edu: true, games: true, reports: false, integrations: false },
  estudante: { erp: false, edu: true, games: true, reports: false, integrations: false },
  professor: { erp: false, edu: true, games: true, reports: true, integrations: false },
  basic: { erp: true, edu: true, games: true, reports: true, integrations: false },
  pro: { erp: true, edu: true, games: true, reports: true, integrations: true },
  enterprise: { erp: true, edu: true, games: true, reports: true, integrations: true },
};

const ALL_PLANS: LicensePlan[] = ['trial', 'estudante', 'professor', 'basic', 'pro', 'enterprise'];

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [quotas, setQuotas] = useState<OrgQuota[]>([]);
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<LicensePlan | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<LicenseStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<LicensePlan>('trial');
  const [editStatus, setEditStatus] = useState<LicenseStatus>('active');
  const [editExpires, setEditExpires] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Assign license dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignOrgId, setAssignOrgId] = useState('');
  const [assignPlan, setAssignPlan] = useState<LicensePlan>('basic');
  const [assignExpires, setAssignExpires] = useState('');
  const [assignMode, setAssignMode] = useState<'user' | 'org'>('user');
  const [assignUserId, setAssignUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<{ user_id: string; full_name: string; email?: string }[]>([]);

  // Quota dialog
  const [showQuotaDialog, setShowQuotaDialog] = useState(false);
  const [quotaOrgId, setQuotaOrgId] = useState('');
  const [quotaPlan, setQuotaPlan] = useState<LicensePlan>('basic');
  const [quotaMax, setQuotaMax] = useState(10);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<LicenseRow | null>(null);

  const fetchOrgs = async () => {
    const { data } = await supabase.from('orgs').select('id, name').order('name');
    setOrgs(data || []);
  };

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];

      // Fetch profiles for all user_ids (including pending_approval status)
      const userIds = [...new Set(rows.map((l: any) => l.user_id).filter(Boolean))] as string[];
      let profileMap: Record<string, { full_name: string | null; org_id: string; pending_approval: boolean }> = {};
      const pendingUserIds = new Set<string>();
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name, org_id, pending_approval')
          .in('user_id', userIds);
        for (const p of profileData || []) {
          profileMap[p.user_id] = { full_name: p.full_name, org_id: p.org_id, pending_approval: !!p.pending_approval };
          if (p.pending_approval) pendingUserIds.add(p.user_id);
        }
      }

      // Filter out licenses belonging to users still pending approval
      const approvedRows = rows.filter((l: any) => !pendingUserIds.has(l.user_id));

      // Fetch org names
      const orgIds = [...new Set(rows.map((l: any) => l.org_id).filter(Boolean))] as string[];
      let orgMap: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgData } = await supabase.from('orgs').select('id, name').in('id', orgIds);
        for (const o of orgData || []) orgMap[o.id] = o.name;
      }

      setLicenses(approvedRows.map((l: any) => ({
        ...l,
        plan: l.plan as LicensePlan,
        status: l.status as LicenseStatus,
        features: (l.features as Record<string, boolean>) ?? {},
        profile: profileMap[l.user_id] || null,
        org_name: l.org_id ? orgMap[l.org_id] : undefined,
      })));
    } catch (err: any) {
      console.error('Error fetching licenses:', err);
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotas = async () => {
    const { data } = await (supabase as any)
      .from('org_license_quotas')
      .select('*, orgs:org_id(name)')
      .order('created_at', { ascending: false });

    setQuotas((data || []).map((q: any) => ({
      ...q,
      org_name: q.orgs?.name,
    })));
  };

  useEffect(() => {
    fetchOrgs();
    fetchLicenses();
    fetchQuotas();
  }, []);

  const handleStartEdit = (license: LicenseRow) => {
    setEditingId(license.id);
    setEditPlan(license.plan);
    setEditStatus(license.status);
    // For trials, use trial_ends_at; for paid plans, use expires_at
    const expDate = license.plan === 'trial' ? license.trial_ends_at : license.expires_at;
    setEditExpires(expDate ? new Date(expDate).toISOString().split('T')[0] : '');
    setEditNotes(license.notes || '');
  };

  const handleSave = async (license: LicenseRow) => {
    try {
      const features = DEFAULT_FEATURES[editPlan];
      const updateData: Record<string, any> = {
        plan: editPlan,
        status: editStatus,
        features,
        notes: editNotes || null,
        activated_at: editPlan !== license.plan ? new Date().toISOString() : license.activated_at,
        updated_at: new Date().toISOString(),
      };

      // Handle trial_ends_at for trial plans, expires_at for paid plans
      if (editPlan === 'trial') {
        updateData.trial_ends_at = editExpires ? new Date(editExpires + 'T23:59:59').toISOString() : null;
        // Reactivate if extending an expired trial
        if (editExpires && editStatus === 'active') {
          const newEnd = new Date(editExpires + 'T23:59:59');
          if (newEnd > new Date() && license.status === 'expired') {
            updateData.status = 'active';
          }
        }
      } else {
        updateData.expires_at = editExpires ? new Date(editExpires).toISOString() : null;
      }

      const { error } = await (supabase as any)
        .from('licenses')
        .update(updateData)
        .eq('id', license.id);

      if (error) throw error;

      toast.success(`Licença de ${license.profile?.full_name || 'usuário'} atualizada`);
      setEditingId(null);
      fetchLicenses();
    } catch (err: any) {
      toast.error('Erro ao atualizar licença: ' + err.message);
    }
  };

  const handleExpireTrials = async () => {
    try {
      const { error } = await (supabase as any).rpc('expire_trial_licenses');
      if (error) throw error;
      toast.success('Trials expirados atualizados');
      fetchLicenses();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  // Fetch users without license or for org
  const fetchAvailableUsers = async (orgId?: string) => {
    try {
      let query = supabase.from('profiles').select('user_id, full_name').eq('pending_approval', false);
      if (orgId) query = query.eq('org_id', orgId);
      const { data } = await query;
      setAvailableUsers(data || []);
    } catch {
      setAvailableUsers([]);
    }
  };

  const handleAssignLicense = async () => {
    try {
      if (assignMode === 'user') {
        if (!assignUserId) { toast.error('Selecione um usuário'); return; }

        // Check quota
        if (assignOrgId) {
          const { data: usage } = await (supabase as any).rpc('get_org_license_usage', {
            p_org_id: assignOrgId,
            p_plan: assignPlan,
          });
          if (usage && usage.length > 0 && usage[0].available <= 0) {
            toast.error('Cota de licenças esgotada para este plano nesta organização');
            return;
          }
        }

        const features = DEFAULT_FEATURES[assignPlan];
        const { error } = await (supabase as any)
          .from('licenses')
          .upsert({
            user_id: assignUserId,
            org_id: assignOrgId || null,
            plan: assignPlan,
            status: 'active',
            activated_at: new Date().toISOString(),
            expires_at: assignExpires ? new Date(assignExpires).toISOString() : null,
            features,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) throw error;
        toast.success('Licença atribuída com sucesso');

      } else {
        // Assign to all org users
        if (!assignOrgId) { toast.error('Selecione uma organização'); return; }

        const { data: orgUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('org_id', assignOrgId)
          .eq('pending_approval', false);

        if (!orgUsers?.length) {
          toast.error('Nenhum usuário aprovado nesta organização');
          return;
        }

        const features = DEFAULT_FEATURES[assignPlan];
        const records = orgUsers.map(u => ({
          user_id: u.user_id,
          org_id: assignOrgId,
          plan: assignPlan,
          status: 'active' as const,
          activated_at: new Date().toISOString(),
          expires_at: assignExpires ? new Date(assignExpires).toISOString() : null,
          features,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await (supabase as any)
          .from('licenses')
          .upsert(records, { onConflict: 'user_id' });

        if (error) throw error;
        toast.success(`${orgUsers.length} licenças atribuídas`);
      }

      setShowAssignDialog(false);
      fetchLicenses();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const handleSaveQuota = async () => {
    try {
      if (!quotaOrgId) { toast.error('Selecione uma organização'); return; }
      const { error } = await (supabase as any)
        .from('org_license_quotas')
        .upsert({
          org_id: quotaOrgId,
          plan: quotaPlan,
          max_licenses: quotaMax,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,plan' });

      if (error) throw error;
      toast.success('Cota atualizada');
      setShowQuotaDialog(false);
      fetchQuotas();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  };

  const filtered = licenses.filter(l => {
    if (filterPlan !== 'all' && l.plan !== filterPlan) return false;
    if (filterStatus !== 'all' && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = l.profile?.full_name?.toLowerCase() || '';
      const email = l.email?.toLowerCase() || '';
      const org = l.org_name?.toLowerCase() || '';
      if (!name.includes(q) && !email.includes(q) && !org.includes(q)) return false;
    }
    return true;
  });

  // Exclude SISTUR internal org from external-facing stats
  const externalLicenses = licenses.filter(l => l.org_name !== 'SISTUR');

  const stats = {
    total: externalLicenses.length,
    active: externalLicenses.filter(l => l.status === 'active').length,
    trial: externalLicenses.filter(l => l.plan === 'trial' && l.status === 'active').length,
    expired: externalLicenses.filter(l => l.status === 'expired').length,
    paid: externalLicenses.filter(l => l.plan !== 'trial' && l.status === 'active').length,
  };

  return (
    <AppLayout title="Gestão de Licenças" subtitle="Controle de planos, cotas e acessos por usuário e organização">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Shield, color: 'text-muted-foreground' },
            { label: 'Ativos', value: stats.active, icon: UserCheck, color: 'text-emerald-400' },
            { label: 'Em Trial', value: stats.trial, icon: Clock, color: 'text-amber-400' },
            { label: 'Pagos', value: stats.paid, icon: Crown, color: 'text-purple-400' },
            { label: 'Expirados', value: stats.expired, icon: AlertTriangle, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <s.icon className={cn('h-5 w-5', s.color)} />
              <div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs defaultValue="licenses">
          <TabsList>
            <TabsTrigger value="licenses" className="gap-1.5"><Users className="h-4 w-4" /> Licenças</TabsTrigger>
            <TabsTrigger value="trials" className="gap-1.5"><FlaskConical className="h-4 w-4" /> Controle de Trials</TabsTrigger>
            <TabsTrigger value="quotas" className="gap-1.5"><Building2 className="h-4 w-4" /> Cotas por Organização</TabsTrigger>
          </TabsList>

          <TabsContent value="licenses" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, email ou organização..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as any)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
                <option value="all">Todos os planos</option>
                {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_CONFIG[p].icon} {PLAN_CONFIG[p].label}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
                <option value="all">Todos os status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={handleExpireTrials} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Expirar trials
              </Button>
              <Button size="sm" onClick={() => { setShowAssignDialog(true); setAssignMode('user'); fetchAvailableUsers(); }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Atribuir Licença
              </Button>
            </div>

            {/* Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organização</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expira</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Carregando licenças...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Nenhuma licença encontrada</td></tr>
                    ) : filtered.map(license => {
                      const isEditing = editingId === license.id;
                      const planCfg = PLAN_CONFIG[license.plan];
                      const statusCfg = STATUS_CONFIG[license.status];

                      return (
                        <tr key={license.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium">{license.profile?.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground">{license.email || license.user_id.slice(0, 8)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{license.org_name || '—'}</td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select value={editPlan} onChange={e => setEditPlan(e.target.value as LicensePlan)} className="h-8 rounded border border-border bg-background px-2 text-xs">
                                {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_CONFIG[p].label}</option>)}
                              </select>
                            ) : (
                              <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', planCfg.color)}>
                                {planCfg.icon} {planCfg.label}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <select value={editStatus} onChange={e => setEditStatus(e.target.value as LicenseStatus)} className="h-8 rounded border border-border bg-background px-2 text-xs">
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusCfg.color)}>
                                  {statusCfg.label}
                                </span>
                                {license.plan === 'trial' && license.status === 'active' && (
                                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    ⏳ Trial
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {isEditing ? (
                              <input type="date" value={editExpires} onChange={e => setEditExpires(e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs" />
                            ) : (() => {
                              const expDate = license.trial_ends_at || license.expires_at;
                              if (!expDate) return <span className="text-emerald-400 font-medium">Sem expiração</span>;
                              const remaining = Math.ceil((new Date(expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                              return (
                                <div>
                                  <span>{new Date(expDate).toLocaleDateString('pt-BR')}</span>
                                  {license.plan === 'trial' && license.status === 'active' && remaining > 0 && (
                                    <span className="block text-amber-400 font-medium">{remaining} dia{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}</span>
                                  )}
                                  {remaining <= 0 && <span className="block text-destructive font-medium">Vencido</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center gap-1 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 p-0"><X className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" onClick={() => handleSave(license)} className="h-7 gap-1 text-xs"><Check className="h-3.5 w-3.5" /> Salvar</Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-end">
                                <Button size="sm" variant="outline" onClick={() => handleStartEdit(license)} className="h-7 text-xs">Editar</Button>
                                {license.status === 'active' && (
                                  <Button size="sm" variant="ghost" onClick={() => setCancelTarget(license)} className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1">
                                    <Ban className="h-3 w-3" /> Cancelar
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trials" className="mt-4">
            <TrialControlPanel />
          </TabsContent>

          <TabsContent value="quotas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Defina quantas licenças de cada plano cada organização pode distribuir.</p>
              <Button size="sm" onClick={() => setShowQuotaDialog(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Definir Cota
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{filterBusinessOrganizations(orgs).map(org => {
                const orgQuotas = quotas.filter(q => q.org_id === org.id);
                const orgLicenses = licenses.filter(l => l.org_id === org.id && l.status === 'active');

                return (
                  <div key={org.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-bold text-sm">{org.name}</h4>
                      <Badge variant="outline" className="text-xs ml-auto">{orgLicenses.length} licenças ativas</Badge>
                    </div>
                    {orgQuotas.length > 0 ? (
                      <div className="space-y-2">
                        {orgQuotas.map(q => {
                          const used = orgLicenses.filter(l => l.plan === q.plan).length;
                          const pct = q.max_licenses > 0 ? (used / q.max_licenses) * 100 : 0;
                          return (
                            <div key={q.id} className="flex items-center gap-2 text-xs">
                              <span className={cn('font-bold px-1.5 py-0.5 rounded-full border', PLAN_CONFIG[q.plan].color)}>
                                {PLAN_CONFIG[q.plan].icon} {PLAN_CONFIG[q.plan].label}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-muted-foreground tabular-nums">{used}/{q.max_licenses}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma cota definida</p>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Assign License Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Atribuir Licença
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Modo de atribuição</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={assignMode === 'user' ? 'default' : 'outline'} onClick={() => setAssignMode('user')} className="flex-1 text-xs">
                  Usuário específico
                </Button>
                <Button size="sm" variant={assignMode === 'org' ? 'default' : 'outline'} onClick={() => setAssignMode('org')} className="flex-1 text-xs">
                  Toda organização
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Organização</Label>
              <select value={assignOrgId} onChange={e => { setAssignOrgId(e.target.value); if (assignMode === 'user') fetchAvailableUsers(e.target.value); }} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1">
                <option value="">Selecione...</option>
                {filterBusinessOrganizations(orgs).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {assignMode === 'user' && (
              <div>
                <Label className="text-xs">Usuário</Label>
                <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1">
                  <option value="">Selecione...</option>
                  {availableUsers.map(u => <option key={u.user_id} value={u.user_id}>{u.full_name || u.user_id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs">Plano</Label>
              <select value={assignPlan} onChange={e => setAssignPlan(e.target.value as LicensePlan)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1">
                {ALL_PLANS.filter(p => p !== 'trial').map(p => <option key={p} value={p}>{PLAN_CONFIG[p].icon} {PLAN_CONFIG[p].label}</option>)}
              </select>
            </div>

            <div>
              <Label className="text-xs">Data de expiração (vazio = sem expiração)</Label>
              <Input type="date" value={assignExpires} onChange={e => setAssignExpires(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssignLicense}>Atribuir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quota Dialog */}
      <Dialog open={showQuotaDialog} onOpenChange={setShowQuotaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Definir Cota de Licenças</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Organização</Label>
              <select value={quotaOrgId} onChange={e => setQuotaOrgId(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1">
                <option value="">Selecione...</option>
                {filterBusinessOrganizations(orgs).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Plano</Label>
              <select value={quotaPlan} onChange={e => setQuotaPlan(e.target.value as LicensePlan)} className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm mt-1">
                {ALL_PLANS.map(p => <option key={p} value={p}>{PLAN_CONFIG[p].label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Máximo de licenças</Label>
              <Input type="number" min={0} value={quotaMax} onChange={e => setQuotaMax(Number(e.target.value))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuotaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveQuota}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cancelTarget && (
        <AdminCancelLicenseDialog
          open={!!cancelTarget}
          onOpenChange={open => { if (!open) setCancelTarget(null); }}
          licenseId={cancelTarget.id}
          userName={cancelTarget.profile?.full_name || cancelTarget.email || 'Usuário'}
          planLabel={PLAN_CONFIG[cancelTarget.plan].label}
          onCancelled={() => { setCancelTarget(null); fetchLicenses(); }}
        />
      )}
    </AppLayout>
  );
}
