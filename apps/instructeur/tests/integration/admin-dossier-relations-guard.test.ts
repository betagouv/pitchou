import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier, createGroupeInstructeurs } from "../factories/index.ts";
import {
  DossierManagedByDnError,
  updateDossierFromAdmin,
} from "@pitchou/server/database/dossier_admin.ts";

import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

test("DN-managed dossier relations cannot be changed from admin", async () => {
  const dossier = await createDossier(db, { demarche_numerique_number: "910201" });
  const groupe = await createGroupeInstructeurs(db);

  await expect(
    updateDossierFromAdmin(
      dossier.id as DossierId,
      {
        relations: {
          groupe_instructeurs: groupe.id as GroupeInstructeursId,
          demandeur_type: "personne_physique",
          demandeur_personne_physique: {
            last_name: "Martin",
            first_names: "Camille",
            email: null,
            address: null,
            phone: null,
            role: null,
          },
          demandeur_personne_morale: null,
          identites: [
            {
              type: "demandeur",
              last_name: "Martin",
              first_names: "Camille",
              email: null,
              phone: null,
              role: null,
            },
          ],
        },
      },
      "admin-guard@pitchou.test",
      db,
    ),
  ).rejects.toBeInstanceOf(DossierManagedByDnError);
});
