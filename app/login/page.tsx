"use client";
import { useActionState } from "react";
import { authAction } from "./actions";
import Mascot from "../mascot";
export default function Login() {
  const [state, action, pending] = useActionState(authAction, undefined);
  return (
    <main className="mx-auto mt-24 max-w-sm rounded-xl bg-white p-6 shadow dark:bg-slate-900">
      <div className="mb-2 flex justify-center"><Mascot size={110} /></div>
      <h1 className="mb-1 text-center text-3xl">Penny</h1>
      <p className="mb-4 text-center text-sm opacity-70">Make your salary last until payday.</p>
      <form action={action} className="space-y-3">
        <input name="email" type="email" required placeholder="Email" className="w-full rounded border p-2 dark:bg-slate-800" />
        <input name="password" type="password" required minLength={8} placeholder="Password (8+ chars)" className="w-full rounded border p-2 dark:bg-slate-800" />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button name="mode" value="login" disabled={pending} className="w-full rounded bg-emerald-600 p-2 text-white disabled:opacity-50">{pending ? "Please wait…" : "Log in"}</button>
        <button name="mode" value="signup" disabled={pending} className="w-full rounded border p-2 disabled:opacity-50">Create account</button>
      </form>
    </main>
  );
}
