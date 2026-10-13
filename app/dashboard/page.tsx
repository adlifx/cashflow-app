import { supabaseServer } from "@/lib/supabase/server";
import { logout } from "../login/actions";
import { dailyLimit, daysUntil, formatRM, nextSalaryDate, safeToSpend } from "@/lib/finance/calc";

export const dynamic = "force-dynamic";
const my = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));

export default async function Dashboard() {
  const sb = await supabaseServer();
  const today = my();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const [{ data: p }, { data: acc }, { data: exp }, { data: debts }] = await Promise.all([
    sb.from("profiles").select("*").single(),
    sb.from("accounts").select("opening_balance").eq("is_active", true),
    sb.from("expenses").select("amount").gte("spent_at", monthStart),
    sb.from("debts").select("current_balance"),
  ]);
  const spent = (exp ?? []).reduce((s, e) => s + Number(e.amount), 0);
  const outstanding = (debts ?? []).reduce((s, d) => s + Number(d.current_balance), 0);
  // Stage 1: balance = opening balances only. Stage 2 adds income/expense/transfer movements.
  const cash = (acc ?? []).reduce((s, a) => s + Number(a.opening_balance), 0);
  const safe = safeToSpend({ availableCash: cash, incomeReceived: 0, unpaidCommitments: 0, plannedDebtPayments: 0,
    plannedSavings: Number(p?.savings_target ?? 0), emergencyReserve: Number(p?.emergency_reserve ?? 0), otherReserved: Number(p?.other_reserved ?? 0) });
  const days = daysUntil(today, nextSalaryDate(today, p?.salary_day ?? 25));
  const limit = dailyLimit(safe, days);
  const cards: [string, string][] = [
    ["Total Monthly Expenses", formatRM(spent)], ["Total Outstanding Debt", formatRM(outstanding)],
    ["Safe-to-Spend", formatRM(safe)], ["Expected Salary", formatRM(Number(p?.expected_salary ?? 0))],
  ];
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between"><h1 className="text-2xl font-semibold">Dashboard</h1>
        <form action={logout}><button className="rounded border px-3 py-1 text-sm">Log out</button></form></div>
      <p className="mb-6 rounded-xl bg-emerald-600 p-4 text-white">
        {safe > 0 ? `You can safely spend ${formatRM(limit)} per day until your next salary (${days} day${days > 1 ? "s" : ""}).`
                  : "Your commitments and reserves currently exceed your available cash. Review non-essential spending first."}
      </p>
      <div className="grid grid-cols-2 gap-4">{cards.map(([t, v]) => (
        <div key={t} className="rounded-xl bg-white p-4 shadow dark:bg-slate-900"><div className="text-sm opacity-70">{t}</div><div className="text-xl font-semibold">{v}</div></div>))}</div>
      <p className="mt-6 text-sm opacity-60">Stage 1 foundation. Income, transactions, debts, budgets, charts, calendar and reports are the next stages.</p>
    </main>
  );
}
