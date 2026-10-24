import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readStorage, writeStorage, removeStorage } from "./storage.ts";

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("reads existing secrets and filters without migrating stored values", async () => {
  data.set("secret-pitchou", "existing-secret");
  data.set("filters", '{"tri":"date","filtres":{"texte":"renard"}}');
  expect(await readStorage("secret-pitchou")).toBe("existing-secret");
  expect(await readStorage("filters")).toEqual({
    tri: "date",
    filtres: { texte: "renard" },
  });
  expect(await readStorage("missing")).toBeUndefined();
});

it("keeps strings raw, serializes filters, and removes the secret on logout", async () => {
  await writeStorage("secret-pitchou", "new-secret");
  await writeStorage("filters", { tri: "date" });
  expect(data.get("secret-pitchou")).toBe("new-secret");
  expect(data.get("filters")).toBe('{"tri":"date"}');
  await removeStorage("secret-pitchou");
  expect(await readStorage("secret-pitchou")).toBeUndefined();
});

it("reports unavailable storage through promise rejection", async () => {
  const fail = () => {
    throw new Error("Storage unavailable");
  };
  vi.stubGlobal("localStorage", { getItem: fail, setItem: fail, removeItem: fail });
  await expect(readStorage("secret")).rejects.toThrow("Storage unavailable");
  await expect(writeStorage("secret", "value")).rejects.toThrow("Storage unavailable");
  await expect(removeStorage("secret")).rejects.toThrow("Storage unavailable");
});
