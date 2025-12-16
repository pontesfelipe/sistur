import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndicatorValue {
  id: string;
  indicator_id: string;
  value_raw: number | null;
  indicator: {
    id: string;
    code: string;
    name: string;
    pillar: "RA" | "OE" | "AO";
    theme: string;
    direction: "HIGH_IS_BETTER" | "LOW_IS_BETTER";
    normalization: "MIN_MAX" | "BANDS" | "BINARY";
    min_ref: number | null;
    max_ref: number | null;
    weight: number;
  };
}

interface Course {
  id: string;
  title: string;
  level: string;
  tags: { pillar: string; theme: string }[];
}

// Normalize a value to 0-1 scale
function normalizeValue(
  value: number | null,
  minRef: number | null,
  maxRef: number | null,
  direction: string,
  normalization: string
): number {
  if (value === null || value === undefined) return 0;

  if (normalization === "BINARY") {
    return value > 0 ? 1 : 0;
  }

  if (normalization === "BANDS") {
    // Simple band normalization
    if (value <= 0.3) return 0.2;
    if (value <= 0.5) return 0.5;
    if (value <= 0.7) return 0.8;
    return 1;
  }

  // MIN_MAX normalization
  const min = minRef ?? 0;
  const max = maxRef ?? 100;
  
  if (max === min) return 0.5;
  
  let score = (value - min) / (max - min);
  score = Math.max(0, Math.min(1, score)); // Clamp to 0-1
  
  // Invert if lower is better
  if (direction === "LOW_IS_BETTER") {
    score = 1 - score;
  }
  
  return score;
}

// Determine severity based on score
function getSeverity(score: number): "CRITICO" | "MODERADO" | "BOM" {
  if (score <= 0.33) return "CRITICO";
  if (score <= 0.66) return "MODERADO";
  return "BOM";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessment_id } = await req.json();
    
    if (!assessment_id) {
      return new Response(
        JSON.stringify({ error: "assessment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting calculation for assessment: ${assessment_id}`);

    // 1. Get assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*, destination:destinations(*)")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      console.error("Assessment not found:", assessmentError);
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = assessment.org_id;

    // 2. Get all indicator values with indicator details
    const { data: indicatorValues, error: valuesError } = await supabase
      .from("indicator_values")
      .select(`
        id,
        indicator_id,
        value_raw,
        indicator:indicators(
          id,
          code,
          name,
          pillar,
          theme,
          direction,
          normalization,
          min_ref,
          max_ref,
          weight
        )
      `)
      .eq("assessment_id", assessment_id);

    if (valuesError) {
      console.error("Error fetching indicator values:", valuesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch indicator values" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!indicatorValues || indicatorValues.length === 0) {
      return new Response(
        JSON.stringify({ error: "No indicator values found for this assessment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${indicatorValues.length} indicator values`);

    // 3. Calculate scores for each indicator
    const indicatorScores: Array<{
      org_id: string;
      assessment_id: string;
      indicator_id: string;
      score: number;
      min_ref_used: number | null;
      max_ref_used: number | null;
      weight_used: number;
    }> = [];

    const pillarData: Record<string, { scores: number[]; weights: number[]; themes: Map<string, { scores: number[]; names: string[] }> }> = {
      RA: { scores: [], weights: [], themes: new Map() },
      OE: { scores: [], weights: [], themes: new Map() },
      AO: { scores: [], weights: [], themes: new Map() },
    };

    for (const iv of indicatorValues as unknown as IndicatorValue[]) {
      const indicator = iv.indicator;
      if (!indicator) continue;

      const score = normalizeValue(
        iv.value_raw,
        indicator.min_ref,
        indicator.max_ref,
        indicator.direction,
        indicator.normalization
      );

      indicatorScores.push({
        org_id: orgId,
        assessment_id,
        indicator_id: iv.indicator_id,
        score,
        min_ref_used: indicator.min_ref,
        max_ref_used: indicator.max_ref,
        weight_used: indicator.weight,
      });

      // Aggregate by pillar
      const pillar = indicator.pillar;
      if (pillarData[pillar]) {
        pillarData[pillar].scores.push(score);
        pillarData[pillar].weights.push(indicator.weight);

        // Aggregate by theme within pillar
        const theme = indicator.theme;
        if (!pillarData[pillar].themes.has(theme)) {
          pillarData[pillar].themes.set(theme, { scores: [], names: [] });
        }
        pillarData[pillar].themes.get(theme)!.scores.push(score);
        pillarData[pillar].themes.get(theme)!.names.push(indicator.name);
      }
    }

    // 4. Delete existing scores/issues/recommendations for this assessment
    await supabase.from("recommendations").delete().eq("assessment_id", assessment_id);
    await supabase.from("issues").delete().eq("assessment_id", assessment_id);
    await supabase.from("pillar_scores").delete().eq("assessment_id", assessment_id);
    await supabase.from("indicator_scores").delete().eq("assessment_id", assessment_id);

    // 5. Insert indicator scores
    if (indicatorScores.length > 0) {
      const { error: insertScoresError } = await supabase
        .from("indicator_scores")
        .insert(indicatorScores);

      if (insertScoresError) {
        console.error("Error inserting indicator scores:", insertScoresError);
      }
    }

    // 6. Calculate pillar scores
    const pillarScores: Array<{
      org_id: string;
      assessment_id: string;
      pillar: string;
      score: number;
      severity: string;
    }> = [];

    for (const [pillar, data] of Object.entries(pillarData)) {
      if (data.scores.length === 0) continue;

      // Weighted average
      let totalWeight = data.weights.reduce((a, b) => a + b, 0);
      let pillarScore: number;
      
      if (totalWeight === 0) {
        // Simple average if no weights
        pillarScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      } else {
        pillarScore = data.scores.reduce((sum, score, i) => sum + score * data.weights[i], 0) / totalWeight;
      }

      pillarScores.push({
        org_id: orgId,
        assessment_id,
        pillar,
        score: pillarScore,
        severity: getSeverity(pillarScore),
      });
    }

    // Insert pillar scores
    if (pillarScores.length > 0) {
      const { error: insertPillarError } = await supabase
        .from("pillar_scores")
        .insert(pillarScores);

      if (insertPillarError) {
        console.error("Error inserting pillar scores:", insertPillarError);
      }
    }

    // 7. Find critical pillar
    const criticalPillar = pillarScores.reduce((prev, curr) => 
      curr.score < prev.score ? curr : prev
    , pillarScores[0]);

    console.log(`Critical pillar: ${criticalPillar?.pillar} with score ${criticalPillar?.score}`);

    // 8. Detect issues (low-scoring themes)
    const issues: Array<{
      org_id: string;
      assessment_id: string;
      pillar: string;
      theme: string;
      severity: string;
      title: string;
      evidence: object;
    }> = [];

    for (const [pillar, data] of Object.entries(pillarData)) {
      for (const [theme, themeData] of data.themes) {
        const avgThemeScore = themeData.scores.reduce((a, b) => a + b, 0) / themeData.scores.length;
        
        // Create issue if theme score is below 0.5
        if (avgThemeScore < 0.5) {
          const severity = getSeverity(avgThemeScore);
          const indicators = themeData.names.map((name, i) => ({
            name,
            score: themeData.scores[i],
          }));

          issues.push({
            org_id: orgId,
            assessment_id,
            pillar,
            theme,
            severity,
            title: generateIssueTitle(pillar as "RA" | "OE" | "AO", theme, avgThemeScore),
            evidence: { indicators, avgScore: avgThemeScore },
          });
        }
      }
    }

    // Insert issues
    let insertedIssues: any[] = [];
    if (issues.length > 0) {
      const { data: issuesData, error: insertIssuesError } = await supabase
        .from("issues")
        .insert(issues)
        .select();

      if (insertIssuesError) {
        console.error("Error inserting issues:", insertIssuesError);
      } else {
        insertedIssues = issuesData || [];
      }
    }

    console.log(`Created ${insertedIssues.length} issues`);

    // 9. Get courses for recommendations
    const { data: courses, error: coursesError } = await supabase
      .from("courses")
      .select("*")
      .or(`org_id.is.null,org_id.eq.${orgId}`);

    if (coursesError) {
      console.error("Error fetching courses:", coursesError);
    }

    // 10. Generate recommendations based on issues
    const recommendations: Array<{
      org_id: string;
      assessment_id: string;
      issue_id: string;
      course_id: string;
      reason: string;
      priority: number;
    }> = [];

    if (courses && courses.length > 0 && insertedIssues.length > 0) {
      let priority = 1;
      
      for (const issue of insertedIssues) {
        // Find matching courses by pillar and theme
        const matchingCourses = (courses as Course[]).filter(course => 
          course.tags.some(tag => 
            tag.pillar === issue.pillar && 
            tag.theme.toLowerCase() === issue.theme.toLowerCase()
          )
        );

        // Sort by level (BASICO first)
        matchingCourses.sort((a, b) => {
          const levelOrder: Record<string, number> = { BASICO: 1, INTERMEDIARIO: 2, AVANCADO: 3 };
          return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
        });

        // Add top 2 matching courses as recommendations
        for (const course of matchingCourses.slice(0, 2)) {
          recommendations.push({
            org_id: orgId,
            assessment_id,
            issue_id: issue.id,
            course_id: course.id,
            reason: `Recomendado para resolver: ${issue.title}`,
            priority: priority++,
          });
        }
      }
    }

    // Insert recommendations
    if (recommendations.length > 0) {
      const { error: insertRecsError } = await supabase
        .from("recommendations")
        .insert(recommendations);

      if (insertRecsError) {
        console.error("Error inserting recommendations:", insertRecsError);
      }
    }

    console.log(`Created ${recommendations.length} recommendations`);

    // 11. Update assessment status
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        status: "CALCULATED",
        calculated_at: new Date().toISOString(),
      })
      .eq("id", assessment_id);

    if (updateError) {
      console.error("Error updating assessment:", updateError);
    }

    // 12. Create audit event
    await supabase.from("audit_events").insert({
      org_id: orgId,
      event_type: "ASSESSMENT_CALCULATED",
      entity_type: "assessment",
      entity_id: assessment_id,
      metadata: {
        pillar_scores: pillarScores,
        critical_pillar: criticalPillar?.pillar,
        issues_count: insertedIssues.length,
        recommendations_count: recommendations.length,
      },
    });

    // Return result
    return new Response(
      JSON.stringify({
        success: true,
        assessment_id,
        pillar_scores: pillarScores,
        critical_pillar: criticalPillar?.pillar,
        critical_score: criticalPillar?.score,
        issues_created: insertedIssues.length,
        recommendations_created: recommendations.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Calculation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate a descriptive issue title
function generateIssueTitle(pillar: "RA" | "OE" | "AO", theme: string, score: number): string {
  const severity = score <= 0.33 ? "crítico" : "moderado";
  
  const themeDescriptions: Record<string, string> = {
    ambiental: "Sustentabilidade ambiental",
    governanca: "Governança e gestão pública",
    infraestrutura: "Infraestrutura turística",
    marketing: "Marketing e promoção",
    desempenho: "Desempenho de mercado",
    oferta: "Oferta turística",
    social: "Aspectos socioculturais",
    economico: "Desenvolvimento econômico",
  };

  const themeDesc = themeDescriptions[theme.toLowerCase()] || theme;
  
  const pillarNames: Record<string, string> = {
    RA: "Relações Ambientais",
    OE: "Organização Estrutural",
    AO: "Ações Operacionais",
  };

  return `${themeDesc} em nível ${severity} (${pillarNames[pillar]})`;
}
