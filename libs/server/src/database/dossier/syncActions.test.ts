// The synchronization runs wherever the worker is deployed, not in UTC. The two
// sides of a `date` column are shaped differently — Postgres returns a JS Date at
// local midnight, Démarche Numérique sends a "YYYY-MM-DD" string — so the zone is
// what makes them comparable, and the tests pin it rather than inherit it.
process.env.TZ = "Europe/Paris";

import { expect, test } from "vitest";

import { actionsFromSyncUpdates } from "./syncActions.ts";
import { fakeDatabase } from "../fakeDatabase.ts";
import { makeDossierLocationColumns88444 } from "../../../../worker/synchronization-ds/makeCommonDossierColumnsForSync88444/locationColumns.ts";

import type { Knex } from "knex";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";

function fakeDb(rows: Partial<Dossier>[]): Knex {
  return fakeDatabase().selectResolves(rows).build().knex;
}

function updateFor(dossier: Partial<Dossier>): DossierForUpdate {
  return { dossier: { demarche_numerique_number: "456", ...dossier } } as DossierForUpdate;
}

test("an unchanged date champ is not reported as modified", async () => {
  // What Postgres returns for a `date` column holding 2026-06-01, read in Paris:
  // local midnight, which is 22:00 UTC the day before.
  const storedInterventionStart = new Date("2026-05-31T22:00:00Z");

  const { actions, changedDossiers } = await actionsFromSyncUpdates(
    // Démarche Numérique sends the same day as an ISO8601Date string
    [updateFor({ intervention_start_date: "2026-06-01" as unknown as Date })],
    fakeDb([
      {
        id: 1 as Dossier["id"],
        demarche_numerique_number: "456",
        intervention_start_date: storedInterventionStart,
      },
    ]),
  );

  expect(actions).toEqual([]);
  expect(changedDossiers.size).toBe(0);
});

test("a date champ the pétitionnaire really changed is reported", async () => {
  const { actions } = await actionsFromSyncUpdates(
    [updateFor({ intervention_start_date: "2026-06-02" as unknown as Date })],
    fakeDb([
      {
        id: 1 as Dossier["id"],
        demarche_numerique_number: "456",
        intervention_start_date: new Date("2026-05-31T22:00:00Z"),
      },
    ]),
  );

  expect(actions).toEqual([
    {
      dossier: 1,
      type: "champ_modifie",
      data: {
        field: "Date de début d'intervention ou des travaux",
        column: "intervention_start_date",
        notification: true,
        from: "2026-06-01",
        to: "2026-06-02",
      },
      author_petitionnaire: true,
    },
  ]);
});

test("a text champ the pétitionnaire changed is reported under its label", async () => {
  const { actions, changedDossiers } = await actionsFromSyncUpdates(
    [updateFor({ name: "Nouveau nom" })],
    fakeDb([{ id: 1 as Dossier["id"], demarche_numerique_number: "456", name: "Ancien nom" }]),
  );

  expect(actions).toEqual([
    {
      dossier: 1,
      type: "champ_modifie",
      data: {
        field: "Nom du projet",
        column: "name",
        notification: true,
        from: "Ancien nom",
        to: "Nouveau nom",
      },
      author_petitionnaire: true,
    },
  ]);
  expect(changedDossiers).toEqual(new Set([1]));
});

test.each([
  [null, "Ajout ultérieur"],
  ["Texte", null],
])("later additions and cleared values are revisions: %s -> %s", async (before, after) => {
  const { actions } = await actionsFromSyncUpdates(
    [updateFor({ description: after })],
    fakeDb([{ id: 1 as Dossier["id"], demarche_numerique_number: "456", description: before }]),
  );
  expect(actions).toHaveLength(1);
  expect(actions[0].data).toMatchObject({
    field: "Description",
    notification: true,
    from: before,
    to: after,
  });
});

test("first submission and omitted update values are not modifications", async () => {
  expect(
    (await actionsFromSyncUpdates([updateFor({ description: "Initial" })], fakeDb([]))).actions,
  ).toEqual([]);
  const { actions } = await actionsFromSyncUpdates(
    [updateFor({ description: undefined })],
    fakeDb([
      { id: 1 as Dossier["id"], demarche_numerique_number: "456", description: "Unchanged" },
    ]),
  );
  expect(actions).toEqual([]);
});

test("the worker's serialized map matches the stored PostgreSQL object", async () => {
  const columns = makeDossierLocationColumns88444(
    [
      { geoAreas: [{ geometry: { type: "Point", coordinates: [2, 48] }, source: "selection" }] },
    ] as Parameters<typeof makeDossierLocationColumns88444>[0],
    new Map(),
    new Map(),
  );
  const stored = {
    id: 1 as Dossier["id"],
    demarche_numerique_number: "456",
    projet_map: JSON.parse(columns.projet_map!),
  };
  const result = await actionsFromSyncUpdates([updateFor(columns)], fakeDb([stored]));
  expect(result.actions).toEqual([]);
  expect(result.changedDossiers.size).toBe(0);
  const changed = await actionsFromSyncUpdates(
    [updateFor({ projet_map: columns.projet_map!.replace("[2,48]", "[3,48]") })],
    fakeDb([stored]),
  );
  expect(changed.actions).toHaveLength(1);
  expect(changed.actions[0].data).toMatchObject({ column: "projet_map", notification: true });
});

test.each(["communes", "departments", "regions"] as const)(
  "serialized %s are compared as JSON",
  async (column) => {
    const value = column === "communes" ? [{ name: "Paris", code: "75056" }] : ["75"];
    const result = await actionsFromSyncUpdates(
      [updateFor({ [column]: JSON.stringify(value) })],
      fakeDb([{ id: 1 as Dossier["id"], demarche_numerique_number: "456", [column]: value }]),
    );
    expect(result.actions).toEqual([]);
  },
);

test("JSON-looking text remains literal text", async () => {
  const result = await actionsFromSyncUpdates(
    [updateFor({ description: '{"b":2,"a":1}' })],
    fakeDb([
      { id: 1 as Dossier["id"], demarche_numerique_number: "456", description: '{"a":1,"b":2}' },
    ]),
  );
  expect(result.actions).toHaveLength(1);
});

test("JSONB object key ordering does not reopen a reviewed map", async () => {
  const { actions } = await actionsFromSyncUpdates(
    [
      updateFor({
        projet_map: {
          type: "FeatureCollection",
          features: [{ properties: { a: 1, b: 2 }, geometry: null }],
        },
      }),
    ],
    fakeDb([
      {
        id: 1 as Dossier["id"],
        demarche_numerique_number: "456",
        projet_map: {
          features: [{ geometry: null, properties: { b: 2, a: 1 } }],
          type: "FeatureCollection",
        },
      },
    ]),
  );
  expect(actions).toEqual([]);
});
