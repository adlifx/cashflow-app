import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { addDebt, deleteDebt, repay, adjustBalance } from "../debt-actions";
import { formatRM, payoffMonths } from "@/lib/finance/calc";
import { klNow, ymd } from "@/lib/kl";
import { addMonths, dueIn } from "@/lib/dates";

export const dynamic = "force-dynamic";
const input = "w-full rounded border p-2 dark:bg-slate-800";
const TYPES = ["bank", "friend", "family", "credit_card", "bnpl", "other"];

export default async function Debts({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: debts }, { data: reps }, { data: adjs }, { data: prof }] = await Promise.all([
    sb.from("debts").select("*").order("created_at"),
    sb.from("debt_repayments").select("*").order("paid_on", { ascending: false }).limit(300),
    sb.from("debt_adjustments").select("*").order("created_at", { ascending: false }).limit(100),
    sb.from("profiles").select("expected_salary").single(),
  ]);
  const list = debts ?? [];
  const today = klNow(), todayStr = ymd(today), month = todayStr.slice(0, 7);
  const cents = (n: unknown) => Math.round(Number(n) * 100);
  const total = list.reduce((s, d) => s + cents(d.current_balance), 0) / 100;
  const minTotal = list.filter((d) => Number(d.current_balance) > 0).reduce((s, d) => s + cents(d.min_payment), 0) / 100;
  const salary = Number(prof?.expected_salary ?? 0);
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} />
      <h1 className="mb-1 text-2xl font-semibold">Debts</h1>
      <p className="mb-4 text-sm opacity-70">Outstanding {formatRM(total)} · minimum payments {formatRM(minTotal)}/month{salary > 0 ? ` (${((minTotal / salary) * 100).toFixed(1)}% of your expected salary)` : ""}</p>
      <details className="mb-6 rounded-xl bg-white p-4 shadow dark:bg-slate-900" open={list.length === 0}>
        <summary className="cursor-pointer font-medium">Add a debt</summary>
        <form action={addDebt} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Debt name (e.g. Car loan)" className={input} />
          <input name="lender" required placeholder="Lender or person owed" className={input} />
          <select name="debt_type" className={input}>{TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}</select>
          <select name="frequency" className={input}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="one_time">One-time</option></select>
          <input name="original_amount" type="number" step="0.01" min="0" required placeholder="Original amount (RM)" className={input} />
          <input name="current_balance" type="number" step="0.01" min="0" required placeholder="Outstanding balance now (RM)" className={input} />
          <input name="interest_rate" type="number" step="0.01" min="0" placeholder="Interest % per year (0 if none)" className={input} />
          <input name="min_payment" type="number" step="0.01" min="0" placeholder="Minimum monthly payment (RM)" className={input} />
          <input name="due_day" type="number" min="1" max="31" placeholder="Payment day of month (1-31)" className={input} />
          <label className="text-sm">Start date<input name="start_date" type="date" className={input} /></label>
          <label className="text-sm">Expected settlement<input name="expected_settlement" type="date" className={input} /></label>
          <input name="notes" placeholder="Notes (optional)" className={input} />
          <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Add debt</button>
        </form>
      </details>
      {list.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center opacity-70">No debts recorded. Add one above to track repayments and payoff dates.</p>}
      <div className="space-y-4">{list.map((d) => {
        const bal = Number(d.current_balance), orig = Number(d.original_amount);
        const pct = orig > 0 ? Math.min(100, Math.max(0, ((orig - bal) / orig) * 100)) : 0;
        const myReps = (reps ?? []).filter((r) => r.debt_id === d.id), myAdjs = (adjs ?? []).filter((a) => a.debt_id === d.id);
        const paidMonth = myReps.filter((r) => String(r.paid_on).startsWith(month)).reduce((s, r) => s + cents(r.amount), 0) / 100;
        let due = "";
        let overdue = false;
        if (d.due_day && bal > 0) {
          const thisDue = dueIn(today.getFullYear(), today.getMonth(), d.due_day);
          overdue = ymd(thisDue) < todayStr && paidMonth < Number(d.min_payment) && Number(d.min_payment) > 0;
          const next = ymd(thisDue) >= todayStr ? thisDue : dueIn(addMonths(today, 1).getFullYear(), addMonths(today, 1).getMonth(), d.due_day);
          due = ymd(next);
        }
        const months = payoffMonths(bal, Number(d.interest_rate), Number(d.min_payment));
        const payoff = bal <= 0 ? "Paid off" : months === null ? "Won't clear at the current payment" : `~${addMonths(today, months).toLocaleDateString("en-MY", { month: "short", year: "numeric" })} (${months} months)`;
        return (
          <section key={d.id} className="rounded-xl bg-white p-4 shadow dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-semibold">{d.name} <span className="text-xs font-normal opacity-60">{d.lender} · {String(d.debt_type).replace("_", " ")}{Number(d.interest_rate) > 0 ? ` · ${d.interest_rate}% p.a.` : ""}</span></h2>
                {overdue && <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Overdue: this month&apos;s payment isn&apos;t recorded yet</span>}
                {!overdue && due && <span className="mt-1 inline-block text-xs opacity-60">Next payment due {due}</span>}</div>
              <form action={deleteDebt}><input type="hidden" name="id" value={d.id} /><ConfirmButton message="Delete this debt and its history?" /></form>
            </div>
            <div className="my-3 h-2 rounded bg-slate-200 dark:bg-slate-800"><div className="h-2 rounded bg-emerald-600" style={{ width: `${pct}%` }} /></div>
            <p className="text-sm">Remaining <b>{formatRM(bal)}</b> of {formatRM(orig)} · minimum {formatRM(Number(d.min_payment))}/month · paid this month {formatRM(paidMonth)} · payoff {payoff}</p>
            {bal > 0 && (
              <form action={repay} className="mt-3 grid gap-2 sm:grid-cols-5">
                <input type="hidden" name="debt_id" value={d.id} /><input type="hidden" name="request_id" value={crypto.randomUUID()} />
                <input name="amount" type="number" step="0.01" min="0.01" max={bal} required defaultValue={Number(d.min_payment) > 0 ? Math.min(bal, Number(d.min_payment)) : undefined} placeholder="Repayment (RM)" className={`${input} sm:col-span-1`} />
                <input name="paid_on" type="date" required defaultValue={todayStr} className={input} />
                <select name="payment_method" className={input}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="debit_card">Debit card</option><option value="e_wallet">E-wallet</option><option value="other">Other</option></select>
                <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Record repayment</button>
              </form>)}
            <details className="mt-3 text-sm"><summary className="cursor-pointer opacity-80">History and balance adjustment</summary>
              <ul className="mt-2 space-y-1">{myReps.map((r) => <li key={r.id}>{r.paid_on}: paid {formatRM(Number(r.amount))}, balance {formatRM(Number(r.balance_after))}</li>)}
                {myAdjs.map((a) => <li key={a.id} className="opacity-70">{String(a.created_at).slice(0, 10)}: adjusted {formatRM(Number(a.old_balance))} to {formatRM(Number(a.new_balance))}. Reason: {a.reason}</li>)}
                {myReps.length + myAdjs.length === 0 && <li className="opacity-60">No history yet.</li>}</ul>
              <form action={adjustBalance} className="mt-2 grid gap-2 sm:grid-cols-4">
                <input type="hidden" name="debt_id" value={d.id} />
                <input name="new_balance" type="number" step="0.01" min="0" required placeholder="New balance" className={input} />
                <input name="reason" required placeholder="Reason (e.g. interest added)" className={`${input} sm:col-span-2`} />
                <button className="rounded border p-2">Adjust balance</button>
              </form>
              <p className="mt-1 text-xs opacity-60">An adjustment only changes the debt balance. It does not touch your cash.</p>
            </details>
          </section>);
      })}</div>
    </main>
  );
}
