import { expect, test } from "vitest";
import { createSession } from "@pitchou/server/session.ts";
import { createApiKey } from "@pitchou/server/database/externalApi/keys.ts";
import {
  accountReadScope,
  dossierReadScope,
  referenceReadScope,
  type ApiScope,
} from "@pitchou/types/externalApi.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { createGroupeInstructeurs } from "../factories/dossier.ts";
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
  const { secret, key } = await issued.json();
  expect(await readJson(secret, "/account")).toMatchObject({
    id: user.id,
    email,
    permissions: [],
    can_read_dossiers: false,
    max_upload_size_bytes: process.env.MAX_UPLOAD_SIZE === "Infinity" ? null : expect.any(Number),
  });
  expect(await readJson(secret, "/account/api-keys")).toEqual([
    { ...key, lastUsedAt: expect.any(String) },
  ]);
  const login = await fetchAuthenticated(
    session,
    INTEGRATION_BASE_URL + "/auth/login/__data.json?redirectTo=%2Fparametres%2Fapi",
  );
  expect(await login.json()).toMatchObject({ type: "redirect", location: "/parametres/api" });
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
  const {
    rows: [{ week }],
  } = await db.raw("select to_char(date_trunc('week', ?::timestamptz), 'YYYY-MM-DD') as week", [
    date,
  ]);
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
      expect.objectContaining({
        date: week,
        proxy_retained_user_count: 1,
        proxy_impacted_user_count: 1,
      }),
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

test("personal keys see the same group candidates as the signed-in member", async () => {
  const email = "group-member@example.test";
  const [member] = await db("auth_user").insert({ email }).returning("id");
  await db("auth_user").insert({ email: "candidate@example.test", first_names: "Céline" });
  await db("auth_user").insert({
    email: "inactive@example.test",
    first_names: "Céline",
    active: false,
  });
  const group = await createGroupeInstructeurs(db);
  const foreignGroup = await createGroupeInstructeurs(db, { name: "Autre groupe" });
  const membership = { user_id: member.id, groupe_instructeurs: group.id };
  await db("user_groupe").insert(membership);
  const session = await createSession(
    { userId: member.id, email, name: "Test", idToken: null },
    db,
  );
  const { secret } = await createApiKey(
    { user_id: member.id },
    { label: "Compte", scopes: [accountReadScope], days: 30 },
    db,
  );
  const query = "?q=celine";
  const route = `/account/groupes/${group.id}/member-candidates`;
  const uiResponse = await fetchAuthenticated(
    session,
    `${INTEGRATION_BASE_URL}/parametres/groupes/${group.id}/membres${query}`,
  );
  expect(uiResponse.status).toBe(200);
  const candidates = await readJson(secret, route + query);
  expect(candidates).toEqual(await uiResponse.json());
  expect(candidates).toEqual([expect.objectContaining({ email: "candidate@example.test" })]);
  expect((await read(secret, `/account/groupes/${foreignGroup.id}/member-candidates`)).status).toBe(
    403,
  );
  await db("user_groupe").where(membership).delete();
  expect((await read(secret, route)).status).toBe(403);
});

test("reference reads include published releases, synchronization time, and unclassified species", async () => {
  const [account] = await db("auth_user").insert({ email: "reader@example.test" }).returning("id");
  const { secret } = await createApiKey(
    { user_id: account.id },
    { label: "Référentiels", scopes: [referenceReadScope], days: 30 },
    db,
  );
  const date = "2026-11-25";
  await db("changelog").insert([
    {
      version_major: 1,
      version_minor: 0,
      version_patch: 1,
      date,
      titre: "Public",
      contenu: "<p>Publié</p>",
      published: true,
      updated_by: "test",
    },
    { titre: "Brouillon", contenu: "<p>Brouillon</p>", published: false, updated_by: "test" },
  ]);
  expect(await readJson(secret, "/references/changelog")).toEqual([
    { version: "1.0.1", date, title: "Public", content: "<p>Publié</p>" },
  ]);
  const timestamp = "2026-11-25T10:00:00.000Z";
  await db("demarche_numerique_88444_synchronization_result").insert([
    { timestamp, success: true },
    { timestamp, success: false, error: "Internal error" },
  ]);
  expect(await readJson(secret, "/references/synchronization-status")).toEqual({
    last_success_at: timestamp,
  });
  await db("espece_protegee_modification").insert({ cd_ref: "123", espece_cnpn: true });
  expect(await readJson(secret, "/references/especes-protegees")).toEqual([
    expect.objectContaining({ cd_ref: "123", classification: null, espece_cnpn: true }),
  ]);
});
