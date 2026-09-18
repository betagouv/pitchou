import { beforeEach, afterEach, expect, test } from "vitest";
import knex, { type Knex } from "knex";
import { prepareDossiersForPersistence } from "./prepareDossiersForPersistence.ts";
import type {
  DossierEntreprisesPersonneInitializersForUpdate,
  DossierEntreprisesPersonneInitializersForInsert,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { EntrepriseInitializer } from "@pitchou/types/database/public/Entreprise.ts";

const siret = "12345678900001" as EntrepriseInitializer["siret"];
const company = { siret, legal_name: "Entreprise initiale", address: "1 rue du Parc" };
let db: Knex;
let current: object[];
let stored: object[];
let queries: { sql: string; values: unknown[] }[];
beforeEach(() => {
  current = [
    { ...company, dossier: 1, demarche_numerique_number: "101", source: "demarche_numerique" },
  ];
  stored = [company];
  queries = [];
  db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(
      config: { text: string; values?: unknown[] },
      callback: (error: null, result: object) => void,
    ) {
      const { text: sql, values = [] } = config;
      queries.push({ sql, values });
      let rows: object[] = [];
      if (sql.startsWith("select") && sql.includes('from "dossier" as "d"')) rows = current;
      if (sql.startsWith("select") && sql.includes('from "entreprise"')) rows = stored;
      callback(null, { rows, rowCount: rows.length, command: sql.split(" ")[0].toUpperCase() });
    },
  });
  db.client.releaseConnection = async () => {};
});
afterEach(async () => {
  await db.destroy();
});

const update = (company: EntrepriseInitializer | undefined) =>
  ({
    dossier: { demarche_numerique_number: "101", demandeur_personne_morale: company },
  }) as DossierEntreprisesPersonneInitializersForUpdate;
const changes = () =>
  queries
    .filter(({ sql }) => sql.startsWith('insert into "action_dossier"'))
    .flatMap(({ values }) =>
      values.filter((value): value is string => typeof value === "string" && value.startsWith("{")),
    )
    .map((json) => JSON.parse(json));

test("company properties are diffed individually and sparse writes retain untouched columns", async () => {
  const result = await prepareDossiersForPersistence(
    [],
    [update({ siret, legal_name: "Entreprise corrigée" })],
    db as Knex.Transaction,
  );
  expect(changes()).toEqual([
    {
      field: "Entreprise : Dénomination",
      label: "Entreprise : Dénomination",
      notification_field: "entreprise.legal_name",
      from: company.legal_name,
      to: "Entreprise corrigée",
      notification: true,
    },
  ]);
  expect(result.dossiersChangedByEntreprises).toEqual(new Set([1]));
});

test("an explicitly cleared company property is recorded with its old value", async () => {
  await prepareDossiersForPersistence(
    [],
    [update({ siret, address: undefined })],
    db as Knex.Transaction,
  );
  expect(changes()).toMatchObject([
    { notification_field: "entreprise.address", from: company.address, to: null },
  ]);
  expect(changes()).toHaveLength(1);
});

test("switching company compares properties against the actual target company", async () => {
  const next = {
    siret: "12345678900002" as EntrepriseInitializer["siret"],
    legal_name: "Autre entreprise",
    address: "2 rue du Parc",
  };
  stored.push(next);
  await prepareDossiersForPersistence([], [update({ siret: next.siret })], db as Knex.Transaction);
  expect(
    changes()
      .map(({ notification_field }) => notification_field)
      .sort(),
  ).toEqual(["entreprise.address", "entreprise.legal_name", "entreprise.siret"]);
  expect(
    changes().find(({ notification_field }) => notification_field === "entreprise.address"),
  ).toMatchObject({ from: company.address, to: next.address });
});

test("company removal is per-property, and initial submission is not a revision", async () => {
  await prepareDossiersForPersistence([], [update(undefined)], db as Knex.Transaction);
  expect(changes()).toHaveLength(3);
  expect(changes().every(({ to }) => to === null)).toBe(true);
  queries = [];
  const result = await prepareDossiersForPersistence(
    [update(company) as DossierEntreprisesPersonneInitializersForInsert],
    [],
    db as Knex.Transaction,
  );
  expect(changes()).toEqual([]);
  expect(result.dossiersChangedByEntreprises.size).toBe(0);
});

test("later company addition to an empty dossier notifies, an unchanged company does not", async () => {
  current = [
    { dossier: 1, demarche_numerique_number: "101", siret: null, source: "demarche_numerique" },
  ];
  await prepareDossiersForPersistence([], [update(company)], db as Knex.Transaction);
  expect(changes()).toHaveLength(3);
  expect(changes().every(({ from }) => from === null)).toBe(true);
  current = [
    { ...company, dossier: 1, demarche_numerique_number: "101", source: "demarche_numerique" },
  ];
  queries = [];
  await prepareDossiersForPersistence([], [update(company)], db as Knex.Transaction);
  expect(changes()).toEqual([]);
});

test.each([false, true])(
  "shared company changes reach dossiers outside the batch, insert-only=%s",
  async (insertOnly) => {
    const outside = { ...company, dossier: 2, demarche_numerique_number: null, source: "pitchou" };
    current = insertOnly ? [outside] : [...current, outside];
    const incoming = update({ siret, legal_name: "Nom partagé corrigé" });
    const result = await prepareDossiersForPersistence(
      insertOnly ? [incoming as DossierEntreprisesPersonneInitializersForInsert] : [],
      insertOnly ? [] : [incoming],
      db as Knex.Transaction,
    );
    expect(result.dossiersChangedByEntreprises).toEqual(new Set(insertOnly ? [2] : [1, 2]));
    expect(changes()).toHaveLength(insertOnly ? 1 : 2);
    expect(
      changes().every(
        ({ notification_field, from, to }) =>
          notification_field === "entreprise.legal_name" &&
          from === company.legal_name &&
          to === "Nom partagé corrigé",
      ),
    ).toBe(true);
    const select = queries.find(({ sql }) => sql.includes('from "dossier" as "d"'))!;
    expect(select.sql).toContain('or "d"."demandeur_personne_morale" in');
    expect(select.values).toContain(siret);
    expect(
      queries.findIndex(({ sql }) => sql.startsWith('insert into "action_dossier"')),
    ).toBeLessThan(queries.findIndex(({ sql }) => sql.startsWith('insert into "entreprise"')));
  },
);
