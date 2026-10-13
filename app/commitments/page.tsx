import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { addCommitment, deleteCommitment, payCommitment } from "../debt-actions";
import { formatRM } from "@/lib/finance/calc";
import { klNow, ymd } from "@/lib/kl";
import { addMonths, dueIn } from "@/lib/dates";

export const dynamic = "force-dynamic";
const input = "w-full rounded border p-2 dark:bg-slate-800";

export default async function Commitments({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const today = klNow(), todayStr = ymd(today);
  const { data: cms } = await sb.from("commitments").select("*").eq("is_active", true).order("due_day");
  const months = [today, addMonths(today, 1)];
  // Generate this month's and next month's records; the unique key (commitment, month) makes this safe to repeat.
  const gen = (cms ?? []).flatMap((c) => months.flatMap((m) => {
    const due = dueIn(m.getFullYear(), m.getMonth(), c.due_day), ds = ymd(due);
    if (ds.slice(0, 7) < String(c.start_date).slice(0, 7) || (c.end_date && ds > c.end_date)) return [];
    return [{ user_id: user!.id, commitment_id: c.id, period: `${ds.slice(0, 7)}-01`, due_date: ds, amount: c.amount }];
  }));
  if (gen.length) await sb.from("commitment_occurrences").upsert(gen, { onConflict: "commitment_id,period", ignoreDuplicates: true });
  const [{ data: occ }, { data: debts }] = await Promise.all([
    sb.from("commitment_occurrences").select("*, commitments(name)").gte("period", `${ymd(today).slice(0, 7)}-01`).order("due_date"),
    sb.from("debts").select("id, name").order("name"),
  ]);
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} />
      <h1 className="mb-4 text-2xl font-semibold">Fixed commitments</h1>
      <details className="mb-6 rounded-xl bg-white p-4 shadow dark:bg-slate-900" open={(cms ?? []).length === 0}>
        <summary className="cursor-pointer font-medium">Add a monthly commitment</summary>
        <form action={addCommitment} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Name (e.g. Car loan, Rent, Internet)" className={input} />
          <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount (RM)" className={input} />
          <input name="due_day" type="number" min="1" max="31" required placeholder="Due day of month" className={input} />
          <label className="text-sm">Start date<input name="start_date" type="date" required defaultValue={todayStr} className={input} /></label>
          <label className="text-sm">End date (optional)<input name="end_date" type="date" className={input} /></label>
          <select name="debt_id" className={input}><option value="">Not linked to a debt</option>{(debts ?? []).map((d) => <option key={d.id} value={d.id}>Pays debt: {d.name}</option>)}</select>
          <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Add commitment</button>
        </form>
        <p className="mt-2 text-xs opacity-60">Linking to a debt means marking it paid also reduces that debt, with only one expense recorded.</p>
      </details>
      {(occ ?? []).length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center opacity-70">No commitments yet. Add rent, loans, bills and subscriptions above.</p> : (
        <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{(occ ?? []).map((o) => {
          const status = o.status === "paid" ? "paid" : o.due_date < todayStr ? "overdue" : "upcoming";
          const badge = status === "paid" ? "bg-emerald-100 text-emerald-800" : status === "overdue" ? "bg-red-100 text-red-800" : "bg-slate-200 text-slate-800";
          return (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div><div className="font-medium">{o.commitments?.name} <span className={`ml-1 rounded px-2 py-0.5 text-xs ${badge}`}>{status}</span></div>
                <div className="text-xs opacity-60">Due {o.due_date} · {formatRM(Number(o.amount))}</div></div>
              {status !== "paid" && (
                <form action={payCommitment} className="flex items-center gap-2">
                  <input type="hidden" name="occ" value={o.id} /><input type="hidden" name="request_id" value={crypto.randomUUID()} />
                  <input type="date" name="paid_on" defaultValue={todayStr} required className="rounded border p-1 text-sm dark:bg-slate-800" />
                  <select name="payment_method" className="rounded border p-1 text-sm dark:bg-slate-800"><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="debit_card">Debit card</option><option value="e_wallet">E-wallet</option></select>
                  <button className="rounded bg-emerald-600 px-3 py-1 text-sm text-white">Mark paid</button>
                </form>)}
            </li>);
        })}</ul>)}
      {(cms ?? []).length > 0 && (<><h2 className="mb-2 mt-8 font-semibold">Your commitments</h2>
        <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{(cms ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between p-3 text-sm"><span>{c.name} · {formatRM(Number(c.amount))} on day {c.due_day}</span>
            <form action={deleteCommitment}><input type="hidden" name="id" value={c.id} /><ConfirmButton message="Delete this commitment and its schedule? Paid expenses stay in Transactions." /></form></li>))}</ul></>)}
    </main>
  );
}
