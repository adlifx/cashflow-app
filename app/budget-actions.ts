"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_KEYS } from "@/lib/categories";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const back = (m: string, q = "") => redirect(`/budgets?m=${m}${q}`);

async function client(m: string) {
  if (!MONTH.test(m)) redirect("/budgets");
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return { sb, uid: user!.id };
}

export async function saveBudgets(form: FormData) {
  const m = String(form.get("month"));
  const { sb, uid } = await client(m);
  const rows: { user_id: string; period: string; category: string; amount: number }[] = [];
  const cleared: string[] = [];
  for (const k of CATEGORY_KEYS) {
    const raw = String(form.get(`b_${k}`) ?? "").trim();
    if (raw === "") { cleared.push(k); continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 10_000_000) return back(m, `&err=${encodeURIComponent("Budget amounts must be between 0 and 10,000,000")}`);
    rows.push({ user_id: uid, period: `${m}-01`, category: k, amount: Math.round(n * 100) / 100 });
  }
  if (rows.length) { const { error } = await sb.from("budgets").upsert(rows, { onConflict: "user_id,period,category" }); if (error) return back(m, `&err=${encodeURIComponent(error.message)}`); }
  if (cleared.length) await sb.from("budgets").delete().eq("period", `${m}-01`).in("category", cleared);
  ["/budgets", "/dashboard"].forEach((p) => revalidatePath(p));
  back(m, "&ok=1");
}

export async function copyPreviousBudget(form: FormData) {
  const m = String(form.get("month"));
  const { sb, uid } = await client(m);
  const [y, mo] = m.split("-").map(Number);
  const prev = new Date(y, mo - 2, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
  const { data } = await sb.from("budgets").select("category, amount").eq("period", prevKey);
  if (!data?.length) return back(m, `&err=${encodeURIComponent("There is no budget in the previous month to copy.")}`);
  const { error } = await sb.from("budgets").upsert(data.map((b) => ({ user_id: uid, period: `${m}-01`, category: b.category, amount: b.amount })), { onConflict: "user_id,period,category" });
  if (error) return back(m, `&err=${encodeURIComponent(error.message)}`);
  ["/budgets", "/dashboard"].forEach((p) => revalidatePath(p));
  back(m, "&ok=1");
}
