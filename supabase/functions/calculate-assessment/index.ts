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

type TerritorialInterpretation = "ESTRUTURAL" | "GESTAO" | "ENTREGA";

// Rules for determining territorial interpretation based on pillar and theme
function determineInterpretation(
  pillar: "RA" | "OE" | "AO",
  theme: string,
  avgScore: number
): TerritorialInterpretation {
  const themeLower = theme.toLowerCase();
  
  // RA pillar - typically structural issues (historical, socioeconomic constraints)
  if (pillar === "RA") {
    if (themeLower.includes("social") || themeLower.includes("economico") || themeLower.includes("gini")) {
      return "ESTRUTURAL";
    }
    if (themeLower.includes("ambiental") || themeLower.includes("cultural")) {
      return avgScore < 0.33 ? "ESTRUTURAL" : "GESTAO";
    }
    return "ESTRUTURAL";
  }
  
  // OE pillar - typically governance/planning issues
  if (pillar === "OE") {
    if (themeLower.includes("infraestrutura") || themeLower.includes("superestrutura")) {
      return avgScore < 0.33 ? "ESTRUTURAL" : "GESTAO";
    }
    if (themeLower.includes("governanca") || themeLower.includes("institucional")) {
      return "GESTAO";
    }
    return "GESTAO";
  }
  
  // AO pillar - typically execution/delivery issues
  if (pillar === "AO") {
    if (themeLower.includes("oferta") || themeLower.includes("demanda")) {
      return avgScore < 0.33 ? "GESTAO" : "ENTREGA";
    }
    if (themeLower.includes("marketing") || themeLower.includes("promocao")) {
      return "ENTREGA";
    }
    if (themeLower.includes("desempenho") || themeLower.includes("mercado")) {
      return "ENTREGA";
    }
    return "ENTREGA";
  }
  
  return "GESTAO"; // Default fallback
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

// Determine severity based on score (per SISTUR spec)
// Adequado: ≥0.67, Atenção: 0.34-0.66, Crítico: ≤0.33
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

    const pillarData: Record<string, { scores: number[]; weights: number[]; themes: Map<string, { scores: number[]; names: string[]; codes: string[] }> }> = {
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
          pillarData[pillar].themes.set(theme, { scores: [], names: [], codes: [] });
        }
        pillarData[pillar].themes.get(theme)!.scores.push(score);
        pillarData[pillar].themes.get(theme)!.names.push(indicator.name);
        pillarData[pillar].themes.get(theme)!.codes.push(indicator.code);
      }
    }

    // 4. Delete existing scores/issues/recommendations/prescriptions for this assessment
    await supabase.from("prescriptions").delete().eq("assessment_id", assessment_id);
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

    // 8. Detect issues (low-scoring themes) with territorial interpretation
    const issues: Array<{
      org_id: string;
      assessment_id: string;
      pillar: string;
      theme: string;
      severity: string;
      interpretation: TerritorialInterpretation;
      title: string;
      evidence: object;
    }> = [];

    for (const [pillar, data] of Object.entries(pillarData)) {
      for (const [theme, themeData] of data.themes) {
        const avgThemeScore = themeData.scores.reduce((a, b) => a + b, 0) / themeData.scores.length;
        
        // Create issue if theme score is below 0.67 (not Adequado)
        if (avgThemeScore < 0.67) {
          const severity = getSeverity(avgThemeScore);
          const interpretation = determineInterpretation(
            pillar as "RA" | "OE" | "AO",
            theme,
            avgThemeScore
          );
          
          const indicators = themeData.names.map((name, i) => ({
            name,
            code: themeData.codes[i],
            score: themeData.scores[i],
          }));

          issues.push({
            org_id: orgId,
            assessment_id,
            pillar,
            theme,
            severity,
            interpretation,
            title: generateIssueTitle(pillar as "RA" | "OE" | "AO", theme, avgThemeScore, interpretation),
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

    // Helper function to determine target agent based on interpretation
    function determineTargetAgent(interpretation: TerritorialInterpretation): "GESTORES" | "TECNICOS" | "TRADE" {
      switch (interpretation) {
        case "ESTRUTURAL":
          return "GESTORES"; // Strategic decisions
        case "GESTAO":
          return "TECNICOS"; // Technical improvements
        case "ENTREGA":
          return "TRADE"; // Service delivery
        default:
          return "GESTORES";
      }
    }

    // 10. Generate prescriptions with explicit justification (new prescription engine)
    const prescriptions: Array<{
      org_id: string;
      assessment_id: string;
      issue_id: string;
      course_id: string;
      indicator_id?: string;
      pillar: string;
      status: string;
      interpretation: TerritorialInterpretation;
      justification: string;
      target_agent: string;
      priority: number;
      cycle_number: number;
    }> = [];

    // Also keep recommendations for backward compatibility
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
      
      // Sort issues by severity (CRITICO first)
      const sortedIssues = [...insertedIssues].sort((a, b) => {
        const severityOrder: Record<string, number> = { CRITICO: 1, MODERADO: 2, BOM: 3 };
        return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
      });
      
      for (const issue of sortedIssues) {
        // Find matching courses by pillar (new single pillar field first, then tags)
        const matchingCourses = (courses as any[]).filter(course => {
          // Check new pillar field first
          if (course.pillar === issue.pillar) return true;
          // Fall back to tags for backward compatibility
          return course.tags?.some((tag: { pillar: string; theme: string }) => 
            tag.pillar === issue.pillar && 
            tag.theme.toLowerCase() === issue.theme.toLowerCase()
          );
        });

        // Sort by level (BASICO first for critical issues)
        matchingCourses.sort((a, b) => {
          const levelOrder: Record<string, number> = { BASICO: 1, INTERMEDIARIO: 2, AVANCADO: 3 };
          return (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99);
        });

        // Get interpretation labels for justification
        const interpretationLabels: Record<string, string> = {
          ESTRUTURAL: "Estrutural",
          GESTAO: "Gestão",
          ENTREGA: "Entrega"
        };
        const interpretationLabel = interpretationLabels[issue.interpretation] || issue.interpretation;
        
        const pillarNames: Record<string, string> = {
          RA: "Relações Ambientais",
          OE: "Organização Estrutural",
          AO: "Ações Operacionais"
        };
        const pillarName = pillarNames[issue.pillar] || issue.pillar;

        const severityLabels: Record<string, string> = {
          CRITICO: "Crítico",
          MODERADO: "Atenção"
        };
        const severityLabel = severityLabels[issue.severity] || issue.severity;

        // Determine target agent based on interpretation
        const targetAgent = determineTargetAgent(issue.interpretation);

        // Add top 2 matching courses as prescriptions
        for (const course of matchingCourses.slice(0, 2)) {
          // Build the mandatory justification per spec
          const justification = `Esta capacitação foi prescrita porque o indicador de ${issue.theme} está em nível ${severityLabel}, classificado no pilar ${pillarName}, com interpretação territorial ${interpretationLabel}.`;

          prescriptions.push({
            org_id: orgId,
            assessment_id,
            issue_id: issue.id,
            course_id: course.id,
            pillar: issue.pillar,
            status: issue.severity,
            interpretation: issue.interpretation,
            justification,
            target_agent: targetAgent,
            priority: priority,
            cycle_number: 1,
          });

          // Also add to recommendations for backward compatibility
          recommendations.push({
            org_id: orgId,
            assessment_id,
            issue_id: issue.id,
            course_id: course.id,
            reason: justification,
            priority: priority++,
          });
        }
      }
    }

    // Insert prescriptions
    if (prescriptions.length > 0) {
      const { error: insertPrescError } = await supabase
        .from("prescriptions")
        .insert(prescriptions);

      if (insertPrescError) {
        console.error("Error inserting prescriptions:", insertPrescError);
      }
    }

    console.log(`Created ${prescriptions.length} prescriptions`);

    // Insert recommendations (for backward compatibility)
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

    // 12. Detect regression patterns and create alerts
    const destinationId = assessment.destination_id;
    console.log(`Checking regression patterns for destination: ${destinationId}`);

    // Get all previous calculated assessments for this destination
    const { data: previousAssessments } = await supabase
      .from("assessments")
      .select("id, calculated_at")
      .eq("destination_id", destinationId)
      .eq("status", "CALCULATED")
      .neq("id", assessment_id)
      .order("calculated_at", { ascending: false });

    if (previousAssessments && previousAssessments.length > 0) {
      // Get pillar scores for previous assessments
      const prevAssessmentIds = previousAssessments.map(a => a.id);
      const { data: previousPillarScores } = await supabase
        .from("pillar_scores")
        .select("assessment_id, pillar, score")
        .in("assessment_id", prevAssessmentIds);

      if (previousPillarScores && previousPillarScores.length > 0) {
        // Group by assessment in chronological order
        const scoresByAssessment = new Map<string, Map<string, number>>();
        previousPillarScores.forEach(ps => {
          if (!scoresByAssessment.has(ps.assessment_id)) {
            scoresByAssessment.set(ps.assessment_id, new Map());
          }
          scoresByAssessment.get(ps.assessment_id)!.set(ps.pillar, ps.score);
        });

        // Current scores
        const currentScores = new Map<string, number>();
        pillarScores.forEach(ps => currentScores.set(ps.pillar, ps.score));

        // Check each pillar for consecutive regressions
        for (const pillar of ["RA", "OE", "AO"]) {
          const currentScore = currentScores.get(pillar);
          if (currentScore === undefined) continue;

          let consecutiveRegressions = 0;
          let lastScore = currentScore;

          // Go through previous assessments in order (newest first)
          for (const prevAssessment of previousAssessments) {
            const prevScoreMap = scoresByAssessment.get(prevAssessment.id);
            if (!prevScoreMap) continue;

            const prevScore = prevScoreMap.get(pillar);
            if (prevScore === undefined) continue;

            // Check if there was regression (current score < previous score by more than 2%)
            if (lastScore < prevScore - 0.02) {
              consecutiveRegressions++;
              lastScore = prevScore;
            } else {
              break; // No regression in this cycle, stop counting
            }
          }

          // Create alert if 2+ consecutive regressions
          if (consecutiveRegressions >= 2) {
            const pillarNames: Record<string, string> = {
              RA: "Relações Ambientais",
              OE: "Organização Estrutural",
              AO: "Ações Operacionais"
            };

            const alertMessage = `O pilar ${pillarNames[pillar]} (${pillar}) apresentou regressão em ${consecutiveRegressions} ciclos consecutivos. Ação corretiva urgente é recomendada.`;

            // Check if similar alert already exists (not dismissed)
            const { data: existingAlert } = await supabase
              .from("alerts")
              .select("id")
              .eq("destination_id", destinationId)
              .eq("pillar", pillar)
              .eq("alert_type", "REGRESSION")
              .eq("is_dismissed", false)
              .maybeSingle();

            if (!existingAlert) {
              const { error: alertError } = await supabase
                .from("alerts")
                .insert({
                  org_id: orgId,
                  destination_id: destinationId,
                  pillar,
                  alert_type: "REGRESSION",
                  consecutive_cycles: consecutiveRegressions,
                  message: alertMessage,
                  assessment_id: assessment_id,
                });

              if (alertError) {
                console.error("Error creating regression alert:", alertError);
              } else {
                console.log(`Created regression alert for pillar ${pillar} (${consecutiveRegressions} cycles)`);
              }
            } else {
              // Update existing alert with new cycle count
              await supabase
                .from("alerts")
                .update({ 
                  consecutive_cycles: consecutiveRegressions,
                  assessment_id: assessment_id,
                  is_read: false,
                })
                .eq("id", existingAlert.id);
            }
          }
        }
      }
    }

    // 13. Create audit event
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

// Generate a descriptive issue title including interpretation
function generateIssueTitle(
  pillar: "RA" | "OE" | "AO", 
  theme: string, 
  score: number,
  interpretation: TerritorialInterpretation
): string {
  const severityLabel = score <= 0.33 ? "Crítico" : "Atenção";
  
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

  const interpretationLabels: Record<string, string> = {
    ESTRUTURAL: "Estrutural",
    GESTAO: "Gestão",
    ENTREGA: "Entrega"
  };

  return `${themeDesc} em nível ${severityLabel} (${pillarNames[pillar]}) — Interpretação: ${interpretationLabels[interpretation]}`;
}