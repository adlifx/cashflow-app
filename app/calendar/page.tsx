import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import { formatRM } from "@/lib/finance/calc";
import { dueIn } from "@/lib/dates";
import { daysInMonth, shiftMonth } from "@/lib/finance/report";
import { klNow, klYmd, ymd } from "@/lib/kl";

export const dynamic = "force-dynamic";
type Item = { kind: "payday" | "income" | "expense" | "commitment" | "debt" | "savings"; label: string; amount: number };
const dot: Record<Item["kind"], string> = { payday: "bg-emerald-500", income: "bg-sky-500", expense: "bg-rose-500", commitment: "bg-amber-500", debt: "bg-orange-500", savings: "bg-violet-500" };
const KIND: Record<Item["kind"], string> = { payday: "Payday", income: "Income", expense: "Expense", commitment: "Bill due", debt: "Debt payment due", savings: "Savings" };

export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const sp = await searchParams;
  const todayStr = ymd(klNow()), cur = todayStr.slice(0, 7);
  const m = sp.m && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.m) ? sp.m : cur;
  const next = shiftMonth(m, 1);
  const sb = await supabaseServer();
  const [{ data: prof }, { data: inc }, { data: exp }, { data: occ }, { data: debts }, { data: cons }] = await Promise.all([
    sb.from("profiles").select("salary_day, expected_salary").single(),
    sb.from("income").select("income_date, source, amount, status").gte("income_date", `${m}-01`).lt("income_date", `${next}-01`),
    sb.from("expenses").select("spent_at, description, amount").gte("spent_at", `${m}-01T00:00:00+08:00`).lt("spent_at", `${next}-01T00:00:00+08:00`),
    sb.from("commitment_occurrences").select("due_date, amount, status, commitments(name)").gte("due_date", `${m}-01`).lt("due_date", `${next}-01`),
    sb.from("debts").select("name, due_day, min_payment, current_balance"),
    sb.from("savings_contributions").select("contributed_on, amount, savings_goals(name)").gte("contributed_on", `${m}-01`).lt("contributed_on", `${next}-01`),
  ]);
  const map: Record<string, Item[]> = {};
  const add = (d: string, it: Item) => { if (d.startsWith(m)) (map[d] ??= []).push(it); };
  const [y, mo] = m.split("-").map(Number);
  add(ymd(dueIn(y, mo - 1, prof?.salary_day ?? 25)), { kind: "payday", label: "Expected salary day", amount: Number(prof?.expected_salary ?? 0) });
  (inc ?? []).forEach((i) => add(String(i.income_date), { kind: "income", label: `${i.source}${i.status === "expected" ? " (expected)" : ""}`, amount: Number(i.amount) }));
  (exp ?? []).forEach((e) => add(klYmd(e.spent_at), { kind: "expense", label: e.description, amount: Number(e.amount) }));
  (occ ?? []).forEach((o) => add(String(o.due_date), { kind: "commitment", label: `${(o.commitments as unknown as { name?: string } | null)?.name ?? "Commitment"}${o.status === "paid" ? " (paid)" : ""}`, amount: Number(o.amount) }));
  (debts ?? []).filter((d) => d.due_day && Number(d.current_balance) > 0).forEach((d) => add(ymd(dueIn(y, mo - 1, d.due_day)), { kind: "debt", label: d.name, amount: Number(d.min_payment) }));
  (cons ?? []).forEach((c) => add(String(c.contributed_on), { kind: "savings", label: (c.savings_goals as unknown as { name?: string } | null)?.name ?? "Savings goal", amount: Number(c.amount) }));
  const offset = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth(m) }, (_, k) => k + 1)];
  const sel = sp.d && sp.d.startsWith(m) ? sp.d : null;
  const label = new Date(`${m}-01T00:00:00`).toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav />
      <div className="mb-3 flex items-center justify-between"><h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-2 text-sm"><Link href={`/calendar?m=${shiftMonth(m, -1)}`} className="rounded border px-2 py-1">←</Link><span>{label}</span><Link href={`/calendar?m=${next}`} className="rounded border px-2 py-1">→</Link></div></div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs">{(Object.keys(dot) as Item["kind"][]).map((k) => <span key={k} className="flex items-center gap-1"><i className={`inline-block h-2 w-2 rounded-full ${dot[k]}`} />{KIND[k]}</span>)}</div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-60">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">{cells.map((d, i) => {
        if (d === null) return <div key={`e${i}`} />;
        const ds = `${m}-${String(d).padStart(2, "0")}`, items = map[ds] ?? [];
        return (<Link key={ds} href={`/calendar?m=${m}&d=${ds}`} className={`min-h-16 rounded border p-1 text-left text-xs hover:bg-slate-200 dark:hover:bg-slate-800 ${ds === todayStr ? "border-emerald-500" : ""} ${ds === sel ? "bg-slate-200 dark:bg-slate-800" : ""}`}>
          <div className="font-medium">{d}</div><div className="mt-1 flex flex-wrap gap-0.5">{items.slice(0, 8).map((it, k) => <i key={k} className={`inline-block h-2 w-2 rounded-full ${dot[it.kind]}`} />)}</div></Link>);
      })}</div>
      {sel && <section className="mt-4 rounded-xl bg-white p-4 shadow dark:bg-slate-900"><h2 className="mb-2 font-semibold">{sel}</h2>
        {(map[sel] ?? []).length === 0 ? <p className="text-sm opacity-60">Nothing recorded or scheduled for this day.</p> :
          <ul className="space-y-1 text-sm">{(map[sel] ?? []).map((it, k) => <li key={k} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className={`inline-block h-2 w-2 rounded-full ${dot[it.kind]}`} />{KIND[it.kind]}: {it.label}</span><span>{formatRM(it.amount)}</span></li>)}</ul>}</section>}
    </main>
  );
}
