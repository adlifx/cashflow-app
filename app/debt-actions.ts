"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const clean = (f: FormData) => Object.fromEntries([...f].filter(([, v]) => v !== ""));
const amt = z.coerce.number().positive("Amount must be more than 0").max(100_000_000).transform((n) => Math.round(n * 100) / 100);
const amt0 = z.coerce.number().min(0).max(100_000_000).transform((n) => Math.round(n * 100) / 100);
const fail = (path: string, msg: string): never => redirect(`${path}?err=${encodeURIComponent(msg)}`);
const refresh = () => ["/debts", "/commitments", "/transactions", "/dashboard"].forEach((p) => revalidatePath(p));
const METHODS = ["cash", "debit_card", "bank_transfer", "e_wallet", "other"] as const; // credit card is not cash

async function client() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  return { sb, uid: user!.id };
}

export async function addDebt(form: FormData) {
  const p = z.object({ name: z.string().trim().min(1, "Debt name is required").max(80), lender: z.string().trim().min(1, "Lender is required").max(80),
    debt_type: z.enum(["bank", "friend", "family", "credit_card", "bnpl", "other"]), original_amount: amt0, current_balance: amt0,
    interest_rate: z.coerce.number().min(0).max(100).default(0), min_payment: amt0.default(0), due_day: z.coerce.number().int().min(1).max(31).optional(),
    start_date: z.string().optional(), expected_settlement: z.string().optional(), frequency: z.enum(["weekly", "monthly", "one_time"]).default("monthly"),
    notes: z.string().max(300).optional() }).safeParse(clean(form));
  if (!p.success) return fail("/debts", p.error.issues[0].message);
  const { sb, uid } = await client();
  const { error } = await sb.from("debts").insert({ ...p.data, user_id: uid });
  if (error) return fail("/debts", error.message);
  refresh(); redirect("/debts");
}

export async function deleteDebt(form: FormData) {
  const { sb } = await client();
  const { error } = await sb.from("debts").delete().eq("id", z.string().uuid().parse(form.get("id")));
  if (error) return fail("/debts", error.message);
  refresh(); redirect("/debts");
}

export async function repay(form: FormData) {
  const p = z.object({ debt_id: z.string().uuid(), amount: amt, paid_on: z.string().min(10), payment_method: z.enum(METHODS), request_id: z.string().uuid() }).safeParse(clean(form));
  if (!p.success) return fail("/debts", p.error.issues[0].message);
  const { sb } = await client();
  const { error } = await sb.rpc("record_debt_repayment", { p_debt_id: p.data.debt_id, p_amount: p.data.amount, p_paid_on: p.data.paid_on,
    p_account_id: null, p_payment_method: p.data.payment_method, p_request_id: p.data.request_id });
  if (error) return fail("/debts", error.message);
  refresh(); redirect("/debts");
}

export async function adjustBalance(form: FormData) {
  const p = z.object({ debt_id: z.string().uuid(), new_balance: amt0, reason: z.string().trim().min(1, "Please give a reason for the adjustment").max(200) }).safeParse(clean(form));
  if (!p.success) return fail("/debts", p.error.issues[0].message);
  const { sb } = await client();
  const { error } = await sb.rpc("adjust_debt_balance", { p_debt: p.data.debt_id, p_new: p.data.new_balance, p_reason: p.data.reason });
  if (error) return fail("/debts", error.message);
  refresh(); redirect("/debts");
}

export async function addCommitment(form: FormData) {
  const p = z.object({ name: z.string().trim().min(1, "Name is required").max(80), amount: amt, due_day: z.coerce.number().int().min(1).max(31),
    start_date: z.string().min(10), end_date: z.string().optional(), payment_method: z.string().max(30).optional(), debt_id: z.string().uuid().optional() }).safeParse(clean(form));
  if (!p.success) return fail("/commitments", p.error.issues[0].message);
  const { sb, uid } = await client();
  const { error } = await sb.from("commitments").insert({ ...p.data, user_id: uid, frequency: "monthly" });
  if (error) return fail("/commitments", error.message);
  refresh(); redirect("/commitments");
}

export async function deleteCommitment(form: FormData) {
  const { sb } = await client();
  const { error } = await sb.from("commitments").delete().eq("id", z.string().uuid().parse(form.get("id")));
  if (error) return fail("/commitments", error.message);
  refresh(); redirect("/commitments");
}

export async function payCommitment(form: FormData) {
  const p = z.object({ occ: z.string().uuid(), paid_on: z.string().min(10), payment_method: z.enum(METHODS), request_id: z.string().uuid() }).safeParse(clean(form));
  if (!p.success) return fail("/commitments", p.error.issues[0].message);
  const { sb } = await client();
  const { error } = await sb.rpc("pay_commitment", { p_occ: p.data.occ, p_paid_on: p.data.paid_on, p_method: p.data.payment_method, p_request_id: p.data.request_id });
  if (error) return fail("/commitments", error.message);
  refresh(); redirect("/commitments");
}
