import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithCapToGroup } from "../factories/index.ts";
import { physicalAdminDossierRelations } from "../factories/adminDossier.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin_list.ts";

import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

test("a legal dossier creation only stores its representative identity", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne morale",
      depot_date: new Date("2026-08-01"),
      phase: "Accompagnement amont",
      relations: {
        groupe_instructeurs: instructeur.groupeId as GroupeInstructeursId,
        demandeur_type: "personne_morale",
        demandeur_personne_physique: null,
        demandeur_personne_morale: {
          siret: "12345678901234" as EntrepriseSiret,
          legal_name: null,
          address: null,
          postal_code: null,
          department: null,
          region: null,
        },
        identites: [
          {
            type: "representant",
            last_name: "",
            first_names: "",
            email: "lou@example.org",
            phone: "0102030405",
            role: null,
          },
        ],
      },
    },
    "admin-legal-creation@pitchou.test",
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.demandeur_personne_morale?.legal_name).toBeNull();
  expect(detail.identites).toEqual([
    expect.objectContaining({ type: "representant", last_name: "" }),
  ]);
  expect(detail.dossier.deposant).toBeNull();
});

test("a physical dossier can be created without a duplicated identity name", async () => {
  const instructeur = await createInstructeurWithCapToGroup(db);
  const groupeId = instructeur.groupeId as GroupeInstructeursId;
  const relations = physicalAdminDossierRelations(groupeId, "", "");
  relations.demandeur_personne_physique.address = "11 rue Réaumur, Paris 75002, France";

  const { id } = await createDossierFromAdmin(
    {
      name: "Dossier personne physique",
      depot_date: new Date("2026-08-02"),
      phase: "Accompagnement amont",
      relations,
      columns: {
        primary_department: "01",
        location_scope: "regions",
        departments: JSON.stringify([]),
        communes: JSON.stringify([]),
        regions: JSON.stringify(["Auvergne-Rhône-Alpes"]),
        projet_map: JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [2.35, 48.85] },
              properties: { source: "selection_utilisateur" },
            },
          ],
        }),
      },
    },
    "admin-physical-creation@pitchou.test",
    db,
  );

  const detail = await getDossierDetailForAdmin(id, db);
  expect(detail.demandeur_personne_physique).toMatchObject({
    last_name: "",
    first_names: "",
    address: "11 rue Réaumur, Paris 75002, France",
  });
  expect(detail.dossier).toMatchObject({
    primary_department: "01",
    location_scope: "regions",
    departments: [],
    communes: [],
    regions: ["Auvergne-Rhône-Alpes"],
    projet_map: {
      type: "FeatureCollection",
      features: [
        expect.objectContaining({ geometry: { type: "Point", coordinates: [2.35, 48.85] } }),
      ],
    },
  });
});
