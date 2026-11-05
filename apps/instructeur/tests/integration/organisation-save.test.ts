import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import { getDossierFull, getDossiersSummariesForUser } from "@pitchou/server/database/dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type {
  PorteurDeProjetInitializer,
  PorteurDeProjetOrganisation,
} from "@pitchou/types/porteurDeProjet.ts";
import { createDossier } from "../factories/dossier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { SIRET, count, morale, physique } from "../factories/porteurDeProjet.ts";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { truncateAll } from "../setup/truncate.ts";

let fixture: Awaited<ReturnType<typeof disposableAccessDatabase>>;
beforeAll(async () => {
  fixture = await disposableAccessDatabase();
}, 60_000);
afterAll(async () => {
  if (fixture) await fixture.close();
});
beforeEach(async () => truncateAll(fixture.db));

const declared: PorteurDeProjetOrganisation = {
  type: "organisation",
  name: "Commune de Tours",
  address: "1 rue de la Mairie",
  siren: null,
  verification_status: "source_declared",
  source: "onagre",
  source_reference: "acteur-42",
  verification_evidence: null,
};
const verified: PorteurDeProjetOrganisation = {
  ...declared,
  verification_status: "verified",
  siren: "123456789",
  verification_evidence: "Registry extract 2026-11-04",
};
async function save(entries: [number, PorteurDeProjetInitializer][]) {
  await savePorteursDeProjet(
    new Map(entries as [DossierId, PorteurDeProjetInitializer][]),
    fixture.db,
  );
}
async function link(dossier: number) {
  return fixture
    .db("dossier")
    .join("porteur_de_projet", "porteur_de_projet.id", "dossier.porteur_de_projet")
    .where("dossier.id", dossier)
    .first("porteur_de_projet.*");
}

test("organisation provenance roundtrips through full and summary reads and updates in place", async () => {
  const { db } = fixture;
  const instructeur = await createInstructeurWithDossier(db);
  const id = instructeur.dossier.id as DossierId;
  const user = instructeur.id as UserId;
  await save([[id, declared]]);
  const before = await link(id);
  expect((await getDossierFull(id, user, db))?.porteur_de_projet).toEqual(declared);
  expect((await getDossiersSummariesForUser(user, db))[0].porteur_de_projet).toEqual(declared);
  await save([[id, verified]]);
  expect(await link(id)).toEqual(before);
  expect((await getDossierFull(id, user, db))?.porteur_de_projet).toEqual(verified);
  expect(await count(db, "organisation")).toBe(1);
});

test("identical names, source references and verified SIRENs never merge organisations", async () => {
  const { db } = fixture;
  const a = await createDossier(db);
  const b = await createDossier(db);
  await save([
    [a.id, verified],
    [b.id, verified],
  ]);
  const first = await link(a.id);
  const second = await link(b.id);
  expect(first.id).not.toBe(second.id);
  expect(first.organisation).not.toBe(second.organisation);
  await save([[a.id, { ...declared, name: "Commune renommée" }]]);
  expect(
    await db("organisation").where({ id: second.organisation }).first("name", "siren"),
  ).toEqual({ name: verified.name, siren: verified.siren });
});

test("organisation transitions retain identity rows and delete only orphan porteur links", async () => {
  const { db } = fixture;
  const a = await createDossier(db);
  const b = await createDossier(db);
  await save([
    [a.id, declared],
    [b.id, morale(SIRET)],
  ]);
  const old = await link(a.id);
  await save([[a.id, morale(SIRET)]]);
  expect(await link(a.id)).toEqual(await link(b.id));
  expect(await db("porteur_de_projet").where({ id: old.id })).toEqual([]);
  expect(await count(db, "organisation")).toBe(1);
  await save([[a.id, declared]]);
  await save([[a.id, physique("Martin")]]);
  expect((await link(a.id)).personne_physique).not.toBeNull();
  await save([[a.id, declared]]);
  const last = await link(a.id);
  await save([[a.id, undefined]]);
  expect(await db("porteur_de_projet").where({ id: last.id })).toEqual([]);
  expect(await count(db, "organisation")).toBe(3);
  expect((await link(b.id)).personne_morale).toBe(SIRET);
});

test("updating a manually shared organisation copies it to preserve the other dossier", async () => {
  const { db } = fixture;
  const a = await createDossier(db);
  const b = await createDossier(db);
  await save([[a.id, declared]]);
  const old = await link(a.id);
  await db("dossier").where({ id: b.id }).update({ porteur_de_projet: old.id });
  await save([[a.id, verified]]);
  expect((await link(a.id)).organisation).not.toBe(old.organisation);
  expect(await link(b.id)).toEqual(old);
  expect(
    await db("organisation").where({ id: old.organisation }).first("verification_status"),
  ).toEqual({ verification_status: "source_declared" });
});

test("invalid organisation writes roll back the batch and cannot persist extra fields", async () => {
  const { db } = fixture;
  const a = await createDossier(db);
  const b = await createDossier(db);
  await expect(
    save([
      [a.id, declared],
      [b.id, { ...declared, siren: "123456789" }],
    ]),
  ).rejects.toThrow("Invalid organisation");
  expect(await count(db, "organisation")).toBe(0);
  expect(await count(db, "porteur_de_projet")).toBe(0);
  await save([[a.id, { ...declared, id: 987654 } as PorteurDeProjetOrganisation]]);
  expect((await link(a.id)).organisation).not.toBe(987654);
});
