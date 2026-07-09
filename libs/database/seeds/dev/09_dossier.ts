import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Knex } from "knex";

import { stockerNouveauFichier } from "@pitchou/server/database/fichier.ts";
import {
  construireActivitésMéthodesMoyensDePoursuite,
  dbRowToEspeceProtegee,
  descriptionMenacesEspècesToOdsArrayBuffer,
} from "@pitchou/common/outils-espèces.ts";
import type { default as EspeceProtegee } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type { FichierId } from "@pitchou/types/database/public/Fichier.ts";
import type { DescriptionMenacesEspèces, EspèceProtégée } from "@pitchou/types/especes.d.ts";

import { SEED_DEMARCHE_NUMBER } from "../fixtures/demarche_numerique.ts";
import {
  SEED_DOSSIERS,
  SEED_AVIS_EXPERTS,
  SEED_DÉCISIONS_ADMINISTRATIVES,
  SEED_ÉVÈNEMENTS_PHASE_DOSSIER,
  SEED_PRESCRIPTIONS,
  SEED_CONTRÔLES,
  SEED_ENTREPRISES,
  SEED_PERSONNES,
  SEED_DOSSIERS_SUIVIS_PAR_DEV,
  SEED_ESPÈCES_IMPACTÉES,
} from "../fixtures/dossiers.ts";
import { generatePlaceholderPdf } from "../fixtures/placeholder-pdf.ts";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";
const ACTIVITÉS_ODS_PATH = join(
  import.meta.dirname,
  "../../../../data/activites-methodes-moyens-de-poursuite.ods",
);

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

const JSON_COLUMNS = [
  "communes",
  "départements",
  "régions",
  "cartographie_projet",
  "scientifique_type_demande",
  "scientifique_mode_capture",
  "scientifique_intervenants",
  "scientifique_finalité_demande",
] as const;

function logJsonFields(label: string, data: Record<string, unknown>) {
  console.error(`  JSON fields for ${label}:`);
  for (const col of JSON_COLUMNS) {
    if (col in data) {
      const val = data[col];
      console.error(`    ${col}: (${typeof val}) ${JSON.stringify(val)}`);
    }
  }
}

function serializeJsonColumns(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };
  for (const col of JSON_COLUMNS) {
    if (col in result && result[col] !== null && result[col] !== undefined) {
      result[col] = JSON.stringify(result[col]);
    }
  }
  return result;
}

async function stockerPlaceholderPdf(nom: string, transaction: Knex.Transaction) {
  const stored = await stockerNouveauFichier(
    {
      nom,
      contenu: generatePlaceholderPdf(nom),
      media_type: "application/pdf",
    },
    transaction,
  );

  return stored.id ?? null;
}

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    const person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    const devCap = person?.code_accès
      ? await transaction("cap_dossier").where({ personne_cap: person.code_accès }).first()
      : null;

    // Step 0 — entreprises (demandeurs personne morale), referenced by dossiers

    for (const entreprise of SEED_ENTREPRISES) {
      await transaction("entreprise").insert(entreprise).onConflict("siret").merge();
    }

    // Step 0b — personnes (demandeurs personne physique & representatives), resolved by email

    for (const personne of SEED_PERSONNES) {
      await transaction("personne").insert(personne).onConflict("email").merge();
    }

    const personneRows = await transaction("personne")
      .whereIn(
        "email",
        SEED_PERSONNES.map((p) => p.email),
      )
      .select("id", "email");
    const personneIdByEmail = new Map<string, number>(personneRows.map((p) => [p.email, p.id]));

    // Step 1 — dossiers + groupe junction

    const dossierIdMap: Record<string, number> = {};
    // personneId (as string) → list of seed dossier DB ids they can see, used later for random follow
    const agentVisibleDossiers = new Map<string, number[]>();

    for (const {
      groupe_instructeur,
      demandeur_personne_physique_email,
      representative_email,
      déposant_email,
      ...dossierData
    } of SEED_DOSSIERS) {
      const label = `dossier "${dossierData.nom}" (${dossierData.number_demarches_simplifiées})`;
      try {
        let dossier = await transaction("dossier")
          .where({ number_demarches_simplifiées: dossierData.number_demarches_simplifiées })
          .first();

        if (!dossier) {
          const [inserted] = await transaction("dossier")
            .insert(
              serializeJsonColumns({
                ...dossierData,
                numéro_démarche: SEED_DEMARCHE_NUMBER,
                demandeur_personne_physique: demandeur_personne_physique_email
                  ? (personneIdByEmail.get(demandeur_personne_physique_email) ?? null)
                  : null,
                representative: representative_email
                  ? (personneIdByEmail.get(representative_email) ?? null)
                  : null,
                déposant: déposant_email ? (personneIdByEmail.get(déposant_email) ?? null) : null,
              }),
            )
            .returning("id");
          dossier = inserted;
        }

        dossierIdMap[dossierData.number_demarches_simplifiées!] = dossier.id;

        const group = await transaction("groupe_instructeurs")
          .where({ nom: groupe_instructeur, numéro_démarche: SEED_DEMARCHE_NUMBER })
          .first();

        if (group) {
          const existingLink = await transaction("arête_groupe_instructeurs__dossier")
            .where({ dossier: dossier.id })
            .first();

          if (!existingLink) {
            await transaction("arête_groupe_instructeurs__dossier").insert({
              dossier: dossier.id,
              groupe_instructeurs: group.id,
            });
          }

          if (devCap) {
            const existingCapLink = await transaction("arête_cap_dossier__groupe_instructeurs")
              .where({ cap_dossier: devCap.cap, groupe_instructeurs: group.id })
              .first();

            if (!existingCapLink) {
              await transaction("arête_cap_dossier__groupe_instructeurs").insert({
                cap_dossier: devCap.cap,
                groupe_instructeurs: group.id,
              });
            }
          }

          const agentsInGroup = await transaction("personne")
            .join("cap_dossier", "cap_dossier.personne_cap", "personne.code_accès")
            .join(
              "arête_cap_dossier__groupe_instructeurs",
              "arête_cap_dossier__groupe_instructeurs.cap_dossier",
              "cap_dossier.cap",
            )
            .where({ "arête_cap_dossier__groupe_instructeurs.groupe_instructeurs": group.id })
            .select("personne.id");

          for (const { id: personneId } of agentsInGroup) {
            const key = String(personneId);
            const list = agentVisibleDossiers.get(key) ?? [];
            list.push(dossier.id);
            agentVisibleDossiers.set(key, list);
          }
        } else {
          console.warn(`  ⚠ groupe_instructeurs "${groupe_instructeur}" introuvable — ${label}`);
        }
      } catch (err) {
        console.error(`\n  ✗ Erreur insertion ${label}`);
        logJsonFields(label, dossierData as Record<string, unknown>);
        throw err;
      }
    }

    // Step 1b — each agent follows exactly one dossier, randomly chosen from those they can see
    for (const [personneId, visibleDossierIds] of agentVisibleDossiers) {
      const alreadyFollows = await transaction("arête_personne_suit_dossier")
        .where({ personne: personneId })
        .first();

      if (!alreadyFollows) {
        const randomId = visibleDossierIds[Math.floor(Math.random() * visibleDossierIds.length)];
        await transaction("arête_personne_suit_dossier").insert({
          personne: personneId,
          dossier: randomId,
        });
      }
    }

    // Step 2 — évènements phase dossier
    for (const { dossier: dsNumber, ...evtData } of SEED_ÉVÈNEMENTS_PHASE_DOSSIER) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ évènement phase "${evtData.phase}" — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      try {
        const existing = await transaction("évènement_phase_dossier")
          .where({ dossier: dossierId, phase: evtData.phase })
          .first();

        if (!existing) {
          await transaction("évènement_phase_dossier").insert({ ...evtData, dossier: dossierId });
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion évènement phase "${evtData.phase}" (dossier DB id ${dossierId})`,
        );
        throw err;
      }
    }

    // Step 3 — avis experts
    for (const {
      dossier: dsNumber,
      nom_fichier_saisine,
      nom_fichier_avis,
      ...avisData
    } of SEED_AVIS_EXPERTS) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ avis_expert ${avisData.id} — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      try {
        const existing = await transaction("avis_expert").where({ id: avisData.id }).first();
        if (!existing) {
          await transaction("avis_expert").insert({
            ...avisData,
            dossier: dossierId,
            saisine_fichier: nom_fichier_saisine
              ? await stockerPlaceholderPdf(nom_fichier_saisine, transaction)
              : null,
            avis_fichier: nom_fichier_avis
              ? await stockerPlaceholderPdf(nom_fichier_avis, transaction)
              : null,
          });
        } else {
          const fichiersÀAjouter: {
            saisine_fichier?: FichierId | null;
            avis_fichier?: FichierId | null;
          } = {};

          if (nom_fichier_saisine && !existing.saisine_fichier) {
            fichiersÀAjouter.saisine_fichier = await stockerPlaceholderPdf(
              nom_fichier_saisine,
              transaction,
            );
          }

          if (nom_fichier_avis && !existing.avis_fichier) {
            fichiersÀAjouter.avis_fichier = await stockerPlaceholderPdf(
              nom_fichier_avis,
              transaction,
            );
          }

          if (Object.keys(fichiersÀAjouter).length >= 1) {
            await transaction("avis_expert").where({ id: avisData.id }).update(fichiersÀAjouter);
          }
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion avis_expert ${avisData.id} (dossier DB id ${dossierId})`,
        );
        throw err;
      }
    }

    // Step 4 — décisions administratives
    for (const { dossier: dsNumber, nom_fichier, ...daData } of SEED_DÉCISIONS_ADMINISTRATIVES) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(
          `  ⚠ décision_administrative ${daData.id} — dossier DS ${dsNumber} non résolu`,
        );
        continue;
      }

      try {
        const existing = await transaction("décision_administrative")
          .where({ id: daData.id })
          .first();
        if (!existing) {
          let fichier: FichierId | null = null;
          if (nom_fichier) {
            fichier = await stockerPlaceholderPdf(nom_fichier, transaction);
          }
          await transaction("décision_administrative").insert({
            ...daData,
            dossier: dossierId,
            fichier,
          });
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion décision_administrative ${daData.id} (dossier DB id ${dossierId})`,
        );
        throw err;
      }
    }

    // Step 5 — prescriptions
    for (const prescription of SEED_PRESCRIPTIONS) {
      try {
        const existing = await transaction("prescription").where({ id: prescription.id }).first();
        if (!existing) {
          await transaction("prescription").insert(prescription);
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion prescription ${prescription.id} (décision ${prescription.décision_administrative})`,
        );
        throw err;
      }
    }

    // Step 6 — contrôles
    for (const contrôle of SEED_CONTRÔLES) {
      try {
        const existing = await transaction("contrôle").where({ id: contrôle.id }).first();
        if (!existing) {
          await transaction("contrôle").insert(contrôle);
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion contrôle ${contrôle.id} (prescription ${contrôle.prescription})`,
        );
        throw err;
      }
    }

    // Step 7 — the dev/seed user follows some dossiers ("personnes qui suivent ce dossier")
    if (person) {
      for (const dsNumber of SEED_DOSSIERS_SUIVIS_PAR_DEV) {
        const dossierId = dossierIdMap[dsNumber];
        if (!dossierId) {
          console.warn(`  ⚠ suivi dossier — dossier DS ${dsNumber} non résolu`);
          continue;
        }

        await transaction("arête_personne_suit_dossier")
          .insert({ personne: person.id, dossier: dossierId })
          .onConflict(["personne", "dossier"])
          .ignore();
      }
    }

    // Step 8 — espèces impactées (generated ODS fichier)
    if (SEED_ESPÈCES_IMPACTÉES.length > 0) {
      const activitésBuffer = await readFile(ACTIVITÉS_ODS_PATH);
      const activités = await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer);
      const activitéParIdentifiantPitchou =
        activités.identifiantPitchouVersActivitéEtImpactsQuantifiés;

      for (const { dossier: dsNumber, nom_fichier, lignes } of SEED_ESPÈCES_IMPACTÉES) {
        const dossierId = dossierIdMap[dsNumber];
        if (!dossierId) {
          console.warn(`  ⚠ espèces impactées — dossier DS ${dsNumber} non résolu`);
          continue;
        }

        // Idempotence: skip if the dossier already has an espèces impactées fichier.
        const dossier = await transaction("dossier").where({ id: dossierId }).first();
        if (dossier?.espèces_impactées) continue;

        const cdRefs = [...new Set(lignes.map((l) => l.cd_ref))];
        const rows: EspeceProtegee[] = await transaction("espece_protegee").whereIn(
          "cd_ref",
          cdRefs,
        );
        const espèceByCD_REF = new Map<string, EspèceProtégée>(
          rows.map((row) => [row.cd_ref, dbRowToEspeceProtegee(row)]),
        );

        const description: DescriptionMenacesEspèces = {
          oiseau: [],
          "faune non-oiseau": [],
          flore: [],
        };

        for (const ligne of lignes) {
          const espèce = espèceByCD_REF.get(ligne.cd_ref);
          if (!espèce) {
            throw new Error(
              `espèces impactées — espèce CD_REF ${ligne.cd_ref} introuvable dans la vue espece_protegee (dossier DS ${dsNumber})`,
            );
          }

          const activité = activitéParIdentifiantPitchou.get(ligne.identifiant_pitchou_activité);
          if (!activité) {
            throw new Error(
              `espèces impactées — activité "${ligne.identifiant_pitchou_activité}" introuvable dans le référentiel (dossier DS ${dsNumber})`,
            );
          }

          const base = {
            espèce,
            activité,
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

        const odsArrayBuffer = await descriptionMenacesEspècesToOdsArrayBuffer(description);
        const { id: fichierId } = await stockerNouveauFichier(
          {
            nom: nom_fichier,
            contenu: Buffer.from(odsArrayBuffer),
            media_type: ODS_MEDIA_TYPE,
          },
          transaction,
        );

        await transaction("dossier")
          .where({ id: dossierId })
          .update({ espèces_impactées: fichierId });
      }
    }

    console.log("");
    console.log(`  Seed dossiers OK — ${SEED_DOSSIERS.length} dossiers`);
    console.log(`  Email : ${SEED_EMAIL}`);
    if (person?.code_accès) {
      console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    }
    console.log("");
  });
}
