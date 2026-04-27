---
name: Customizable Org Weights
description: Per-organization pillar (RA/OE/AO sum=1) and indicator weight overrides applied by calculate-assessment edge function
type: feature
---
Organizations can customize the relative importance of pillars and individual indicators in the Score Final SISTUR. Tables: `org_pillar_weights` (3 rows max, sum must equal 1.0) and `org_indicator_weights` (sparse override map, weight 0-10). RPCs: get_org_pillar_weights / get_org_indicator_weights (with fallback to defaults RA=0.35/OE=0.30/AO=0.35 and indicator.weight global), set_org_pillar_weights (atomic, validates sum), set_org_indicator_weight (null clears override), reset_org_pillar_weights. Any weight change auto-marks assessments as needs_recalculation. Edge function calculate-assessment loads both override maps at calc start and applies them in the main indicator loop, audit trail, pillar aggregation, and final score formula. Admin UI: "Pesos" tab in IndicadoresPanel via OrgWeightsPanel (sliders for pillars with sum validator, inline editing for indicators).
