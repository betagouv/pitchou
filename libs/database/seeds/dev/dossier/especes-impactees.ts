import { createOdsFile } from "@odfjs/odfjs";
import type { Knex } from "knex";

import {
  dbRowToEspeceProtegee,
  descriptionMenacesEspecesToOdsArrayBuffer,
} from "@pitchou/common/especesUtils.ts";
import { storeNewFichier } from "@pitchou/server/database/fichier.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "@pitchou/server/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import type EspeceProtegeeRow from "@pitchou/types/database/public/EspeceProtegee.ts";
import type { DescriptionMenacesEspeces, EspeceProtegee } from "@pitchou/types/especes.d.ts";

import { SEED_ESPECES_IMPACTEES } from "../../fixtures/dossiers.ts";
import { SEED_FICHIER_ESPECES_INCORRECT } from "../../fixtures/dossiers/especes-impactees-incorrect.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";

export async function seedEspecesImpactees(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  if (SEED_ESPECES_IMPACTEES.length > 0) {
    // Read from the referential tables, which the migrations have already filled.
    const referentiel = await getReferentielTypeImpactMethodeMoyenDePoursuite(transaction);
    const activiteParIdentifiantPitchou =
      referentiel.identifiantPitchouVersActivitéEtImpactsQuantifiés;

    for (const { dossier: dsNumber, nom_fichier, lignes } of SEED_ESPECES_IMPACTEES) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ espèces impactées — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      // Idempotence: skip if the dossier already has an espèces impactées fichier.
      const dossier = await transaction("dossier").where({ id: dossierId }).first();
      if (dossier?.especes_impactees) continue;

      const cdRefs = [...new Set(lignes.map((l) => l.cd_ref))];
      const rows: EspeceProtegeeRow[] = await transaction("espece_protegee").whereIn(
        "cd_ref",
        cdRefs,
      );
      const especeByCD_REF = new Map<string, EspeceProtegee>(
        rows.map((row) => [row.cd_ref, dbRowToEspeceProtegee(row)]),
      );

      const description: DescriptionMenacesEspeces = {
        oiseau: [],
        "faune non-oiseau": [],
        flore: [],
      };

      for (const ligne of lignes) {
        const espece = especeByCD_REF.get(ligne.cd_ref);
        if (!espece) {
          throw new Error(
            `espèces impactées — espèce CD_REF ${ligne.cd_ref} introuvable dans la vue espece_protegee (dossier DS ${dsNumber})`,
          );
        }

        const activite = activiteParIdentifiantPitchou.get(ligne.identifiant_pitchou_activité);
        if (!activite) {
          throw new Error(
            `espèces impactées — activité "${ligne.identifiant_pitchou_activité}" introuvable dans le référentiel (dossier DS ${dsNumber})`,
          );
        }

        const base = {
          espèce: espece,
          activité: activite,
          nombreIndividus: ligne.nombre_individus,
          surfaceHabitatDétruit: ligne.surface_habitat_détruit,
        };

        if (ligne.classification === "oiseau") {
          description.oiseau.push({
            ...base,
            nombreNids: ligne.nombre_nids,
            nombreOeufs: ligne.nombre_oeufs,
          });
        } else if (ligne.classification === "faune non-oiseau") {
          description["faune non-oiseau"].push(base);
        } else {
          description.flore.push(base);
        }
      }

      const odsArrayBuffer = await descriptionMenacesEspecesToOdsArrayBuffer(description);
      const { id: fichierId } = await storeNewFichier(
        {
          name: nom_fichier,
          content: Buffer.from(odsArrayBuffer),
          media_type: ODS_MEDIA_TYPE,
        },
        transaction,
      );

      await transaction("dossier")
        .where({ id: dossierId })
        .update({ especes_impactees: fichierId });
    }
  }

  await seedFichierEspecesIncorrect(transaction, dossierIdMap);
}

/**
 * Attaches a faulty file to one dossier, so the anomalies reported on the onglet Projet can be
 * seen in a dev environment.
 *
 * Built from raw cells: the loop above resolves everything against the référentiel and throws on
 * what it does not know, which is precisely what this file is meant to contain.
 */
async function seedFichierEspecesIncorrect(
  transaction: Knex.Transaction,
  dossierIdMap: Record<string, number>,
) {
  const { dossier: dsNumber, nom_fichier, feuilles } = SEED_FICHIER_ESPECES_INCORRECT;

  const dossierId = dossierIdMap[dsNumber];
  if (!dossierId) {
    console.warn(`  ⚠ espèces impactées incorrectes — dossier DS ${dsNumber} non résolu`);
    return;
  }

  const dossier = await transaction("dossier").where({ id: dossierId }).first();
  if (dossier?.especes_impactees) return;

  const sheets = new Map(
    Object.entries(feuilles).map(([nom, { colonnes, lignes }]) => [
      nom,
      [colonnes, ...lignes].map((ligne) =>
        ligne.map((value) => ({ type: "string" as const, value })),
      ),
    ]),
  );

  const odsArrayBuffer = await createOdsFile(sheets as Parameters<typeof createOdsFile>[0]);
  const { id: fichierId } = await storeNewFichier(
    { name: nom_fichier, content: Buffer.from(odsArrayBuffer), media_type: ODS_MEDIA_TYPE },
    transaction,
  );

  await transaction("dossier").where({ id: dossierId }).update({ especes_impactees: fichierId });
}
