import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import {
  updatePorteurFromAdmin,
  type AdminPorteurUpdate,
} from "@pitchou/server/database/dossier_admin/porteur.ts";
import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierSource } from "@pitchou/types/dossierSource.ts";
import { createDossier } from "../factories/dossier.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { truncateAll } from "../setup/truncate.ts";

let fixture: Awaited<ReturnType<typeof disposableAccessDatabase>>;
beforeAll(async () => {
  fixture = await disposableAccessDatabase();
}, 60_000);
afterAll(async () => {
  if (fixture) await fixture.close();
}, 60_000);
beforeEach(async () => truncateAll(fixture.db));

const declared: AdminPorteurUpdate = {
  type: "organisation",
  name: "Commune de Tours",
  address: null,
  siren: null,
  verification_status: "source_declared",
  source: "onagre",
  source_reference: "acteur-42",
  verification_evidence: null,
};
async function administrator(): Promise<UserId> {
  const [actor] = await fixture
    .db("auth_user")
    .insert({ email: "admin@example.org" })
    .returning("id");
  return actor.id;
}
async function save(id: number, value: AdminPorteurUpdate, actor: UserId) {
  await fixture.db.transaction((trx) => updatePorteurFromAdmin(id as DossierId, value, actor, trx));
}
async function snapshot(id: number) {
  const { db } = fixture;
  const { porteur_de_projet: _porteur, ...dossier } = await db("dossier").where({ id }).first();
  return {
    dossier,
    contacts: await db("dossier_acteur").where({ dossier: id }).orderBy("id"),
    people: await db("personne_physique").orderBy("id"),
    identities: await db("identite_dossier").where({ dossier: id }).orderBy("id"),
    legacyPeople: await db("personne").orderBy("id"),
    actions: await db("action_dossier").where({ dossier: id }).orderBy("id"),
  };
}

test("Onagre organisation edits and SIRET upgrades preserve contacts and legacy identities", async () => {
  const { db } = fixture;
  const actor = await administrator();
  const [legacy] = await db("personne")
    .insert({ last_name: "Legacy", email: "legacy@example.org" })
    .returning("id");
  const dossier = await createDossier(db, {
    source: "onagre",
    demandeur_personne_physique: legacy.id,
  });
  const id = dossier.id as DossierId;
  await savePorteursDeProjet(new Map([[id, declared]]), db);
  const [contact] = await db("personne_physique")
    .insert({ last_name: "Contact", phone: "0123456789", role: "Mandataire" })
    .returning("id");
  await db("dossier_acteur").insert(
    ["personne_contact", "mandataire"].map((involvement) => ({
      dossier: id,
      involvement,
      personne_physique: contact.id,
    })),
  );
  await db("identite_dossier").insert({
    dossier: id,
    type: "representant",
    last_name: "Contact",
    email: "contact@example.org",
  });
  const before = await snapshot(id);
  const verified: AdminPorteurUpdate = {
    ...declared,
    verification_status: "verified",
    siren: "123456789",
    verification_evidence: "Registry extract",
  };
  await save(id, verified, actor);
  expect(await snapshot(id)).toEqual(before);
  await save(id, { type: "personne_morale", siret: "12345678900001" as EntrepriseSiret }, actor);
  expect(await snapshot(id)).toEqual(before);
  const porteur = await db("dossier")
    .join("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .where("dossier.id", id)
    .first("porteur_de_projet.*");
  expect(porteur).toMatchObject({ personne_morale: "12345678900001", organisation: null });
  expect(await db("organisation").first("verification_evidence", "source_reference")).toEqual({
    verification_evidence: "Registry extract",
    source_reference: "acteur-42",
  });
  const audit = await db("administration_event").orderBy("id");
  expect(audit).toHaveLength(2);
  expect(audit[0]).toMatchObject({
    actor,
    action: "dossier_porteur_saved",
    data: { dossier: id, before: declared, after: verified },
  });
  expect(audit[1].data.before).toEqual(verified);
});

test("Pitchou dossiers can use the same narrow porteur update", async () => {
  const actor = await administrator();
  const dossier = await createDossier(fixture.db, { source: "pitchou" });
  await save(dossier.id, declared, actor);
  expect(await fixture.db("organisation")).toHaveLength(1);
});

test.each(["demarche_numerique", "unknown", "gunenv", "import_fichier"])(
  "rejects source %s without changing its porteur, contacts or audit",
  async (source) => {
    const { db } = fixture;
    const actor = await administrator();
    const dossier = await createDossier(db, { source: source as DossierSource });
    const id = dossier.id as DossierId;
    await savePorteursDeProjet(new Map([[id, declared]]), db);
    const before = await db("dossier").where({ id }).first();
    await expect(save(id, { ...declared, name: "Changed" }, actor)).rejects.toThrow();
    expect(await db("dossier").where({ id }).first()).toEqual(before);
    expect(await db("organisation").first("name")).toEqual({ name: declared.name });
    expect(await db("administration_event")).toHaveLength(0);
  },
);

test("missing dossiers cannot create an organisation or audit record", async () => {
  await expect(save(999999, declared, await administrator())).rejects.toThrow("introuvable");
  expect(await fixture.db("organisation")).toHaveLength(0);
  expect(await fixture.db("administration_event")).toHaveLength(0);
});
