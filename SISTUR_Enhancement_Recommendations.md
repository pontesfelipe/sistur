# SISTUR Enhancement Recommendations
## Architecture Improvements & New Features Aligned with Mario Beni Methodology

**Document Version**: 1.0
**Date**: January 2026
**Prepared for**: Lovable Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Mario Beni Methodology Alignment](#mario-beni-methodology-alignment)
3. [Architecture Recommendations](#architecture-recommendations)
4. [Priority Feature Roadmap](#priority-feature-roadmap)
5. [Implementation Instructions](#implementation-instructions)
6. [Database Schema Changes](#database-schema-changes)
7. [Code Examples](#code-examples)
8. [API Specifications](#api-specifications)
9. [Validation Checklist](#validation-checklist)

---

## Executive Summary

Based on the strategic vision presented in the SISTUR presentation and analysis of the current implementation, this document provides comprehensive recommendations to transform SISTUR from a **diagnostic-focused platform** into a **complete territorial intelligence ecosystem** serving five stakeholder types:

1. **Public Decision-Makers** (current focus) ✅
2. **Investors** (missing) ❌
3. **Entrepreneurs** (missing) ❌
4. **Community** (missing) ❌
5. **Travelers** (missing) ❌

**Key Gap**: Current system implements excellent diagnostic capabilities with Mario Beni's IGMA motor, but lacks the **Impact Mathematics layer**, **Investment Marketplace**, and **Multi-Stakeholder Architecture** emphasized in the strategic vision.

**Critical Principle**: All recommendations MUST respect Mario Beni's systemic hierarchy where **RA (Environment) → AO (Governance) → OE (Infrastructure)** and IGMA blocking rules are never bypassed.

---

## Mario Beni Methodology Alignment

### Core Principles from "Análise Estrutural do Turismo"

**SISTUR Model** = Tourism as an open system with three interdependent sets:

1. **CRA (Conjunto das Relações Ambientais)** → **RA Pillar**
   - Environmental relations, natural resources, cultural heritage
   - **Priority 1**: Foundation of sustainable tourism

2. **COE (Conjunto da Organização Estrutural)** → **OE Pillar**
   - Infrastructure, equipment, services, supply chain
   - **Priority 2**: Built only on healthy environmental foundation

3. **CAO (Conjunto das Ações Operacionais)** → **AO Pillar**
   - Governance, policies, operations, coordination
   - **Central Mediator**: Critical governance blocks entire system

### The 6 IGMA Rules (Mario Beni Systemic Principles)

```typescript
// Currently implemented in src/lib/igmaEngine.ts
export const IGMA_RULES = {
  RULE_1: "RA_LIMITATION",           // Environmental issues block infrastructure
  RULE_2: "CONTINUOUS_CYCLE",         // Auto-scheduled reviews by severity
  RULE_3: "NEGATIVE_EXTERNALITIES",   // Detect OE growth harming RA
  RULE_4: "GOVERNANCE_BLOCK",         // Critical AO blocks everything
  RULE_5: "MARKETING_BLOCKED",        // No promotion if RA/AO critical
  RULE_6: "INTERSECTORAL_DEPENDENCY"  // Multi-agency coordination needed
};
```

### Alignment Validation Checklist

Before implementing ANY feature, validate:

- [ ] **Does it respect RA environmental priority?**
- [ ] **Does it enforce governance centrality (AO)?**
- [ ] **Does it support holistic systemic analysis?**
- [ ] **Does it detect negative externalities?**
- [ ] **Does it support continuous planning cycles?**
- [ ] **Does it recognize intersectoral dependencies?**

**🚨 NEVER**: Allow profit-driven decisions to override IGMA blocking rules.

---

## Architecture Recommendations

### 1. Multi-Stakeholder Architecture

**Current State**: Single-tenant orgs with generic roles (ADMIN/ANALYST/VIEWER)

**Recommended Architecture**:

```typescript
// New stakeholder type system
enum StakeholderType {
  PUBLIC_DECISION_MAKER = "PUBLIC_DECISION_MAKER",  // Current focus
  INVESTOR = "INVESTOR",                             // New
  ENTREPRENEUR = "ENTREPRENEUR",                     // New
  COMMUNITY_MEMBER = "COMMUNITY_MEMBER",            // New
  TRAVELER = "TRAVELER"                             // New
}

// Stakeholder profiles with specific capabilities
interface StakeholderProfile {
  id: string;
  user_id: string;
  stakeholder_type: StakeholderType;
  org_id: string;
  capabilities: StakeholderCapability[];
  preferences: Record<string, any>;
}

interface StakeholderCapability {
  action: string;              // e.g., "VIEW_INVESTMENTS", "SUBMIT_FEEDBACK"
  scope: string;               // e.g., "DESTINATION:123", "ORG:456"
  igma_filtered: boolean;      // TRUE = subject to IGMA blocking rules
}
```

**Database Schema**:

```sql
-- New table: stakeholder_profiles
CREATE TABLE stakeholder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN (
    'PUBLIC_DECISION_MAKER',
    'INVESTOR',
    'ENTREPRENEUR',
    'COMMUNITY_MEMBER',
    'TRAVELER'
  )),
  profile_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_stakeholder_profiles_type ON stakeholder_profiles(stakeholder_type);
CREATE INDEX idx_stakeholder_profiles_user ON stakeholder_profiles(user_id);

-- RLS Policies
ALTER TABLE stakeholder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stakeholder profiles"
  ON stakeholder_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view all org stakeholder profiles"
  ON stakeholder_profiles FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
```

**Implementation Priority**: **HIGH** (Foundation for all other features)

---

### 2. Impact Mathematics Layer

**Strategic Importance**: Core differentiator mentioned in presentation: *"Transforming discourse into metrics"*

**Current State**: Pillar scores (RA, OE, AO) normalized 0-1 with severity levels

**Recommended Enhancement**: Add **Territorial Impact Index (TII)** module

```typescript
// New impact scoring system
interface TerritorialImpactScore {
  assessment_id: string;
  destination_id: string;

  // Four impact dimensions
  environmental_impact: number;      // 0-1 scale
  social_impact: number;             // 0-1 scale
  institutional_impact: number;      // 0-1 scale
  economic_impact: number;           // 0-1 scale

  // Composite index
  territorial_impact_index: number;  // Weighted average

  // Certification eligibility
  certification_eligible: boolean;
  certification_level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null;

  // ESG alignment
  esg_score: number;                 // 0-100 scale
  sdg_alignments: number[];          // UN SDG goals aligned (1-17)

  calculated_at: Date;
}

// Calculation logic
function calculateTerritorialImpactIndex(
  pillarScores: { RA: number; OE: number; AO: number },
  indicators: IndicatorValue[]
): TerritorialImpactScore {

  // Environmental Impact (derived from RA)
  const environmentalIndicators = indicators.filter(i =>
    i.pillar === 'RA' && i.theme.includes('ambiental')
  );
  const environmental_impact = pillarScores.RA; // Can be refined

  // Social Impact (cross-pillar)
  const socialIndicators = indicators.filter(i =>
    i.theme.includes('social') || i.theme.includes('comunidade')
  );
  const social_impact = calculateWeightedAverage(socialIndicators);

  // Institutional Impact (derived from AO)
  const institutional_impact = pillarScores.AO;

  // Economic Impact (derived from OE + economic indicators)
  const economicIndicators = indicators.filter(i =>
    i.theme.includes('econom') || i.theme.includes('emprego')
  );
  const economic_impact = (pillarScores.OE + calculateWeightedAverage(economicIndicators)) / 2;

  // Composite TII (weighted based on Beni's hierarchy)
  const territorial_impact_index = (
    environmental_impact * 0.35 +  // Highest weight (RA priority)
    institutional_impact * 0.30 +  // Governance centrality
    social_impact * 0.20 +
    economic_impact * 0.15         // Lowest weight (subordinate to RA/AO)
  );

  // Certification logic (MUST respect IGMA)
  const certification_eligible =
    pillarScores.RA >= 0.67 &&
    pillarScores.AO >= 0.67 &&
    pillarScores.OE >= 0.67;

  let certification_level = null;
  if (certification_eligible) {
    if (territorial_impact_index >= 0.90) certification_level = 'PLATINUM';
    else if (territorial_impact_index >= 0.80) certification_level = 'GOLD';
    else if (territorial_impact_index >= 0.70) certification_level = 'SILVER';
    else certification_level = 'BRONZE';
  }

  return {
    environmental_impact,
    social_impact,
    institutional_impact,
    economic_impact,
    territorial_impact_index,
    certification_eligible,
    certification_level,
    esg_score: territorial_impact_index * 100,
    sdg_alignments: mapToSDGs(indicators),
    calculated_at: new Date()
  };
}
```

**Database Schema**:

```sql
-- New table: territorial_impact_scores
CREATE TABLE territorial_impact_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  -- Four impact dimensions
  environmental_impact DECIMAL(5,4) NOT NULL CHECK (environmental_impact BETWEEN 0 AND 1),
  social_impact DECIMAL(5,4) NOT NULL CHECK (social_impact BETWEEN 0 AND 1),
  institutional_impact DECIMAL(5,4) NOT NULL CHECK (institutional_impact BETWEEN 0 AND 1),
  economic_impact DECIMAL(5,4) NOT NULL CHECK (economic_impact BETWEEN 0 AND 1),

  -- Composite index
  territorial_impact_index DECIMAL(5,4) NOT NULL CHECK (territorial_impact_index BETWEEN 0 AND 1),

  -- Certification
  certification_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  certification_level TEXT CHECK (certification_level IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),

  -- ESG & SDG
  esg_score DECIMAL(5,2) CHECK (esg_score BETWEEN 0 AND 100),
  sdg_alignments INTEGER[] DEFAULT '{}',

  -- Metadata
  calculation_method TEXT DEFAULT 'BENI_WEIGHTED_V1',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(assessment_id)
);

CREATE INDEX idx_impact_scores_destination ON territorial_impact_scores(destination_id);
CREATE INDEX idx_impact_scores_certification ON territorial_impact_scores(certification_level);

-- RLS Policies
ALTER TABLE territorial_impact_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view impact scores for their org destinations"
  ON territorial_impact_scores FOR SELECT
  USING (
    destination_id IN (
      SELECT id FROM destinations WHERE org_id IN (
        SELECT org_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Public access for certified destinations (transparency)
CREATE POLICY "Public can view certified destination scores"
  ON territorial_impact_scores FOR SELECT
  USING (certification_eligible = TRUE);
```

**Implementation Priority**: **CRITICAL** (Core strategic differentiator)

---

### 3. Investment Marketplace Architecture

**Strategic Importance**: Presentation emphasizes connecting investors to territories

**CRITICAL GUARDRAIL**: MUST respect IGMA blocking rules - NO bypasses for profit

**Architecture**:

```typescript
// Investment opportunity types (IGMA-filtered)
enum InvestmentType {
  ENVIRONMENTAL_RESTORATION = "ENVIRONMENTAL_RESTORATION",   // Allowed when RA critical
  GOVERNANCE_CAPACITY = "GOVERNANCE_CAPACITY",               // Allowed when AO critical
  INFRASTRUCTURE_DEVELOPMENT = "INFRASTRUCTURE_DEVELOPMENT", // Only if RA & AO healthy
  TRAINING_CAPACITY = "TRAINING_CAPACITY",                   // Always allowed
  RESEARCH_DEVELOPMENT = "RESEARCH_DEVELOPMENT"              // Always allowed
}

interface InvestmentOpportunity {
  id: string;
  destination_id: string;
  assessment_id: string;

  // Opportunity details
  title: string;
  description: string;
  investment_type: InvestmentType;
  required_capital: number;
  expected_roi: number;
  impact_focus: ('ENVIRONMENTAL' | 'SOCIAL' | 'INSTITUTIONAL' | 'ECONOMIC')[];

  // IGMA compliance
  igma_approved: boolean;           // TRUE only if passes IGMA rules
  blocked_by_igma: boolean;
  blocking_reason?: string;
  allowed_investor_types: string[];

  // Impact projections
  projected_ra_improvement: number;
  projected_ao_improvement: number;
  projected_oe_improvement: number;

  // Due diligence
  data_package_url: string;         // Auditable indicator reports
  risk_assessment: Record<string, any>;

  status: 'DRAFT' | 'PUBLISHED' | 'FUNDED' | 'COMPLETED';
  created_at: Date;
}

// IGMA filter for investment opportunities
function filterInvestmentsByIGMA(
  opportunities: InvestmentOpportunity[],
  pillarScores: { RA: PillarScore; OE: PillarScore; AO: PillarScore },
  igmaOutput: IGMAOutput
): InvestmentOpportunity[] {

  return opportunities.map(opp => {
    let igma_approved = true;
    let blocking_reason = '';

    // RULE 1: RA LIMITATION
    if (pillarScores.RA.severity === 'CRITICO') {
      if (opp.investment_type === 'INFRASTRUCTURE_DEVELOPMENT') {
        igma_approved = false;
        blocking_reason = 'RA crítico bloqueia investimentos em infraestrutura (OE). Priorize restauração ambiental.';
      }
    }

    // RULE 4: GOVERNANCE BLOCK
    if (pillarScores.AO.severity === 'CRITICO') {
      if (opp.investment_type !== 'GOVERNANCE_CAPACITY') {
        igma_approved = false;
        blocking_reason = 'AO crítico bloqueia todos os investimentos exceto capacitação de governança.';
      }
    }

    // RULE 3: NEGATIVE EXTERNALITIES
    if (igmaOutput.flags.EXTERNALITY_WARNING) {
      if (opp.investment_type === 'INFRASTRUCTURE_DEVELOPMENT' && opp.projected_ra_improvement <= 0) {
        igma_approved = false;
        blocking_reason = 'Investimento pode causar externalidades negativas ao meio ambiente (RA).';
      }
    }

    return {
      ...opp,
      igma_approved,
      blocked_by_igma: !igma_approved,
      blocking_reason: igma_approved ? undefined : blocking_reason
    };
  });
}
```

**Database Schema**:

```sql
-- New table: investment_opportunities
CREATE TABLE investment_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,

  -- Opportunity details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  investment_type TEXT NOT NULL CHECK (investment_type IN (
    'ENVIRONMENTAL_RESTORATION',
    'GOVERNANCE_CAPACITY',
    'INFRASTRUCTURE_DEVELOPMENT',
    'TRAINING_CAPACITY',
    'RESEARCH_DEVELOPMENT'
  )),
  required_capital BIGINT NOT NULL CHECK (required_capital > 0),
  expected_roi DECIMAL(5,2),
  impact_focus TEXT[] DEFAULT '{}',

  -- IGMA compliance
  igma_approved BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_by_igma BOOLEAN NOT NULL DEFAULT FALSE,
  blocking_reason TEXT,

  -- Impact projections
  projected_ra_improvement DECIMAL(5,4),
  projected_ao_improvement DECIMAL(5,4),
  projected_oe_improvement DECIMAL(5,4),

  -- Due diligence
  data_package_url TEXT,
  risk_assessment JSONB DEFAULT '{}',

  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PUBLISHED', 'FUNDED', 'COMPLETED'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investment_opportunities_destination ON investment_opportunities(destination_id);
CREATE INDEX idx_investment_opportunities_type ON investment_opportunities(investment_type);
CREATE INDEX idx_investment_opportunities_igma ON investment_opportunities(igma_approved, status);

-- RLS Policies
ALTER TABLE investment_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage their investment opportunities"
  ON investment_opportunities FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Investors can view IGMA-approved published opportunities"
  ON investment_opportunities FOR SELECT
  USING (
    status = 'PUBLISHED' AND
    igma_approved = TRUE AND
    auth.uid() IN (
      SELECT user_id FROM stakeholder_profiles
      WHERE stakeholder_type = 'INVESTOR'
    )
  );

-- Investor profiles table
CREATE TABLE investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_profile_id UUID REFERENCES stakeholder_profiles(id) ON DELETE CASCADE,

  investor_type TEXT NOT NULL CHECK (investor_type IN (
    'IMPACT_FUND',
    'PRIVATE_EQUITY',
    'REAL_ESTATE',
    'GOVERNMENT',
    'MULTILATERAL',
    'ANGEL'
  )),

  investment_thesis JSONB DEFAULT '{}',
  impact_focus TEXT[] DEFAULT '{}',
  geographic_scope TEXT[] DEFAULT '{}',
  ticket_size_min BIGINT,
  ticket_size_max BIGINT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(stakeholder_profile_id)
);
```

**Edge Function** (calculate IGMA compliance):

```typescript
// supabase/functions/calculate-investment-igma/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { opportunity_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch opportunity with assessment data
    const { data: opportunity } = await supabase
      .from('investment_opportunities')
      .select(`
        *,
        assessment:assessments!inner(
          id,
          pillar_scores(pillar, score, severity)
        )
      `)
      .eq('id', opportunity_id)
      .single();

    if (!opportunity) {
      return new Response(JSON.stringify({ error: 'Opportunity not found' }), {
        status: 404
      });
    }

    const pillarScores = opportunity.assessment.pillar_scores.reduce((acc, ps) => {
      acc[ps.pillar] = ps;
      return acc;
    }, {} as Record<string, any>);

    // Apply IGMA rules
    let igma_approved = true;
    let blocking_reason = '';

    const RA = pillarScores['RA'];
    const AO = pillarScores['AO'];

    // RULE 1: RA critical blocks infrastructure
    if (RA?.severity === 'CRITICO' && opportunity.investment_type === 'INFRASTRUCTURE_DEVELOPMENT') {
      igma_approved = false;
      blocking_reason = 'RA crítico bloqueia investimentos em infraestrutura. Priorize restauração ambiental.';
    }

    // RULE 4: AO critical blocks everything except governance
    if (AO?.severity === 'CRITICO' && opportunity.investment_type !== 'GOVERNANCE_CAPACITY') {
      igma_approved = false;
      blocking_reason = 'AO crítico bloqueia investimentos. Priorize capacitação de governança.';
    }

    // Update opportunity
    await supabase
      .from('investment_opportunities')
      .update({
        igma_approved,
        blocked_by_igma: !igma_approved,
        blocking_reason: blocking_reason || null
      })
      .eq('id', opportunity_id);

    return new Response(JSON.stringify({
      success: true,
      igma_approved,
      blocking_reason
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

**Implementation Priority**: **HIGH** (Strategic alignment, requires IGMA compliance)

---

### 4. Community Feedback Module

**Beni Alignment**: Community is part of RA (social/cultural relations)

**Purpose**: Integrate resident perspectives into territorial assessment

```typescript
interface CommunityFeedback {
  id: string;
  destination_id: string;
  assessment_id: string;
  community_member_id: string;

  // Feedback categories
  quality_of_life_score: number;        // 1-5 scale
  tourism_impact_perception: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  environmental_concern_level: number;  // 1-5 scale
  cultural_preservation_score: number;  // 1-5 scale

  // Open feedback
  concerns: string[];
  suggestions: string[];
  priorities: string[];

  // Demographics (anonymized)
  neighborhood?: string;
  age_group?: string;
  occupation_sector?: string;

  submitted_at: Date;
}

// Aggregate community feedback into RA indicators
function aggregateCommunityFeedback(
  feedbacks: CommunityFeedback[]
): Record<string, number> {

  const avgQualityOfLife = feedbacks.reduce((sum, f) =>
    sum + f.quality_of_life_score, 0) / feedbacks.length;

  const positivePerception = feedbacks.filter(f =>
    f.tourism_impact_perception === 'POSITIVE').length / feedbacks.length;

  const avgEnvironmentalConcern = feedbacks.reduce((sum, f) =>
    sum + f.environmental_concern_level, 0) / feedbacks.length;

  const avgCulturalPreservation = feedbacks.reduce((sum, f) =>
    sum + f.cultural_preservation_score, 0) / feedbacks.length;

  return {
    'community_quality_of_life': avgQualityOfLife / 5,  // Normalize to 0-1
    'community_tourism_support': positivePerception,
    'community_environmental_concern': 1 - (avgEnvironmentalConcern / 5), // Inverted
    'community_cultural_satisfaction': avgCulturalPreservation / 5
  };
}
```

**Database Schema**:

```sql
-- New table: community_feedback
CREATE TABLE community_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
  community_member_id UUID REFERENCES stakeholder_profiles(id) ON DELETE CASCADE,

  -- Feedback scores (1-5 scale)
  quality_of_life_score INTEGER CHECK (quality_of_life_score BETWEEN 1 AND 5),
  tourism_impact_perception TEXT CHECK (tourism_impact_perception IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  environmental_concern_level INTEGER CHECK (environmental_concern_level BETWEEN 1 AND 5),
  cultural_preservation_score INTEGER CHECK (cultural_preservation_score BETWEEN 1 AND 5),

  -- Open feedback
  concerns TEXT[] DEFAULT '{}',
  suggestions TEXT[] DEFAULT '{}',
  priorities TEXT[] DEFAULT '{}',

  -- Demographics (anonymized)
  neighborhood TEXT,
  age_group TEXT,
  occupation_sector TEXT,

  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_community_feedback_destination ON community_feedback(destination_id);
CREATE INDEX idx_community_feedback_assessment ON community_feedback(assessment_id);

-- RLS Policies
ALTER TABLE community_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community members can submit their own feedback"
  ON community_feedback FOR INSERT
  WITH CHECK (
    community_member_id IN (
      SELECT id FROM stakeholder_profiles
      WHERE user_id = auth.uid() AND stakeholder_type = 'COMMUNITY_MEMBER'
    )
  );

CREATE POLICY "Org members can view aggregated community feedback"
  ON community_feedback FOR SELECT
  USING (
    destination_id IN (
      SELECT id FROM destinations WHERE org_id IN (
        SELECT org_id FROM user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- View: Aggregated community scores per destination
CREATE VIEW community_aggregated_scores AS
SELECT
  destination_id,
  assessment_id,
  COUNT(*) as feedback_count,
  AVG(quality_of_life_score::DECIMAL) / 5 as avg_quality_of_life,
  SUM(CASE WHEN tourism_impact_perception = 'POSITIVE' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) as positive_perception_ratio,
  AVG(environmental_concern_level::DECIMAL) / 5 as avg_environmental_concern,
  AVG(cultural_preservation_score::DECIMAL) / 5 as avg_cultural_preservation
FROM community_feedback
GROUP BY destination_id, assessment_id;
```

**UI Component**:

```typescript
// src/components/community/FeedbackForm.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CommunityFeedbackFormProps {
  destinationId: string;
  assessmentId: string;
  onSubmitSuccess: () => void;
}

export function CommunityFeedbackForm({
  destinationId,
  assessmentId,
  onSubmitSuccess
}: CommunityFeedbackFormProps) {
  const { toast } = useToast();
  const [qualityOfLife, setQualityOfLife] = useState(3);
  const [environmentalConcern, setEnvironmentalConcern] = useState(3);
  const [culturalPreservation, setCulturalPreservation] = useState(3);
  const [tourismImpact, setTourismImpact] = useState<'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('NEUTRAL');
  const [concerns, setConcerns] = useState('');
  const [suggestions, setSuggestions] = useState('');

  const handleSubmit = async () => {
    try {
      const { error } = await supabase.from('community_feedback').insert({
        destination_id: destinationId,
        assessment_id: assessmentId,
        quality_of_life_score: qualityOfLife,
        environmental_concern_level: environmentalConcern,
        cultural_preservation_score: culturalPreservation,
        tourism_impact_perception: tourismImpact,
        concerns: concerns ? concerns.split('\n').filter(Boolean) : [],
        suggestions: suggestions ? suggestions.split('\n').filter(Boolean) : []
      });

      if (error) throw error;

      toast({
        title: 'Feedback Enviado',
        description: 'Obrigado por contribuir com a avaliação territorial!'
      });

      onSubmitSuccess();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o feedback.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <h3 className="text-lg font-semibold">Feedback da Comunidade</h3>

      <div>
        <label className="block mb-2">Qualidade de Vida: {qualityOfLife}</label>
        <Slider
          value={[qualityOfLife]}
          onValueChange={([val]) => setQualityOfLife(val)}
          min={1}
          max={5}
          step={1}
        />
      </div>

      <div>
        <label className="block mb-2">Preocupação Ambiental: {environmentalConcern}</label>
        <Slider
          value={[environmentalConcern]}
          onValueChange={([val]) => setEnvironmentalConcern(val)}
          min={1}
          max={5}
          step={1}
        />
      </div>

      <div>
        <label className="block mb-2">Preservação Cultural: {culturalPreservation}</label>
        <Slider
          value={[culturalPreservation]}
          onValueChange={([val]) => setCulturalPreservation(val)}
          min={1}
          max={5}
          step={1}
        />
      </div>

      <div>
        <label className="block mb-2">Impacto do Turismo</label>
        <div className="flex gap-4">
          <Button
            variant={tourismImpact === 'POSITIVE' ? 'default' : 'outline'}
            onClick={() => setTourismImpact('POSITIVE')}
          >
            Positivo
          </Button>
          <Button
            variant={tourismImpact === 'NEUTRAL' ? 'default' : 'outline'}
            onClick={() => setTourismImpact('NEUTRAL')}
          >
            Neutro
          </Button>
          <Button
            variant={tourismImpact === 'NEGATIVE' ? 'default' : 'outline'}
            onClick={() => setTourismImpact('NEGATIVE')}
          >
            Negativo
          </Button>
        </div>
      </div>

      <div>
        <label className="block mb-2">Preocupações (uma por linha)</label>
        <Textarea
          value={concerns}
          onChange={(e) => setConcerns(e.target.value)}
          placeholder="Liste suas preocupações..."
          rows={4}
        />
      </div>

      <div>
        <label className="block mb-2">Sugestões (uma por linha)</label>
        <Textarea
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
          placeholder="Compartilhe suas sugestões..."
          rows={4}
        />
      </div>

      <Button onClick={handleSubmit} className="w-full">
        Enviar Feedback
      </Button>
    </div>
  );
}
```

**Implementation Priority**: **MEDIUM-HIGH** (Enhances RA assessment with community voice)

---

### 5. Public Transparency Layer

**Beni Alignment**: Supports AO (governance) through accountability

**Purpose**: Public-facing portal showing destination scores transparently

```typescript
// Public destination explorer (IGMA-filtered)
interface PublicDestinationProfile {
  destination_id: string;
  name: string;
  uf: string;

  // Latest assessment data
  latest_assessment_date: Date;
  pillar_scores: {
    RA: { score: number; severity: 'BOM' | 'MODERADO' | 'CRITICO' };
    OE: { score: number; severity: 'BOM' | 'MODERADO' | 'CRITICO' };
    AO: { score: number; severity: 'BOM' | 'MODERADO' | 'CRITICO' };
  };

  // Impact scores
  territorial_impact_index: number;
  certification_level?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

  // Transparency data
  indicator_count: number;
  data_sources: string[];
  methodology_version: string;

  // IGMA status
  ready_for_visitors: boolean;   // TRUE if RA & AO not critical
  igma_warnings: string[];

  // Public highlights
  strengths: string[];
  areas_for_improvement: string[];
}

// IGMA filter for public visibility
function filterDestinationsForPublic(
  destinations: Destination[]
): PublicDestinationProfile[] {

  return destinations
    .filter(dest => {
      const latestAssessment = dest.assessments[0];
      const RA = latestAssessment.pillar_scores.find(ps => ps.pillar === 'RA');
      const AO = latestAssessment.pillar_scores.find(ps => ps.pillar === 'AO');

      // IGMA RULE 5: Only show destinations that pass marketing check
      return RA?.severity !== 'CRITICO' && AO?.severity !== 'CRITICO';
    })
    .map(dest => ({
      ...dest,
      ready_for_visitors: true,
      igma_warnings: []
    }));
}
```

**Database Schema**:

```sql
-- Materialized view for public destination data (refreshed periodically)
CREATE MATERIALIZED VIEW public_destinations AS
SELECT
  d.id as destination_id,
  d.name,
  d.uf,
  d.municipio_ibge_code,
  a.diagnostic_date as latest_assessment_date,

  -- Pillar scores
  jsonb_object_agg(
    ps.pillar,
    jsonb_build_object('score', ps.score, 'severity', ps.severity)
  ) as pillar_scores,

  -- Impact scores
  tis.territorial_impact_index,
  tis.certification_level,
  tis.esg_score,

  -- Transparency
  COUNT(DISTINCT iv.indicator_id) as indicator_count,
  a.calculation_metadata->'data_sources' as data_sources,
  a.calculation_metadata->'methodology_version' as methodology_version,

  -- IGMA filtering
  CASE
    WHEN MAX(CASE WHEN ps.pillar = 'RA' AND ps.severity = 'CRITICO' THEN 1 ELSE 0 END) = 0
     AND MAX(CASE WHEN ps.pillar = 'AO' AND ps.severity = 'CRITICO' THEN 1 ELSE 0 END) = 0
    THEN TRUE
    ELSE FALSE
  END as ready_for_visitors

FROM destinations d
INNER JOIN assessments a ON a.destination_id = d.id
INNER JOIN pillar_scores ps ON ps.assessment_id = a.id
LEFT JOIN territorial_impact_scores tis ON tis.assessment_id = a.id
LEFT JOIN indicator_values iv ON iv.assessment_id = a.id
WHERE a.status = 'CALCULATED'
  AND a.diagnostic_date = (
    SELECT MAX(a2.diagnostic_date)
    FROM assessments a2
    WHERE a2.destination_id = d.id AND a2.status = 'CALCULATED'
  )
GROUP BY
  d.id, d.name, d.uf, d.municipio_ibge_code,
  a.diagnostic_date, a.calculation_metadata,
  tis.territorial_impact_index, tis.certification_level, tis.esg_score;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_public_destinations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public_destinations;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh on assessment calculation
CREATE OR REPLACE FUNCTION trigger_refresh_public_destinations()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_public_destinations();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_assessment_calculated
  AFTER UPDATE OF status ON assessments
  FOR EACH ROW
  WHEN (NEW.status = 'CALCULATED')
  EXECUTE FUNCTION trigger_refresh_public_destinations();
```

**Public Page Component**:

```typescript
// src/pages/PublicDestinations.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PublicDestinations() {
  const { data: destinations, isLoading } = useQuery({
    queryKey: ['public-destinations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public_destinations')
        .select('*')
        .eq('ready_for_visitors', true)
        .order('territorial_impact_index', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Carregando destinos...</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">
        Destinos Turísticos Certificados SISTUR
      </h1>

      <p className="mb-8 text-muted-foreground">
        Destinos avaliados segundo a metodologia de Mario Carlos Beni,
        priorizando sustentabilidade ambiental, governança responsável e infraestrutura adequada.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {destinations?.map(dest => (
          <Card key={dest.destination_id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{dest.name}</h3>
              {dest.certification_level && (
                <Badge variant={
                  dest.certification_level === 'PLATINUM' ? 'default' :
                  dest.certification_level === 'GOLD' ? 'secondary' :
                  dest.certification_level === 'SILVER' ? 'outline' : 'secondary'
                }>
                  {dest.certification_level}
                </Badge>
              )}
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              {dest.uf} • {dest.indicator_count} indicadores avaliados
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Índice de Impacto Territorial:</span>
                <span className="font-semibold">
                  {(dest.territorial_impact_index * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span>ESG Score:</span>
                <span className="font-semibold">{dest.esg_score?.toFixed(0)}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Pilares SISTUR:</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(dest.pillar_scores || {}).map(([pillar, data]: [string, any]) => (
                  <div key={pillar} className="flex justify-between">
                    <span>{pillar}:</span>
                    <Badge variant={
                      data.severity === 'BOM' ? 'success' :
                      data.severity === 'MODERADO' ? 'warning' : 'destructive'
                    }>
                      {data.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 border rounded-lg bg-muted/50">
        <h2 className="text-lg font-semibold mb-2">Metodologia SISTUR</h2>
        <p className="text-sm text-muted-foreground">
          Os destinos listados foram avaliados segundo os princípios sistêmicos de Mario Carlos Beni,
          que priorizam a sustentabilidade ambiental (RA), governança responsável (AO) e infraestrutura
          adequada (OE). Apenas destinos sem limitações críticas são exibidos publicamente.
        </p>
      </div>
    </div>
  );
}
```

**Implementation Priority**: **MEDIUM** (Transparency is strategic, but less urgent than Impact Math)

---

## Priority Feature Roadmap

### Phase 1: Foundation (Months 1-2)
**Goal**: Enable multi-stakeholder architecture and Impact Mathematics

1. ✅ **Multi-Stakeholder Architecture**
   - Database schema: `stakeholder_profiles`, `investor_profiles`
   - Authentication flows for each stakeholder type
   - RBAC (Role-Based Access Control) per stakeholder

2. ✅ **Impact Mathematics Layer**
   - Database schema: `territorial_impact_scores`
   - Edge function: Enhanced `calculate-assessment` to include TII
   - UI: Impact scores dashboard

3. ✅ **Community Feedback Module**
   - Database schema: `community_feedback`
   - UI: Feedback form for residents
   - Aggregation: Feed into RA indicators

**Deliverables**:
- 3 new database tables + migrations
- 1 enhanced edge function
- 2 new UI pages (Impact Dashboard, Community Feedback)

---

### Phase 2: Investment Marketplace (Months 3-4)
**Goal**: Connect investors to IGMA-approved opportunities

1. ✅ **Investment Opportunity Management**
   - Database schema: `investment_opportunities`
   - Edge function: `calculate-investment-igma`
   - UI: Investment opportunity creation/editing

2. ✅ **Investor Portal**
   - UI: Investment marketplace with filters
   - Due diligence data package generation
   - IGMA warning display

3. ✅ **Matching Algorithm**
   - ML-based investor-opportunity matching
   - Email notifications for new opportunities
   - Analytics dashboard for investors

**Deliverables**:
- 2 new database tables
- 1 new edge function
- 3 new UI pages (Opportunity Management, Investor Portal, Matching Dashboard)

---

### Phase 3: Public Transparency (Months 5-6)
**Goal**: Public-facing portal for travelers and transparency

1. ✅ **Public Destination Explorer**
   - Materialized view: `public_destinations`
   - UI: Public landing page with IGMA-filtered destinations
   - SEO optimization

2. ✅ **Destination Certification System**
   - Certification badge generation
   - Marketing assets (logos, embeddable widgets)
   - Renewal workflows

3. ✅ **Data Provenance Viewer**
   - UI: Show indicator sources and methodology
   - Downloadable audit reports
   - Interactive methodology explorer

**Deliverables**:
- 1 materialized view
- 3 new public pages
- Certification badge system

---

### Phase 4: Advanced Features (Months 7-9)
**Goal**: Scenario modeling, entrepreneur hub, enhanced IGMA

1. ✅ **Scenario Modeling Engine**
   - "What-if" analysis tool
   - Predictive analytics using historical data
   - Budget optimization recommendations

2. ✅ **Entrepreneur Portal**
   - Supply chain mapping
   - Collaborative marketing campaigns
   - IGMA-aware expansion planning

3. ✅ **Enhanced IGMA with ML**
   - Anomaly detection
   - Peer benchmarking
   - Predictive warnings

**Deliverables**:
- 2 new analytical tools
- 1 entrepreneur portal
- ML model integration

---

## Implementation Instructions

### Setup Instructions for Lovable

#### 1. Environment Variables

Add to `.env`:

```bash
# Existing
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# New (if using external services)
VITE_OPENAI_API_KEY=your_openai_key  # For ML recommendations
VITE_ANALYTICS_ID=your_analytics_id  # For public portal analytics
```

#### 2. Database Migrations

Run migrations in order:

```bash
# Phase 1 migrations
supabase migration new add_stakeholder_profiles
supabase migration new add_territorial_impact_scores
supabase migration new add_community_feedback

# Phase 2 migrations
supabase migration new add_investment_opportunities
supabase migration new add_investor_profiles

# Phase 3 migrations
supabase migration new add_public_destinations_view
```

#### 3. Edge Functions Deployment

```bash
# Deploy new functions
supabase functions deploy calculate-investment-igma
supabase functions deploy generate-due-diligence-package
supabase functions deploy refresh-public-destinations
```

#### 4. Frontend Route Configuration

Update `src/App.tsx`:

```typescript
// Add new routes
<Route path="/community/feedback" element={<CommunityFeedbackPage />} />
<Route path="/investments" element={<InvestmentMarketplace />} />
<Route path="/public/destinations" element={<PublicDestinations />} />
<Route path="/impact-scores" element={<ImpactScoresDashboard />} />
```

---

## Code Examples

### Example 1: Enhanced Calculate Assessment with TII

```typescript
// supabase/functions/calculate-assessment/index.ts
// Add after pillar score calculation (around line 650)

// 8.5. Calculate Territorial Impact Index
const territorialImpactScore = calculateTerritorialImpactIndex(
  {
    RA: pillarScores.find(ps => ps.pillar === 'RA')!.score,
    OE: pillarScores.find(ps => ps.pillar === 'OE')!.score,
    AO: pillarScores.find(ps => ps.pillar === 'AO')!.score
  },
  indicatorValues,
  communityFeedback
);

// Insert TII record
const { error: tiiError } = await supabase
  .from('territorial_impact_scores')
  .insert({
    assessment_id: assessmentId,
    destination_id: assessment.destination_id,
    environmental_impact: territorialImpactScore.environmental_impact,
    social_impact: territorialImpactScore.social_impact,
    institutional_impact: territorialImpactScore.institutional_impact,
    economic_impact: territorialImpactScore.economic_impact,
    territorial_impact_index: territorialImpactScore.territorial_impact_index,
    certification_eligible: territorialImpactScore.certification_eligible,
    certification_level: territorialImpactScore.certification_level,
    esg_score: territorialImpactScore.esg_score,
    sdg_alignments: territorialImpactScore.sdg_alignments
  });

if (tiiError) {
  console.error('Error inserting TII:', tiiError);
}

function calculateTerritorialImpactIndex(
  pillarScores: { RA: number; OE: number; AO: number },
  indicators: any[],
  communityFeedback: any[]
): any {
  // Get social indicators
  const socialIndicators = indicators.filter(i =>
    i.theme?.toLowerCase().includes('social') ||
    i.theme?.toLowerCase().includes('comunidade') ||
    i.theme?.toLowerCase().includes('emprego')
  );

  // Calculate social impact from indicators + community feedback
  let social_impact = 0;
  if (socialIndicators.length > 0) {
    social_impact = socialIndicators.reduce((sum, ind) =>
      sum + (ind.normalized_score || 0), 0) / socialIndicators.length;
  }

  // If community feedback exists, blend it in
  if (communityFeedback && communityFeedback.length > 0) {
    const avgCommunityScore = communityFeedback.reduce((sum, fb) =>
      sum + ((fb.quality_of_life_score || 3) / 5), 0) / communityFeedback.length;
    social_impact = (social_impact + avgCommunityScore) / 2;
  }

  // Economic indicators
  const economicIndicators = indicators.filter(i =>
    i.theme?.toLowerCase().includes('econom') ||
    i.theme?.toLowerCase().includes('pib') ||
    i.theme?.toLowerCase().includes('receita')
  );

  let economic_impact = pillarScores.OE;
  if (economicIndicators.length > 0) {
    const econScore = economicIndicators.reduce((sum, ind) =>
      sum + (ind.normalized_score || 0), 0) / economicIndicators.length;
    economic_impact = (pillarScores.OE + econScore) / 2;
  }

  // Territorial Impact Index (weighted by Beni hierarchy)
  const territorial_impact_index = (
    pillarScores.RA * 0.35 +      // Environmental priority
    pillarScores.AO * 0.30 +      // Governance centrality
    social_impact * 0.20 +
    economic_impact * 0.15
  );

  // Certification logic (IGMA-compliant)
  const certification_eligible =
    pillarScores.RA >= 0.67 &&
    pillarScores.AO >= 0.67 &&
    pillarScores.OE >= 0.67;

  let certification_level = null;
  if (certification_eligible) {
    if (territorial_impact_index >= 0.90) certification_level = 'PLATINUM';
    else if (territorial_impact_index >= 0.80) certification_level = 'GOLD';
    else if (territorial_impact_index >= 0.70) certification_level = 'SILVER';
    else certification_level = 'BRONZE';
  }

  // Map to SDGs (simplified)
  const sdg_alignments: number[] = [];
  if (pillarScores.RA >= 0.7) sdg_alignments.push(13, 14, 15); // Climate, Water, Life on Land
  if (social_impact >= 0.7) sdg_alignments.push(1, 8, 10);     // Poverty, Jobs, Inequality
  if (pillarScores.AO >= 0.7) sdg_alignments.push(16, 17);     // Peace, Partnerships
  if (economic_impact >= 0.7) sdg_alignments.push(8, 9);       // Jobs, Innovation

  return {
    environmental_impact: pillarScores.RA,
    social_impact,
    institutional_impact: pillarScores.AO,
    economic_impact,
    territorial_impact_index,
    certification_eligible,
    certification_level,
    esg_score: territorial_impact_index * 100,
    sdg_alignments: [...new Set(sdg_alignments)]
  };
}
```

---

### Example 2: Investment Opportunity IGMA Filter Hook

```typescript
// src/hooks/useInvestmentOpportunities.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useInvestmentOpportunities(destinationId?: string) {
  const { toast } = useToast();

  // Fetch opportunities with IGMA filtering
  const { data: opportunities, isLoading } = useQuery({
    queryKey: ['investment-opportunities', destinationId],
    queryFn: async () => {
      let query = supabase
        .from('investment_opportunities')
        .select(`
          *,
          destination:destinations(name, uf),
          assessment:assessments!inner(
            id,
            pillar_scores(pillar, score, severity)
          )
        `)
        .eq('status', 'PUBLISHED')
        .eq('igma_approved', true);

      if (destinationId) {
        query = query.eq('destination_id', destinationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Create new opportunity
  const createOpportunity = useMutation({
    mutationFn: async (opportunity: any) => {
      // Insert opportunity
      const { data: newOpp, error: insertError } = await supabase
        .from('investment_opportunities')
        .insert({
          destination_id: opportunity.destination_id,
          assessment_id: opportunity.assessment_id,
          title: opportunity.title,
          description: opportunity.description,
          investment_type: opportunity.investment_type,
          required_capital: opportunity.required_capital,
          expected_roi: opportunity.expected_roi,
          impact_focus: opportunity.impact_focus,
          status: 'DRAFT'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Calculate IGMA compliance via edge function
      const { data: igmaResult, error: igmaError } = await supabase.functions.invoke(
        'calculate-investment-igma',
        { body: { opportunity_id: newOpp.id } }
      );

      if (igmaError) throw igmaError;

      return { ...newOpp, ...igmaResult };
    },
    onSuccess: (data) => {
      if (data.igma_approved) {
        toast({
          title: 'Oportunidade Criada',
          description: 'A oportunidade passou pela validação IGMA e está pronta para publicação.'
        });
      } else {
        toast({
          title: 'IGMA Bloqueou',
          description: data.blocking_reason,
          variant: 'destructive'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    opportunities,
    isLoading,
    createOpportunity: createOpportunity.mutate,
    isCreating: createOpportunity.isPending
  };
}
```

---

### Example 3: Community Feedback Aggregation

```typescript
// src/lib/communityFeedback.ts
export interface CommunityFeedbackSummary {
  destination_id: string;
  feedback_count: number;
  avg_quality_of_life: number;
  positive_perception_ratio: number;
  top_concerns: string[];
  top_suggestions: string[];
}

export async function aggregateCommunityFeedback(
  destinationId: string,
  assessmentId: string
): Promise<CommunityFeedbackSummary> {

  const { data: feedbacks, error } = await supabase
    .from('community_feedback')
    .select('*')
    .eq('destination_id', destinationId)
    .eq('assessment_id', assessmentId);

  if (error) throw error;

  if (!feedbacks || feedbacks.length === 0) {
    return {
      destination_id: destinationId,
      feedback_count: 0,
      avg_quality_of_life: 0,
      positive_perception_ratio: 0,
      top_concerns: [],
      top_suggestions: []
    };
  }

  // Calculate averages
  const avg_quality_of_life = feedbacks.reduce((sum, fb) =>
    sum + (fb.quality_of_life_score || 0), 0) / feedbacks.length / 5; // Normalize to 0-1

  const positiveCount = feedbacks.filter(fb =>
    fb.tourism_impact_perception === 'POSITIVE').length;
  const positive_perception_ratio = positiveCount / feedbacks.length;

  // Aggregate concerns and suggestions
  const allConcerns = feedbacks.flatMap(fb => fb.concerns || []);
  const concernCounts = allConcerns.reduce((acc, concern) => {
    acc[concern] = (acc[concern] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const allSuggestions = feedbacks.flatMap(fb => fb.suggestions || []);
  const suggestionCounts = allSuggestions.reduce((acc, suggestion) => {
    acc[suggestion] = (acc[suggestion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by frequency
  const top_concerns = Object.entries(concernCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([concern]) => concern);

  const top_suggestions = Object.entries(suggestionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([suggestion]) => suggestion);

  return {
    destination_id: destinationId,
    feedback_count: feedbacks.length,
    avg_quality_of_life,
    positive_perception_ratio,
    top_concerns,
    top_suggestions
  };
}

// Function to create synthetic indicators from community feedback
export async function createCommunityIndicators(
  destinationId: string,
  assessmentId: string
): Promise<void> {

  const summary = await aggregateCommunityFeedback(destinationId, assessmentId);

  // Create/update synthetic indicators
  const syntheticIndicators = [
    {
      code: 'COMMUNITY_QUALITY_LIFE',
      value: summary.avg_quality_of_life,
      pillar: 'RA',
      theme: 'social'
    },
    {
      code: 'COMMUNITY_TOURISM_SUPPORT',
      value: summary.positive_perception_ratio,
      pillar: 'RA',
      theme: 'social'
    }
  ];

  // Insert as indicator values
  for (const ind of syntheticIndicators) {
    await supabase.from('indicator_values').upsert({
      assessment_id: assessmentId,
      indicator_id: ind.code, // Assumes indicator exists in catalog
      raw_value: ind.value,
      normalized_score: ind.value,
      data_source: 'COMMUNITY_FEEDBACK',
      collected_at: new Date().toISOString()
    });
  }
}
```

---

### Example 4: Public Destination Card Component

```typescript
// src/components/public/DestinationCard.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Award } from 'lucide-react';

interface PublicDestination {
  destination_id: string;
  name: string;
  uf: string;
  pillar_scores: Record<string, { score: number; severity: string }>;
  territorial_impact_index: number;
  certification_level?: string;
  esg_score?: number;
  indicator_count: number;
  ready_for_visitors: boolean;
}

interface DestinationCardProps {
  destination: PublicDestination;
}

export function DestinationCard({ destination }: DestinationCardProps) {
  const certificationColor = {
    'PLATINUM': 'bg-purple-100 text-purple-800 border-purple-300',
    'GOLD': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'SILVER': 'bg-gray-100 text-gray-800 border-gray-300',
    'BRONZE': 'bg-orange-100 text-orange-800 border-orange-300'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{destination.name}</CardTitle>
            <CardDescription>{destination.uf}</CardDescription>
          </div>

          {destination.certification_level && (
            <Badge
              className={certificationColor[destination.certification_level as keyof typeof certificationColor]}
              variant="outline"
            >
              <Award className="w-3 h-3 mr-1" />
              {destination.certification_level}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Impact Score */}
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">
            Índice de Impacto Territorial
          </div>
          <div className="text-2xl font-bold">
            {(destination.territorial_impact_index * 100).toFixed(0)}%
          </div>
          {destination.esg_score && (
            <div className="text-xs text-muted-foreground mt-1">
              ESG Score: {destination.esg_score.toFixed(0)}
            </div>
          )}
        </div>

        {/* Pillar Scores */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Avaliação SISTUR (Mario Beni):</h4>
          <div className="space-y-2">
            {Object.entries(destination.pillar_scores || {}).map(([pillar, data]) => (
              <div key={pillar} className="flex items-center justify-between">
                <span className="text-sm">{pillar}</span>
                <div className="flex items-center gap-2">
                  {data.severity === 'BOM' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {data.severity === 'MODERADO' && (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <Badge variant={
                    data.severity === 'BOM' ? 'success' :
                    data.severity === 'MODERADO' ? 'warning' : 'destructive'
                  }>
                    {(data.score * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transparency */}
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Avaliado com {destination.indicator_count} indicadores
          <span className="mx-2">•</span>
          Metodologia Mario Beni
        </div>

        {destination.ready_for_visitors && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            Destino pronto para visitação consciente
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## API Specifications

### Edge Function: calculate-investment-igma

**Endpoint**: `POST /functions/v1/calculate-investment-igma`

**Request Body**:
```json
{
  "opportunity_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "igma_approved": boolean,
  "blocked_by_igma": boolean,
  "blocking_reason": string | null,
  "allowed_actions": {
    "can_publish": boolean,
    "can_show_to_investors": boolean
  }
}
```

**IGMA Rules Applied**:
1. If RA critical → Block INFRASTRUCTURE_DEVELOPMENT
2. If AO critical → Block everything except GOVERNANCE_CAPACITY
3. If EXTERNALITY_WARNING → Block investments that don't improve RA

---

### Edge Function: generate-due-diligence-package

**Endpoint**: `POST /functions/v1/generate-due-diligence-package`

**Request Body**:
```json
{
  "investment_opportunity_id": "uuid",
  "investor_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "package_url": "https://storage.supabase.co/...",
  "includes": {
    "assessment_data": true,
    "indicator_values": true,
    "pillar_scores": true,
    "igma_warnings": true,
    "territorial_impact_scores": true,
    "community_feedback_summary": true,
    "methodology_documentation": true
  }
}
```

**Generated PDF Contents**:
- Executive summary
- Destination profile
- Latest assessment scores (RA, OE, AO)
- Territorial Impact Index breakdown
- IGMA warnings and blockers
- Historical trend analysis (if available)
- Community feedback summary
- Indicator data sources and methodology
- Risk assessment
- Investment projections

---

## Validation Checklist

### Pre-Implementation Validation

Before implementing any feature, validate:

**Mario Beni Alignment**:
- [ ] Does it respect RA environmental priority?
- [ ] Does it enforce governance centrality (AO)?
- [ ] Does it support holistic systemic analysis (not siloed)?
- [ ] Does it detect negative externalities (OE growth harming RA)?
- [ ] Does it support continuous planning cycles?
- [ ] Does it recognize intersectoral dependencies?

**IGMA Compliance**:
- [ ] All stakeholder actions filtered through IGMA rules?
- [ ] No bypass mechanisms for profit-driven decisions?
- [ ] Investment opportunities blocked if RA/AO critical?
- [ ] Marketing only shown for non-critical destinations?
- [ ] Governance issues prioritized over infrastructure?

**Technical Quality**:
- [ ] Database schema includes RLS policies?
- [ ] Edge functions have error handling?
- [ ] UI components show IGMA warnings?
- [ ] API endpoints documented?
- [ ] Tests cover IGMA blocking logic?

---

### Post-Implementation Testing

After implementing features, test:

**IGMA Blocking Tests**:
1. Create assessment with RA CRÍTICO → Verify OE investments blocked
2. Create assessment with AO CRÍTICO → Verify all actions blocked except governance
3. Improve OE while degrading RA → Verify externality warning
4. Mark destination with RA/AO crítico → Verify NOT shown in public portal
5. Create investment opportunity → Verify IGMA approval calculated

**Multi-Stakeholder Tests**:
1. Login as INVESTOR → Verify only sees IGMA-approved opportunities
2. Login as COMMUNITY_MEMBER → Verify can submit feedback
3. Login as PUBLIC_DECISION_MAKER → Verify sees all data
4. Public (unauthenticated) → Verify sees only certified destinations

**Impact Mathematics Tests**:
1. Assessment with all pillars > 0.67 → Verify certification_eligible = TRUE
2. Assessment with TII > 0.90 → Verify certification_level = PLATINUM
3. Assessment with RA < 0.67 → Verify certification_eligible = FALSE
4. Community feedback submitted → Verify affects social_impact score

---

## Migration Plan

### Step-by-Step Migration

**Week 1-2**: Database Schema
```bash
# Run Phase 1 migrations
supabase migration new add_stakeholder_architecture
supabase db push

# Verify tables created
supabase db inspect
```

**Week 3-4**: Impact Mathematics
```bash
# Deploy enhanced calculate-assessment function
supabase functions deploy calculate-assessment

# Backfill TII for existing assessments
supabase functions invoke calculate-assessment --data '{"recalculate_all": true}'
```

**Week 5-6**: UI Components
```bash
# Add new pages to src/pages/
# Add new components to src/components/
# Update routing in src/App.tsx

# Test locally
npm run dev
```

**Week 7-8**: Investment Marketplace
```bash
# Run Phase 2 migrations
supabase migration new add_investment_marketplace
supabase db push

# Deploy IGMA calculation function
supabase functions deploy calculate-investment-igma

# Test with sample opportunities
```

**Week 9-10**: Public Portal
```bash
# Run Phase 3 migrations
supabase migration new add_public_portal
supabase db push

# Deploy public pages
# Setup CDN caching for public_destinations view
```

---

## Success Metrics

### Phase 1 Success Metrics
- [ ] TII calculated for 100% of assessments
- [ ] Community feedback collected from ≥3 destinations
- [ ] Multi-stakeholder profiles created for all 5 types

### Phase 2 Success Metrics
- [ ] ≥10 investment opportunities created
- [ ] 100% IGMA compliance (no blocked opportunities published)
- [ ] ≥5 investor profiles onboarded

### Phase 3 Success Metrics
- [ ] Public portal live with ≥20 certified destinations
- [ ] ≥1000 public views in first month
- [ ] Certification badges displayed on destination websites

---

## Appendix: Reference Links

### Codebase References
- **IGMA Engine**: `src/lib/igmaEngine.ts`
- **Calculate Assessment**: `supabase/functions/calculate-assessment/index.ts`
- **Methodology Page**: `src/pages/Metodologia.tsx`
- **FAQ**: `src/pages/FAQ.tsx`

### Mario Beni References
- CRA (Environmental Relations) → RA Pillar
- COE (Structural Organization) → OE Pillar
- CAO (Operational Actions) → AO Pillar

### IGMA Rules Summary
1. **RA_LIMITATION**: Environmental critical blocks infrastructure
2. **CONTINUOUS_CYCLE**: Auto-scheduled reviews (6/12/18 months)
3. **NEGATIVE_EXTERNALITIES**: Detects OE growth harming RA
4. **GOVERNANCE_BLOCK**: AO critical blocks everything
5. **MARKETING_BLOCKED**: No promotion if RA/AO critical
6. **INTERSECTORAL_DEPENDENCY**: Flags multi-agency coordination needs

---

## Conclusion

This document provides a comprehensive roadmap to evolve SISTUR from a diagnostic platform into a complete territorial intelligence ecosystem. All recommendations respect Mario Beni's systemic hierarchy and enforce IGMA blocking rules to prevent profit-driven decisions from overriding environmental and governance prerequisites.

**Key Principles**:
1. **RA (Environment) is always Priority 1**
2. **AO (Governance) is the central mediator**
3. **No bypassing IGMA rules for commercial gain**
4. **Transparency through public accountability**
5. **Multi-stakeholder engagement within systemic constraints**

**Next Steps**:
1. Review this document with the Lovable team
2. Prioritize Phase 1 (Foundation) for immediate implementation
3. Create detailed user stories for each feature
4. Setup project tracking (Jira/Trello) with IGMA validation checkpoints
5. Begin database migrations and edge function development

---

**Document Prepared By**: Claude (Anthropic)
**For**: SISTUR Platform Enhancement
**Date**: January 2026
**Version**: 1.0
