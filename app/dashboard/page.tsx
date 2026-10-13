import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import { dailyLimit, daysUntil, formatRM, nextSalaryDate, safeToSpend } from "@/lib/finance/calc";
import { cashBalance } from "@/lib/finance/balance";
import { klNow, klYmd, ymd } from "@/lib/kl";
import { dueIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const sb = await supabaseServer();
  const today = klNow();
  const todayStr = ymd(today), monthStr = todayStr.slice(0, 7);
  const mon = new Date(today); mon.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekStr = ymd(mon);
  const [{ data: p }, { data: acc }, { data: exp }, { data: inc }, { data: debts }, { data: occ }, { data: reps }, { data: cms }] = await Promise.all([
    sb.from("profiles").select("*").single(),
    sb.from("accounts").select("opening_balance").eq("is_active", true),
    sb.from("expenses").select("amount, payment_method, spent_at"),
    sb.from("income").select("amount, income_date, status"),
    sb.from("debts").select("id, current_balance, min_payment, due_day"),
    sb.from("commitment_occurrences").select("amount, due_date").neq("status", "paid"),
    sb.from("debt_repayments").select("debt_id, amount, paid_on"),
    sb.from("commitments").select("debt_id").eq("is_active", true),
  ]);
  const expenses = (exp ?? []).map((e) => ({ amount: Number(e.amount), payment_method: e.payment_method as string, day: klYmd(e.spent_at) }));
  const sumBy = (f: (d: string) => boolean) => expenses.filter((e) => f(e.day)).reduce((s, e) => s + Math.round(e.amount * 100), 0) / 100;
  const spentToday = sumBy((d) => d === todayStr), spentWeek = sumBy((d) => d >= weekStr), spentMonth = sumBy((d) => d.startsWith(monthStr));
  const received = (inc ?? []).filter((i) => i.status === "received");
  const incomeMonth = received.filter((i) => String(i.income_date).startsWith(monthStr)).reduce((s, i) => s + Math.round(Number(i.amount) * 100), 0) / 100;
  const outstanding = (debts ?? []).reduce((s, d) => s + Math.round(Number(d.current_balance) * 100), 0) / 100;
  const cash = cashBalance({ openingBalances: (acc ?? []).map((a) => Number(a.opening_balance)), receivedIncome: received.map((i) => Number(i.amount)), expenses });
  const nextPay = nextSalaryDate(today, p?.salary_day ?? 25), nextPayStr = ymd(nextPay);
  const unpaidCommitments = (occ ?? []).filter((o) => o.due_date < nextPayStr).reduce((s, o) => s + Math.round(Number(o.amount) * 100), 0) / 100;
  const linked = new Set((cms ?? []).map((c) => c.debt_id).filter(Boolean));
  // Debts paid through a commitment are already counted above, so they are skipped here (no double counting)
  const plannedDebt = (debts ?? []).filter((d) => !linked.has(d.id) && Number(d.current_balance) > 0).reduce((s, d) => {
    const due = d.due_day ? ymd(dueIn(today.getFullYear(), today.getMonth(), d.due_day)) : null;
    if (due && due >= nextPayStr) return s;
    const paid = (reps ?? []).filter((r) => r.debt_id === d.id && String(r.paid_on).startsWith(monthStr)).reduce((a, r) => a + Math.round(Number(r.amount) * 100), 0);
    return s + Math.max(0, Math.round(Number(d.min_payment) * 100) - paid);
  }, 0) / 100;
  // Income already in the balance is not added again (avoids double counting)
  const safe = safeToSpend({ availableCash: cash, incomeReceived: 0, unpaidCommitments, plannedDebtPayments: plannedDebt,
    plannedSavings: Number(p?.savings_target ?? 0), emergencyReserve: Number(p?.emergency_reserve ?? 0), otherReserved: Number(p?.other_reserved ?? 0) });
  const days = daysUntil(today, nextPay);
  const limit = dailyLimit(safe, days);
  const cards: [string, string][] = [
    ["Income this month", formatRM(incomeMonth)], ["Expenses this month", formatRM(spentMonth)],
    ["Cash on hand", formatRM(cash)], ["Safe-to-spend", formatRM(safe)],
    ["Spent today", formatRM(spentToday)], ["Spent this week", formatRM(spentWeek)],
    ["Outstanding debt", formatRM(outstanding)], ["Unpaid commitments before payday", formatRM(unpaidCommitments)], ["Planned debt payments", formatRM(plannedDebt)], ["Expected salary", formatRM(Number(p?.expected_salary ?? 0))],
  ];
  const bad = safe <= 0;
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav />
      <h1 className="mb-4 text-2xl font-semibold">Dashboard</h1>
      <p className={`mb-3 rounded-xl p-4 text-white ${bad ? "bg-amber-600" : "bg-emerald-600"}`}>
        {bad ? `Your reserves and savings target currently exceed your cash by ${formatRM(Math.abs(safe))}. Review non-essential spending first.`
             : `You can safely spend ${formatRM(limit)} per day until your next salary (${days} day${days > 1 ? "s" : ""}).`}
      </p>
      {!bad && spentToday > limit && <p className="mb-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">Today&apos;s spending is above your daily limit. A lighter day tomorrow will keep you on track.</p>}
      <div className="grid grid-cols-2 gap-4">{cards.map(([t, v]) => (
        <div key={t} className="rounded-xl bg-white p-4 shadow dark:bg-slate-900"><div className="text-sm opacity-70">{t}</div><div className="text-xl font-semibold">{v}</div></div>))}</div>
    </main>
  );
}
