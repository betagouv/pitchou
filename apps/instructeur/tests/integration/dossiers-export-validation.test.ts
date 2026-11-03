import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

async function download(cap: string, scope = "service", format = "csv", extra = "") {
  return fetchAuthenticated(
    cap,
    `${INTEGRATION_BASE_URL}/dossiers/export?scope=${scope}&format=${format}${extra}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierIds: await db("dossier").pluck("id") }),
    },
  );
}

test("rejects missing and invalid sessions, invalid formats and arbitrary scopes", async () => {
  const owner = await createInstructeurWithDossier(db);
  expect((await download("")).status).toBe(401);
  expect((await download("invalid")).status).toBe(401);
  expect((await download(randomUUID())).status).toBe(401);
  expect((await download(owner.cap, "unknown")).status).toBe(400);
  expect((await download(owner.cap, "service", "grist")).status).toBe(400);
  const caps = await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/api/session`).then(
    (response) => response.json(),
  );
  expect(caps.exporterDossiers).toBe("/dossiers/export");
});
