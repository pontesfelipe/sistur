import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cross-project portfolio rollup: counts how many linked indicators across
 * ALL of the user's projects improved / regressed / reached target, based on
 * the project's assessment_id current scores vs the stored baseline.
 */
export function useProjectsPortfolioImpact() {
  return useQuery({
    queryKey: ["projects-portfolio-impact"],
    queryFn: async () => {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, assessment_id");
      if (!projects || projects.length === 0) {
        return { total: 0, improved: 0, regressed: 0, reachedTarget: 0, projectsWithLinks: 0 };
      }
      const projectIds = projects.map((p) => p.id);
      const assessmentIds = Array.from(new Set(projects.map((p) => p.assessment_id).filter(Boolean)));
      const projectToAssessment = new Map(projects.map((p) => [p.id, p.assessment_id]));

      const { data: links } = await supabase
        .from("project_indicator_links")
        .select("project_id, indicator_code, baseline_score, target_score")
        .in("project_id", projectIds);
      if (!links || links.length === 0) {
        return { total: 0, improved: 0, regressed: 0, reachedTarget: 0, projectsWithLinks: 0 };
      }

      const { data: scores } = await supabase
        .from("indicator_scores")
        .select("assessment_id, score, indicator:indicators(code)")
        .in("assessment_id", assessmentIds);
      const byKey = new Map<string, number>();
      (scores || []).forEach((s: any) => {
        const code = s.indicator?.code;
        if (code) byKey.set(`${s.assessment_id}::${code}`, s.score);
      });

      let improved = 0, regressed = 0, reachedTarget = 0;
      const projectsSet = new Set<string>();
      links.forEach((l: any) => {
        projectsSet.add(l.project_id);
        const aid = projectToAssessment.get(l.project_id);
        if (!aid) return;
        const current = byKey.get(`${aid}::${l.indicator_code}`);
        if (current === undefined) return;
        const delta = current - Number(l.baseline_score ?? 0);
        if (delta > 0.01) improved++;
        else if (delta < -0.01) regressed++;
        if (current >= Number(l.target_score ?? 0.67)) reachedTarget++;
      });

      return {
        total: links.length,
        improved,
        regressed,
        reachedTarget,
        projectsWithLinks: projectsSet.size,
      };
    },
  });
}