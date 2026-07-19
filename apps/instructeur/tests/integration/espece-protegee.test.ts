import { beforeEach, expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { getEspecesProtegees } from "@pitchou/server/especeProtegee.ts";
import { rebuildEspeceProtegeeReference } from "@pitchou/server/especeProtegeeReference.ts";
import { createPersonne } from "../factories/index.ts";
import {
  seedEspeceProtegeeReference,
  type EspeceProtegeeReferenceSample,
} from "../factories/especeProtegeeReference.ts";
import { INTEGRATION_BASE_URL, TEST_ADMIN_EMAIL } from "../setup/integration-global.ts";
import type { EspeceProtegeeModificationInitializer } from "@pitchou/types/database/public/EspeceProtegeeModification.ts";

function refEspece(
  cd_ref: string,
  overrides: Partial<EspeceProtegeeReferenceSample> = {},
): EspeceProtegeeReferenceSample {
  return {
    cd_ref,
    classification: "oiseau",
    noms_scientifiques: [`Espece ${cd_ref}`],
    noms_vernaculaires: [],
    cd_type_statuts: ["PN"],
    ...overrides,
  };
}

function modification(
  cd_ref: string,
  patch: Partial<EspeceProtegeeModificationInitializer> = {},
): EspeceProtegeeModificationInitializer {
  return { cd_ref, ...patch } as unknown as EspeceProtegeeModificationInitializer;
}

// The reference is a table rebuilt from the source tables; isolate every test from
// leftover source/manual rows, then rebuild to an empty reference.
beforeEach(async () => {
  await db("espece_protegee_modification").truncate();
  await db("espece_taxref").truncate();
  await db("espece_bdc_statut").truncate();
  await rebuildEspeceProtegeeReference(db);
});

test("seedEspeceProtegeeReference alimente la référence via les tables sources", async () => {
  await seedEspeceProtegeeReference([refEspece("10")], db);

  const rows = await getEspecesProtegees(db);
  expect(rows.map((r) => r.cd_ref)).toEqual(["10"]);
});

test("la référence agrège noms et statuts depuis les tables sources", async () => {
  await seedEspeceProtegeeReference(
    [
      refEspece("11", {
        classification: "flore",
        noms_scientifiques: ["Nom accepté", "Synonyme A", "Synonyme B"],
        noms_vernaculaires: ["Vernaculaire 1", "Vernaculaire 2"],
        cd_type_statuts: ["PD", "PN"],
      }),
    ],
    db,
  );

  const [espece] = await getEspecesProtegees(db);
  // The accepted name stays first.
  expect(espece.noms_scientifiques).toEqual(["Nom accepté", "Synonyme A", "Synonyme B"]);
  expect(espece.noms_vernaculaires).toEqual(["Vernaculaire 1", "Vernaculaire 2"]);
  // The statuts are ordered PN/PR/PD/POM.
  expect(espece.cd_type_statuts).toEqual(["PN", "PD"]);
});

test("les liens des documents BDC sont exposés par statut de protection", async () => {
  await seedEspeceProtegeeReference(
    [
      refEspece("12", {
        cd_type_statuts: ["PN", "PR"],
      }),
    ],
    db,
  );
  await db("espece_bdc_statut").where({ cd_ref: "12", cd_type_statut: "PN" }).update({
    cd_doc: "713",
    full_citation: "Arrêté protégeant les oiseaux sur l'ensemble du territoire",
    doc_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000021384277",
  });
  await db("espece_bdc_statut").where({ cd_ref: "12", cd_type_statut: "PR" }).update({
    cd_doc: "735",
    full_citation: "Arrêté protégeant la flore en Île-de-France",
    doc_url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006059591/",
  });

  const [espece] = await getEspecesProtegees(db);

  expect(espece.statuts_protection).toEqual([
    {
      cd_type_statut: "PN",
      documents: [
        {
          cd_doc: "713",
          full_citation: "Arrêté protégeant les oiseaux sur l'ensemble du territoire",
          doc_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000021384277",
        },
      ],
    },
    {
      cd_type_statut: "PR",
      documents: [
        {
          cd_doc: "735",
          full_citation: "Arrêté protégeant la flore en Île-de-France",
          doc_url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006059591/",
        },
      ],
    },
  ]);
});

test("la vue n'expose pas les drapeaux quand il n'y a aucune modification", async () => {
  await seedEspeceProtegeeReference([refEspece("20")], db);

  const [espece] = await getEspecesProtegees(db);
  expect(espece.espece_ministerielle).toBe(false);
  expect(espece.espece_cnpn).toBe(false);
});

test("la vue fusionne un patch épars : les drapeaux viennent de la modification, le reste hérite de la référence", async () => {
  await seedEspeceProtegeeReference([refEspece("30")], db);
  await db("espece_protegee_modification").insert(modification("30", { espece_cnpn: true }));

  const [espece] = await getEspecesProtegees(db);
  // inherited from the reference
  expect(espece.classification).toBe("oiseau");
  expect(espece.noms_scientifiques).toEqual(["Espece 30"]);
  expect(espece.cd_type_statuts).toEqual(["PN"]);
  // coming from the modification
  expect(espece.espece_cnpn).toBe(true);
  expect(espece.espece_ministerielle).toBe(false);
});

test("la vue fait apparaître un ajout manuel absent de la référence", async () => {
  await seedEspeceProtegeeReference([refEspece("40")], db);
  await db("espece_protegee_modification").insert(
    modification("999", {
      classification: "flore",
      noms_scientifiques: ["Espece ajoutée"],
      noms_vernaculaires: [],
      cd_type_statuts: ["Espèce manquante"],
    }),
  );

  const rows = await getEspecesProtegees(db);
  const ajout = rows.find((r) => r.cd_ref === "999");
  expect(ajout).toBeDefined();
  expect(ajout!.classification).toBe("flore");
  expect(ajout!.cd_type_statuts).toEqual(["Espèce manquante"]);
});

test("la vue masque une espèce exclue (tombstone)", async () => {
  await seedEspeceProtegeeReference([refEspece("50"), refEspece("51")], db);
  await db("espece_protegee_modification").insert(modification("50", { excluded: true }));

  const rows = await getEspecesProtegees(db);
  expect(rows.map((r) => r.cd_ref)).toEqual(["51"]);
});

test("PUT /api/admin/especes-protegees/modifications/:cd_ref rejette une propriété inconnue", async () => {
  const adminSecret = "admin-species-secret";
  await createPersonne(db, { email: TEST_ADMIN_EMAIL, access_code: adminSecret });

  const response = await fetch(
    `${INTEGRATION_BASE_URL}/api/admin/especes-protegees/modifications/50?secret=${adminSecret}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclu: true }),
    },
  );

  expect(response.status).toBe(400);
  await expect(db("espece_protegee_modification").where({ cd_ref: "50" })).resolves.toHaveLength(0);
});
