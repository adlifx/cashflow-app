import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { saveSettings, addAccount, deleteAccount } from "../actions";
import { formatRM } from "@/lib/finance/calc";

export const dynamic = "force-dynamic";
const input = "w-full rounded border p-2 dark:bg-slate-800";

export default async function Settings({ searchParams }: { searchParams: Promise<{ err?: string; ok?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: p }, { data: accs }] = await Promise.all([sb.from("profiles").select("*").single(), sb.from("accounts").select("*").order("created_at")]);
  const f = (label: string, name: string, v: unknown, step = "0.01") => (
    <label className="text-sm">{label}<input name={name} type="number" step={step} min="0" required defaultValue={String(v ?? 0)} className={input} /></label>);
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} ok={!!sp.ok} />
      <h1 className="mb-4 text-2xl font-semibold">Settings</h1>
      <form action={saveSettings} className="mb-8 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-slate-900 sm:grid-cols-2">
        {f("Expected monthly salary (RM)", "expected_salary", p?.expected_salary)}
        {f("Salary payment day of month (1-31)", "salary_day", p?.salary_day ?? 25, "1")}
        {f("Monthly savings target (RM)", "savings_target", p?.savings_target)}
        {f("Minimum emergency reserve (RM)", "emergency_reserve", p?.emergency_reserve)}
        {f("Other reserved funds (RM)", "other_reserved", p?.other_reserved)}
        <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Save settings</button>
      </form>
      <h2 className="mb-2 text-lg font-semibold">Accounts</h2>
      <p className="mb-3 text-sm opacity-70">Cash, bank and e-wallet accounts only. Credit cards and borrowed money are never counted as cash. Opening balance is what you had when you started using this app.</p>
      <form action={addAccount} className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-slate-900 sm:grid-cols-4">
        <input name="name" required placeholder="Account name" className={input} />
        <select name="kind" className={input}><option value="bank">Bank</option><option value="cash">Cash</option><option value="e_wallet">E-wallet</option><option value="savings">Savings</option></select>
        <input name="opening_balance" type="number" step="0.01" min="0" required placeholder="Opening balance" className={input} />
        <button className="rounded bg-emerald-600 p-2 text-white">Add account</button>
      </form>
      <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{(accs ?? []).map((a) => (
        <li key={a.id} className="flex items-center justify-between p-3"><span>{a.name} <span className="text-xs opacity-60">({a.kind})</span></span>
          <span className="flex items-center gap-3">{formatRM(Number(a.opening_balance))}<form action={deleteAccount}><input type="hidden" name="id" value={a.id} /><ConfirmButton message="Delete this account?" /></form></span></li>))}</ul>
    </main>
  );
}
