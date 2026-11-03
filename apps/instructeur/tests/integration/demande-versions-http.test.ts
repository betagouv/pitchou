import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { INTEGRATION_BASE_URL as base } from "../setup/integration-global.ts";

function post(token: string, id: number, body: unknown) {
  return fetchAuthenticated(token, `${base}/dossier/${id}/demandes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("creates an independent demande, compares its history and shares dossier access over HTTP", async () => {
  const owner = await createInstructeurWithDossier(db);
  const id = owner.dossier.id;
  const create = await post(owner.cap, id, { action: "create", label: "Second procedure" });
  expect(create.status, await create.clone().text()).toBe(200);
  const { demandeId } = await create.json();
  const workspace = await fetchAuthenticated(owner.cap, `${base}/dossier/${demandeId}/demandes`);
  expect(workspace.status).toBe(200);
  expect((await workspace.json()).demandes.map((item: { id: number }) => item.id)).toEqual([
    id,
    demandeId,
  ]);
  await db("dossier").where({ id: demandeId }).update({ description: "New description" });
  const revisions = await fetchAuthenticated(owner.cap, `${base}/dossier/${demandeId}/versions`);
  const states = await revisions.json();
  expect(states).toHaveLength(2);
  const earlier = await fetchAuthenticated(
    owner.cap,
    `${base}/dossier/${demandeId}/versions?revision=${states[1].id}`,
  );
  expect((await earlier.json()).dossier.description).not.toBe("New description");
  const current = await fetchAuthenticated(
    owner.cap,
    `${base}/dossier/${demandeId}/versions?revision=current`,
  );
  expect((await current.json()).dossier.description).toBe("New description");
  const otherDemande = await fetchAuthenticated(
    owner.cap,
    `${base}/dossier/${id}/versions?revision=${states[1].id}`,
  );
  expect(otherDemande.status).toBe(404);
  const rejectedWrite = await fetchAuthenticated(
    owner.cap,
    `${base}/dossier/${demandeId}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: states[1].id }),
    },
  );
  expect(rejectedWrite.status).toBe(405);
});

test("rejects malformed creation, restricted historical reads and unauthorised linking", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@example.test",
    nomGroupe: "Owner",
  });
  const other = await createInstructeurWithDossier(db, {
    email: "other@example.test",
    nomGroupe: "Other",
  });
  expect((await post(owner.cap, owner.dossier.id, { action: "create", label: " " })).status).toBe(
    400,
  );
  expect(
    (await post(owner.cap, owner.dossier.id, { action: "link", demandeId: other.dossier.id }))
      .status,
  ).toBe(403);
  expect(
    (await fetchAuthenticated(other.cap, `${base}/dossier/${owner.dossier.id}/versions`)).status,
  ).toBe(404);
  expect((await fetch(`${base}/dossier/${owner.dossier.id}/versions`)).status).toBe(401);
  expect(await db("dossier_demande")).toEqual([]);
});
