import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { dumpEntreprises } from "@pitchou/server/database/helpers.ts";
import { createPersonnes } from "@pitchou/server/database/personne.ts";
import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import type { DossierForInsert } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

// More than one batch: generated ids must still match the input order.
test("bulk dossier creation preserves the association of comments and phase events", async () => {
  const dossiers: DossierForInsert[] = Array.from({ length: 1100 }, (_, index) => ({
    dossier: {
      source: "demarche_numerique",
      demarche_numerique_number: String(700000 + index),
      name: `Dossier ${index}`,
      free_comment: `Comment ${index}`,
    },
    evenement_phase_dossier: [
      {
        phase: "Instruction",
        timestamp: new Date("2025-01-01"),
        demarche_numerique_motivation: `Event ${index}`,
      },
    ],
    avis_expert: [],
    decision_administrative: [],
  }));
  await dumpDossiers(dossiers, [], db);
  const rows = await db("dossier as d")
    .join("commentaire as c", "c.dossier", "d.id")
    .join("evenement_phase_dossier as e", "e.dossier", "d.id")
    .select("d.demarche_numerique_number", "c.content", "e.demarche_numerique_motivation");
  expect(rows).toHaveLength(1100);
  for (const row of rows) {
    const index = Number(row.demarche_numerique_number) - 700000;
    expect(row.content).toBe(`Comment ${index}`);
    expect(row.demarche_numerique_motivation).toBe(`Event ${index}`);
  }
});

test("bulk personne creation returns ids in input order across batches", async () => {
  const input = Array.from({ length: 1100 }, (_, i) => ({
    email: `Person${i}@example.test`,
    last_name: `Person ${i}`,
  }));
  const saved = await createPersonnes(input, db);
  const people = new Map((await db("personne").select("id", "email")).map((p) => [p.id, p.email]));
  expect(saved).toHaveLength(input.length);
  expect(saved.map(({ id }) => people.get(id))).toEqual(input.map((p) => p.email.toLowerCase()));
});

test("splitting company upserts preserves the original union of columns", async () => {
  const companies = Array.from({ length: 1100 }, (_, i) => ({
    siret: String(10000000000000 + i),
    legal_name: `Company ${i}`,
    address: "Old address",
    naf_label: "Retained",
  }));
  await db.batchInsert("entreprise", companies, 500);
  // An address only present in the last batch must still clear it in earlier batches.
  const incoming = companies.map(({ siret }, i) => ({
    siret,
    ...(i === 1099 ? { address: "New address" } : {}),
  })) as Entreprise[];
  await dumpEntreprises(incoming, db);
  const rows = await db("entreprise").orderBy("siret");
  expect(rows.slice(0, -1).every((row) => row.address === null)).toBe(true);
  expect(rows.at(-1).address).toBe("New address");
  expect(rows.every((row) => row.naf_label === "Retained")).toBe(true);
});
