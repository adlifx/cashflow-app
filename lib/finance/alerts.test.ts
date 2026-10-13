import { describe, it, expect } from "vitest";
import { buildAlerts } from "./alerts";
const base = { spentToday: 0, dailyLimit: 40, avg7: 10, warnPct: 75, budgets: [], overdue: [], approaching: [], projectedAfterObligations: 100 };
describe("buildAlerts", () => {
  it("is quiet when everything is fine", () => expect(buildAlerts(base)).toEqual([]));
  it("flags a projected shortfall", () => expect(buildAlerts({ ...base, projectedAfterObligations: -50 })[0].message).toContain("50.00"));
  it("flags budget warning and over-budget at the threshold", () => {
    const r = buildAlerts({ ...base, budgets: [{ label: "Food", budget: 100, spent: 75 }, { label: "Petrol", budget: 100, spent: 101 }] });
    expect(r.map((x) => x.level)).toEqual(["warn", "bad"]);
  });
  it("flags spending above the daily limit once", () => expect(buildAlerts({ ...base, spentToday: 60, avg7: 90 })).toHaveLength(1));
  it("flags overdue and approaching payments", () => expect(buildAlerts({ ...base, overdue: ["Rent"], approaching: ["Loan"] }).map((x) => x.level)).toEqual(["bad", "warn"]));
});
