import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { shiftMonth } from "@/lib/finance/report";
import { klYmd } from "@/lib/kl";

// Prefix risky leading characters so spreadsheets don't run cell contents as formulas
const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export async function GET(req: NextRequest) {
  const m = req.nextUrl.searchParams.get("m") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return new Response("Invalid month", { status: 400 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const [{ data: exp }, { data: inc }] = await Promise.all([
    sb.from("expenses").select("*").gte("spent_at", `${m}-01T00:00:00+08:00`).lt("spent_at", `${shiftMonth(m, 1)}-01T00:00:00+08:00`).order("spent_at"),
    sb.from("income").select("*").gte("income_date", `${m}-01`).lt("income_date", `${shiftMonth(m, 1)}-01`).order("income_date"),
  ]);
  const rows = [["type", "date", "description", "category", "amount_rm", "method_or_status", "merchant", "essential"],
    ...(inc ?? []).map((r) => ["income", r.income_date, `${r.source}${r.description ? " - " + r.description : ""}`, r.income_type, r.amount, r.status, "", ""]),
    ...(exp ?? []).map((r) => ["expense", klYmd(r.spent_at), r.description, r.category, r.amount, r.payment_method, r.merchant ?? "", r.is_essential ? "yes" : "no"])];
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="cashflow-${m}.csv"` } });
}
