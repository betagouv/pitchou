import { afterEach, describe, expect, it, vi } from "vitest";
import { json, text } from "./http.ts";

afterEach(() => vi.unstubAllGlobals());

describe("HTTP helpers", () => {
  it("forwards request options and parses JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ saved: true }));
    vi.stubGlobal("fetch", fetchMock);
    const init = { method: "POST", body: "{}", headers: { Accept: "application/json" } };
    expect(await json("/save", init)).toEqual({ saved: true });
    expect(fetchMock).toHaveBeenCalledWith("/save", init);
  });

  it.each([204, 205])("accepts an empty %s response", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect(await json("/save")).toBeUndefined();
  });

  it.each([json, text])(
    "rejects HTTP failures with the status used by login handling",
    async (read) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 403, statusText: "Forbidden" })),
      );
      await expect(read("/caps")).rejects.toThrow("403 Forbidden");
    },
  );

  it("returns text and rejects invalid JSON and network errors", async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response("hello")));
    vi.stubGlobal("fetch", fetchMock);
    expect(await text("/message")).toBe("hello");
    await expect(json("/message")).rejects.toThrow();
    fetchMock.mockRejectedValue(new TypeError("Network error"));
    await expect(json("/message")).rejects.toThrow("Network error");
  });
});
