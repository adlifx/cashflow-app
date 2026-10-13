import Link from "next/link";
import { logout } from "./login/actions";
import Mascot from "./mascot";
const LINKS: [string, string][] = [["/dashboard", "Dashboard"], ["/transactions", "Transactions"], ["/income", "Income"], ["/budgets", "Budgets"], ["/debts", "Debts"], ["/commitments", "Commitments"], ["/goals", "Goals"], ["/calendar", "Calendar"], ["/reports", "Reports"], ["/settings", "Settings"]];
export default function Nav({ err, ok }: { err?: string; ok?: boolean }) {
  return (
    <header className="mb-6 print:hidden">
      <nav className="flex flex-wrap items-center gap-2 pb-3 text-sm">
        <Link href="/dashboard" className="mr-2 flex items-center gap-2 text-lg font-black"><Mascot size={36} /><span>Penny</span></Link>
        {LINKS.map(([h, t]) => <Link key={h} href={h} className="rounded px-3 py-1 hover:bg-slate-200 dark:hover:bg-slate-800">{t}</Link>)}
        <form action={logout} className="ml-auto"><button className="rounded border px-3 py-1">Log out</button></form>
      </nav>
      {err && <p className="mt-3 rounded bg-red-100 p-3 text-sm text-red-800">{err}</p>}
      {ok && <p className="mt-3 rounded bg-emerald-100 p-3 text-sm text-emerald-800">Saved.</p>}
    </header>
  );
}
