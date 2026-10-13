import { describe, it, expect } from "vitest";
import { safeToSpend, dailyLimit, daysUntil, budgetStatus, payoffMonths, nextSalaryDate } from "./calc";

describe("finance calc", () => {
  it("computes safe-to-spend without float drift", () => {
    expect(safeToSpend({ availableCash: 0.1, incomeReceived: 0.2, unpaidCommitments: 0, plannedDebtPayments: 0, plannedSavings: 0, emergencyReserve: 0, otherReserved: 0 })).toBe(0.3);
    expect(safeToSpend({ availableCash: 3000, incomeReceived: 0, unpaidCommitments: 1200, plannedDebtPayments: 300, plannedSavings: 200, emergencyReserve: 500, otherReserved: 0 })).toBe(800);
  });
  it("daily limit is 0 when nothing is safe", () => { expect(dailyLimit(-50, 10)).toBe(0); expect(dailyLimit(250, 10)).toBe(25); });
  it("days until payday is at least 1", () => { expect(daysUntil(new Date(2026, 9, 13), new Date(2026, 9, 25))).toBe(12); expect(daysUntil(new Date(2026, 9, 25), new Date(2026, 9, 25))).toBe(1); });
  it("next salary date rolls to next month and handles short months", () => {
    expect(nextSalaryDate(new Date(2026, 9, 26), 25).getMonth()).toBe(10);
    expect(nextSalaryDate(new Date(2026, 0, 31), 31).getDate()).toBe(28);
  });
  it("budget status thresholds", () => { expect(budgetStatus(100, 74)).toBe("normal"); expect(budgetStatus(100, 75)).toBe("warning"); expect(budgetStatus(100, 100)).toBe("warning"); expect(budgetStatus(100, 101)).toBe("over"); });
  it("payoff estimate", () => { expect(payoffMonths(1000, 0, 100)).toBe(10); expect(payoffMonths(1000, 24, 10)).toBeNull(); });
});
