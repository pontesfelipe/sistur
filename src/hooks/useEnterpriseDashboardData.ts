import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileContext } from '@/contexts/ProfileContext';

export interface EnterpriseKPIs {
  avgRevPAR: number | null;
  avgNPS: number | null;
  avgOccupancyRate: number | null;
  esgCertifications: number;
  totalEnterprises: number;
  totalAssessments: number;
}

export interface EnterprisePillarScore {
  id: string;
  pillar: 'RA' | 'OE' | 'AO';
  score: number;
  severity: 'CRITICO' | 'MODERADO' | 'BOM';
  count: number;
}

export interface EnterpriseIssue {
  id: string;
  indicator_code: string;
  title: string;
  pillar: string;
  severity: string;
  interpretation: string;
  assessment_title: string;
  destination_name: string;
}

// Fetch enterprise-specific KPIs from indicator values
export function useEnterpriseKPIs(destinationId?: string) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['enterprise-kpis', effectiveOrgId, destinationId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;

      // Get calculated enterprise assessments
      let query = supabase
        .from('assessments')
        .select('id, destination_id')
        .eq('status', 'CALCULATED')
        .eq('diagnostic_type', 'enterprise')
        .eq('org_id', effectiveOrgId);

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data: assessments } = await query;
      if (!assessments || assessments.length === 0) {
        return {
          avgRevPAR: null,
          avgNPS: null,
          avgOccupancyRate: null,
          esgCertifications: 0,
          totalEnterprises: 0,
          totalAssessments: 0,
        } as EnterpriseKPIs;
      }

      const assessmentIds = assessments.map(a => a.id);
      const uniqueDestinations = new Set(assessments.map(a => a.destination_id));

      // Get enterprise indicator values for specific KPIs
      const { data: indicatorValues } = await supabase
        .from('enterprise_indicator_values')
        .select('indicator_id, value, enterprise_indicators!inner(code)')
        .in('assessment_id', assessmentIds);

      // Calculate averages for key metrics
      let revparValues: number[] = [];
      let npsValues: number[] = [];
      let occupancyValues: number[] = [];
      let certificationCount = 0;

      indicatorValues?.forEach((iv: any) => {
        const code = iv.enterprise_indicators?.code;
        if (!code || iv.value === null) return;

        if (code === 'ENT_OE_REVPAR' || code.includes('REVPAR')) {
          revparValues.push(iv.value);
        } else if (code === 'ENT_AO_NPS' || code.includes('NPS')) {
          npsValues.push(iv.value);
        } else if (code === 'ENT_AO_OCUPACAO' || code.includes('OCUPACAO')) {
          occupancyValues.push(iv.value);
        } else if (code.includes('CERTIFICACAO') || code.includes('CERT')) {
          certificationCount += iv.value;
        }
      });

      return {
        avgRevPAR: revparValues.length > 0 
          ? revparValues.reduce((a, b) => a + b, 0) / revparValues.length 
          : null,
        avgNPS: npsValues.length > 0 
          ? npsValues.reduce((a, b) => a + b, 0) / npsValues.length 
          : null,
        avgOccupancyRate: occupancyValues.length > 0 
          ? occupancyValues.reduce((a, b) => a + b, 0) / occupancyValues.length 
          : null,
        esgCertifications: certificationCount,
        totalEnterprises: uniqueDestinations.size,
        totalAssessments: assessments.length,
      } as EnterpriseKPIs;
    },
    enabled: !!effectiveOrgId,
  });
}

// Aggregated pillar scores for enterprise assessments
export function useAggregatedEnterprisePillarScores(destinationId?: string) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['aggregated-enterprise-pillar-scores', effectiveOrgId, destinationId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;

      // Get calculated enterprise assessments
      let query = supabase
        .from('assessments')
        .select('id, title, destination_id, destinations(name)')
        .eq('status', 'CALCULATED')
        .eq('diagnostic_type', 'enterprise')
        .eq('org_id', effectiveOrgId);

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data: assessments } = await query;
      if (!assessments || assessments.length === 0) return null;

      // Get pillar scores
      const assessmentIds = assessments.map(a => a.id);
      const { data: allPillarScores } = await supabase
        .from('pillar_scores')
        .select('*')
        .in('assessment_id', assessmentIds);

      if (!allPillarScores || allPillarScores.length === 0) return null;

      // Aggregate by pillar
      const pillarAggregates: Record<string, { scores: number[], severities: string[] }> = {};
      
      allPillarScores.forEach(ps => {
        if (!pillarAggregates[ps.pillar]) {
          pillarAggregates[ps.pillar] = { scores: [], severities: [] };
        }
        pillarAggregates[ps.pillar].scores.push(ps.score);
        pillarAggregates[ps.pillar].severities.push(ps.severity);
      });

      const aggregatedScores = Object.entries(pillarAggregates).map(([pillar, data]) => {
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        let severity: 'CRITICO' | 'MODERADO' | 'BOM' = 'BOM';
        if (avgScore <= 0.33) severity = 'CRITICO';
        else if (avgScore <= 0.66) severity = 'MODERADO';
        
        return {
          id: pillar,
          pillar: pillar as 'RA' | 'OE' | 'AO',
          score: avgScore,
          severity,
          count: data.scores.length,
        };
      });

      const uniqueDestinations = new Map<string, string>();
      assessments.forEach(a => {
        if (a.destination_id && (a.destinations as any)?.name) {
          uniqueDestinations.set(a.destination_id, (a.destinations as any).name);
        }
      });

      return {
        pillarScores: aggregatedScores,
        totalAssessments: assessments.length,
        destinations: Array.from(uniqueDestinations.entries()).map(([id, name]) => ({ id, name }))
      };
    },
    enabled: !!effectiveOrgId,
  });
}

// Enterprise-specific issues
export function useEnterpriseIssues(destinationId?: string) {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['enterprise-issues', effectiveOrgId, destinationId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];

      let query = supabase
        .from('issues')
        .select(`
          *,
          assessments!inner(title, status, destination_id, diagnostic_type, org_id, destinations(name))
        `)
        .eq('assessments.status', 'CALCULATED')
        .eq('assessments.diagnostic_type', 'enterprise')
        .eq('assessments.org_id', effectiveOrgId);

      if (destinationId) {
        query = query.eq('assessments.destination_id', destinationId);
      }

      const { data: issues } = await query
        .order('severity', { ascending: true })
        .limit(5);

      return (issues ?? []).map((issue: any) => ({
        id: issue.id,
        indicator_code: issue.indicator_code,
        title: issue.title,
        pillar: issue.pillar,
        severity: issue.severity,
        interpretation: issue.interpretation,
        assessment_title: issue.assessments?.title,
        destination_name: issue.assessments?.destinations?.name,
      }));
    },
    enabled: !!effectiveOrgId,
  });
}

// Enterprise stats for dashboard
export function useEnterpriseDashboardStats() {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['enterprise-dashboard-stats', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return null;

      const [enterpriseAssessments, enterpriseIssues, actionPlans] = await Promise.all([
        supabase
          .from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('diagnostic_type', 'enterprise')
          .eq('org_id', effectiveOrgId),
        supabase
          .from('issues')
          .select('id, assessments!inner(org_id, diagnostic_type)', { count: 'exact', head: true })
          .eq('severity', 'CRITICO')
          .eq('assessments.diagnostic_type', 'enterprise')
          .eq('assessments.org_id', effectiveOrgId),
        supabase
          .from('action_plans')
          .select('id, assessments!inner(org_id, diagnostic_type)', { count: 'exact', head: true })
          .eq('assessments.diagnostic_type', 'enterprise')
          .eq('assessments.org_id', effectiveOrgId),
      ]);

      // Get unique enterprises (destinations with enterprise assessments)
      const { data: enterprises } = await supabase
        .from('assessments')
        .select('destination_id')
        .eq('diagnostic_type', 'enterprise')
        .eq('org_id', effectiveOrgId);

      const uniqueEnterprises = new Set(enterprises?.map(e => e.destination_id) ?? []);

      return {
        totalEnterprises: uniqueEnterprises.size,
        activeAssessments: enterpriseAssessments.count ?? 0,
        criticalIssues: enterpriseIssues.count ?? 0,
        actionPlans: actionPlans.count ?? 0,
      };
    },
    enabled: !!effectiveOrgId,
  });
}

// Destinations with enterprise assessments
export function useEnterpriseDestinations() {
  const { effectiveOrgId } = useProfileContext();

  return useQuery({
    queryKey: ['enterprise-destinations', effectiveOrgId],
    queryFn: async () => {
      if (!effectiveOrgId) return [];

      const { data: assessments } = await supabase
        .from('assessments')
        .select('destination_id, destinations(id, name)')
        .eq('status', 'CALCULATED')
        .eq('diagnostic_type', 'enterprise')
        .eq('org_id', effectiveOrgId);

      if (!assessments) return [];

      const uniqueDestinations = new Map<string, string>();
      assessments.forEach(a => {
        const dest = a.destinations as any;
        if (dest?.id && dest?.name) {
          uniqueDestinations.set(dest.id, dest.name);
        }
      });

      return Array.from(uniqueDestinations.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!effectiveOrgId,
  });
}
