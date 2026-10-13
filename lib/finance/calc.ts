// All money math in integer sen to avoid floating-point errors.
export const toSen = (rm: number) => Math.round(rm * 100);
export const fromSen = (s: number) => s / 100;
export const formatRM = (rm: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(rm);

export interface SafeToSpendInput {
  availableCash: number;        // confirmed balance of cash/bank/e-wallet accounts (RM)
  incomeReceived: number;       // confirmed income not yet in the balance (usually 0)
  unpaidCommitments: number;
  plannedDebtPayments: number;  // only debt payments NOT already in unpaidCommitments
  plannedSavings: number;
  emergencyReserve: number;
  otherReserved: number;
}
export function safeToSpend(i: SafeToSpendInput): number {
  const s = toSen(i.availableCash) + toSen(i.incomeReceived)
    - toSen(i.unpaidCommitments) - toSen(i.plannedDebtPayments)
    - toSen(i.plannedSavings) - toSen(i.emergencyReserve) - toSen(i.otherReserved);
  return fromSen(s);
}
/** Days from today (inclusive) up to the day before next payday; minimum 1. */
export function daysUntil(today: Date, nextSalary: Date): number {
  const d = Math.ceil((Date.UTC(nextSalary.getFullYear(), nextSalary.getMonth(), nextSalary.getDate())
    - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  return Math.max(1, d);
}
export function dailyLimit(remainingSafe: number, daysLeft: number): number {
  if (remainingSafe <= 0) return 0;
  return Math.floor(toSen(remainingSafe) / Math.max(1, daysLeft)) / 100;
}
export function nextSalaryDate(today: Date, salaryDay: number): Date {
  const last = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const y = today.getFullYear(), m = today.getMonth();
  const thisMonth = new Date(y, m, Math.min(salaryDay, last(y, m)));
  if (thisMonth > today) return thisMonth;
  const ny = m === 11 ? y + 1 : y, nm = (m + 1) % 12;
  return new Date(ny, nm, Math.min(salaryDay, last(ny, nm)));
}
export type BudgetStatus = "normal" | "warning" | "over";
export function budgetStatus(budget: number, spent: number, warnPct = 75): BudgetStatus {
  if (spent > budget) return "over";
  if (budget > 0 && (spent / budget) * 100 >= warnPct) return "warning";
  return "normal";
}
/** Months to clear a balance with a fixed monthly payment; null if never paid off. */
export function payoffMonths(balance: number, annualRatePct: number, monthly: number): number | null {
  if (balance <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (monthly <= 0) return null;
  if (r === 0) return Math.ceil(balance / monthly);
  if (monthly <= balance * r) return null;
  return Math.ceil(-Math.log(1 - (r * balance) / monthly) / Math.log(1 + r));
}
