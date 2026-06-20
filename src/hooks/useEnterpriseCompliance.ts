import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComplianceItem {
  id: string;
  org_id: string;
  enterprise_profile_id: string;
  item_code: string;
  item_label: string;
  category: string;
  status: 'pendente' | 'valido' | 'vencido' | 'nao_aplicavel' | string;
  document_url: string | null;
  document_number: string | null;
  issued_at: string | null;
  expires_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  notes: string | null;
  auto_checked: boolean;
  auto_check_source: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_COMPLIANCE_TEMPLATE: Array<Pick<ComplianceItem, 'item_code' | 'item_label' | 'category'>> = [
  { item_code: 'CADASTUR', item_label: 'Cadastro no CADASTUR (MTur)', category: 'Turismo' },
  { item_code: 'ALVARA_FUNC', item_label: 'Alvará de Funcionamento Municipal', category: 'Municipal' },
  { item_code: 'AVCB', item_label: 'AVCB (Auto de Vistoria do Corpo de Bombeiros)', category: 'Segurança' },
  { item_code: 'SANITARIO', item_label: 'Alvará Sanitário (Vigilância Sanitária)', category: 'Saúde' },
  { item_code: 'LGPD', item_label: 'Política de Privacidade e Conformidade LGPD', category: 'Dados' },
  { item_code: 'AMBIENTAL', item_label: 'Licença Ambiental (quando aplicável)', category: 'Ambiental' },
  { item_code: 'ACESSIBILIDADE', item_label: 'Laudo de Acessibilidade (NBR 9050)', category: 'Acessibilidade' },
  { item_code: 'SEGURO_RC', item_label: 'Seguro de Responsabilidade Civil', category: 'Seguros' },
];

function statusFromExpiry(expires_at: string | null, current: string): string {
  if (current === 'nao_aplicavel') return 'nao_aplicavel';
  if (!expires_at) return current || 'pendente';
  const d = new Date(expires_at);
  if (isNaN(d.getTime())) return current || 'pendente';
  return d.getTime() < Date.now() ? 'vencido' : 'valido';
}

export function useComplianceItems(enterpriseProfileId: string | null | undefined, orgId: string | null | undefined) {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['enterprise-compliance', enterpriseProfileId],
    queryFn: async () => {
      if (!enterpriseProfileId) return [] as ComplianceItem[];
      const { data, error } = await supabase
        .from('enterprise_compliance_items' as any)
        .select('*')
        .eq('enterprise_profile_id', enterpriseProfileId)
        .order('category', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ComplianceItem[];
    },
    enabled: !!enterpriseProfileId,
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      if (!enterpriseProfileId || !orgId) throw new Error('Perfil inválido');
      const existing = new Set(items.map((i) => i.item_code));
      const rows = DEFAULT_COMPLIANCE_TEMPLATE.filter((t) => !existing.has(t.item_code)).map((t) => ({
        org_id: orgId,
        enterprise_profile_id: enterpriseProfileId,
        item_code: t.item_code,
        item_label: t.item_label,
        category: t.category,
        status: 'pendente',
      }));
      if (rows.length === 0) return { inserted: 0 };
      const { error } = await supabase.from('enterprise_compliance_items' as any).insert(rows);
      if (error) throw error;
      return { inserted: rows.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['enterprise-compliance', enterpriseProfileId] });
      if (r.inserted > 0) toast.success(`${r.inserted} itens adicionados ao checklist`);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar checklist'),
  });

  const upsertItem = useMutation({
    mutationFn: async (row: Partial<ComplianceItem> & { id?: string }) => {
      const payload: any = { ...row };
      payload.status = statusFromExpiry(payload.expires_at ?? null, payload.status ?? 'pendente');
      const { data, error } = await supabase
        .from('enterprise_compliance_items' as any)
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise-compliance', enterpriseProfileId] });
      toast.success('Item atualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar item'),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enterprise_compliance_items' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['enterprise-compliance', enterpriseProfileId] }),
  });

  const validateCnpj = useMutation({
    mutationFn: async (cnpj: string) => {
      const { data, error } = await supabase.functions.invoke('validate-cnpj', { body: { cnpj } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('CNPJ consultado'),
    onError: (e: any) => toast.error(e.message || 'Falha ao consultar CNPJ'),
  });

  // Derived stats
  const applicable = items.filter((i) => i.status !== 'nao_aplicavel');
  const validCount = applicable.filter((i) => statusFromExpiry(i.expires_at, i.status) === 'valido').length;
  const expiredCount = applicable.filter((i) => statusFromExpiry(i.expires_at, i.status) === 'vencido').length;
  const pendingCount = applicable.filter((i) => {
    const s = statusFromExpiry(i.expires_at, i.status);
    return s !== 'valido' && s !== 'vencido';
  }).length;
  const complianceRate = applicable.length > 0 ? (validCount / applicable.length) * 100 : 0;

  return {
    items,
    isLoading,
    seedDefaults,
    upsertItem,
    removeItem,
    validateCnpj,
    stats: { total: items.length, applicable: applicable.length, validCount, expiredCount, pendingCount, complianceRate },
  };
}