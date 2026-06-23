import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileContext } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export type BrandType = 'independent' | 'chain' | 'franchise' | 'collection';

export interface EnterpriseBrand {
  id: string;
  org_id: string;
  name: string;
  brand_type: BrandType;
  headquarters_uf: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnterpriseBrandUnit {
  id: string;
  brand_id: string | null;
  destination_id: string;
  unit_name: string | null;
  is_flagship: boolean;
  destinations?: { id: string; name: string; uf: string | null; ibge_code: string | null } | null;
}

export function useEnterpriseBrands() {
  const queryClient = useQueryClient();
  const { effectiveOrgId, loading: profileLoading } = useProfileContext();

  const { data: brands, isLoading } = useQuery({
    queryKey: ['enterprise-brands', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [] as EnterpriseBrand[];
      const { data, error } = await supabase
        .from('enterprise_brands')
        .select('*')
        .eq('org_id', effectiveOrgId)
        .order('name');
      if (error) throw error;
      return (data ?? []) as EnterpriseBrand[];
    },
    enabled: !profileLoading && !!effectiveOrgId,
  });

  const createBrand = useMutation({
    mutationFn: async (input: {
      name: string;
      brand_type?: BrandType;
      headquarters_uf?: string | null;
      website?: string | null;
      notes?: string | null;
    }) => {
      if (!effectiveOrgId) throw new Error('Organização ativa não encontrada');
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        org_id: effectiveOrgId,
        name: input.name.trim(),
        brand_type: input.brand_type ?? 'independent',
        headquarters_uf: input.headquarters_uf ?? null,
        website: input.website ?? null,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('enterprise_brands')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as EnterpriseBrand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-brands'] });
      toast.success('Marca criada');
    },
    onError: (e: any) => {
      const msg = e?.message?.includes('unique')
        ? 'Já existe uma marca com esse nome nesta organização.'
        : 'Erro ao criar marca';
      toast.error(msg);
    },
  });

  const updateBrand = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<EnterpriseBrand> & { id: string }) => {
      const { data, error } = await supabase
        .from('enterprise_brands')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as EnterpriseBrand;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-brands'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-brand-units'] });
      toast.success('Marca atualizada');
    },
    onError: () => toast.error('Erro ao atualizar marca'),
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('enterprise_brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-brands'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-brand-units'] });
      toast.success('Marca removida');
    },
    onError: () => toast.error('Erro ao remover marca'),
  });

  return {
    brands: brands ?? [],
    isLoading: profileLoading || isLoading,
    createBrand,
    updateBrand,
    deleteBrand,
  };
}

/**
 * Lista de unidades (enterprise_profiles) agrupadas por marca. Útil para
 * a visão "Rede": mostra em quais municípios a marca já tem operação.
 */
export function useBrandUnits(brandId?: string | null) {
  return useQuery({
    queryKey: ['enterprise-brand-units', brandId ?? 'all'],
    queryFn: async () => {
      const query = supabase
        .from('enterprise_profiles')
        .select('id, brand_id, destination_id, unit_name, is_flagship, destinations(id, name, uf, ibge_code)')
        .order('unit_name', { ascending: true });
      const { data, error } = brandId
        ? await query.eq('brand_id', brandId)
        : await query;
      if (error) throw error;
      return (data ?? []) as unknown as EnterpriseBrandUnit[];
    },
    enabled: brandId !== null,
  });
}