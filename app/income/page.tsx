import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { addIncome, deleteIncome } from "../actions";
import { INCOME_TYPES } from "@/lib/categories";
import { formatRM } from "@/lib/finance/calc";
import { klNow, ymd } from "@/lib/kl";

export const dynamic = "force-dynamic";
const input = "w-full rounded border p-2 dark:bg-slate-800";

export default async function Income({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const { data } = await sb.from("income").select("*").order("income_date", { ascending: false }).limit(200);
  const rows = data ?? [];
  const month = ymd(klNow()).slice(0, 7);
  const received = rows.filter((r) => r.status === "received" && String(r.income_date).startsWith(month)).reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0) / 100;
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} />
      <h1 className="mb-1 text-2xl font-semibold">Income</h1>
      <p className="mb-4 text-sm opacity-70">Received this month: {formatRM(received)}. Moving money between your own accounts is not income, so don&apos;t record it here.</p>
      <form action={addIncome} className="mb-8 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-slate-900 sm:grid-cols-2">
        <input type="hidden" name="request_id" value={crypto.randomUUID()} />
        <input name="source" required placeholder="Source (e.g. Employer)" className={input} />
        <input name="amount" required type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="Amount (RM)" className={input} />
        <input name="income_date" type="date" required defaultValue={ymd(klNow())} className={input} />
        <select name="income_type" className={input}>{INCOME_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select name="status" className={input}><option value="received">Received</option><option value="expected">Expected (not counted yet)</option></select>
        <input name="description" placeholder="Description (optional)" className={input} />
        <input name="notes" placeholder="Notes (optional)" className={`${input} sm:col-span-2`} />
        <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Add income</button>
      </form>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center opacity-70">No income recorded yet.</p> : (
        <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 p-3">
            <div><div className="font-medium">{r.source} <span className="text-xs opacity-60">({r.income_type}{r.status === "expected" ? ", expected" : ""})</span></div>
              <div className="text-xs opacity-60">{r.income_date}{r.description ? ` · ${r.description}` : ""}</div></div>
            <div className="flex items-center gap-3"><span className="font-semibold">{formatRM(Number(r.amount))}</span>
              <form action={deleteIncome}><input type="hidden" name="id" value={r.id} /><ConfirmButton /></form></div>
          </li>))}</ul>)}
    </main>
  );
}
