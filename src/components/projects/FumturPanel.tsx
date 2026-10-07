import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileContext } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileText, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { tx } from '@/i18n/t';
import type { Project } from '@/hooks/useProjects';
import { buildFumturLedger, FUMTUR_REVENUE_ORIGINS } from '@/lib/fumturLedger';
import { FUMTUR_SOURCE } from '@/lib/comturReport';
import { exportFumturAnnualReport } from '@/lib/exportFumturDocx';

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const db = supabase as any;

export function FumturPanel({ projects }: { projects: Project[] }) {
  const { user } = useAuth();
  const { effectiveOrgId } = useProfileContext();
  const qc = useQueryClient();
  const destinations = useMemo(() => {
    const m = new Map<string, string>();
    projects.forEach((p) => p.destination_id && m.set(p.destination_id, p.destination ? `${p.destination.name}${p.destination.uf ? ' / ' + p.destination.uf : ''}` : p.destination_id));
    return [...m.entries()];
  }, [projects]);
  const [destId, setDestId] = useState<string>('');
  const [year, setYear] = useState(new Date().getFullYear());
  const dest = destId || destinations[0]?.[0] || '';
  const destProjects = projects.filter((p) => p.destination_id === dest);
  const key = ['fumtur', dest, year];

  const { data } = useQuery({
    queryKey: key,
    enabled: !!dest,
    queryFn: async () => {
      const { data: fund } = await db.from('fumtur_funds').select('*').eq('destination_id', dest).eq('fiscal_year', year).maybeSingle();
      const ids = destProjects.map((p) => p.id);
      const { data: lines } = ids.length
        ? await db.from('project_budget_lines').select('*').in('project_id', ids).eq('funding_source', FUMTUR_SOURCE)
        : { data: [] };
      if (!fund) return { fund: null, revenues: [], plan: [], lines: lines ?? [] };
      const [{ data: revenues }, { data: plan }] = await Promise.all([
        db.from('fumtur_revenues').select('*').eq('fund_id', fund.id).order('revenue_date'),
        db.from('fumtur_application_plan').select('*').eq('fund_id', fund.id).order('created_at'),
      ]);
      return { fund, revenues: revenues ?? [], plan: plan ?? [], lines: lines ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const run = async (q: any) => { const { error } = await q; if (error) toast.error(error.message); else refresh(); };

  const [fundForm, setFundForm] = useState({ law_reference: '', fund_cnpj: '', bank_account: '', opening_balance: '' });
  const [rev, setRev] = useState({ origin: FUMTUR_REVENUE_ORIGINS[0], revenue_date: new Date().toISOString().slice(0, 10), amount: '', description: '' });
  const [planItem, setPlanItem] = useState({ project_id: '', action: '', planned_amount: '' });

  if (!destinations.length) {
    return <Card><CardContent className="py-8 text-center text-muted-foreground">{tx('Crie um projeto vinculado a um destino para controlar o FUMTUR.')}</CardContent></Card>;
  }

  const projName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? '—';
  const expenses = (data?.lines ?? []).map((l: any) => ({ ...l, project_name: projName(l.project_id) }));
  const ledger = data?.fund ? buildFumturLedger(Number(data.fund.opening_balance), data.revenues, data.plan, expenses) : null;
  const destName = destinations.find(([id]) => id === dest)?.[1] ?? '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div><Label>{tx('Destino')}</Label>
          <Select value={dest} onValueChange={setDestId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{destinations.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}</SelectContent></Select></div>
        <div><Label>{tx('Ano')}</Label><Input type="number" className="w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} /></div>
        {data?.fund && ledger && (
          <Button variant="outline" className="gap-1" onClick={() => exportFumturAnnualReport(destName, year, data.fund, data.revenues, data.plan.map((p: any) => ({ ...p, project_name: projName(p.project_id) })), expenses, ledger)}>
            <FileText className="h-4 w-4" />{tx('Relatório anual para o COMTUR')}
          </Button>
        )}
      </div>

      {!data?.fund ? (
        <Card><CardHeader><CardTitle>{tx('Cadastrar o fundo de {{v0}}', { v0: year })}</CardTitle>
          <CardDescription>{tx('Dados do Fundo Municipal de Turismo deste destino.')}</CardDescription></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3">
            <div><Label>{tx('Lei de criação')}</Label><Input value={fundForm.law_reference} onChange={(e) => setFundForm({ ...fundForm, law_reference: e.target.value })} /></div>
            <div><Label>{tx('CNPJ do fundo')}</Label><Input value={fundForm.fund_cnpj} onChange={(e) => setFundForm({ ...fundForm, fund_cnpj: e.target.value })} /></div>
            <div><Label>{tx('Conta bancária (identificação)')}</Label><Input value={fundForm.bank_account} onChange={(e) => setFundForm({ ...fundForm, bank_account: e.target.value })} /></div>
            <div><Label>{tx('Saldo inicial do ano (R$)')}</Label><Input type="number" value={fundForm.opening_balance} onChange={(e) => setFundForm({ ...fundForm, opening_balance: e.target.value })} /></div>
            <Button className="sm:col-span-2" onClick={() => run(db.from('fumtur_funds').insert({ ...fundForm, opening_balance: Number(fundForm.opening_balance || 0), destination_id: dest, fiscal_year: year, org_id: effectiveOrgId, created_by: user?.id }))}>{tx('Cadastrar fundo')}</Button>
          </CardContent></Card>
      ) : ledger && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[[tx('Saldo atual'), brl(ledger.balance)], [tx('Receitas no ano'), brl(ledger.totalRevenue)], [tx('Gasto realizado'), brl(ledger.totalSpent)],
              [tx('Plano aprovado usado'), ledger.planUsePct === null ? '—' : `${ledger.planUsePct}%`]].map(([l, v]) => (
              <Card key={l}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold">{v}</p></CardContent></Card>
            ))}
          </div>
          {ledger.alerts.length > 0 && (
            <Card className="border-destructive/50"><CardContent className="pt-4 space-y-1">
              {ledger.alerts.map((a) => <p key={a} className="text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{a}</p>)}
            </CardContent></Card>
          )}

          <Card><CardHeader><CardTitle className="text-base">{tx('Receitas do fundo')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-5 gap-2">
                <Select value={rev.origin} onValueChange={(v) => setRev({ ...rev, origin: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FUMTUR_REVENUE_ORIGINS.map((o) => <SelectItem key={o} value={o}>{tx(o)}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={rev.revenue_date} onChange={(e) => setRev({ ...rev, revenue_date: e.target.value })} />
                <Input type="number" placeholder="R$" value={rev.amount} onChange={(e) => setRev({ ...rev, amount: e.target.value })} />
                <Input placeholder={tx('Descrição')} value={rev.description} onChange={(e) => setRev({ ...rev, description: e.target.value })} />
                <Button disabled={!rev.amount} onClick={() => { run(db.from('fumtur_revenues').insert({ ...rev, amount: Number(rev.amount), fund_id: data.fund.id, org_id: data.fund.org_id, created_by: user?.id })); setRev({ ...rev, amount: '', description: '' }); }}>{tx('Adicionar')}</Button>
              </div>
              {data.revenues.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b py-1">
                  <span>{r.revenue_date.split('-').reverse().join('/')} · {r.origin}{r.description ? ` — ${r.description}` : ''}</span>
                  <span className="flex items-center gap-2">{brl(Number(r.amount))}<Button size="icon" variant="ghost" onClick={() => run(db.from('fumtur_revenues').delete().eq('id', r.id))}><Trash2 className="h-4 w-4" /></Button></span>
                </div>
              ))}
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">{tx('Plano de Aplicação Anual')}</CardTitle>
            <CardDescription>{tx('O que se pretende gastar com o fundo. Gastos de projetos fora do plano aprovado geram alerta.')}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-4 gap-2">
                <Select value={planItem.project_id || '_none'} onValueChange={(v) => setPlanItem({ ...planItem, project_id: v === '_none' ? '' : v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">{tx('Sem projeto')}</SelectItem>{destProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select>
                <Input placeholder={tx('Ação')} value={planItem.action} onChange={(e) => setPlanItem({ ...planItem, action: e.target.value })} />
                <Input type="number" placeholder="R$" value={planItem.planned_amount} onChange={(e) => setPlanItem({ ...planItem, planned_amount: e.target.value })} />
                <Button disabled={!planItem.action && !planItem.project_id} onClick={() => { run(db.from('fumtur_application_plan').insert({ action: planItem.action || projName(planItem.project_id), project_id: planItem.project_id || null, planned_amount: Number(planItem.planned_amount || 0), fund_id: data.fund.id, org_id: data.fund.org_id, created_by: user?.id })); setPlanItem({ project_id: '', action: '', planned_amount: '' }); }}>{tx('Adicionar')}</Button>
              </div>
              {data.plan.map((p: any) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-b py-1">
                  <span>{p.action}{p.project_id ? ` (${projName(p.project_id)})` : ''} — {brl(Number(p.planned_amount))}</span>
                  <span className="flex items-center gap-2">
                    {p.status === 'approved'
                      ? <Badge>{tx('Aprovado pelo COMTUR')}{p.approved_meeting ? ` · ${p.approved_meeting}` : ''}</Badge>
                      : <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                          const meeting = window.prompt(tx('Reunião do COMTUR que aprovou (ex.: 5ª Ordinária)')) ?? '';
                          run(db.from('fumtur_application_plan').update({ status: 'approved', approved_meeting: meeting || null, approved_at: new Date().toISOString().slice(0, 10) }).eq('id', p.id));
                        }}><Check className="h-4 w-4" />{tx('Marcar aprovado')}</Button>}
                    <Button size="icon" variant="ghost" onClick={() => run(db.from('fumtur_application_plan').delete().eq('id', p.id))}><Trash2 className="h-4 w-4" /></Button>
                  </span>
                </div>
              ))}
            </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">{tx('Despesas pagas com o FUMTUR')}</CardTitle>
            <CardDescription>{tx('Vêm das linhas de orçamento dos projetos com fonte "Fundo municipal (FUMTUR)".')}</CardDescription></CardHeader>
            <CardContent>
              {expenses.length === 0 ? <p className="text-sm text-muted-foreground">{tx('Nenhuma linha de orçamento com fonte FUMTUR.')}</p> :
                expenses.map((e: any) => (
                  <div key={e.id} className="flex justify-between text-sm border-b py-1">
                    <span>{e.project_name} · {e.description}{e.commitment_number ? ` · Empenho ${e.commitment_number}` : ''}{e.execution_stage ? ` · ${e.execution_stage}` : ''}{e.status === 'cancelled' ? ' · cancelada' : ''}</span>
                    <span>{brl(Number(e.actual_amount))} / {brl(Number(e.planned_amount))}</span>
                  </div>
                ))}
            </CardContent></Card>
        </>
      )}
    </div>
  );
}
