"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "./login/actions";
import Mascot from "./mascot";

const MAIN: [string, string, string][] = [["/dashboard", "Home", "🏠"], ["/transactions", "Spend", "💸"], ["/income", "Income", "💰"], ["/budgets", "Budgets", "🎯"]];
const MORE: [string, string][] = [["/debts", "Debts"], ["/commitments", "Commitments"], ["/goals", "Goals"], ["/calendar", "Calendar"], ["/reports", "Reports"], ["/settings", "Settings"]];
const ALL: [string, string][] = [...MAIN.map(([h, t]) => [h, t === "Home" ? "Dashboard" : t === "Spend" ? "Transactions" : t] as [string, string]), ...MORE];

export default function Nav({ err, ok }: { err?: string; ok?: boolean }) {
  const path = usePathname();
  const on = (h: string) => path === h || path.startsWith(`${h}/`);
  return (
    <header className="mb-4 print:hidden md:mb-6">
      <nav className="flex items-center gap-2 pb-3 text-sm">
        <Link href="/dashboard" className="mr-2 flex items-center gap-2 text-lg font-black"><Mascot size={36} /><span>Penny</span></Link>
        <div className="ml-auto hidden flex-wrap items-center gap-1 md:flex">
          {ALL.map(([h, t]) => <Link key={h} href={h} className={`rounded px-3 py-1 hover:bg-amber-200 dark:hover:bg-indigo-800 ${on(h) ? "bg-amber-300 font-bold text-indigo-950" : ""}`}>{t}</Link>)}
          <form action={logout}><button className="rounded border px-3 py-1">Log out</button></form>
        </div>
      </nav>
      <div className="tabbar fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MAIN.map(([h, t, e]) => <Link key={h} href={h} className={`tab ${on(h) ? "active" : ""}`}><span className="text-xl leading-none">{e}</span><span>{t}</span></Link>)}
          <details className="relative">
            <summary className="tab cursor-pointer"><span className="text-xl leading-none">⋯</span><span>More</span></summary>
            <div className="sheet absolute bottom-full right-1 mb-2 w-52 p-2">
              {MORE.map(([h, t]) => <Link key={h} href={h} className={on(h) ? "active" : ""}>{t}</Link>)}
              <form action={logout}><button type="submit">Log out</button></form>
            </div>
          </details>
        </div>
      </div>
      {err && <p className="mt-3 rounded bg-red-100 p-3 text-sm text-red-800">{err}</p>}
      {ok && <p className="mt-3 rounded bg-emerald-100 p-3 text-sm text-emerald-800">Saved.</p>}
    </header>
  );
}
