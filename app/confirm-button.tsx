"use client";
export default function ConfirmButton({ label = "Delete", message = "Delete this record? This cannot be undone." }: { label?: string; message?: string }) {
  return <button type="submit" onClick={(e) => { if (!confirm(message)) e.preventDefault(); }} className="text-sm text-red-600 hover:underline">{label}</button>;
}
