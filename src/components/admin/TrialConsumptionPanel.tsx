import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Building2, CheckCircle2, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TrialRow {
  subject_id: string;
  subject_kind: 'user' | 'org';
  training_consumed_at: string | null;
  assessment_run_at: string | null;
  converted_at: string | null;
  notes: string | null;
  created_at: string;
  label: string;
}

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

/**
 * Trial por consumo (modelo atual): usuário novo tem o curso base + 10 perguntas
 * ao Beni; organização nova tem 1 diagnóstico com resultado em teaser.
 * Substitui o antigo trial por tempo (7 dias).
 */
export function TrialConsumptionPanel() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-trial-state'],
    queryFn: async (): Promise<TrialRow[]> => {
      const { data: rows, error } = await (supabase as any)
        .from('trial_state')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const list = (rows || []) as TrialRow[];
      const userIds = list.filter(r => r.subject_kind === 'user').map(r => r.subject_id);
      const orgIds = list.filter(r => r.subject_kind === 'org').map(r => r.subject_id);

      const [profilesRes, orgsRes] = await Promise.all([
        userIds.length
          ? supabase.from('profiles').select('user_id, full_name').in('user_id', userIds)
          : Promise.resolve({ data: [] as any[] }),
        orgIds.length
          ? supabase.from('orgs').select('id, name').in('id', orgIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const nameMap: Record<string, string> = {};
      for (const p of profilesRes.data || []) nameMap[p.user_id] = p.full_name || 'Sem nome';
      for (const o of orgsRes.data || []) nameMap[o.id] = o.name;

      return list.map(r => ({ ...r, label: nameMap[r.subject_id] || r.subject_id.slice(0, 8) }));
    },
  });

  const convert = useMutation({
    mutationFn: async (row: TrialRow) => {
      const { error } = await (supabase.rpc as any)('admin_convert_trial', {
        _subject_id: row.subject_id,
        _subject_kind: row.subject_kind,
        _notes: 'Conversão manual pelo painel comercial',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Trial convertido (acesso integral liberado)');
      qc.invalidateQueries({ queryKey: ['admin-trial-state'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data ?? [];
  const trialing = rows.filter(r => !r.converted_at);
  const stats = [
    { label: 'Usuários em trial', value: trialing.filter(r => r.subject_kind === 'user').length, icon: Users },
    { label: 'Organizações em trial', value: trialing.filter(r => r.subject_kind === 'org').length, icon: Building2 },
    { label: 'Convertidos', value: rows.filter(r => r.converted_at).length, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" /> Trial por consumo
          </CardTitle>
          <CardDescription>
            Usuário novo: curso base + 10 perguntas ao Professor Beni. Organização nova: 1 diagnóstico
            com resultado em teaser e projetos bloqueados. Não há mais trial por tempo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro de trial.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Curso base</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={`${r.subject_kind}-${r.subject_id}`}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.subject_kind === 'org' ? 'Organização' : 'Usuário'}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.subject_kind === 'user' ? (r.training_consumed_at ? `Consumido ${fmt(r.training_consumed_at)}` : 'Disponível') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.subject_kind === 'org' ? (r.assessment_run_at ? `Usado ${fmt(r.assessment_run_at)}` : 'Disponível') : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded-full',
                          r.converted_at ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500',
                        )}>
                          {r.converted_at ? `Convertido ${fmt(r.converted_at)}` : 'Em trial'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!r.converted_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={convert.isPending}
                            onClick={() => convert.mutate(r)}
                          >
                            Converter
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
