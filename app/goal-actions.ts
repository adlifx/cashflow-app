"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const clean = (f: FormData) => Object.fromEntries([...f].filter(([, v]) => v !== ""));
const amt = z.coerce.number().positive("Amount must be more than 0").max(100_000_000).transform((n) => Math.round(n * 100) / 100);
const fail = (msg: string): never => redirect(`/goals?err=${encodeURIComponent(msg)}`);
const done = () => { revalidatePath("/goals"); redirect("/goals"); };
async function client() { const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect("/login"); return { sb, uid: user!.id }; }

export async function addGoal(form: FormData) {
  const p = z.object({ name: z.string().trim().min(1, "Goal name is required").max(80), target_amount: amt, target_date: z.string().optional(),
    monthly_contribution: z.coerce.number().min(0).max(100_000_000).default(0), notes: z.string().max(300).optional() }).safeParse(clean(form));
  if (!p.success) return fail(p.error.issues[0].message);
  const { sb, uid } = await client();
  const { error } = await sb.from("savings_goals").insert({ ...p.data, user_id: uid });
  if (error) return fail(error.message);
  done();
}
export async function deleteGoal(form: FormData) {
  const { sb } = await client();
  const { error } = await sb.from("savings_goals").delete().eq("id", z.string().uuid().parse(form.get("id")));
  if (error) return fail(error.message);
  done();
}
// A contribution is an allocation of your own money, not an expense and not income.
export async function contribute(form: FormData) {
  const p = z.object({ goal_id: z.string().uuid(), amount: amt, kind: z.enum(["add", "withdraw"]), contributed_on: z.string().min(10) }).safeParse(clean(form));
  if (!p.success) return fail(p.error.issues[0].message);
  const { sb, uid } = await client();
  if (p.data.kind === "withdraw") {
    const { data } = await sb.from("savings_contributions").select("amount").eq("goal_id", p.data.goal_id);
    const saved = (data ?? []).reduce((s, r) => s + Math.round(Number(r.amount) * 100), 0) / 100;
    if (p.data.amount > saved) return fail("You can't withdraw more than the amount saved in this goal.");
  }
  const { error } = await sb.from("savings_contributions").insert({ user_id: uid, goal_id: p.data.goal_id, contributed_on: p.data.contributed_on, amount: p.data.kind === "withdraw" ? -p.data.amount : p.data.amount });
  if (error) return fail(error.message);
  done();
}
