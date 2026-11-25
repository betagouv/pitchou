import { expect, test } from "vitest";
import { createSession } from "@pitchou/server/session.ts";
import {
  accountReadScope,
  dossierReadScope,
  referenceReadScope,
  type ApiScope,
} from "@pitchou/types/externalApi.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import {
  readExternalApi as read,
  readExternalApiJson as readJson,
} from "../helpers/externalApi.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("supports personal account and reference scopes without dossier permission", async () => {
  const email = "settings@example.test";
  const [user] = await db("auth_user").insert({ email }).returning("id");
  const session = await createSession({ userId: user.id, email, name: "Test", idToken: null }, db);
  const endpoint = INTEGRATION_BASE_URL + "/parametres/api/keys";
  const issue = (scopes: ApiScope[]) =>
    fetchAuthenticated(session, endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "Mon compte API", scopes, days: 30 }),
    });
  expect((await issue([dossierReadScope])).status).toBe(403);
  const issued = await issue([accountReadScope, referenceReadScope]);
  expect(issued.status).toBe(201);
  const { secret } = await issued.json();
  expect(await readJson(secret, "/account")).toMatchObject({ id: user.id, email, permissions: [] });
  expect(await readJson(secret, "/account/groupes")).toEqual([]);
  expect(await readJson(secret, "/account/notifications")).toEqual([]);
  expect(await readJson(secret, "/account/notification-preferences")).toMatchObject({
    arrival: expect.any(Boolean),
  });
  await db("dossier_search").insert({ personne: user.id, text: "Ancienne recherche" });
  expect(await readJson(secret, "/account/recent-searches")).toEqual([]);
  expect(await readJson(secret, "/references/bdc-statuts?iucn=VU")).toMatchObject({ rows: [] });
  expect((await read(secret, "/references/bdc-statuts?iucn=LC")).status).toBe(400);
  await db("espece_taxref").insert({
    cd_nom: "123",
    cd_ref: "123",
    lb_nom: "Hirundo rustica",
    nom_vern: "Hirondelle rustique",
    regne: "Animalia",
    classe: "Aves",
  });
  expect(
    await readJson(secret, "/references/taxref?kingdom=Animalia&sort=cd_ref&order=asc"),
  ).toMatchObject({
    rows: [
      {
        scientific_name: "Hirundo rustica",
        common_name: "Hirondelle rustique",
        kingdom: "Animalia",
        class: "Aves",
      },
    ],
  });
  expect((await read(secret, "/references/taxref?tri=cdref")).status).toBe(400);
  for (const resource of [
    "taxref-filters",
    "bdc-statuts-filters",
    "especes-protegees",
    "activites",
    "impacts-especes",
    "stats",
  ]) {
    expect(await readJson(secret, `/references/${resource}`)).toBeDefined();
  }
  const date = new Date();
  await db("evenement_metrique").insert([
    { personne: user.id, evenement: "ajouterContrôle", date },
    ...Array.from({ length: 4 }, () => ({
      personne: user.id,
      evenement: "modifierPrescription",
      date,
    })),
  ]);
  expect(await readJson(secret, "/references/aarri")).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ proxy_retained_user_count: 1, proxy_impacted_user_count: 1 }),
    ]),
  );
  expect((await read(secret, "/dossiers")).status).toBe(403);
  const write = await fetch(INTEGRATION_BASE_URL + "/api/v1/account", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: "{}",
  });
  expect(write.status).toBe(405);
  expect(write.headers.get("Allow")).toContain("GET");
});
