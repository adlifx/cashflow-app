import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import Charts from "../charts";
import PrintButton from "../print-button";
import { CATEGORIES } from "@/lib/categories";
import { formatRM } from "@/lib/finance/calc";
import { buildReport, daysInMonth, shiftMonth } from "@/lib/finance/report";
import { klNow, klYmd, ymd } from "@/lib/kl";

export const dynamic = "force-dynamic";
const name = (k: string) => CATEGORIES.find((c) => c[0] === k)?.[1] ?? k;

export default async function Reports({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const cur = ymd(klNow()).slice(0, 7);
  const m = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : cur;
  const start = shiftMonth(m, -5), end = shiftMonth(m, 1);
  const sb = await supabaseServer();
  const [{ data: exp }, { data: inc }, { data: reps }, { data: adjs }, { data: debts }, { data: cons }, { data: buds }, { data: prof }] = await Promise.all([
    sb.from("expenses").select("amount, spent_at, category, is_essential, is_recurring, debt_id, commitment_occurrence_id").gte("spent_at", `${start}-01T00:00:00+08:00`).lt("spent_at", `${end}-01T00:00:00+08:00`),
    sb.from("income").select("amount, income_date").eq("status", "received").gte("income_date", `${start}-01`).lt("income_date", `${end}-01`),
    sb.from("debt_repayments").select("amount, paid_on"),
    sb.from("debt_adjustments").select("old_balance, new_balance, created_at"),
    sb.from("debts").select("current_balance, created_at"),
    sb.from("savings_contributions").select("amount, contributed_on"),
    sb.from("budgets").select("category, amount").eq("period", `${m}-01`),
    sb.from("profiles").select("savings_target, expected_salary").single(),
  ]);
  const r = buildReport({ month: m, divisorDays: m === cur ? klNow().getDate() : daysInMonth(m),
    expenses: (exp ?? []).map((e) => ({ day: klYmd(e.spent_at), amount: Number(e.amount), category: e.category, essential: !!e.is_essential, fixed: !!(e.is_recurring || e.debt_id || e.commitment_occurrence_id) })),
    income: (inc ?? []).map((i) => ({ date: String(i.income_date), amount: Number(i.amount) })),
    repayments: (reps ?? []).map((x) => ({ date: String(x.paid_on), amount: Number(x.amount) })),
    contributions: (cons ?? []).map((x) => ({ date: String(x.contributed_on), amount: Number(x.amount) })),
    budgets: (buds ?? []).map((b) => ({ category: b.category, amount: Number(b.amount) })),
    debts: (debts ?? []).map((d) => ({ balance: Number(d.current_balance), created: String(d.created_at).slice(0, 10) })),
    debtAdjustments: (adjs ?? []).map((a) => ({ date: String(a.created_at).slice(0, 10), delta: Number(a.new_balance) - Number(a.old_balance) })) });
  const over = r.budgetPerf.filter((b) => b.spent > b.budget);
  const salary = Number(prof?.expected_salary ?? 0), target = Number(prof?.savings_target ?? 0);
  const base = r.totalIncome > 0 ? r.totalIncome : salary;
  const tips: string[] = [];
  if (over.length) tips.push(`Review ${over.map((b) => name(b.category)).join(", ")}: they went over budget. Trimming non-essential items there is the easiest win.`);
  if (r.totalExpenses > 0 && r.nonEssential / r.totalExpenses > 0.3) tips.push(`Non-essential spending was ${Math.round((r.nonEssential / r.totalExpenses) * 100)}% of your expenses. Setting a smaller limit for it could free up cash.`);
  if (target > 0 && r.savings < target) tips.push(`You saved ${formatRM(r.savings)} against a target of ${formatRM(target)}. Moving the transfer to payday can make it easier to hit.`);
  if (r.net < 0) tips.push("Spending was above income received this month. Pick one or two categories to lower next month.");
  if (!tips.length) tips.push("Nice work: no problem areas stood out this month. Keep the same routine next month.");
  const label = new Date(`${m}-01T00:00:00`).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  const stat = (t: string, v: string) => <div key={t} className="rounded-xl bg-white p-3 shadow dark:bg-slate-900"><div className="text-xs opacity-70">{t}</div><div className="text-lg font-semibold">{v}</div></div>;
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-semibold">Report: {label}</h1>
        <div className="flex items-center gap-2 text-sm print:hidden"><Link href={`/reports?m=${shiftMonth(m, -1)}`} className="rounded border px-2 py-1">←</Link><Link href={`/reports?m=${shiftMonth(m, 1)}`} className="rounded border px-2 py-1">→</Link>
          <a href={`/reports/csv?m=${m}`} className="rounded border px-3 py-1">Download CSV</a><PrintButton /></div></div>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Total income", formatRM(r.totalIncome))}{stat("Total expenses", formatRM(r.totalExpenses))}{stat("Net cash flow", formatRM(r.net))}{stat("Average daily spending", formatRM(r.avgDaily))}
        {stat("Debt repaid", formatRM(r.debtRepaid))}{stat("Debt outstanding now", formatRM(r.debtOutstanding))}{stat("Saved this month", formatRM(r.savings))}{stat("Essential / non-essential", `${formatRM(r.essential)} / ${formatRM(r.nonEssential)}`)}
      </div>
      <Charts daily={r.daily} months={r.months} categories={r.byCategory.map((c) => ({ name: name(c.category), value: c.amount }))} fixedVar={[{ name: "Fixed", value: r.fixed }, { name: "Variable", value: r.variable }]} />
      <section className="mt-6 rounded-xl bg-white p-4 shadow dark:bg-slate-900 print:break-inside-avoid"><h2 className="mb-2 font-semibold">Month-end review</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Where your money went: {r.byCategory.slice(0, 5).map((c) => `${name(c.category)} ${formatRM(c.amount)}`).join(", ") || "no expenses recorded"}.</li>
          <li>Budgets over: {over.length ? over.map((b) => `${name(b.category)} (+${formatRM(b.spent - b.budget)})`).join(", ") : "none"}.</li>
          <li>Saved {formatRM(r.savings)} and repaid {formatRM(r.debtRepaid)} of debt.</li>
          <li>{base > 0 ? (r.totalExpenses <= base ? `You stayed within your income: ${formatRM(r.totalExpenses)} spent of ${formatRM(base)}.` : `You spent ${formatRM(r.totalExpenses - base)} more than your income.`) : "Add income to see whether you stayed within your salary."}</li>
        </ul>
        <h3 className="mb-1 mt-3 text-sm font-semibold">Suggestions for next month</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">{tips.map((t) => <li key={t}>{t}</li>)}</ul></section>
      <section className="mt-6 overflow-x-auto rounded-xl bg-white p-4 text-sm shadow dark:bg-slate-900"><h2 className="mb-2 font-semibold">Comparison with previous months</h2>
        <table className="w-full text-left"><thead><tr className="opacity-60"><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead><tbody>{[...r.months].reverse().map((x) => (
          <tr key={x.m}><td>{x.m}</td><td>{formatRM(x.income)}</td><td>{formatRM(x.expenses)}</td><td>{formatRM(x.income - x.expenses)}</td></tr>))}</tbody></table></section>
      {r.budgetPerf.length > 0 && <section className="mt-6 rounded-xl bg-white p-4 text-sm shadow dark:bg-slate-900 print:break-inside-avoid"><h2 className="mb-2 font-semibold">Budget performance</h2>
        {r.budgetPerf.map((b) => <div key={b.category} className="flex justify-between py-0.5"><span>{name(b.category)}</span><span>{formatRM(b.spent)} of {formatRM(b.budget)}</span></div>)}</section>}
    </main>
  );
}
