import { fromSen, toSen } from "./calc";
export interface Cashflow {
  openingBalances: number[]; receivedIncome: number[];
  expenses: { amount: number; payment_method: string }[];
}
/** Cash on hand. Credit-card purchases do NOT reduce cash (money is only owed); card repayments are recorded as debt repayments. */
export function cashBalance(c: Cashflow): number {
  const sum = (a: number[]) => a.reduce((s, x) => s + toSen(x), 0);
  const spent = c.expenses.filter((e) => e.payment_method !== "credit_card").reduce((s, e) => s + toSen(e.amount), 0);
  return fromSen(sum(c.openingBalances) + sum(c.receivedIncome) - spent);
}
