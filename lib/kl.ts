const TZ = "Asia/Kuala_Lumpur";
export const klNow = () => new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
export const klYmd = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const klDateTimeLocal = () => { const d = klNow(); return `${ymd(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
