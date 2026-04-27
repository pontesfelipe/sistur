---
name: Indicator Audit Trail
description: Per-assessment indicator provenance log (MANUAL/DERIVED/OFFICIAL_API/ESTIMADA) populated by calculate-assessment edge function
type: feature
---
Every call to the calculate-assessment edge function persists an `assessment_indicator_audit` row per indicator (and composite), capturing: indicator_code, pillar, raw value, normalized_score, source_type (MANUAL|DERIVED|OFFICIAL_API|ESTIMADA), source_detail and weight. The table is wiped+reinserted on each recalculation. Read access is restricted to ADMIN (global) and ORG_ADMIN (own org) via RLS and the `get_assessment_audit(p_assessment_id)` RPC. Surfaced in the UI on the "Indicadores" tab of DiagnosticoDetalhe via the AssessmentAuditTrail component.
