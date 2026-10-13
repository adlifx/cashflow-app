export const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** Due date in month m (0-based) of year y, clamped to the month's last day. */
export const dueIn = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, lastDay(y, m)));
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
