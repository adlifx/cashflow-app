import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { addExpense, deleteExpense } from "../actions";
import { CATEGORIES, METHODS, QUICK } from "@/lib/categories";
import { formatRM } from "@/lib/finance/calc";
import { klDateTimeLocal } from "@/lib/kl";

export const dynamic = "force-dynamic";
type SP = { q?: string; cat?: string; sort?: string; d?: string; c?: string; e?: string; err?: string };
const catName = (k: string) => CATEGORIES.find((c) => c[0] === k)?.[1] ?? k;
const input = "w-full rounded border p-2 dark:bg-slate-800";

export default async function Transactions({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  let q = sb.from("expenses").select("*").limit(200);
  if (sp.q) q = q.or(`description.ilike.%${sp.q.replace(/[%,()]/g, "")}%,merchant.ilike.%${sp.q.replace(/[%,()]/g, "")}%`);
  if (sp.cat) q = q.eq("category", sp.cat);
  const sort = sp.sort ?? "date_desc";
  q = sort === "amount_desc" ? q.order("amount", { ascending: false }) : sort === "date_asc" ? q.order("spent_at", { ascending: true }) : q.order("spent_at", { ascending: false });
  const { data } = await q;
  const rows = data ?? [];
  const paths = rows.map((r) => r.receipt_path).filter(Boolean) as string[];
  const signed: Record<string, string> = {};
  if (paths.length) { const { data: s } = await sb.storage.from("receipts").createSignedUrls(paths, 3600); (s ?? []).forEach((x) => { if (x.path && x.signedUrl) signed[x.path] = x.signedUrl; }); }
  const total = rows.reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0) / 100;
  const requestId = crypto.randomUUID();
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} />
      <h1 className="mb-3 text-2xl font-semibold">Transactions</h1>
      <div className="mb-3 flex flex-wrap gap-2">{QUICK.map((b) => (
        <a key={b.label} href={`/transactions?d=${encodeURIComponent(b.d)}&c=${b.c}&e=${b.e}`} className="rounded-full border px-3 py-1 text-sm hover:bg-slate-200 dark:hover:bg-slate-800">{b.label}</a>))}</div>
      <form action={addExpense} className="mb-8 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-slate-900 sm:grid-cols-2">
        <input type="hidden" name="request_id" value={requestId} />
        <input name="description" required placeholder="What did you buy?" defaultValue={sp.d} className={input} />
        <input name="amount" required type="number" step="0.01" min="0.01" inputMode="decimal" placeholder="Amount (RM)" autoFocus={!!sp.d} className={input} />
        <select name="category" defaultValue={sp.c ?? "food"} className={input}>{CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="payment_method" defaultValue="debit_card" className={input}>{METHODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input name="spent" type="datetime-local" required defaultValue={klDateTimeLocal()} className={input} />
        <input name="merchant" placeholder="Merchant or shop (optional)" className={input} />
        <input name="notes" placeholder="Notes (optional)" className={`${input} sm:col-span-2`} />
        <label className="text-sm sm:col-span-2">Receipt image (optional, JPG/PNG/WebP up to 3 MB)<input name="receipt" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></label>
        <label className="text-sm"><input type="checkbox" name="essential" defaultChecked={sp.e !== "0"} /> Essential</label>
        <label className="text-sm"><input type="checkbox" name="recurring" /> Recurring</label>
        <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Add expense</button>
      </form>
      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search description or shop" className="rounded border p-2 dark:bg-slate-800" />
        <select name="cat" defaultValue={sp.cat ?? ""} className="rounded border p-2 dark:bg-slate-800"><option value="">All categories</option>{CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="sort" defaultValue={sort} className="rounded border p-2 dark:bg-slate-800"><option value="date_desc">Newest</option><option value="date_asc">Oldest</option><option value="amount_desc">Highest amount</option></select>
        <button className="rounded border px-3">Apply</button>
      </form>
      <p className="mb-2 text-sm opacity-70">{rows.length} records, total {formatRM(total)}</p>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center opacity-70">No expenses yet. Use a quick button above to record your first one.</p> : (
        <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 p-3">
            <div><div className="font-medium">{r.description}{!r.is_essential && <span className="ml-2 rounded bg-amber-100 px-1 text-xs text-amber-800">non-essential</span>}</div>
              <div className="text-xs opacity-60">{new Date(r.spent_at).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" })} · {catName(r.category)} · {r.payment_method.replace("_", " ")}{r.merchant ? ` · ${r.merchant}` : ""}{r.receipt_path && signed[r.receipt_path] && <> · <a href={signed[r.receipt_path]} target="_blank" rel="noopener noreferrer" className="underline">receipt</a></>}</div></div>
            <div className="flex items-center gap-3"><span className="font-semibold">{formatRM(Number(r.amount))}</span>
              <form action={deleteExpense}><input type="hidden" name="id" value={r.id} /><ConfirmButton /></form></div>
          </li>))}</ul>)}
    </main>
  );
}
