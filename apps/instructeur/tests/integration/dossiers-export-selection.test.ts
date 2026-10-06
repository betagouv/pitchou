import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";

async function exportSelection(
  cap: string,
  dossierIds: unknown,
  scope = "service",
  format = "csv",
) {
  return fetchAuthenticated(
    cap,
    `${INTEGRATION_BASE_URL}/dossiers/export?scope=${scope}&format=${format}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierIds }),
    },
  );
}

async function readRows(response: Response): Promise<string[][]> {
  expect(response.status).toBe(200);
  const book = XLSX.read(await response.arrayBuffer(), { type: "array", raw: true });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: "" });
}

test("exports exactly the selected filtered dossiers and accepts an empty selection", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner" });
  const other = await createInstructeurWithDossier(db, {
    email: "other@export.fr",
    nomGroupe: "Other",
  });
  const rows = await readRows(
    await exportSelection(owner.cap, [owner.dossier.id, other.dossier.id]),
  );
  expect(rows).toHaveLength(2);
  expect(rows[1][0]).toBe(String(owner.dossier.id));
  expect(await readRows(await exportSelection(owner.cap, []))).toHaveLength(1);
  expect(
    await readRows(await exportSelection(owner.cap, [owner.dossier.id], "followed")),
  ).toHaveLength(1);
});

test("national filtered exports preserve read-only restrictions", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner" });
  const reader = await createInstructeurWithDossier(db, {
    email: "reader@export.fr",
    nomGroupe: "Reader",
  });
  await db("edge_personne_follows_dossier").insert({
    personne: owner.id,
    dossier: owner.dossier.id,
  });
  await db("avis_expert").insert([
    { dossier: owner.dossier.id, expert: "CNPN", saisine_date: "2026-09-01", avis: "Favorable" },
    { dossier: owner.dossier.id, expert: "Autre expert", avis: "Favorable" },
  ]);
  const rows = await readRows(await exportSelection(reader.cap, [owner.dossier.id], "france"));
  expect(rows).toHaveLength(2);
  expect(rows[1][0]).toBe(String(owner.dossier.id));
  expect(rows[1][4]).toBe("");
  expect(rows[1][15]).toBe("");
  expect(rows[1][16]).toBe("Oui CNPN");
  expect(rows[1].slice(18)).toEqual(["", "", ""]);
});

test.each([null, "all", ["1"], [-1], [1.5], [2147483648]])(
  "rejects invalid dossier selections %s",
  async (selection) => {
    const owner = await createInstructeurWithDossier(db);
    expect((await exportSelection(owner.cap, selection)).status).toBe(400);
  },
);

test("rejects missing and invalid sessions, invalid formats and arbitrary scopes", async () => {
  const owner = await createInstructeurWithDossier(db);
  for (const token of ["", "invalid", randomUUID()])
    expect((await exportSelection(token, [])).status).toBe(401);
  expect((await exportSelection(owner.cap, [], "unknown")).status).toBe(400);
  expect((await exportSelection(owner.cap, [], "service", "grist")).status).toBe(400);
  const caps = await fetchAuthenticated(owner.cap, `${INTEGRATION_BASE_URL}/api/session`).then(
    (response) => response.json(),
  );
  expect(caps.exporterDossiers).toBe("/dossiers/export");
  const legacy = await fetch(`${INTEGRATION_BASE_URL}/dossiers/export?cap=${owner.cap}`, {
    method: "POST",
  });
  expect(legacy.status).toBe(401);
});

test("read-only sessions can export national data while access revocation and origins are enforced", async () => {
  const reader = await createInstructeurWithDossier(db);
  await db("auth_permission_exclusion").insert({
    user_id: reader.id,
    permission: "dossier:instruct",
  });
  const caps = await fetchAuthenticated(reader.cap, `${INTEGRATION_BASE_URL}/api/session`).then(
    (response) => response.json(),
  );
  expect(caps.exporterDossiers).toBe("/dossiers/export");
  expect(
    await readRows(await exportSelection(reader.cap, [reader.dossier.id], "france")),
  ).toHaveLength(2);
  expect(await readRows(await exportSelection(reader.cap, [reader.dossier.id]))).toHaveLength(1);
  expect(
    await readRows(await exportSelection(reader.cap, [reader.dossier.id], "followed")),
  ).toHaveLength(1);
  const forbidden = await fetch(`${INTEGRATION_BASE_URL}/dossiers/export?scope=france&format=csv`, {
    method: "POST",
    headers: {
      cookie: `pitchou_session=${reader.cap}`,
      origin: "https://untrusted.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ dossierIds: [reader.dossier.id] }),
  });
  expect(forbidden.status).toBe(403);
  await db("user_groupe").where({ user_id: reader.id }).delete();
  expect((await exportSelection(reader.cap, [reader.dossier.id], "france")).status).toBe(403);
  await db("auth_user").where({ id: reader.id }).update({ active: false });
  expect((await exportSelection(reader.cap, [reader.dossier.id], "france")).status).toBe(401);
});
