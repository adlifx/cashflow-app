import "./globals.css";
export const metadata = { title: "Cash Flow", description: "Personal finance tracker" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">{children}</body></html>;
}
