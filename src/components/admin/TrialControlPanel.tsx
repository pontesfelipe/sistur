import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface TrialLicense {
  id: string;
  user_id: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  full_name?: string;
  org_name?: string;
}

export function TrialControlPanel() {
  const [trials, setTrials] = useState<TrialLicense[]>([]);
  const [allLicenses, setAllLicenses] = useState<{ plan: string; status: string; org_id: string | null; org_name?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trialsRes, allRes] = await Promise.all([
        (supabase as any)
          .from('licenses')
          .select('id, user_id, status, trial_started_at, trial_ends_at, created_at')
          .eq('plan', 'trial')
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('licenses')
          .select('plan, status, org_id'),
      ]);

      const trialData = trialsRes.data || [];
      const allData = allRes.data || [];

      // Fetch org names for allLicenses to filter SISTUR
      const allOrgIds = [...new Set(allData.map((l: any) => l.org_id).filter(Boolean))] as string[];
      let allOrgMap: Record<string, string> = {};
      if (allOrgIds.length > 0) {
        const { data: orgData } = await supabase.from('orgs').select('id, name').in('id', allOrgIds);
        for (const o of orgData || []) allOrgMap[o.id] = o.name;
      }

      setAllLicenses(allData.map((l: any) => ({
        ...l,
        org_name: l.org_id ? allOrgMap[l.org_id] : undefined,
      })));

      // Fetch user names
      const userIds = trialData.map((t: any) => t.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, org_id')
          .in('user_id', userIds);

        const orgIds = [...new Set((profiles || []).map(p => p.org_id).filter(Boolean))] as string[];
        let orgMap: Record<string, string> = {};
        if (orgIds.length > 0) {
          const { data: orgs } = await supabase.from('orgs').select('id, name').in('id', orgIds);
          for (const o of orgs || []) orgMap[o.id] = o.name;
        }

        const profileMap: Record<string, { full_name: string; org_name: string }> = {};
        for (const p of profiles || []) {
          profileMap[p.user_id] = {
            full_name: p.full_name || 'Sem nome',
            org_name: p.org_id ? orgMap[p.org_id] || '' : '',
          };
        }

        setTrials(trialData.map((t: any) => ({
          ...t,
          full_name: profileMap[t.user_id]?.full_name,
          org_name: profileMap[t.user_id]?.org_name,
        })));
      } else {
        setTrials([]);
      }
    } catch (err) {
      console.error('Error fetching trial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const activeTrials = trials.filter(t => t.status === 'active' && t.trial_ends_at && new Date(t.trial_ends_at) > now);
    const expiredTrials = trials.filter(t => t.status === 'expired' || (t.trial_ends_at && new Date(t.trial_ends_at) <= now));
    const expiringSoon = activeTrials.filter(t => {
      if (!t.trial_ends_at) return false;
      const daysLeft = (new Date(t.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 3;
    });

    // Conversion: users who had trial and now have a paid plan (exclude SISTUR internal)
    const externalTrials = trials.filter(t => t.org_name !== 'SISTUR');
    const convertedCount = allLicenses.filter(l =>
      l.plan !== 'trial' && l.status === 'active' && l.org_name !== 'SISTUR'
    ).length;

    const conversionRate = externalTrials.length > 0
      ? Math.round((convertedCount / externalTrials.length) * 100)
      : 0;

    return {
      total: trials.length,
      active: activeTrials.length,
      expired: expiredTrials.length,
      expiringSoon: expiringSoon.length,
      converted: convertedCount,
      conversionRate,
    };
  }, [trials, allLicenses]);

  const getDaysRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getTrialStatus = (trial: TrialLicense) => {
    if (trial.status === 'expired') return 'expired';
    if (!trial.trial_ends_at) return 'unknown';
    const days = getDaysRemaining(trial.trial_ends_at);
    if (days <= 0) return 'expired';
    if (days <= 2) return 'critical';
    if (days <= 4) return 'warning';
    return 'healthy';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Trials', value: stats.total, icon: Users, color: 'text-muted-foreground' },
          { label: 'Ativos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Expirando (≤3d)', value: stats.expiringSoon, icon: AlertTriangle, color: 'text-amber-400' },
          { label: 'Expirados', value: stats.expired, icon: XCircle, color: 'text-red-400' },
          { label: 'Convertidos', value: stats.converted, icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Conversão', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-sky-400' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold tabular-nums">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Conversion funnel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold mb-4">Funil de Conversão</h3>
        <div className="space-y-3">
          {[
            { label: 'Trials criados', value: stats.total, pct: 100, color: 'bg-sky-500' },
            { label: 'Trials ativos', value: stats.active, pct: stats.total ? (stats.active / stats.total) * 100 : 0, color: 'bg-emerald-500' },
            { label: 'Convertidos para plano pago', value: stats.converted, pct: stats.total ? (stats.converted / stats.total) * 100 : 0, color: 'bg-purple-500' },
          ].map(step => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-40 text-xs text-muted-foreground truncate">{step.label}</div>
              <div className="flex-1">
                <Progress value={step.pct} className="h-2.5" />
              </div>
              <div className="w-16 text-right text-sm font-bold tabular-nums">
                {step.value} <span className="text-muted-foreground text-xs">({Math.round(step.pct)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trial list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">Trials Recentes</h3>
        </div>
        <div className="divide-y divide-border">
          {trials.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum trial encontrado
            </div>
          ) : (
            trials.slice(0, 20).map(trial => {
              const status = getTrialStatus(trial);
              const days = getDaysRemaining(trial.trial_ends_at);

              return (
                <div key={trial.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{trial.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{trial.org_name}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {trial.trial_started_at && new Date(trial.trial_started_at).toLocaleDateString('pt-BR')}
                    <ArrowRight className="inline h-3 w-3 mx-1" />
                    {trial.trial_ends_at && new Date(trial.trial_ends_at).toLocaleDateString('pt-BR')}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold',
                      status === 'healthy' && 'border-emerald-500/30 text-emerald-400',
                      status === 'warning' && 'border-amber-500/30 text-amber-400',
                      status === 'critical' && 'border-red-500/30 text-red-400',
                      status === 'expired' && 'border-muted text-muted-foreground',
                    )}
                  >
                    {status === 'expired'
                      ? 'Expirado'
                      : status === 'critical'
                      ? `${days}d ⚠️`
                      : `${days}d`
                    }
                  </Badge>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
