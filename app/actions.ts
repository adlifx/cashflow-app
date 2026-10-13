"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_KEYS, METHOD_KEYS, INCOME_TYPES } from "@/lib/categories";

const money = z.coerce.number().positive("Amount must be more than 0").max(10_000_000).transform((n) => Math.round(n * 100) / 100);
const fail = (path: string, msg: string): never => redirect(`${path}?err=${encodeURIComponent(msg)}`);
const withTz = (s: string) => `${s.length === 16 ? s + ":00" : s}+08:00`; // forms are entered in Malaysia time
const refresh = () => { ["/transactions", "/income", "/dashboard", "/settings"].forEach((p) => revalidatePath(p)); };

export async function addExpense(form: FormData) {
  const p = z.object({ description: z.string().trim().min(1, "Description is required").max(120), category: z.enum(CATEGORY_KEYS),
    amount: money, payment_method: z.enum(METHOD_KEYS), spent: z.string().min(10), merchant: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(300).optional(), request_id: z.string().uuid() }).safeParse(Object.fromEntries(form));
  if (!p.success) return fail("/transactions", p.error.issues[0].message);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await sb.from("expenses").insert({ user_id: user!.id, description: p.data.description, category: p.data.category,
    amount: p.data.amount, payment_method: p.data.payment_method, spent_at: withTz(p.data.spent), merchant: p.data.merchant || null,
    notes: p.data.notes || null, is_essential: form.get("essential") === "on", is_recurring: form.get("recurring") === "on",
    client_request_id: p.data.request_id });
  if (error && error.code !== "23505") return fail("/transactions", error.message); // 23505 = duplicate submit, already saved
  refresh(); redirect("/transactions");
}

export async function deleteExpense(form: FormData) {
  const id = z.string().uuid().parse(form.get("id"));
  const sb = await supabaseServer();
  const { data: row } = await sb.from("expenses").select("debt_id, commitment_occurrence_id").eq("id", id).single();
  if (row?.debt_id || row?.commitment_occurrence_id) return fail("/transactions", "This record is linked to a debt or commitment. Remove it from there so balances stay correct.");
  const { error } = await sb.from("expenses").delete().eq("id", id);
  if (error) return fail("/transactions", error.message);
  refresh(); redirect("/transactions");
}

export async function addIncome(form: FormData) {
  const p = z.object({ income_date: z.string().min(10), source: z.string().trim().min(1, "Source is required").max(80),
    description: z.string().trim().max(120).optional(), amount: money, income_type: z.enum(INCOME_TYPES),
    status: z.enum(["received", "expected"]), notes: z.string().trim().max(300).optional(), request_id: z.string().uuid() }).safeParse(Object.fromEntries(form));
  if (!p.success) return fail("/income", p.error.issues[0].message);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { request_id, ...rest } = p.data;
  const { error } = await sb.from("income").insert({ ...rest, description: rest.description || null, notes: rest.notes || null, user_id: user!.id, client_request_id: request_id });
  if (error && error.code !== "23505") return fail("/income", error.message);
  refresh(); redirect("/income");
}

export async function deleteIncome(form: FormData) {
  const id = z.string().uuid().parse(form.get("id"));
  const sb = await supabaseServer();
  const { error } = await sb.from("income").delete().eq("id", id);
  if (error) return fail("/income", error.message);
  refresh(); redirect("/income");
}

export async function saveSettings(form: FormData) {
  const n = z.coerce.number().min(0).max(10_000_000);
  const p = z.object({ expected_salary: n, savings_target: n, emergency_reserve: n, other_reserved: n,
    salary_day: z.coerce.number().int().min(1).max(31) }).safeParse(Object.fromEntries(form));
  if (!p.success) return fail("/settings", p.error.issues[0].message);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await sb.from("profiles").update(p.data).eq("id", user!.id);
  if (error) return fail("/settings", error.message);
  refresh(); redirect("/settings?ok=1");
}

export async function addAccount(form: FormData) {
  const p = z.object({ name: z.string().trim().min(1, "Name is required").max(60), kind: z.enum(["cash", "bank", "e_wallet", "savings"]),
    opening_balance: z.coerce.number().min(0).max(100_000_000) }).safeParse(Object.fromEntries(form));
  if (!p.success) return fail("/settings", p.error.issues[0].message);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await sb.from("accounts").insert({ ...p.data, user_id: user!.id });
  if (error) return fail("/settings", error.message);
  refresh(); redirect("/settings?ok=1");
}

export async function deleteAccount(form: FormData) {
  const id = z.string().uuid().parse(form.get("id"));
  const sb = await supabaseServer();
  const { error } = await sb.from("accounts").delete().eq("id", id);
  if (error) return fail("/settings", error.message);
  refresh(); redirect("/settings?ok=1");
}
