"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
export async function authAction(_: { error?: string } | undefined, form: FormData) {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and a password of at least 8 characters." };
  const sb = await supabaseServer();
  const mode = form.get("mode");
  const { error } = mode === "signup" ? await sb.auth.signUp(parsed.data) : await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };
  redirect("/dashboard");
}
export async function logout() { const sb = await supabaseServer(); await sb.auth.signOut(); redirect("/login"); }
