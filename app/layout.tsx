import "./globals.css";
export const metadata = { title: "Penny · Cash Flow", description: "Personal finance tracker" };
export const viewport = { themeColor: "#fbbf24" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen text-slate-900 dark:text-slate-100">{children}</body></html>;
}
