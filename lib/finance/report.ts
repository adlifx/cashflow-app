export const shiftMonth = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
export const daysInMonth = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const c = (n: number) => Math.round(n * 100);
const sum = (a: { amount: number }[]) => a.reduce((s, x) => s + c(x.amount), 0) / 100;

export interface ReportInput {
  month: string; divisorDays: number;
  expenses: { day: string; amount: number; category: string; essential: boolean; fixed: boolean }[];
  income: { date: string; amount: number }[];
  repayments: { date: string; amount: number }[];
  contributions: { date: string; amount: number }[];
  budgets: { category: string; amount: number }[];
  debts: { balance: number; created: string }[];
  debtAdjustments: { date: string; delta: number }[];
}
export function buildReport(i: ReportInput) {
  const inMonth = <T extends { day?: string; date?: string }>(r: T[]) => r.filter((x) => (x.day ?? x.date ?? "").startsWith(i.month));
  const ex = inMonth(i.expenses), inc = inMonth(i.income);
  const totalExpenses = sum(ex), totalIncome = sum(inc);
  const cat: Record<string, number> = {};
  ex.forEach((e) => { cat[e.category] = (cat[e.category] ?? 0) + c(e.amount); });
  const byCategory = Object.entries(cat).map(([k, v]) => ({ category: k, amount: v / 100 })).sort((a, b) => b.amount - a.amount);
  const budgetPerf = i.budgets.map((b) => ({ category: b.category, budget: b.amount, spent: (cat[b.category] ?? 0) / 100 }));
  const months = [-5, -4, -3, -2, -1, 0].map((n) => shiftMonth(i.month, n)).map((m) => {
    const end = `${m}-31`;
    const debt = i.debts.filter((d) => d.created <= end).reduce((s, d) => s + c(d.balance), 0)
      + i.repayments.filter((r) => r.date > end).reduce((s, r) => s + c(r.amount), 0)
      - i.debtAdjustments.filter((a) => a.date > end).reduce((s, a) => s + c(a.delta), 0);
    return { m,
      income: sum(i.income.filter((x) => x.date.startsWith(m))), expenses: sum(i.expenses.filter((x) => x.day.startsWith(m))),
      debt: Math.max(0, debt) / 100, savings: sum(i.contributions.filter((x) => x.date <= end)) };
  });
  const daily = Array.from({ length: daysInMonth(i.month) }, (_, k) => { const d = `${i.month}-${String(k + 1).padStart(2, "0")}`; return { day: k + 1, amount: sum(ex.filter((e) => e.day === d)) }; });
  return {
    totalIncome, totalExpenses, net: Math.round((totalIncome - totalExpenses) * 100) / 100,
    debtRepaid: sum(inMonth(i.repayments)), savings: sum(inMonth(i.contributions)),
    debtOutstanding: i.debts.reduce((s, d) => s + c(d.balance), 0) / 100,
    avgDaily: totalExpenses / Math.max(1, i.divisorDays), byCategory, budgetPerf, months, daily,
    essential: sum(ex.filter((e) => e.essential)), nonEssential: sum(ex.filter((e) => !e.essential)),
    fixed: sum(ex.filter((e) => e.fixed)), variable: sum(ex.filter((e) => !e.fixed)),
  };
}
