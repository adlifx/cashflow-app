import { describe, it, expect } from "vitest";
import { fetchAll } from "./fetch-all";
describe("fetchAll", () => {
  const rows = Array.from({ length: 2500 }, (_, i) => i);
  const page = async (a: number, b: number) => ({ data: rows.slice(a, b + 1), error: null });
  it("collects every page", async () => expect((await fetchAll(page)).length).toBe(2500));
  it("handles an exact multiple of the page size", async () => expect((await fetchAll(async (a, b) => ({ data: rows.slice(a, Math.min(b + 1, 2000)), error: null }))).length).toBe(2000));
  it("throws on an error", async () => { await expect(fetchAll(async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom"); });
});
