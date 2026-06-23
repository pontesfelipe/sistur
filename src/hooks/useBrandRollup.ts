import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitWithScores {
  id: string;
  unit_name: string;
  destination_id: string;
  destination_name: string | null;
  destination_state: string | null;
  is_primary: boolean;
  enterprise_profile_id: string | null;
  room_count: number | null;
  pillar_scores: Array<{ pillar: string; score: number; severity: string }>;
}

export interface BrandRollupRow {
  pillar: 'RA' | 'OE' | 'AO' | 'GLOBAL';
  score_weighted: number;
  score_simple: number;
  stddev: number;
  unit_count: number;
  critical_unit_id: string | null;
}

export function useBrandRollup(assessmentId?: string) {
  return useQuery({
    queryKey: ['brand-rollup', assessmentId],
    enabled: !!assessmentId,
    queryFn: async () => {
      if (!assessmentId) return null;

      const { data: assessment } = await supabase
        .from('assessments')
        .select('id, brand_id')
        .eq('id', assessmentId)
        .maybeSingle();

      const { data: unitRows } = await supabase
        .from('assessment_units')
        .select(`
          id,
          unit_name,
          destination_id,
          is_primary,
          enterprise_profile_id,
          destination:destinations(name, state),
          profile:enterprise_profiles(room_count)
        `)
        .eq('assessment_id', assessmentId)
        .order('is_primary', { ascending: false });

      const units = (unitRows || []) as any[];
      const isMultiUnit = !!assessment?.brand_id && units.length > 1;

      if (!isMultiUnit) {
        return { isMultiUnit: false, brandId: null, units: [], rollups: [] as BrandRollupRow[] };
      }

      const unitIds = units.map((u) => u.id);
      const [{ data: pillarRows }, { data: rollupRows }, { data: brandRow }] = await Promise.all([
        supabase
          .from('pillar_scores')
          .select('unit_id, pillar, score, severity')
          .eq('assessment_id', assessmentId)
          .in('unit_id', unitIds),
        supabase
          .from('assessment_brand_rollups')
          .select('*')
          .eq('assessment_id', assessmentId),
        assessment?.brand_id
          ? supabase.from('enterprise_brands').select('id, name').eq('id', assessment.brand_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      const pillarsByUnit = new Map<string, Array<{ pillar: string; score: number; severity: string }>>();
      (pillarRows || []).forEach((r: any) => {
        const arr = pillarsByUnit.get(r.unit_id) || [];
        arr.push({ pillar: r.pillar, score: Number(r.score), severity: r.severity });
        pillarsByUnit.set(r.unit_id, arr);
      });

      const unitsWithScores: UnitWithScores[] = units.map((u) => ({
        id: u.id,
        unit_name: u.unit_name,
        destination_id: u.destination_id,
        destination_name: u.destination?.name ?? null,
        destination_state: u.destination?.state ?? null,
        is_primary: !!u.is_primary,
        enterprise_profile_id: u.enterprise_profile_id,
        room_count: u.profile?.room_count ?? null,
        pillar_scores: pillarsByUnit.get(u.id) || [],
      }));

      return {
        isMultiUnit: true,
        brandId: assessment!.brand_id as string,
        brandName: (brandRow as any)?.name ?? null,
        units: unitsWithScores,
        rollups: (rollupRows || []) as BrandRollupRow[],
      };
    },
  });
}