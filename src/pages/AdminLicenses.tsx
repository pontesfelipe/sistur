import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, UserCheck, Clock, AlertTriangle, Crown, ChevronDown, X, Check, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { LicensePlan, LicenseStatus } from '@/contexts/LicenseContext';

interface LicenseRow {
  id: string;
  user_id: string;
  plan: LicensePlan;
  status: LicenseStatus;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  activated_at: string;
  expires_at: string | null;
  max_users: number;
  features: Record<string, boolean>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: {
    full_name: string | null;
    org_id: string;
  };
  email?: string;
}

const PLAN_CONFIG: Record<LicensePlan, { label: string; color: string; icon: string }> = {
  trial: { label: 'Avaliação', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '⏳' },
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
  basic: { erp: true, edu: true, games: true, reports: true, integrations: false },
  pro: { erp: true, edu: true, games: true, reports: true, integrations: true },
  enterprise: { erp: true, edu: true, games: true, reports: true, integrations: true },
};

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<LicensePlan | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<LicenseStatus | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<LicensePlan>('trial');
  const [editStatus, setEditStatus] = useState<LicenseStatus>('active');
  const [editExpires, setEditExpires] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*, profiles:user_id(full_name, org_id)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Also fetch emails from auth
      const userIds = (data || []).map(l => l.user_id);
      let emailMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: users } = await supabase.auth.admin.listUsers();
        if (users?.users) {
          for (const u of users.users) {
            emailMap[u.id] = u.email || '';
          }
        }
      }

      setLicenses((data || []).map(l => ({
        ...l,
        plan: l.plan as LicensePlan,
        status: l.status as LicenseStatus,
        features: (l.features as Record<string, boolean>) ?? {},
        profile: l.profiles as any,
        email: emailMap[l.user_id] || '',
      })));
    } catch (err: any) {
      console.error('Error fetching licenses:', err);
      toast.error('Erro ao carregar licenças');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLicenses(); }, []);

  const handleStartEdit = (license: LicenseRow) => {
    setEditingId(license.id);
    setEditPlan(license.plan);
    setEditStatus(license.status);
    setEditExpires(license.expires_at ? new Date(license.expires_at).toISOString().split('T')[0] : '');
    setEditNotes(license.notes || '');
  };

  const handleSave = async (license: LicenseRow) => {
    try {
      const features = DEFAULT_FEATURES[editPlan];
      const { error } = await supabase
        .from('licenses')
        .update({
          plan: editPlan,
          status: editStatus,
          expires_at: editExpires ? new Date(editExpires).toISOString() : null,
          features,
          notes: editNotes || null,
          activated_at: editPlan !== license.plan ? new Date().toISOString() : license.activated_at,
        })
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
      const { error } = await supabase.rpc('expire_trial_licenses');
      if (error) throw error;
      toast.success('Trials expirados atualizados');
      fetchLicenses();
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
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    trial: licenses.filter(l => l.plan === 'trial' && l.status === 'active').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    paid: licenses.filter(l => l.plan !== 'trial' && l.status === 'active').length,
  };

  return (
    <AppLayout title="Gestão de Licenças" subtitle="Controle de planos, trials e acessos">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: Shield, color: 'text-slate-400' },
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value as any)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="all">Todos os planos</option>
            <option value="trial">Avaliação</option>
            <option value="basic">Básico</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="expired">Expirado</option>
            <option value="cancelled">Cancelado</option>
            <option value="suspended">Suspenso</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleExpireTrials} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Expirar trials
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLicenses} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usuário</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plano</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Trial</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expira</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Carregando licenças...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhuma licença encontrada
                    </td>
                  </tr>
                ) : filtered.map(license => {
                  const isEditing = editingId === license.id;
                  const planCfg = PLAN_CONFIG[license.plan];
                  const statusCfg = STATUS_CONFIG[license.status];
                  const trialEnd = license.trial_ends_at ? new Date(license.trial_ends_at) : null;
                  const trialRemaining = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

                  return (
                    <tr key={license.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{license.profile?.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{license.email || license.user_id.slice(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={editPlan} onChange={e => setEditPlan(e.target.value as LicensePlan)} className="h-8 rounded border border-border bg-background px-2 text-xs">
                            <option value="trial">Avaliação</option>
                            <option value="basic">Básico</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
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
                            <option value="active">Ativo</option>
                            <option value="expired">Expirado</option>
                            <option value="cancelled">Cancelado</option>
                            <option value="suspended">Suspenso</option>
                          </select>
                        ) : (
                          <span className={cn('text-xs font-medium px-2 py-1 rounded-full', statusCfg.color)}>
                            {statusCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {license.plan === 'trial' && trialRemaining !== null ? (
                          <span className={cn(trialRemaining <= 1 ? 'text-red-400 font-bold' : trialRemaining <= 3 ? 'text-amber-400' : '')}>
                            {trialRemaining > 0 ? `${trialRemaining}d restantes` : 'Expirado'}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {isEditing ? (
                          <input type="date" value={editExpires} onChange={e => setEditExpires(e.target.value)} className="h-8 rounded border border-border bg-background px-2 text-xs" />
                        ) : (
                          license.expires_at ? new Date(license.expires_at).toLocaleDateString('pt-BR') : '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 p-0">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" onClick={() => handleSave(license)} className="h-7 gap-1 text-xs">
                              <Check className="h-3.5 w-3.5" /> Salvar
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => handleStartEdit(license)} className="h-7 text-xs">
                            Editar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
