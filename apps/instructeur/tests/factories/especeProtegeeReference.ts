import type { Knex } from "knex";

import type { EspeceTaxrefInitializer } from "@pitchou/types/database/public/EspeceTaxref.ts";
import type { EspeceBdcStatutInitializer } from "@pitchou/types/database/public/EspeceBdcStatut.ts";
import { rebuildEspeceProtegeeReference } from "@pitchou/server/especeProtegeeReference.ts";

export type EspeceProtegeeReferenceSample = {
  cd_ref: string;
  classification: string;
  noms_scientifiques: string[];
  noms_vernaculaires: string[];
  cd_type_statuts: string[];
};

export async function seedEspeceProtegeeReference(
  especes: EspeceProtegeeReferenceSample[],
  db: Knex,
): Promise<void> {
  const taxrefRows: EspeceTaxrefInitializer[] = [];
  const bdcRows: EspeceBdcStatutInitializer[] = [];

  for (const e of especes) {
    const { regne, classe } = taxrefClassification(e.classification);
    const [accepte = "", ...synonymes] = e.noms_scientifiques;
    // Accepted-taxon row (CD_NOM = CD_REF): carries the classification + the
    // vernacular names (joined like TAXREF does, comma-separated).
    taxrefRows.push({
      cd_nom: e.cd_ref,
      cd_ref: e.cd_ref,
      lb_nom: accepte,
      nom_vern: e.noms_vernaculaires.join(", "),
      regne,
      classe,
    });
    // One row per scientific synonym (synthetic CD_NOM ≠ CD_REF).
    synonymes.forEach((lb_nom, i) => {
      taxrefRows.push({
        cd_nom: `${e.cd_ref}-${i + 1}`,
        cd_ref: e.cd_ref,
        lb_nom,
        nom_vern: "",
        regne,
        classe,
      });
    });
    for (const cd_type_statut of e.cd_type_statuts) {
      bdcRows.push({ cd_nom: e.cd_ref, cd_ref: e.cd_ref, cd_type_statut, label_statut: "" });
    }
  }

  if (taxrefRows.length >= 1) await db.batchInsert("espece_taxref", taxrefRows, 1000);
  if (bdcRows.length >= 1) await db.batchInsert("espece_bdc_statut", bdcRows, 1000);
  await rebuildEspeceProtegeeReference(db);
}

/** Reverse of the reference's REGNE/CLASSE → classification: pick a representative pair. */
function taxrefClassification(classification: string): { regne: string; classe: string } {
  if (classification === "oiseau") return { regne: "Animalia", classe: "Aves" };
  if (classification === "flore") return { regne: "Plantae", classe: "" };
  return { regne: "Animalia", classe: "Mammalia" }; // faune non-oiseau
}
