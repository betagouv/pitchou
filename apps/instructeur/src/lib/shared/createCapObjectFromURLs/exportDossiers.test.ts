import { afterEach, expect, test, vi } from "vitest";
import { wrapExportDossiers } from "./exportDossiers.ts";

afterEach(() => vi.unstubAllGlobals());

function captureRequest() {
  vi.stubGlobal("location", { href: "https://pitchou.example/mes-dossiers" });
  const fetchMock = vi.fn().mockResolvedValue(new Response("export"));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

test("exports explicit selections without adding a competing query", async () => {
  const fetchMock = captureRequest();
  await wrapExportDossiers("/dossiers/export")!("service", "csv", []);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ dossierIds: [] });
});

test("exports the full server filter with browser calendar timezone and no selected IDs", async () => {
  const fetchMock = captureRequest();
  await wrapExportDossiers("/dossiers/export")!(
    "followed",
    "ods",
    undefined,
    "q=Marais&from=2026-03-29",
  );
  const [url, init] = fetchMock.mock.calls[0];
  expect(url.searchParams.get("scope")).toBe("followed");
  expect(url.searchParams.get("format")).toBe("ods");
  const body = JSON.parse(init.body);
  expect(body).not.toHaveProperty("dossierIds");
  const params = new URLSearchParams(body.query);
  expect(params.get("q")).toBe("Marais");
  expect(params.get("from")).toBe("2026-03-29");
  expect(params.get("timeZone")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test("an empty query exports all results rather than omitting the selection", async () => {
  const fetchMock = captureRequest();
  await wrapExportDossiers("/dossiers/export")!("service", "csv", undefined, "");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ query: "" });
});
