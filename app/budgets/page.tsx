import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import { saveBudgets, copyPreviousBudget } from "../budget-actions";
import { CATEGORIES } from "@/lib/categories";
import { budgetStatus, formatRM } from "@/lib/finance/calc";
import { klNow, ymd } from "@/lib/kl";

export const dynamic = "force-dynamic";
const shift = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export default async function Budgets({ searchParams }: { searchParams: Promise<{ m?: string; err?: string; ok?: string }> }) {
  const sp = await searchParams;
  const m = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : ymd(klNow()).slice(0, 7);
  const sb = await supabaseServer();
  const [{ data: buds }, { data: exp }, { data: prof }] = await Promise.all([
    sb.from("budgets").select("category, amount").eq("period", `${m}-01`),
    sb.from("expenses").select("category, amount, is_essential").gte("spent_at", `${m}-01T00:00:00+08:00`).lt("spent_at", `${shift(m, 1)}-01T00:00:00+08:00`),
    sb.from("profiles").select("warn_threshold_pct, expected_salary, savings_target").single(),
  ]);
  const warn = Number(prof?.warn_threshold_pct ?? 75);
  const c = (n: unknown) => Math.round(Number(n) * 100);
  const budget = (k: string) => (buds ?? []).find((b) => b.category === k);
  const spent = (k: string, nonEss = false) => (exp ?? []).filter((e) => e.category === k && (!nonEss || !e.is_essential)).reduce((s, e) => s + c(e.amount), 0) / 100;
  const totalBudget = (buds ?? []).reduce((s, b) => s + c(b.amount), 0) / 100;
  const totalSpent = (exp ?? []).reduce((s, e) => s + c(e.amount), 0) / 100;
  const salary = Number(prof?.expected_salary ?? 0);
  const label = new Date(`${m}-01T00:00:00`).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  const badge = { normal: "bg-emerald-100 text-emerald-800", warning: "bg-amber-100 text-amber-900", over: "bg-red-100 text-red-800" } as const;
  const bar = { normal: "bg-emerald-600", warning: "bg-amber-500", over: "bg-red-600" } as const;
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} ok={!!sp.ok} />
      <div className="mb-2 flex items-center justify-between"><h1 className="text-2xl font-semibold">Budgets</h1>
        <div className="flex items-center gap-2 text-sm"><Link href={`/budgets?m=${shift(m, -1)}`} className="rounded border px-2 py-1">←</Link><span>{label}</span><Link href={`/budgets?m=${shift(m, 1)}`} className="rounded border px-2 py-1">→</Link></div></div>
      <p className="mb-4 text-sm opacity-70">Budgeted {formatRM(totalBudget)} · spent {formatRM(totalSpent)}{salary > 0 ? ` · expected salary ${formatRM(salary)}` : ""}. Unused budget stays unused; it never becomes extra spending money. Warnings start at {warn}% used (change it in Settings).</p>
      <form action={copyPreviousBudget} className="mb-3"><input type="hidden" name="month" value={m} /><button className="rounded border px-3 py-1 text-sm">Copy last month&apos;s budget</button></form>
      <form action={saveBudgets}>
        <input type="hidden" name="month" value={m} />
        <ul className="divide-y rounded-xl bg-white shadow dark:divide-slate-800 dark:bg-slate-900">{CATEGORIES.map(([k, name]) => {
          const b = budget(k), amount = b ? Number(b.amount) : 0, s = spent(k);
          const st = b ? budgetStatus(amount, s, warn) : "normal";
          const pct = amount > 0 ? Math.round((s / amount) * 100) : 0;
          const ne = spent(k, true);
          return (
            <li key={k} className="grid items-center gap-2 p-3 sm:grid-cols-[1fr_8rem_1fr]">
              <div className="font-medium">{name}</div>
              <input name={`b_${k}`} type="number" step="0.01" min="0" defaultValue={b ? amount : ""} placeholder="No budget" className="w-full rounded border p-2 dark:bg-slate-800" />
              <div className="text-sm">{b ? (<>
                <div className="mb-1 flex justify-between"><span>Spent {formatRM(s)}</span><span className={`rounded px-2 text-xs ${badge[st]}`}>{st === "over" ? "Over budget" : st === "warning" ? "Warning" : "Normal"} · {pct}%</span></div>
                <div className="h-1.5 rounded bg-slate-200 dark:bg-slate-800"><div className={`h-1.5 rounded ${bar[st]}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <div className="mt-1 text-xs opacity-70">{s > amount ? `Over by ${formatRM(s - amount)}.${ne > 0 ? ` ${formatRM(ne)} of this was non-essential, so that's the easiest place to cut.` : ""}` : `Remaining ${formatRM(amount - s)}`}</div></>)
                : <span className="text-xs opacity-60">{s > 0 ? `Spent ${formatRM(s)} with no budget` : "—"}</span>}</div>
            </li>);
        })}</ul>
        <button className="mt-4 w-full rounded bg-emerald-600 p-2 text-white">Save budgets for {label}</button>
      </form>
    </main>
  );
}
