import { describe, it, expect } from "vitest";
import { buildReport, shiftMonth } from "./report";
describe("buildReport", () => {
  const r = buildReport({ month: "2026-10", divisorDays: 10,
    expenses: [{ day: "2026-10-02", amount: 50.1, category: "food", essential: true, fixed: false }, { day: "2026-10-03", amount: 20.2, category: "shopping", essential: false, fixed: true }, { day: "2026-09-30", amount: 5, category: "food", essential: true, fixed: false }],
    income: [{ date: "2026-10-01", amount: 3000 }], repayments: [{ date: "2026-10-05", amount: 100 }], contributions: [{ date: "2026-09-10", amount: 50 }, { date: "2026-10-10", amount: 25 }],
    budgets: [{ category: "food", amount: 40 }], debts: [{ balance: 900, created: "2026-01-01" }], debtAdjustments: [] });
  it("totals the month without float drift", () => { expect(r.totalExpenses).toBe(70.3); expect(r.net).toBe(2929.7); expect(r.avgDaily).toBeCloseTo(7.03); });
  it("splits essential/fixed and ranks categories", () => { expect(r.nonEssential).toBe(20.2); expect(r.fixed).toBe(20.2); expect(r.byCategory[0].category).toBe("food"); });
  it("rebuilds debt balance history and cumulative savings", () => { expect(r.months[4].debt).toBe(1000); expect(r.months[5].debt).toBe(900); expect(r.months[4].savings).toBe(50); expect(r.months[5].savings).toBe(75); });
  it("flags over-budget categories", () => expect(r.budgetPerf[0].spent).toBeGreaterThan(r.budgetPerf[0].budget));
  it("shifts months across years", () => expect(shiftMonth("2026-01", -1)).toBe("2025-12"));
});
