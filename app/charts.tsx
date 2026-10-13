"use client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartsData {
  daily: { day: number; amount: number }[];
  months: { m: string; income: number; expenses: number; debt: number; savings: number }[];
  categories: { name: string; value: number }[];
  fixedVar: { name: string; value: number }[];
}
const COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#e11d48", "#8b5cf6", "#14b8a6", "#f97316", "#64748b"];
const rm = (v: unknown) => `RM ${Number(v).toFixed(2)}`;
const axis = { stroke: "#94a3b8", fontSize: 11 };

function Box({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (<div className="rounded-xl bg-white p-4 shadow dark:bg-slate-900 print:break-inside-avoid"><h3 className="mb-2 text-sm font-semibold">{title}</h3>
    {empty ? <p className="py-10 text-center text-sm opacity-60">Nothing to show for this month yet.</p> : <div className="h-56">{children}</div>}</div>);
}
export default function Charts({ daily, months, categories, fixedVar }: ChartsData) {
  const hasSpend = daily.some((d) => d.amount > 0);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Box title="Daily spending" empty={!hasSpend}><ResponsiveContainer><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} /><XAxis dataKey="day" {...axis} /><YAxis {...axis} /><Tooltip formatter={rm} /><Bar dataKey="amount" name="Spent" fill="#059669" /></BarChart></ResponsiveContainer></Box>
      <Box title="Income vs expenses (6 months)"><ResponsiveContainer><BarChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} /><XAxis dataKey="m" {...axis} /><YAxis {...axis} /><Tooltip formatter={rm} /><Legend /><Bar dataKey="income" name="Income" fill="#0ea5e9" /><Bar dataKey="expenses" name="Expenses" fill="#e11d48" /></BarChart></ResponsiveContainer></Box>
      <Box title="Spending by category" empty={categories.length === 0}><ResponsiveContainer><PieChart><Pie data={categories} dataKey="value" nameKey="name" outerRadius={80}>{categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={rm} /><Legend /></PieChart></ResponsiveContainer></Box>
      <Box title="Debt balance over time"><ResponsiveContainer><LineChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} /><XAxis dataKey="m" {...axis} /><YAxis {...axis} /><Tooltip formatter={rm} /><Line dataKey="debt" name="Outstanding debt" stroke="#f59e0b" strokeWidth={2} /></LineChart></ResponsiveContainer></Box>
      <Box title="Savings progress (cumulative)"><ResponsiveContainer><LineChart data={months}><CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} /><XAxis dataKey="m" {...axis} /><YAxis {...axis} /><Tooltip formatter={rm} /><Line dataKey="savings" name="Saved" stroke="#059669" strokeWidth={2} /></LineChart></ResponsiveContainer></Box>
      <Box title="Fixed commitments vs variable" empty={fixedVar.every((f) => f.value === 0)}><ResponsiveContainer><PieChart><Pie data={fixedVar} dataKey="value" nameKey="name" outerRadius={80}>{fixedVar.map((_, i) => <Cell key={i} fill={COLORS[i * 2]} />)}</Pie><Tooltip formatter={rm} /><Legend /></PieChart></ResponsiveContainer></Box>
    </div>
  );
}
