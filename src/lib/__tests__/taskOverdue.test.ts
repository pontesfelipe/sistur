import { describe, it, expect } from "vitest";
import { isTaskOverdue } from "@/hooks/useProjects";

const today = new Date("2026-10-07T12:00:00Z");

describe("isTaskOverdue", () => {
  it("prazo passado e não concluída = vencida", () => {
    expect(isTaskOverdue({ planned_end_date: "2026-10-06", status: "todo" }, today)).toBe(true);
  });
  it("concluída nunca é vencida", () => {
    expect(isTaskOverdue({ planned_end_date: "2026-10-01", status: "done" }, today)).toBe(false);
  });
  it("prazo hoje não é vencida", () => {
    expect(isTaskOverdue({ planned_end_date: "2026-10-07", status: "in_progress" }, today)).toBe(false);
  });
});
