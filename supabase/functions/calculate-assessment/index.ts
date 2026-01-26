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
    intersectoral_dependency?: boolean;
  };
}

interface Course {
  id: string;
  title: string;
  level: string;
  tags: { pillar: string; theme: string }[];
}

type TerritorialInterpretation = "ESTRUTURAL" | "GESTAO" | "ENTREGA";
type SeverityType = "CRITICO" | "MODERADO" | "BOM";
type PillarType = "RA" | "OE" | "AO";

// ============================================================
// MOTOR IGMA - Princípios Sistêmicos de Mario Beni
// ============================================================

interface PillarContext {
  pillar: PillarType;
  score: number;
  severity: SeverityType;
  trend?: "UP" | "DOWN" | "STABLE";
}

interface IGMAFlags {
  RA_LIMITATION: boolean;
  GOVERNANCE_BLOCK: boolean;
  EXTERNALITY_WARNING: boolean;
  MARKETING_BLOCKED: boolean;
  INTERSECTORAL_DEPENDENCY: boolean;
}

interface IGMAUIMessage {
  type: "warning" | "info" | "critical";
  flag: keyof IGMAFlags;
  title: string;
  message: string;
  icon?: string;
}

interface IGMAOutput {
  flags: IGMAFlags;
  allowedActions: {
    EDU_RA: boolean;
    EDU_AO: boolean;
    EDU_OE: boolean;
    MARKETING: boolean;
  };
  blockedActions: string[];
  uiMessages: IGMAUIMessage[];
  interpretationType: TerritorialInterpretation;
  nextReviewRecommendedAt: string;
  criticalPillar?: PillarType;
}

/**
 * Motor de Interpretação IGMA
 * Aplica as 6 regras sistêmicas de Mario Beni
 */
function interpretIGMA(
  pillarScores: PillarContext[],
  previousPillarScores: PillarContext[] | null,
  assessmentDate: Date,
  intersectoralCount: number
): IGMAOutput {
  const flags: IGMAFlags = {
    RA_LIMITATION: false,
    GOVERNANCE_BLOCK: false,
    EXTERNALITY_WARNING: false,
    MARKETING_BLOCKED: false,
    INTERSECTORAL_DEPENDENCY: false,
  };
  
  const uiMessages: IGMAUIMessage[] = [];
  const blockedActions: string[] = [];
  
  const RA = pillarScores.find(p => p.pillar === "RA");
  const AO = pillarScores.find(p => p.pillar === "AO");
  const OE = pillarScores.find(p => p.pillar === "OE");
  
  const prevRA = previousPillarScores?.find(p => p.pillar === "RA");
  const prevOE = previousPillarScores?.find(p => p.pillar === "OE");
  
  const criticalPillar = pillarScores.reduce((prev, curr) => 
    curr.score < prev.score ? curr : prev
  ).pillar;
  
  let interpretationType: TerritorialInterpretation = "GESTAO";
  if (RA?.severity === "CRITICO") {
    interpretationType = "ESTRUTURAL";
  } else if (AO?.severity === "CRITICO") {
    interpretationType = "GESTAO";
  } else if (OE?.severity === "CRITICO") {
    interpretationType = "ENTREGA";
  }

  // REGRA 1 — LIMITAÇÃO ESTRUTURAL DO TERRITÓRIO
  if (RA?.severity === "CRITICO") {
    flags.RA_LIMITATION = true;
    blockedActions.push("EDU_OE");
    
    uiMessages.push({
      type: "critical",
      flag: "RA_LIMITATION",
      title: "Limitação Estrutural do Território",
      message: "O território apresenta limitações estruturais que comprometem a sustentabilidade do turismo, independentemente de ações de mercado ou gestão isoladas.",
      icon: "AlertTriangle",
    });
  }

  // REGRA 4 — GOVERNANÇA CENTRAL
  if (AO?.severity === "CRITICO") {
    flags.GOVERNANCE_BLOCK = true;
    if (!blockedActions.includes("EDU_OE")) {
      blockedActions.push("EDU_OE");
    }
    
    uiMessages.push({
      type: "critical",
      flag: "GOVERNANCE_BLOCK",
      title: "Fragilidade de Governança",
      message: "Fragilidades de governança comprometem a efetividade de ações de mercado e investimento no turismo.",
      icon: "ShieldAlert",
    });
  }

  // REGRA 3 — EXTERNALIDADES NEGATIVAS
  if (prevRA && prevOE && RA && OE) {
    const oeTrend = OE.score > prevOE.score ? "UP" : (OE.score < prevOE.score ? "DOWN" : "STABLE");
    const raTrend = RA.score < prevRA.score ? "DOWN" : (RA.score > prevRA.score ? "UP" : "STABLE");
    
    if (oeTrend === "UP" && raTrend === "DOWN") {
      flags.EXTERNALITY_WARNING = true;
      
      uiMessages.push({
        type: "warning",
        flag: "EXTERNALITY_WARNING",
        title: "Alerta de Externalidades Negativas",
        message: "O crescimento da oferta turística está ocorrendo sem a correspondente sustentabilidade territorial.",
        icon: "TrendingUp",
      });
    }
  }

  // REGRA 5 — TERRITÓRIO ANTES DO MARKETING
  if (RA?.severity === "CRITICO" || AO?.severity === "CRITICO") {
    flags.MARKETING_BLOCKED = true;
    blockedActions.push("MARKETING");
    
    uiMessages.push({
      type: "warning",
      flag: "MARKETING_BLOCKED",
      title: "Marketing Bloqueado",
      message: "A promoção turística deve ser precedida pela consolidação territorial e institucional.",
      icon: "Ban",
    });
  }

  // REGRA 6 — INTERSETORIALIDADE
  if (intersectoralCount > 0) {
    flags.INTERSECTORAL_DEPENDENCY = true;
    
    uiMessages.push({
      type: "info",
      flag: "INTERSECTORAL_DEPENDENCY",
      title: "Dependência Intersetorial",
      message: `${intersectoralCount} indicador(es) dependem de articulação intersetorial (saúde, segurança, educação).`,
      icon: "Users",
    });
  }

  // REGRA 2 — CICLO CONTÍNUO (calcular próxima revisão)
  let nextReviewMonths = 12;
  if (RA?.severity === "CRITICO") {
    nextReviewMonths = 6;
  } else if (AO?.severity === "CRITICO") {
    nextReviewMonths = 12;
  } else if (OE?.severity === "CRITICO") {
    nextReviewMonths = 9;
  } else if (RA?.severity === "MODERADO" || AO?.severity === "MODERADO" || OE?.severity === "MODERADO") {
    nextReviewMonths = 12;
  } else {
    nextReviewMonths = 18;
  }
  
  const nextReviewDate = new Date(assessmentDate);
  nextReviewDate.setMonth(nextReviewDate.getMonth() + nextReviewMonths);

  const allowedActions = {
    EDU_RA: true,
    EDU_AO: !flags.RA_LIMITATION,
    EDU_OE: !flags.RA_LIMITATION && !flags.GOVERNANCE_BLOCK,
    MARKETING: !flags.MARKETING_BLOCKED,
  };

  return {
    flags,
    allowedActions,
    blockedActions,
    uiMessages,
    interpretationType,
    nextReviewRecommendedAt: nextReviewDate.toISOString(),
    criticalPillar,
  };
}

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
    const assessmentTier = assessment.tier || 'COMPLETE';
    const diagnosticType = assessment.diagnostic_type || 'territorial';
    const isEnterprise = diagnosticType === 'enterprise';
    
    console.log(`Assessment tier: ${assessmentTier}, diagnostic_type: ${diagnosticType}`);

    // Build tier filter based on assessment tier
    // COMPLETE: all indicators
    // MEDIUM: indicators with minimum_tier in ('SMALL', 'MEDIUM')
    // SMALL: indicators with minimum_tier = 'SMALL'
    const getTierFilter = (tier: string) => {
      switch (tier) {
        case 'SMALL':
          return ['SMALL'];
        case 'MEDIUM':
          return ['SMALL', 'MEDIUM'];
        case 'COMPLETE':
        default:
          return ['SMALL', 'MEDIUM', 'COMPLETE'];
      }
    };
    
    const allowedTiers = getTierFilter(assessmentTier);
    console.log(`Allowed tiers for this assessment: ${allowedTiers.join(', ')}`);

    // Define interfaces for Enterprise indicators
    interface EnterpriseIndicatorValue {
      id: string;
      indicator_id: string;
      value: number | null;
      indicator: {
        id: string;
        code: string;
        name: string;
        pillar: "RA" | "OE" | "AO";
        category_id: string;
        benchmark_min: number | null;
        benchmark_max: number | null;
        benchmark_target: number | null;
        weight: number;
        minimum_tier: string;
        unit: string;
      };
    }

    let filteredIndicatorValues: any[] = [];
    let isEnterpriseCalc = false;

    // Fetch enterprise categories for better naming (only used if enterprise)
    let enterpriseCategoryMap = new Map<string, { name: string; code: string; description: string }>();

    // 2. Get indicator values based on diagnostic type
    if (isEnterprise) {
      console.log("Using ENTERPRISE indicators");
      isEnterpriseCalc = true;

      // First, try to get values from the unified indicator_values table (new approach)
      // The EnterpriseDataEntryPanel saves to indicator_values with enterprise-scope indicators
      const { data: unifiedValues, error: unifiedError } = await supabase
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
            weight,
            intersectoral_dependency,
            minimum_tier,
            indicator_scope
          )
        `)
        .eq("assessment_id", assessment_id);

      if (unifiedError) {
        console.error("Error fetching unified indicator values:", unifiedError);
      }

      // Filter for enterprise-scope indicators
      const enterpriseUnifiedValues = (unifiedValues || []).filter((iv: any) => {
        const scope = iv.indicator?.indicator_scope;
        return scope === 'enterprise' || scope === 'both';
      });

      console.log(`Found ${enterpriseUnifiedValues.length} enterprise values in unified indicator_values table`);

      // If we found values in unified table, use them
      if (enterpriseUnifiedValues.length > 0) {
        filteredIndicatorValues = enterpriseUnifiedValues
          .filter((iv: any) => {
            const indicator = iv.indicator;
            if (!indicator) return false;
            const indicatorTier = indicator.minimum_tier || 'COMPLETE';
            return allowedTiers.includes(indicatorTier);
          })
          .map((iv: any) => ({
            id: iv.id,
            indicator_id: iv.indicator_id,
            value_raw: iv.value_raw,
            indicator: {
              id: iv.indicator?.id,
              code: iv.indicator?.code,
              name: iv.indicator?.name,
              pillar: iv.indicator?.pillar,
              theme: iv.indicator?.theme || 'Enterprise',
              direction: iv.indicator?.direction || "HIGH_IS_BETTER",
              normalization: iv.indicator?.normalization || "MIN_MAX",
              min_ref: iv.indicator?.min_ref,
              max_ref: iv.indicator?.max_ref,
              weight: iv.indicator?.weight || 1,
              intersectoral_dependency: iv.indicator?.intersectoral_dependency || false,
              minimum_tier: iv.indicator?.minimum_tier,
            },
          }));

        console.log(`Using ${filteredIndicatorValues.length} enterprise indicator values from unified table`);
      } else {
        // Fallback: Try legacy enterprise_indicator_values table
        console.log("Fallback: Checking legacy enterprise_indicator_values table");

        // Fetch category names for enterprise diagnostics
        const { data: categories } = await supabase
          .from("enterprise_indicator_categories")
          .select("id, name, code, description");
        
        if (categories) {
          for (const cat of categories) {
            enterpriseCategoryMap.set(cat.id, { name: cat.name, code: cat.code, description: cat.description || '' });
          }
        }
        console.log(`Loaded ${enterpriseCategoryMap.size} enterprise categories`);
        
        // Fetch enterprise indicator values
        const { data: enterpriseValues, error: enterpriseError } = await supabase
          .from("enterprise_indicator_values")
          .select(`
            id,
            indicator_id,
            value,
            indicator:enterprise_indicators(
              id,
              code,
              name,
              pillar,
              category_id,
              benchmark_min,
              benchmark_max,
              benchmark_target,
              weight,
              minimum_tier,
              unit
            )
          `)
          .eq("assessment_id", assessment_id);

        if (enterpriseError) {
          console.error("Error fetching enterprise indicator values:", enterpriseError);
          return new Response(
            JSON.stringify({ error: "Failed to fetch enterprise indicator values" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Transform to common structure and filter by tier
        filteredIndicatorValues = (enterpriseValues || [])
          .filter((iv: any) => {
            const indicator = iv.indicator;
            if (!indicator) return false;
            const indicatorTier = indicator.minimum_tier || 'COMPLETE';
            return allowedTiers.includes(indicatorTier);
          })
          .map((iv: any) => {
            // Get category name from map for better issue titles
            const categoryId = iv.indicator?.category_id;
            const categoryInfo = categoryId ? enterpriseCategoryMap.get(categoryId) : null;
            const themeName = categoryInfo?.name || categoryInfo?.code || categoryId || 'Enterprise';
            
            return {
              id: iv.id,
              indicator_id: iv.indicator_id,
              value_raw: iv.value,
              indicator: {
                id: iv.indicator?.id,
                code: iv.indicator?.code,
                name: iv.indicator?.name,
                pillar: iv.indicator?.pillar,
                theme: themeName, // Use category NAME for readable issues
                direction: "HIGH_IS_BETTER" as const, // Enterprise default
                normalization: "MIN_MAX" as const,
                min_ref: iv.indicator?.benchmark_min,
                max_ref: iv.indicator?.benchmark_max,
                weight: iv.indicator?.weight || 1,
                intersectoral_dependency: false,
                minimum_tier: iv.indicator?.minimum_tier,
              },
            };
          });
        
        console.log(`Found ${filteredIndicatorValues.length} enterprise indicator values from legacy table`);
      }
      
      // Log sample theme names for debugging
      if (filteredIndicatorValues.length > 0) {
        const sampleThemes = filteredIndicatorValues.slice(0, 3).map((iv: any) => iv.indicator?.theme);
        console.log(`Sample Enterprise themes: ${JSON.stringify(sampleThemes)}`);
      }
    } else {
      // TERRITORIAL: Use standard indicator_values
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
            weight,
            intersectoral_dependency,
            minimum_tier
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

      // Filter indicator values based on tier
      filteredIndicatorValues = (indicatorValues || []).filter((iv: any) => {
        const indicator = iv.indicator;
        if (!indicator) return false;
        const indicatorTier = indicator.minimum_tier || 'COMPLETE';
        return allowedTiers.includes(indicatorTier);
      });
    }

    if (!filteredIndicatorValues || filteredIndicatorValues.length === 0) {
      return new Response(
        JSON.stringify({ error: `No indicator values found for this ${isEnterprise ? 'enterprise' : 'territorial'} assessment and tier level` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${filteredIndicatorValues.length} ${isEnterprise ? 'enterprise' : 'territorial'} indicator values (tier: ${assessmentTier})`);

    // 3.1 Fetch composite rules for I_SEMT calculation
    const { data: compositeRules } = await supabase
      .from("igma_composite_rules")
      .select("composite_code, component_code, weight, transform");

    console.log(`Found ${compositeRules?.length || 0} composite rules`);

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

    // Count intersectoral indicators (REGRA 6)
    let intersectoralCount = 0;

    for (const iv of filteredIndicatorValues as unknown as IndicatorValue[]) {
      const indicator = iv.indicator;
      if (!indicator) continue;

      // Count intersectoral dependencies
      if (indicator.intersectoral_dependency) {
        intersectoralCount++;
      }

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

    // 3.2 Calculate composite indicators (e.g., I_SEMT)
    if (compositeRules && compositeRules.length > 0) {
      // Group rules by composite_code
      const rulesByComposite = new Map<string, typeof compositeRules>();
      for (const rule of compositeRules) {
        if (!rulesByComposite.has(rule.composite_code)) {
          rulesByComposite.set(rule.composite_code, []);
        }
        rulesByComposite.get(rule.composite_code)!.push(rule);
      }

      // Calculate each composite indicator
      for (const [compositeCode, rules] of rulesByComposite) {
        // Get component scores from already calculated indicator scores
        const componentScores: { score: number; weight: number }[] = [];
        
        for (const rule of rules) {
          // Find the component indicator value
          const componentIv = (filteredIndicatorValues as unknown as IndicatorValue[]).find(
            iv => iv.indicator?.code === rule.component_code
          );
          
          if (componentIv && componentIv.value_raw !== null && componentIv.indicator) {
            let score = normalizeValue(
              componentIv.value_raw,
              componentIv.indicator.min_ref,
              componentIv.indicator.max_ref,
              componentIv.indicator.direction,
              componentIv.indicator.normalization
            );
            
            // Apply transform
            if (rule.transform === "INVERT") {
              score = 1 - score;
            } else if (rule.transform === "LOG") {
              score = Math.log1p(score) / Math.log1p(1);
            } else if (rule.transform === "SQRT") {
              score = Math.sqrt(score);
            }
            
            componentScores.push({ score, weight: Number(rule.weight) });
          }
        }

        // Calculate weighted average if we have components
        if (componentScores.length > 0) {
          const totalWeight = componentScores.reduce((sum, c) => sum + c.weight, 0);
          const compositeScore = totalWeight > 0
            ? componentScores.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight
            : 0;

          // Find the composite indicator
          const { data: compositeIndicator } = await supabase
            .from("indicators")
            .select("id, pillar, theme")
            .eq("code", compositeCode)
            .single();

          if (compositeIndicator) {
            // Add to indicator scores
            indicatorScores.push({
              org_id: orgId,
              assessment_id,
              indicator_id: compositeIndicator.id,
              score: compositeScore,
              min_ref_used: 0,
              max_ref_used: 100,
              weight_used: 1.5,
            });

            // Add to pillar data
            const pillar = compositeIndicator.pillar;
            if (pillarData[pillar]) {
              pillarData[pillar].scores.push(compositeScore);
              pillarData[pillar].weights.push(1.5);

              const theme = compositeIndicator.theme;
              if (!pillarData[pillar].themes.has(theme)) {
                pillarData[pillar].themes.set(theme, { scores: [], names: [], codes: [] });
              }
              pillarData[pillar].themes.get(theme)!.scores.push(compositeScore);
              pillarData[pillar].themes.get(theme)!.names.push(`Índice Composto ${compositeCode}`);
              pillarData[pillar].themes.get(theme)!.codes.push(compositeCode);
            }

            console.log(`Calculated composite ${compositeCode}: ${compositeScore.toFixed(3)}`);
          }
        }
      }
    }

    // 4. Delete existing scores/issues/recommendations/prescriptions/action_plans for this assessment
    await supabase.from("action_plans").delete().eq("assessment_id", assessment_id);
    await supabase.from("prescriptions").delete().eq("assessment_id", assessment_id);
    await supabase.from("recommendations").delete().eq("assessment_id", assessment_id);
    await supabase.from("issues").delete().eq("assessment_id", assessment_id);
    await supabase.from("pillar_scores").delete().eq("assessment_id", assessment_id);
    
     // Delete indicator scores for this assessment.
     // IMPORTANT: Indicators are now unified in the `indicators` catalog, so Enterprise scores must be stored
     // in `indicator_scores` (FK -> indicators). The legacy `enterprise_indicator_scores` references
     // `enterprise_indicators` and will fail with FK violations.
     await supabase.from("indicator_scores").delete().eq("assessment_id", assessment_id);

    // 5. Insert indicator scores (deduplicate by indicator_id to avoid unique constraint violations)
    if (indicatorScores.length > 0) {
      // Deduplicate: keep the last entry for each indicator_id (composite scores take precedence)
      const deduplicatedScores = Array.from(
        indicatorScores.reduce((map, score) => {
          map.set(score.indicator_id, score);
          return map;
        }, new Map<string, typeof indicatorScores[0]>()).values()
      );
      
      console.log(`Inserting ${deduplicatedScores.length} ${isEnterpriseCalc ? 'enterprise ' : ''}indicator scores (deduplicated from ${indicatorScores.length})`);
      
       // Insert into unified indicator_scores (works for both territorial and enterprise).
       // Ensure computed_at is present (indicator_scores has NOT NULL computed_at).
       const scoresForInsert = deduplicatedScores.map((s) => ({
         ...s,
         computed_at: (s as any).computed_at ?? new Date().toISOString(),
       }));

       const { error: insertScoresError } = await supabase
         .from("indicator_scores")
         .insert(scoresForInsert);

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

    // 7. Get previous assessment pillar scores for IGMA trend analysis
    const destinationId = assessment.destination_id;
    let previousPillarContexts: PillarContext[] | null = null;
    
    const { data: previousAssessments } = await supabase
      .from("assessments")
      .select("id, calculated_at")
      .eq("destination_id", destinationId)
      .eq("status", "CALCULATED")
      .neq("id", assessment_id)
      .order("calculated_at", { ascending: false })
      .limit(1);

    if (previousAssessments && previousAssessments.length > 0) {
      const { data: prevScores } = await supabase
        .from("pillar_scores")
        .select("pillar, score, severity")
        .eq("assessment_id", previousAssessments[0].id);
      
      if (prevScores && prevScores.length > 0) {
        previousPillarContexts = prevScores.map(ps => ({
          pillar: ps.pillar as PillarType,
          score: ps.score,
          severity: ps.severity as SeverityType,
        }));
      }
    }

    // 8. Apply IGMA interpretation engine (Mario Beni principles)
    const currentPillarContexts: PillarContext[] = pillarScores.map(ps => ({
      pillar: ps.pillar as PillarType,
      score: ps.score,
      severity: ps.severity as SeverityType,
    }));

    const igmaResult = interpretIGMA(
      currentPillarContexts,
      previousPillarContexts,
      new Date(),
      intersectoralCount
    );

    console.log("IGMA Result:", JSON.stringify(igmaResult, null, 2));

    // Find critical pillar
    const criticalPillar = pillarScores.reduce((prev, curr) => 
      curr.score < prev.score ? curr : prev
    , pillarScores[0]);

    console.log(`Critical pillar: ${criticalPillar?.pillar} with score ${criticalPillar?.score}`);

    // 9. Detect issues (low-scoring themes) with territorial interpretation
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

    // 10. Get indicator codes for low-scoring indicators to map to trainings
    // Collect all indicator codes that have score < 0.67 (Crítico or Atenção)
    const lowScoreIndicatorCodes: string[] = [];
    const indicatorScoreMap = new Map<string, { code: string; name: string; score: number; pillar: string }>();
    
    for (const iv of filteredIndicatorValues as unknown as IndicatorValue[]) {
      if (!iv.indicator) continue;
      const indicatorScore = indicatorScores.find(s => s.indicator_id === iv.indicator_id);
      if (indicatorScore && indicatorScore.score < 0.67) {
        lowScoreIndicatorCodes.push(iv.indicator.code);
        indicatorScoreMap.set(iv.indicator.code, {
          code: iv.indicator.code,
          name: iv.indicator.name,
          score: indicatorScore.score,
          pillar: iv.indicator.pillar,
        });
      }
    }

    console.log(`Found ${lowScoreIndicatorCodes.length} indicators with low scores for training mapping`);

    // 10.1 Get training mappings from edu_indicator_training_map (unified EDU model)
    let trainingMappings: any[] = [];
    let eduTrainings: any[] = [];

    if (lowScoreIndicatorCodes.length > 0) {
      const { data: mappings, error: mappingsError } = await supabase
        .from("edu_indicator_training_map")
        .select("*")
        .in("indicator_code", lowScoreIndicatorCodes)
        .order("priority", { ascending: true });

      if (mappingsError) {
        console.error("Error fetching training mappings:", mappingsError);
      } else {
        trainingMappings = mappings || [];
      }

      // Get unique training IDs
      const trainingIds = [...new Set((trainingMappings || []).map(m => m.training_id))];
      
      if (trainingIds.length > 0) {
        const { data: trainings, error: trainingsError } = await supabase
          .from("edu_trainings")
          .select("*")
          .in("training_id", trainingIds)
          .eq("active", true);

        if (trainingsError) {
          console.error("Error fetching edu trainings:", trainingsError);
        } else {
          eduTrainings = trainings || [];
        }
      }
    }

    console.log(`Found ${trainingMappings.length} training mappings and ${eduTrainings.length} active trainings`);

    // 10.2 Fallback: Also get legacy courses for backward compatibility
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

    // 11. Generate prescriptions with IGMA filtering (Mario Beni rules)
    // Using UNIFIED EDU model: edu_indicator_training_map + edu_trainings
    const prescriptions: Array<{
      org_id: string;
      assessment_id: string;
      issue_id: string;
      course_id?: string;
      training_id?: string;
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
      course_id?: string;
      training_id?: string;
      reason: string;
      priority: number;
    }> = [];

    // Label constants for justification
    const interpretationLabels: Record<string, string> = {
      ESTRUTURAL: "Estrutural",
      GESTAO: "Gestão",
      ENTREGA: "Entrega"
    };
    
    const pillarNames: Record<string, string> = {
      RA: "Relações Ambientais",
      OE: "Organização Estrutural",
      AO: "Ações Operacionais"
    };

    const severityLabels: Record<string, string> = {
      CRITICO: "Crítico",
      MODERADO: "Atenção"
    };

    let priority = 1;
    const usedTrainingIds = new Set<string>();

    // STRATEGY A: Use edu_indicator_training_map (preferred - unified model)
    if (trainingMappings.length > 0 && eduTrainings.length > 0 && insertedIssues.length > 0) {
      console.log("Using unified EDU model for prescriptions");

      // Group mappings by indicator code
      const mappingsByIndicator = new Map<string, typeof trainingMappings>();
      for (const mapping of trainingMappings) {
        if (!mappingsByIndicator.has(mapping.indicator_code)) {
          mappingsByIndicator.set(mapping.indicator_code, []);
        }
        mappingsByIndicator.get(mapping.indicator_code)!.push(mapping);
      }

      // For each issue, find trainings mapped to indicators in that issue's evidence
      for (const issue of insertedIssues) {
        // IGMA FILTER: Check if this pillar's EDU is allowed (Mario Beni rules)
        const pillarActionKey = `EDU_${issue.pillar}` as keyof typeof igmaResult.allowedActions;
        const isAllowed = igmaResult.allowedActions[pillarActionKey] ?? true;
        
        if (!isAllowed) {
          console.log(`IGMA: Skipping prescriptions for pillar ${issue.pillar} - blocked by systemic rules`);
          continue;
        }

        // Get indicator codes from issue evidence
        const evidenceIndicators = (issue.evidence as any)?.indicators || [];
        const issueIndicatorCodes = evidenceIndicators.map((i: any) => i.code).filter(Boolean);

        // Find matching trainings via mappings
        const matchedTrainings: Array<{ training: any; mapping: any; indicatorInfo: any }> = [];

        for (const code of issueIndicatorCodes) {
          const mappings = mappingsByIndicator.get(code) || [];
          const indicatorInfo = indicatorScoreMap.get(code);
          
          for (const mapping of mappings) {
            // Only include if pillar matches
            if (mapping.pillar !== issue.pillar) continue;
            
            const training = eduTrainings.find(t => t.training_id === mapping.training_id);
            if (training && !usedTrainingIds.has(training.training_id)) {
              matchedTrainings.push({ training, mapping, indicatorInfo });
            }
          }
        }

        // Sort by mapping priority and take top 3
        matchedTrainings.sort((a, b) => a.mapping.priority - b.mapping.priority);
        
        const targetAgent = determineTargetAgent(issue.interpretation);
        const interpretationLabel = interpretationLabels[issue.interpretation] || issue.interpretation;
        const pillarName = pillarNames[issue.pillar] || issue.pillar;
        const severityLabel = severityLabels[issue.severity] || issue.severity;

        for (const { training, mapping, indicatorInfo } of matchedTrainings.slice(0, 3)) {
          // Build justification using the mapping's reason_template or default format
          let justification = mapping.reason_template || 
            `Esta capacitação foi prescrita porque o indicador {indicator} está {status} no pilar {pillar}.`;
          
          justification = justification
            .replace('{indicator}', indicatorInfo?.name || issue.theme)
            .replace('{status}', severityLabel)
            .replace('{pillar}', pillarName);

          // Mark as used to avoid duplicates
          usedTrainingIds.add(training.training_id);

          prescriptions.push({
            org_id: orgId,
            assessment_id,
            issue_id: issue.id,
            training_id: training.training_id, // Use training_id for unified EDU model
            // indicator_id omitted - would need UUID lookup, not critical for prescriptions
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
            training_id: training.training_id, // Use training_id for unified EDU model
            reason: justification,
            priority: priority++,
          });
        }
      }
    }

    // STRATEGY B: Fallback to legacy courses table if no EDU mappings found
    if (prescriptions.length === 0 && courses && courses.length > 0 && insertedIssues.length > 0) {
      console.log("Falling back to legacy courses table for prescriptions");
      
      // Sort issues by severity (CRITICO first)
      const sortedIssues = [...insertedIssues].sort((a, b) => {
        const severityOrder: Record<string, number> = { CRITICO: 1, MODERADO: 2, BOM: 3 };
        return (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99);
      });
      
      for (const issue of sortedIssues) {
        // IGMA FILTER: Check if this pillar's EDU is allowed (Mario Beni rules)
        const pillarActionKey = `EDU_${issue.pillar}` as keyof typeof igmaResult.allowedActions;
        const isAllowed = igmaResult.allowedActions[pillarActionKey] ?? true;
        
        if (!isAllowed) {
          console.log(`IGMA: Skipping prescriptions for pillar ${issue.pillar} - blocked by systemic rules`);
          continue;
        }

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

        const interpretationLabel = interpretationLabels[issue.interpretation] || issue.interpretation;
        const pillarName = pillarNames[issue.pillar] || issue.pillar;
        const severityLabel = severityLabels[issue.severity] || issue.severity;
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

    // 12. Update assessment with IGMA results (including new ra_limitation and governance_block flags)
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        status: "CALCULATED",
        calculated_at: new Date().toISOString(),
        next_review_recommended_at: igmaResult.nextReviewRecommendedAt,
        igma_flags: Object.entries(igmaResult.flags)
          .filter(([_, v]) => v)
          .map(([k, _]) => k),
        igma_interpretation: {
          flags: igmaResult.flags,
          allowedActions: igmaResult.allowedActions,
          blockedActions: igmaResult.blockedActions,
          uiMessages: igmaResult.uiMessages,
          interpretationType: igmaResult.interpretationType,
          criticalPillar: igmaResult.criticalPillar,
        },
        marketing_blocked: igmaResult.flags.MARKETING_BLOCKED,
        externality_warning: igmaResult.flags.EXTERNALITY_WARNING,
        // NEW: Persist RA_LIMITATION and GOVERNANCE_BLOCK flags for full auditability
        ra_limitation: igmaResult.flags.RA_LIMITATION,
        governance_block: igmaResult.flags.GOVERNANCE_BLOCK,
      })
      .eq("id", assessment_id);

    if (updateError) {
      console.error("Error updating assessment:", updateError);
    }

    // 12.1 Generate initial action plans from issues/prescriptions (ERP cycle closure)
    console.log("Generating initial action plans...");
    const actionPlans: Array<{
      org_id: string;
      assessment_id: string;
      title: string;
      description: string;
      pillar: string;
      priority: number;
      linked_issue_id?: string;
      linked_prescription_id?: string;
      due_date: string;
    }> = [];

    // Create action plans based on critical issues
    for (const issue of insertedIssues) {
      if (issue.severity === "CRITICO" || issue.severity === "MODERADO") {
        const pillarNames: Record<string, string> = {
          RA: "Relações Ambientais",
          OE: "Organização Estrutural",
          AO: "Ações Operacionais"
        };
        
        // Calculate due date based on severity
        const dueDate = new Date();
        if (issue.severity === "CRITICO") {
          dueDate.setMonth(dueDate.getMonth() + 3); // 3 months for critical
        } else {
          dueDate.setMonth(dueDate.getMonth() + 6); // 6 months for moderate
        }

        // Get category name for enterprise diagnostics
        let themeDisplayName = issue.theme;
        if (isEnterpriseCalc && enterpriseCategoryMap.has(issue.theme)) {
          themeDisplayName = enterpriseCategoryMap.get(issue.theme)!.name;
        }

        // Enterprise-specific action plan formatting
        const isEnterprisePlan = isEnterpriseCalc;
        const planTitle = isEnterprisePlan
          ? `Plano de Ação Hoteleiro: ${themeDisplayName}`
          : `Plano de Ação: ${themeDisplayName} (${pillarNames[issue.pillar]})`;
        
        const planDescription = isEnterprisePlan
          ? `Ação corretiva para o KPI hoteleiro identificado: ${issue.title}. Categoria: ${themeDisplayName}. Interpretação: ${issue.interpretation}. Prioridade baseada em benchmark do setor.`
          : `Ação corretiva para o gargalo identificado: ${issue.title}. Interpretação territorial: ${issue.interpretation}.`;

        actionPlans.push({
          org_id: orgId,
          assessment_id,
          title: planTitle,
          description: planDescription,
          pillar: issue.pillar,
          priority: issue.severity === "CRITICO" ? 1 : 2,
          linked_issue_id: issue.id,
          due_date: dueDate.toISOString().split('T')[0],
        });
      }
    }

    // Link prescriptions to action plans
    if (prescriptions.length > 0 && actionPlans.length > 0) {
      // Get inserted prescriptions to link them
      const { data: insertedPrescriptions } = await supabase
        .from("prescriptions")
        .select("id, issue_id")
        .eq("assessment_id", assessment_id);
      
      if (insertedPrescriptions) {
        for (const ap of actionPlans) {
          const matchingPrescription = insertedPrescriptions.find(p => p.issue_id === ap.linked_issue_id);
          if (matchingPrescription) {
            ap.linked_prescription_id = matchingPrescription.id;
          }
        }
      }
    }

    // Insert action plans
    if (actionPlans.length > 0) {
      const { error: insertApError } = await supabase
        .from("action_plans")
        .insert(actionPlans);

      if (insertApError) {
        console.error("Error inserting action plans:", insertApError);
      } else {
        console.log(`Created ${actionPlans.length} action plans`);
      }
    }

    // 13. Save IGMA interpretation history
    await supabase.from("igma_interpretation_history").insert({
      assessment_id,
      org_id: orgId,
      pillar_context: currentPillarContexts,
      flags: Object.entries(igmaResult.flags)
        .filter(([_, v]) => v)
        .map(([k, _]) => k),
      allowed_actions: Object.entries(igmaResult.allowedActions)
        .filter(([_, v]) => v)
        .map(([k, _]) => k),
      blocked_actions: igmaResult.blockedActions,
      ui_messages: igmaResult.uiMessages,
      interpretation_type: igmaResult.interpretationType,
    });

    // 14. Detect regression patterns and create alerts
    console.log(`Checking regression patterns for destination: ${destinationId}`);

    // Get all previous calculated assessments for this destination
    const { data: allPreviousAssessments } = await supabase
      .from("assessments")
      .select("id, calculated_at")
      .eq("destination_id", destinationId)
      .eq("status", "CALCULATED")
      .neq("id", assessment_id)
      .order("calculated_at", { ascending: false });

    if (allPreviousAssessments && allPreviousAssessments.length > 0) {
      // Get pillar scores for previous assessments
      const prevAssessmentIds = allPreviousAssessments.map(a => a.id);
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
          for (const prevAssessment of allPreviousAssessments) {
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

    // 15. Create IGMA-based alerts for Mario Beni rules
    for (const msg of igmaResult.uiMessages) {
      if (msg.type === "critical" || msg.type === "warning") {
        // Check if similar alert already exists
        const { data: existingIgmaAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("destination_id", destinationId)
          .eq("alert_type", `IGMA_${msg.flag}`)
          .eq("is_dismissed", false)
          .maybeSingle();

        if (!existingIgmaAlert) {
          await supabase.from("alerts").insert({
            org_id: orgId,
            destination_id: destinationId,
            pillar: igmaResult.criticalPillar || "RA",
            alert_type: `IGMA_${msg.flag}`,
            message: `${msg.title}: ${msg.message}`,
            assessment_id: assessment_id,
          });
        }
      }
    }

    // 16. Create audit event
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
        igma_flags: igmaResult.flags,
        igma_blocked_actions: igmaResult.blockedActions,
        next_review_at: igmaResult.nextReviewRecommendedAt,
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
        igma: {
          flags: igmaResult.flags,
          allowedActions: igmaResult.allowedActions,
          blockedActions: igmaResult.blockedActions,
          uiMessages: igmaResult.uiMessages,
          nextReviewRecommendedAt: igmaResult.nextReviewRecommendedAt,
        },
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
