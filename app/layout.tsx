import "./globals.css";
export const metadata = {
  title: "Penny · Cash Flow", description: "Personal finance tracker",
  appleWebApp: { capable: true, title: "Penny", statusBarStyle: "default" as const },
};
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const, themeColor: "#fbbf24" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="min-h-screen text-slate-900 dark:text-slate-100">{children}</body></html>;
}
