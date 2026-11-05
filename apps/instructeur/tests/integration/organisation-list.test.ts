import { afterAll, beforeAll, expect, test } from "vitest";
import { disposableAccessDatabase } from "../helpers/disposableAccessDatabase.ts";
import { seedList } from "./dossier-list-query/fixture.ts";
import { savePorteursDeProjet } from "@pitchou/server/database/porteur_de_projet.ts";
import { getDossiersListPage } from "@pitchou/server/database/dossier/list.ts";
import { getDossiersForExport } from "@pitchou/server/database/dossier/export.ts";
import { updateDossierAdminRelations } from "@pitchou/server/database/dossier_admin_relations.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";

let fixture: Awaited<ReturnType<typeof disposableAccessDatabase>>;
let data: Awaited<ReturnType<typeof seedList>>;
beforeAll(async () => {
  fixture = await disposableAccessDatabase();
  data = await seedList(fixture.db);
}, 60_000);
afterAll(async () => {
  if (fixture) await fixture.close();
});

test("source-declared names and verified SIRENs are searchable and exported with provenance", async () => {
  const declared = {
    type: "organisation" as const,
    name: "Organisation marécageuse",
    address: null,
    siren: null,
    verification_status: "source_declared" as const,
    source: "Onagre",
    source_reference: "Projet synthétique",
    verification_evidence: null,
  };
  const verified = {
    ...declared,
    name: "Organisation vérifiée",
    verification_status: "verified" as const,
    siren: "123456789",
    verification_evidence: "Document officiel synthétique",
  };
  await savePorteursDeProjet(
    new Map<DossierId, PorteurDeProjetInitializer>([
      [data.dossiers[4].id as DossierId, declared],
      [data.dossiers[5].id as DossierId, verified],
    ]),
    fixture.db,
  );
  const named = await getDossiersListPage(
    data.user,
    new URLSearchParams({ q: "marecageuse" }),
    "all",
    fixture.db,
  );
  expect(named.total).toBe(1);
  expect(named.items[0].porteur_de_projet).toEqual(declared);
  const identified = await getDossiersListPage(
    data.user,
    new URLSearchParams({ q: "123456789" }),
    "all",
    fixture.db,
  );
  expect(identified.total).toBe(1);
  expect(identified.items[0].porteur_de_projet).toEqual(verified);
  const exported = await getDossiersForExport(
    data.user,
    "france",
    [data.dossiers[4].id as DossierId, data.dossiers[5].id as DossierId],
    fixture.db,
  );
  expect(exported?.map((d) => d.organisation)).toEqual([declared, verified]);
  expect(exported?.every((d) => d.demandeur_personne_morale_siret === null)).toBe(true);
});

test("admin relation updates support organisation without setting legacy company/person fields", async () => {
  const organisation = {
    name: "Organisation admin",
    address: null,
    siren: null,
    verification_status: "source_declared" as const,
    source: "Pitchou",
    source_reference: "Saisie administrative",
    verification_evidence: null,
  };
  const id = data.dossiers[6].id as DossierId;
  await fixture.db.transaction((trx) =>
    updateDossierAdminRelations(
      id,
      {
        demandeur_type: "organisation",
        demandeur_organisation: organisation,
        demandeur_personne_morale: null,
        demandeur_personne_physique: null,
        identites: [],
      },
      trx,
    ),
  );
  const row = await fixture.db("dossier").where({ id }).first();
  expect(row.demandeur_personne_morale).toBeNull();
  expect(row.demandeur_personne_physique).toBeNull();
  const page = await getDossiersListPage(
    data.user,
    new URLSearchParams({ q: "Organisation admin" }),
    "all",
    fixture.db,
  );
  expect(page.items[0].porteur_de_projet).toEqual({ type: "organisation", ...organisation });
});
