import { describe, it, expect } from "vitest";
import {
  interpretIGMA,
  getSeverityFromScore,
  type IGMAInput,
  type PillarContext,
} from "./igmaEngine";

// Helper to build pillar contexts
function makePillars(
  raScore: number,
  oeScore: number,
  aoScore: number
): PillarContext[] {
  return [
    { pillar: "RA", score: raScore, severity: getSeverityFromScore(raScore) },
    { pillar: "OE", score: oeScore, severity: getSeverityFromScore(oeScore) },
    { pillar: "AO", score: aoScore, severity: getSeverityFromScore(aoScore) },
  ];
}

function makeInput(overrides: Partial<IGMAInput> = {}): IGMAInput {
  return {
    pillarScores: makePillars(0.7, 0.7, 0.7),
    assessmentDate: new Date("2025-01-01"),
    ...overrides,
  };
}

describe("getSeverityFromScore", () => {
  it("returns CRITICO for scores <= 0.33", () => {
    expect(getSeverityFromScore(0)).toBe("CRITICO");
    expect(getSeverityFromScore(0.33)).toBe("CRITICO");
  });

  it("returns MODERADO for scores 0.34-0.66", () => {
    expect(getSeverityFromScore(0.34)).toBe("MODERADO");
    expect(getSeverityFromScore(0.5)).toBe("MODERADO");
    expect(getSeverityFromScore(0.66)).toBe("MODERADO");
  });

  it("returns BOM for scores > 0.66", () => {
    expect(getSeverityFromScore(0.67)).toBe("BOM");
    expect(getSeverityFromScore(1.0)).toBe("BOM");
  });
});

describe("interpretIGMA", () => {
  describe("Rule 1 - RA Limitation", () => {
    it("sets RA_LIMITATION when RA is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.2, 0.7, 0.7) })
      );
      expect(result.flags.RA_LIMITATION).toBe(true);
      expect(result.blockedActions).toContain("EDU_OE");
      expect(result.allowedActions.EDU_OE).toBe(false);
    });

    it("does not set RA_LIMITATION when RA is not CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.7, 0.7) })
      );
      expect(result.flags.RA_LIMITATION).toBe(false);
    });
  });

  describe("Rule 4 - Governance Block", () => {
    it("sets GOVERNANCE_BLOCK when AO is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.7, 0.2) })
      );
      expect(result.flags.GOVERNANCE_BLOCK).toBe(true);
      expect(result.blockedActions).toContain("EDU_OE");
      expect(result.allowedActions.EDU_OE).toBe(false);
    });
  });

  describe("Rule 3 - Externality Warning", () => {
    it("warns when OE rises while RA drops", () => {
      const previous = makePillars(0.6, 0.5, 0.7);
      const current = makePillars(0.4, 0.7, 0.7);
      const result = interpretIGMA(
        makeInput({
          pillarScores: current,
          previousPillarScores: previous,
        })
      );
      expect(result.flags.EXTERNALITY_WARNING).toBe(true);
    });

    it("does not warn when both pillars improve", () => {
      const previous = makePillars(0.5, 0.5, 0.7);
      const current = makePillars(0.7, 0.7, 0.7);
      const result = interpretIGMA(
        makeInput({
          pillarScores: current,
          previousPillarScores: previous,
        })
      );
      expect(result.flags.EXTERNALITY_WARNING).toBe(false);
    });
  });

  describe("Rule 5 - Marketing Blocked", () => {
    it("blocks marketing when RA is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.2, 0.7, 0.7) })
      );
      expect(result.flags.MARKETING_BLOCKED).toBe(true);
      expect(result.allowedActions.MARKETING).toBe(false);
    });

    it("blocks marketing when AO is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.7, 0.2) })
      );
      expect(result.flags.MARKETING_BLOCKED).toBe(true);
    });

    it("allows marketing when no pillar is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.7, 0.7) })
      );
      expect(result.flags.MARKETING_BLOCKED).toBe(false);
      expect(result.allowedActions.MARKETING).toBe(true);
    });
  });

  describe("Rule 6 - Intersectoral Dependency", () => {
    it("flags intersectoral dependency when indicators exist", () => {
      const result = interpretIGMA(
        makeInput({ indicatorIntersetorialCount: 3 })
      );
      expect(result.flags.INTERSECTORAL_DEPENDENCY).toBe(true);
      expect(result.uiMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ flag: "INTERSECTORAL_DEPENDENCY" }),
        ])
      );
    });

    it("does not flag when count is 0", () => {
      const result = interpretIGMA(
        makeInput({ indicatorIntersetorialCount: 0 })
      );
      expect(result.flags.INTERSECTORAL_DEPENDENCY).toBe(false);
    });
  });

  describe("Rule 2 - Next Review Timing", () => {
    it("recommends 6-month review when RA is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({
          pillarScores: makePillars(0.2, 0.7, 0.7),
          assessmentDate: new Date("2025-01-01"),
        })
      );
      expect(result.nextReviewRecommendedAt).toEqual(new Date("2025-07-01"));
    });

    it("recommends 18-month review when all pillars are BOM", () => {
      const result = interpretIGMA(
        makeInput({
          pillarScores: makePillars(0.8, 0.8, 0.8),
          assessmentDate: new Date("2025-01-01"),
        })
      );
      expect(result.nextReviewRecommendedAt).toEqual(new Date("2026-07-01"));
    });
  });

  describe("Interpretation Type", () => {
    it("returns ESTRUTURAL when RA is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.2, 0.7, 0.7) })
      );
      expect(result.interpretationType).toBe("ESTRUTURAL");
    });

    it("returns GESTAO when AO is CRITICO (and RA is not)", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.7, 0.2) })
      );
      expect(result.interpretationType).toBe("GESTAO");
    });

    it("returns ENTREGA when only OE is CRITICO", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.7, 0.2, 0.7) })
      );
      expect(result.interpretationType).toBe("ENTREGA");
    });
  });

  describe("EDU_RA always allowed", () => {
    it("allows EDU_RA even when everything is critical", () => {
      const result = interpretIGMA(
        makeInput({ pillarScores: makePillars(0.1, 0.1, 0.1) })
      );
      expect(result.allowedActions.EDU_RA).toBe(true);
    });
  });
});
