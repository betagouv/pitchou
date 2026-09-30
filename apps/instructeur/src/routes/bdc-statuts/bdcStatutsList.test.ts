import { expect, test, vi } from "vitest";
import { fetchBdcStatutPage, parseBdcStatutQuery } from "./bdcStatutsList.ts";

test("transmits the UICN filter alongside search, protection, sort and page", async () => {
  const params = new URLSearchParams({
    q: "aigle",
    statut: "PN",
    uicn: "EN",
    tri: "cdnom",
    ordre: "desc",
    page: "2",
  });
  const fetchFn = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ rows: [], total: 0, page: 2, pageSize: 20 })));
  await fetchBdcStatutPage(parseBdcStatutQuery(params), fetchFn);
  const url = new URL(String(fetchFn.mock.calls[0][0]), "http://localhost");
  expect(Object.fromEntries(url.searchParams)).toEqual(Object.fromEntries(params));
});

test.each(["", "invalid"])("does not send an inactive or invalid UICN filter: %s", async (uicn) => {
  const query = parseBdcStatutQuery(new URLSearchParams({ uicn }));
  expect(query.uicn).toBe("");
  const fetchFn = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ rows: [], total: 0, page: 1, pageSize: 20 })));
  await fetchBdcStatutPage(query, fetchFn);
  expect(fetchFn).toHaveBeenCalledWith("/api/bdc-statuts");
});
