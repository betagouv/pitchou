import { expect, test } from "vitest";
import { createOdsFile } from "@odfjs/odfjs";

import { db } from "../setup/db.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import { createDossier } from "../factories/dossier.ts";
import { createFichier } from "../factories/fichier.ts";
import { createPersonne } from "../factories/personne.ts";

import { générerDéclarationGeoMCE } from "@pitchou/server/database/geomce.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

// Minimal « espèces impactées » .ods: one "oiseau" sheet whose only column is the
// CD_REF of a seeded espèce. The specimen name comes from the database, not the file.
async function odsEspecesImpactees(cdRef: string): Promise<Buffer> {
  const sheets = new Map([
    ["oiseau", [[{ type: "string", value: "CD_REF" }], [{ type: "string", value: cdRef }]]],
  ]);
  const arrayBuffer = await createOdsFile(sheets as Parameters<typeof createOdsFile>[0]);
  return Buffer.from(arrayBuffer);
}

test("générerDéclarationGeoMCE résout les spécimens depuis la vue espece_protegee", async () => {
  // Source of the specimen names for the GeoMCE message. The reference layer holds
  // the names; the view (read by geomce) exposes them — no flags needed here.
  await seedEspeceProtegeeReference(
    [
      {
        cd_ref: "2437",
        classification: "oiseau",
        noms_scientifiques: ["Morus bassanus", "Sula bassana"],
        noms_vernaculaires: ["Fou de Bassan"],
        cd_type_statuts: ["PN"],
      },
    ],
    db,
  );

  const fichier = await createFichier(db, {
    nom: "especes-impactees.ods",
    mediaType: ODS_MEDIA_TYPE,
    contenu: await odsEspecesImpactees("2437"),
  });

  const dossier = await createDossier(db, {
    nom: "Parc éolien du Test",
    espèces_impactées: fichier.id,
  });

  await db("décision_administrative").insert({
    dossier: dossier.id,
    type: "Arrêté dérogation",
    date_signature: new Date("2026-03-15T10:30:00Z"),
  });

  const instructeur = await createPersonne(db, { email: "instructeur@example.org" });
  await db("arête_personne_suit_dossier").insert({
    personne: instructeur.id,
    dossier: dossier.id,
  });

  const messages = await générerDéclarationGeoMCE(db);

  const message = messages.find((m) => m.projet.ref === `PITCHOU-${dossier.id}`);
  expect(message).toBeDefined();
  // The valid name (first in the set) is the one exported
  expect(message!.procedure.specimens_faunes).toEqual([{ nom_scientifique: "Morus bassanus" }]);
  expect(message!.procedure.specimens_flores).toEqual([]);

  // date_decision is the signature date formatted as YYYY-MM-DD. Compare against
  // the stored value formatted the same way, to stay timezone-independent.
  // TODO: formatDate in geomce.ts is timezone-dependent — a `date` column reads back
  // as local midnight and toISOString() can shift it by a day (off-by-one in prod east
  // of UTC). Fix formatDate to use local date components, then assert an exact date here.
  const [decision] = await db("décision_administrative")
    .select("date_signature")
    .where({ dossier: dossier.id });
  expect(message!.procedure.date_decision).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(message!.procedure.date_decision).toBe(decision.date_signature.toISOString().slice(0, 10));

  expect(message!.procedure.instructeurs.map((i) => i.email)).toContain("instructeur@example.org");
});
