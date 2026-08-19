// The synchronization runs wherever the worker is deployed, not in UTC. The two
// sides of a `date` column are shaped differently — Postgres returns a JS Date at
// local midnight, Démarche Numérique sends a "YYYY-MM-DD" string — so the zone is
// what makes them comparable, and the tests pin it rather than inherit it.
process.env.TZ = "Europe/Paris";

import { expect, test } from "vitest";

import { actionsFromSyncUpdates } from "./syncActions.ts";
import { fakeDatabase } from "../fakeDatabase.ts";

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
      data: { field: "Nom du projet", from: "Ancien nom", to: "Nouveau nom" },
      author_petitionnaire: true,
    },
  ]);
  expect(changedDossiers).toEqual(new Set([1]));
});
