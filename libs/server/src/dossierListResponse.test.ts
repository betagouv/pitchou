import { gunzipSync } from "node:zlib";
import { expect, test } from "vitest";
import { dossierListResponse } from "./dossierListResponse.ts";

const data = [
  {
    id: 42,
    name: "Projet à préserver 🐦",
    latestCommentaire: "Espèces protégées, commentaire complet. ".repeat(1_000),
    depot_date: new Date("2026-01-01"),
    empty: null,
    omitted: undefined,
  },
];

function expectPrivateHeaders(response: Response) {
  expect(response.headers.get("vary")).toBe("Accept-Encoding");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("content-type")).toBe("application/json");
}

test.each([
  "gzip",
  "br, gzip, deflate",
  "GZip;Q=0.5",
  "*;q=0.5",
  "gzip;q=1, identity;q=0.5",
  "gzip;q=0.5, *;q=0",
])(
  "compresses accepted large responses with %s without changing their JSON bytes",
  async (acceptEncoding) => {
    const response = await dossierListResponse(data, acceptEncoding);
    const compressed = Buffer.from(await response.arrayBuffer());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-encoding")).toBe("gzip");
    expect(Number(response.headers.get("content-length"))).toBe(compressed.byteLength);
    expect(gunzipSync(compressed)).toEqual(Buffer.from(JSON.stringify(data)));
    expect(compressed.byteLength).toBeLessThan(Buffer.byteLength(JSON.stringify(data)));
    expectPrivateHeaders(response);
  },
);

test.each([
  null,
  "",
  "br",
  "gzip;q=0",
  "gzip;q=0, *;q=1",
  "gzip;q=0.5, identity;q=1",
  "gzip;q=invalid",
  "gzip;q=2",
])(
  "keeps the original JSON when gzip is declined or less preferred with %s",
  async (acceptEncoding) => {
    const response = await dossierListResponse(data, acceptEncoding);
    expect(response.status).toBe(200);
    expect(response.headers.has("content-encoding")).toBe(false);
    expect(Number(response.headers.get("content-length"))).toBe(
      Buffer.byteLength(JSON.stringify(data)),
    );
    expect(await response.text()).toBe(JSON.stringify(data));
    expectPrivateHeaders(response);
  },
);

test("keeps small responses uncompressed, unless identity is forbidden", async () => {
  const small = [{ id: 42, name: "Écureuil" }];
  const response = await dossierListResponse(small, "gzip");
  expect(response.headers.has("content-encoding")).toBe(false);
  expect(await response.json()).toEqual(small);
  const compressed = await dossierListResponse(small, "gzip, identity;q=0");
  expect(compressed.headers.get("content-encoding")).toBe("gzip");
  expect(JSON.parse(gunzipSync(await compressed.arrayBuffer()).toString())).toEqual(small);
});

test.each(["gzip;q=0, identity;q=0", "br, *;q=0"])(
  "rejects a response when neither gzip nor identity is acceptable with %s",
  async (acceptEncoding) => {
    const response = await dossierListResponse(data, acceptEncoding);
    expect(response.status).toBe(406);
    expect(await response.text()).toBe("");
    expect(response.headers.has("content-encoding")).toBe(false);
    expectPrivateHeaders(response);
  },
);

test("propagates serialization errors before returning a response", async () => {
  await expect(dossierListResponse({ id: 1n }, "gzip")).rejects.toBeInstanceOf(TypeError);
});
