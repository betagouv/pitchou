import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { physique } from "../factories/porteurDeProjet.ts";

import { getDossierFull, getDossiersSummariesByCap } from "@pitchou/server/database/dossier.ts";
import { savePorteursDeProjetAndActeurs } from "@pitchou/server/database/dossier_acteur.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { CapDossierCap } from "@pitchou/types/database/public/CapDossier.ts";

function personne(last_name: string, phone: string | null = null) {
  return { first_names: "Jean", last_name, email: null, address: null, phone, role: null };
}

test("the dossiers read by the instructeurs carry their acteurs, one per personne", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const cap = instructeur.cap as CapDossierCap;
  const dossierId = instructeur.dossier.id as DossierId;
  await savePorteursDeProjetAndActeurs(
    new Map([[dossierId, physique("Martin")]]),
    new Map([
      [
        dossierId,
        [
          { involvements: ["beneficiaire_demarche_numerique"], porteur: true },
          { involvements: ["mandataire", "deposant"], personne: personne("Dupont") },
          { involvements: ["personne_contact"], personne: personne("Leroy", "0612345678") },
        ],
      ],
    ]),
    db,
  );

  const full = await getDossierFull(dossierId, cap, db);
  expect(full?.acteurs).toEqual([
    {
      involvements: ["beneficiaire_demarche_numerique"],
      first_names: "Camille",
      last_name: "Martin",
      email: "camille@test.fr",
      address: null,
      phone: null,
      role: null,
    },
    { involvements: ["mandataire", "deposant"], ...personne("Dupont") },
    { involvements: ["personne_contact"], ...personne("Leroy", "0612345678") },
  ]);

  const summary = (await getDossiersSummariesByCap(cap, db)).find(({ id }) => id === dossierId);
  expect(summary?.acteurs).toEqual([
    { involvements: ["mandataire", "deposant"], ...personne("Dupont") },
  ]);
});

test("a dossier without acteurs reads an empty list", async () => {
  const instructeur = await createInstructeurWithDossier(db);
  const cap = instructeur.cap as CapDossierCap;

  expect((await getDossierFull(instructeur.dossier.id as DossierId, cap, db))?.acteurs).toEqual([]);
  expect((await getDossiersSummariesByCap(cap, db))[0].acteurs).toEqual([]);
});
