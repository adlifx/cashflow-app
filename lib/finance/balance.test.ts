import { describe, it, expect } from "vitest";
import { cashBalance } from "./balance";
describe("cashBalance", () => {
  it("adds received income and subtracts cash-like spending only", () => {
    expect(cashBalance({ openingBalances: [1000], receivedIncome: [3000], expenses: [
      { amount: 12.5, payment_method: "cash" }, { amount: 99.99, payment_method: "credit_card" }, { amount: 87.5, payment_method: "e_wallet" }] })).toBe(3900);
  });
});
