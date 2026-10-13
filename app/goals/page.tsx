import { supabaseServer } from "@/lib/supabase/server";
import Nav from "../nav";
import ConfirmButton from "../confirm-button";
import { addGoal, deleteGoal, contribute } from "../goal-actions";
import { formatRM } from "@/lib/finance/calc";
import { klNow, ymd } from "@/lib/kl";

export const dynamic = "force-dynamic";
const input = "w-full rounded border p-2 dark:bg-slate-800";

export default async function Goals({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  const [{ data: goals }, { data: cons }] = await Promise.all([sb.from("savings_goals").select("*").order("created_at"), sb.from("savings_contributions").select("goal_id, amount")]);
  const today = klNow(), todayStr = ymd(today);
  return (
    <main className="mx-auto max-w-4xl p-6">
      <Nav err={sp.err} />
      <h1 className="mb-1 text-2xl font-semibold">Savings goals</h1>
      <p className="mb-4 text-sm opacity-70">Contributions here are allocations of your own money. They are not counted as expenses or as new income.</p>
      <details className="mb-6 rounded-xl bg-white p-4 shadow dark:bg-slate-900" open={(goals ?? []).length === 0}><summary className="cursor-pointer font-medium">Add a goal</summary>
        <form action={addGoal} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="name" required placeholder="Goal name (e.g. Emergency fund)" className={input} />
          <input name="target_amount" type="number" step="0.01" min="0.01" required placeholder="Target amount (RM)" className={input} />
          <label className="text-sm">Target date (optional)<input name="target_date" type="date" className={input} /></label>
          <label className="text-sm">Planned monthly contribution (RM)<input name="monthly_contribution" type="number" step="0.01" min="0" className={input} /></label>
          <input name="notes" placeholder="Notes (optional)" className={`${input} sm:col-span-2`} />
          <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Add goal</button></form></details>
      {(goals ?? []).length === 0 && <p className="rounded-xl border border-dashed p-6 text-center opacity-70">No goals yet. Start with an emergency fund.</p>}
      <div className="space-y-4">{(goals ?? []).map((g) => {
        const saved = (cons ?? []).filter((c) => c.goal_id === g.id).reduce((s, c) => s + Math.round(Number(c.amount) * 100), 0) / 100;
        const target = Number(g.target_amount), pct = Math.min(100, Math.max(0, (saved / target) * 100));
        let need = "";
        if (saved >= target) need = "Goal reached!";
        else if (g.target_date) {
          const td = new Date(`${g.target_date}T00:00:00`);
          const months = Math.max(1, (td.getFullYear() - today.getFullYear()) * 12 + td.getMonth() - today.getMonth());
          need = g.target_date < todayStr ? "Target date has passed." : `Save about ${formatRM(Math.ceil(((target - saved) / months) * 100) / 100)} a month to reach it by ${g.target_date}.`;
        } else if (Number(g.monthly_contribution) > 0) need = `At ${formatRM(Number(g.monthly_contribution))} a month, about ${Math.ceil((target - saved) / Number(g.monthly_contribution))} months to go.`;
        return (
          <section key={g.id} className="rounded-xl bg-white p-4 shadow dark:bg-slate-900">
            <div className="flex justify-between"><h2 className="font-semibold">{g.name}</h2><form action={deleteGoal}><input type="hidden" name="id" value={g.id} /><ConfirmButton message="Delete this goal and its contributions?" /></form></div>
            <div className="my-2 h-2 rounded bg-slate-200 dark:bg-slate-800"><div className="h-2 rounded bg-emerald-600" style={{ width: `${pct}%` }} /></div>
            <p className="text-sm">{formatRM(saved)} of {formatRM(target)} ({Math.round(pct)}%) · {need}</p>
            <form action={contribute} className="mt-3 grid gap-2 sm:grid-cols-5">
              <input type="hidden" name="goal_id" value={g.id} />
              <input name="amount" type="number" step="0.01" min="0.01" required placeholder="Amount (RM)" defaultValue={Number(g.monthly_contribution) > 0 ? Number(g.monthly_contribution) : undefined} className={input} />
              <select name="kind" className={input}><option value="add">Add to goal</option><option value="withdraw">Withdraw</option></select>
              <input name="contributed_on" type="date" required defaultValue={todayStr} className={input} />
              <button className="rounded bg-emerald-600 p-2 text-white sm:col-span-2">Record</button></form>
          </section>);
      })}</div>
    </main>
  );
}
