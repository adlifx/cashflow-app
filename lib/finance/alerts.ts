import { budgetStatus, formatRM } from "./calc";
export interface Alert { level: "warn" | "bad"; message: string }
export interface AlertInput {
  spentToday: number; dailyLimit: number; avg7: number; warnPct: number;
  budgets: { label: string; budget: number; spent: number }[];
  overdue: string[]; approaching: string[];
  projectedAfterObligations: number; // cash minus unpaid commitments and planned debt payments before payday
}
export function buildAlerts(i: AlertInput): Alert[] {
  const a: Alert[] = [];
  if (i.projectedAfterObligations < 0)
    a.push({ level: "bad", message: `After your upcoming commitments and debt payments you would be short by ${formatRM(-i.projectedAfterObligations)} before payday. Let's look at what can be trimmed.` });
  i.overdue.forEach((n) => a.push({ level: "bad", message: `${n} is overdue. Paying it soon helps avoid extra charges.` }));
  i.approaching.forEach((n) => a.push({ level: "warn", message: `${n} is due within 3 days.` }));
  if (i.dailyLimit > 0 && i.spentToday > i.dailyLimit)
    a.push({ level: "warn", message: `You've spent ${formatRM(i.spentToday)} today, above your daily limit of ${formatRM(i.dailyLimit)}. A lighter day tomorrow will bring you back on track.` });
  else if (i.dailyLimit > 0 && i.avg7 > i.dailyLimit)
    a.push({ level: "warn", message: `Your spending over the last 7 days averages ${formatRM(i.avg7)} a day, above your limit of ${formatRM(i.dailyLimit)}. Small cuts now will help your salary last.` });
  i.budgets.forEach((b) => {
    if (b.budget <= 0) return;
    const s = budgetStatus(b.budget, b.spent, i.warnPct);
    if (s === "over") a.push({ level: "bad", message: `${b.label} is over budget by ${formatRM(b.spent - b.budget)}. Consider trimming non-essential spending there.` });
    else if (s === "warning") a.push({ level: "warn", message: `${b.label} has used ${Math.round((b.spent / b.budget) * 100)}% of its budget.` });
  });
  return a;
}
