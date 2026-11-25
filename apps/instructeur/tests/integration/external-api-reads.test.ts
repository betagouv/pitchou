import { expect, test } from "vitest";
import { createApiKey } from "@pitchou/server/database/externalApi/keys.ts";
import { storeNewFichier } from "@pitchou/server/database/fichier.ts";
import {
  dossierInternalScope,
  dossierReadScope,
  referenceReadScope,
  type ApiScope,
} from "@pitchou/types/externalApi.ts";
import {
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
} from "../factories/dossier.ts";
import {
  readExternalApi as read,
  readExternalApiJson as readJson,
} from "../helpers/externalApi.ts";
import { db } from "../setup/db.ts";

function key(scopes: ApiScope[]) {
  return { label: "Lecture API", scopes, days: 30 } as const;
}

test("paginates and filters dossiers within a personal key's current access", async () => {
  const [user] = await db("auth_user").insert({ email: "reader@example.test" }).returning("id");
  await db("auth_permission").insert({ user_id: user.id, permission: "dossier:read" });
  const first = await createDossier(db, { name: "Parc de test", primary_department: "75" });
  const hidden = await createDossier(db, { name: "Parc hors accès", primary_department: "75" });
  const second = await createDossier(db, { name: "Parc suivi", primary_department: "75" });
  await db("dossier_user_access").insert(
    [first, second].map(({ id }) => ({
      dossier: id,
      user_id: user.id,
      access_level: "read",
    })),
  );
  await db("edge_personne_follows_dossier").insert({ personne: user.id, dossier: second.id });
  await db("evenement_phase_dossier").insert({
    dossier: second.id,
    phase: "Instruction",
    timestamp: new Date(),
  });
  const { secret } = await createApiKey({ user_id: user.id }, key([dossierReadScope]), db);
  const firstPage = await readJson(secret, "/dossiers?limit=1&department=75&q=parc");
  expect(firstPage.dossiers).toEqual([expect.objectContaining({ id: first.id, followed: false })]);
  expect(firstPage.next_cursor).toBe(first.id);
  const secondPage = await readJson(secret, `/dossiers?limit=1&after=${firstPage.next_cursor}`);
  expect(secondPage.dossiers).toEqual([expect.objectContaining({ id: second.id, followed: true })]);
  expect(secondPage.next_cursor).toBeNull();
  const filtered = await readJson(secret, "/dossiers?followed=true&status=instruction");
  expect(filtered.dossiers.map(({ id }: { id: number }) => id)).toEqual([second.id]);
  expect((await readJson(secret, "/dossiers?followed=false")).dossiers).toHaveLength(1);
  expect((await readJson(secret, "/dossiers?q=%25")).dossiers).toEqual([]);
  expect((await read(secret, "/dossiers?limit=101")).status).toBe(400);
  expect((await read(secret, "/dossiers?limite=10")).status).toBe(400);
  expect((await read(secret, `/dossiers/${hidden.id}`)).status).toBe(404);
  expect((await read(secret, `/dossiers/${first.id}/statut`)).status).toBe(404);
  await db("dossier_user_access").where({ user_id: user.id, dossier: first.id }).del();
  expect((await read(secret, `/dossiers/${first.id}`)).status).toBe(404);
});

test("uses the same dossier and file restrictions for related reads and downloads", async () => {
  const [user] = await db("auth_user").insert({ email: "member@example.test" }).returning("id");
  const groupe = await createGroupeInstructeurs(db);
  await db("auth_permission").insert({ user_id: user.id, permission: "dossier:read" });
  await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: groupe.id });
  const outside = await createDossier(db, {
    free_comment: "Legacy private note",
    description: "Le projet",
  });
  const inside = await createDossier(db);
  await db("dossier_user_access").insert({
    dossier: inside.id,
    user_id: user.id,
    access_level: "read",
  });
  await db("commentaire").insert({ dossier: outside.id, personne: user.id, content: "Interne" });
  const file = await storeNewFichier(
    { name: "Document.txt", media_type: "text/plain", content: Buffer.from("contenu") },
    db,
  );
  await db("other_attachment").insert({ dossier: outside.id, fichier: file.id, type: "Autre" });
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: inside.id,
    fichier: file.id,
  });
  await db("avis_expert").insert([
    { dossier: outside.id, expert: "CNPN", saisine_fichier: file.id, avis: "Favorable" },
    { dossier: outside.id, expert: "Autre" },
  ]);
  const { secret } = await createApiKey({ user_id: user.id }, key([dossierReadScope]), db);
  const path = `/dossiers/${outside.id}`;
  const dossier = await readJson(secret, path);
  expect(dossier).toMatchObject({ access: "restricted", description: "Le projet" });
  expect(dossier).not.toHaveProperty("free_comment");
  for (const resource of ["comments", "history", "prescriptions", "controles", "cnpn-emails"]) {
    expect((await read(secret, `${path}/${resource}`)).status, resource).toBe(404);
  }
  const avis = await readJson(secret, `${path}/avis-experts`);
  expect(avis).toEqual([expect.objectContaining({ expert: "CNPN", avis: "Favorable" })]);
  expect(avis[0]).not.toHaveProperty("saisine_file_url");
  expect(await readJson(secret, `${path}/pieces-jointes`)).toEqual([]);
  const download = `${path}/pieces-jointes/${file.id}`;
  expect((await read(secret, download)).status).toBe(404);
  const files = await readJson(secret, `/dossiers/${inside.id}/pieces-jointes`);
  expect(files).toEqual([
    expect.objectContaining({ id: file.id, relation: "piece-jointe-petitionnaire" }),
  ]);
  const response = await read(secret, files[0].url);
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("contenu");
  expect((await read(secret, files[0].url, "HEAD")).headers.get("content-length")).toBe("7");
});

test("a service needs a matching internal grant and cannot use personal account routes", async () => {
  const granted = await createDossier(db);
  const hidden = await createDossier(db);
  const groupe = await createGroupeInstructeurs(db);
  await attachDossierToGroupe(db, granted.id, groupe.id);
  const client_id = "service-read";
  await db("external_api_client").insert({ client_id, enabled: true });
  await db("external_api_groupe_grant").insert({
    client_id,
    groupe_instructeurs: groupe.id,
    scope: dossierReadScope,
  });
  await db("external_api_dossier_grant").insert({
    client_id,
    dossier: hidden.id,
    scope: dossierInternalScope,
  });
  const { secret } = await createApiKey(
    { client_id },
    key([dossierReadScope, dossierInternalScope, referenceReadScope]),
    db,
  );
  expect(
    (await readJson(secret, "/dossiers")).dossiers.map(({ id }: { id: number }) => id),
  ).toEqual([granted.id]);
  expect((await read(secret, `/dossiers/${granted.id}/comments`)).status).toBe(404);
  expect((await read(secret, `/dossiers/${hidden.id}/comments`)).status).toBe(404);
  await db("external_api_dossier_grant").insert({
    client_id,
    dossier: granted.id,
    scope: dossierInternalScope,
  });
  for (const resource of [
    "decisions",
    "especes-impactees",
    "phase-events",
    "followers",
    "prescriptions",
    "controles",
    "comments",
    "history",
    "cnpn-emails",
  ]) {
    expect(await readJson(secret, `/dossiers/${granted.id}/${resource}`)).toEqual([]);
  }
  expect((await read(secret, `/dossiers/${granted.id}/statut`)).status).toBe(404);
  expect((await read(secret, "/account")).status).toBe(403);
  expect(await readJson(secret, "/references/taxref?page=1")).toMatchObject({
    page: 1,
    rows: [],
  });
});
