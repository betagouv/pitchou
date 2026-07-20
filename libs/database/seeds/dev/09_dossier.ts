import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Knex } from "knex";

import { storeNewFichier } from "@pitchou/server/database/fichier.ts";
import {
  buildActivitesMethodesMoyensDePoursuite,
  dbRowToEspeceProtegee,
  descriptionMenacesEspecesToOdsArrayBuffer,
} from "@pitchou/common/especesUtils.ts";
import type { default as EspeceProtegeeRow } from "@pitchou/types/database/public/EspeceProtegee.ts";

import type { DescriptionMenacesEspeces, EspeceProtegee } from "@pitchou/types/especes.d.ts";

import { SEED_DEMARCHE_NUMBER } from "../fixtures/demarche_numerique.ts";
import {
  SEED_DOSSIERS,
  SEED_AVIS_EXPERTS,
  SEED_DECISIONS_ADMINISTRATIVES,
  SEED_EVENEMENTS_PHASE_DOSSIER,
  SEED_PRESCRIPTIONS,
  SEED_CONTROLES,
  SEED_ENTREPRISES,
  SEED_PERSONNES,
  SEED_DOSSIERS_SUIVIS_PAR_DEV,
  SEED_ESPECES_IMPACTEES,
} from "../fixtures/dossiers.ts";
import { generatePlaceholderPdf } from "../fixtures/placeholder-pdf.ts";
import type { FileId } from "@pitchou/types/database/public/File.js";

const ODS_MEDIA_TYPE = "application/vnd.oasis.opendocument.spreadsheet";
const ACTIVITES_ODS_PATH = join(
  import.meta.dirname,
  "../../../../data/activites-methodes-moyens-de-poursuite.ods",
);

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

const JSON_COLUMNS = [
  "communes",
  "departments",
  "regions",
  "projet_map",
  "scientifique_demande_type",
  "scientifique_capture_mode",
  "scientifique_intervenants",
  "scientifique_demande_purposes",
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

async function stockerPlaceholderPdf(name: string, transaction: Knex.Transaction) {
  const stored = await storeNewFichier(
    {
      name,
      content: generatePlaceholderPdf(name),
      media_type: "application/pdf",
    },
    transaction,
  );

  return stored.id ?? null;
}

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    const person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    const devCap = person?.access_code
      ? await transaction("cap_dossier").where({ personne_cap: person.access_code }).first()
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

    const personneFixtureByEmail = new Map(SEED_PERSONNES.map((p) => [p.email, p]));

    // Step 1 — dossiers + groupe junction

    const dossierIdMap: Record<string, number> = {};
    // personneId (as string) → list of seed dossier DB ids they can see, used later for random follow
    const agentVisibleDossiers = new Map<string, number[]>();

    for (const {
      groupe_instructeur,
      demandeur_personne_physique_email,
      representative_email,
      deposant_email,
      mandataire_email,
      ...dossierData
    } of SEED_DOSSIERS) {
      const label = `dossier "${dossierData.name}" (${dossierData.demarche_numerique_number})`;
      try {
        let dossier = await transaction("dossier")
          .where({ demarche_numerique_number: dossierData.demarche_numerique_number })
          .first();

        if (!dossier) {
          const [inserted] = await transaction("dossier")
            .insert(
              serializeJsonColumns({
                ...dossierData,
                demarche_number: SEED_DEMARCHE_NUMBER,
                demandeur_personne_physique: demandeur_personne_physique_email
                  ? (personneIdByEmail.get(demandeur_personne_physique_email) ?? null)
                  : null,
                deposant: deposant_email ? (personneIdByEmail.get(deposant_email) ?? null) : null,
              }),
            )
            .returning("id");
          dossier = inserted;
        }

        dossierIdMap[dossierData.demarche_numerique_number!] = dossier.id;

        // Identities shown in the "Porteur de projet" tab (per-dossier snapshots)
        const identites = [];
        const demandeurFixture = deposant_email
          ? personneFixtureByEmail.get(deposant_email)
          : undefined;
        if (demandeurFixture) {
          identites.push({
            dossier: dossier.id,
            type: "demandeur",
            last_name: demandeurFixture.last_name,
            first_names: demandeurFixture.first_names,
            email: demandeurFixture.email,
          });
        }
        const mandataireFixture = mandataire_email
          ? personneFixtureByEmail.get(mandataire_email)
          : undefined;
        if (mandataireFixture) {
          identites.push({
            dossier: dossier.id,
            type: "mandataire",
            last_name: mandataireFixture.last_name,
            first_names: mandataireFixture.first_names,
            email: mandataireFixture.email,
          });
        }
        const representantFixture = representative_email
          ? personneFixtureByEmail.get(representative_email)
          : undefined;
        if (representantFixture) {
          identites.push({
            dossier: dossier.id,
            type: "representant",
            last_name: representantFixture.last_name,
            first_names: representantFixture.first_names,
            email: representantFixture.email,
            phone: representantFixture.phone ?? null,
            role: representantFixture.role ?? null,
          });
        }
        for (const identite of identites) {
          await transaction("identite_dossier")
            .insert(identite)
            .onConflict(["dossier", "type"])
            .merge();
        }

        const group = await transaction("groupe_instructeurs")
          .where({ name: groupe_instructeur, demarche_number: SEED_DEMARCHE_NUMBER })
          .first();

        if (group) {
          const existingLink = await transaction("edge_groupe_instructeurs__dossier")
            .where({ dossier: dossier.id })
            .first();

          if (!existingLink) {
            await transaction("edge_groupe_instructeurs__dossier").insert({
              dossier: dossier.id,
              groupe_instructeurs: group.id,
            });
          }

          if (devCap) {
            const existingCapLink = await transaction("edge_cap_dossier__groupe_instructeurs")
              .where({ cap_dossier: devCap.cap, groupe_instructeurs: group.id })
              .first();

            if (!existingCapLink) {
              await transaction("edge_cap_dossier__groupe_instructeurs").insert({
                cap_dossier: devCap.cap,
                groupe_instructeurs: group.id,
              });
            }
          }

          const agentsInGroup = await transaction("personne")
            .join("cap_dossier", "cap_dossier.personne_cap", "personne.access_code")
            .join(
              "edge_cap_dossier__groupe_instructeurs",
              "edge_cap_dossier__groupe_instructeurs.cap_dossier",
              "cap_dossier.cap",
            )
            .where({ "edge_cap_dossier__groupe_instructeurs.groupe_instructeurs": group.id })
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
      const alreadyFollows = await transaction("edge_personne_follows_dossier")
        .where({ personne: personneId })
        .first();

      if (!alreadyFollows) {
        const randomId = visibleDossierIds[Math.floor(Math.random() * visibleDossierIds.length)];
        await transaction("edge_personne_follows_dossier").insert({
          personne: personneId,
          dossier: randomId,
        });
      }
    }

    // Step 2 — évènements phase dossier
    for (const { dossier: dsNumber, ...evtData } of SEED_EVENEMENTS_PHASE_DOSSIER) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ évènement phase "${evtData.phase}" — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      try {
        const existing = await transaction("evenement_phase_dossier")
          .where({ dossier: dossierId, phase: evtData.phase })
          .first();

        if (!existing) {
          await transaction("evenement_phase_dossier").insert({ ...evtData, dossier: dossierId });
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
          const fichiersAAjouter: {
            saisine_fichier?: FileId | null;
            avis_fichier?: FileId | null;
          } = {};

          if (nom_fichier_saisine && !existing.saisine_fichier) {
            fichiersAAjouter.saisine_fichier = await stockerPlaceholderPdf(
              nom_fichier_saisine,
              transaction,
            );
          }

          if (nom_fichier_avis && !existing.avis_fichier) {
            fichiersAAjouter.avis_fichier = await stockerPlaceholderPdf(
              nom_fichier_avis,
              transaction,
            );
          }

          if (Object.keys(fichiersAAjouter).length >= 1) {
            await transaction("avis_expert").where({ id: avisData.id }).update(fichiersAAjouter);
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
    for (const { dossier: dsNumber, nom_fichier, ...daData } of SEED_DECISIONS_ADMINISTRATIVES) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(
          `  ⚠ décision_administrative ${daData.id} — dossier DS ${dsNumber} non résolu`,
        );
        continue;
      }

      try {
        const existing = await transaction("decision_administrative")
          .where({ id: daData.id })
          .first();
        if (!existing) {
          let fichier: FileId | null = null;
          if (nom_fichier) {
            fichier = await stockerPlaceholderPdf(nom_fichier, transaction);
          }
          await transaction("decision_administrative").insert({
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
          `\n  ✗ Erreur insertion prescription ${prescription.id} (décision ${prescription.decision_administrative})`,
        );
        throw err;
      }
    }

    // Step 6 — contrôles
    for (const controle of SEED_CONTROLES) {
      try {
        const existing = await transaction("controle").where({ id: controle.id }).first();
        if (!existing) {
          await transaction("controle").insert(controle);
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion contrôle ${controle.id} (prescription ${controle.prescription})`,
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

        await transaction("edge_personne_follows_dossier")
          .insert({ personne: person.id, dossier: dossierId })
          .onConflict(["personne", "dossier"])
          .ignore();
      }
    }

    // Step 8 — espèces impactées (generated ODS fichier)
    if (SEED_ESPECES_IMPACTEES.length > 0) {
      const activitesBuffer = await readFile(ACTIVITES_ODS_PATH);
      const activites = await buildActivitesMethodesMoyensDePoursuite(activitesBuffer);
      const activiteParIdentifiantPitchou =
        activites.identifiantPitchouVersActivitéEtImpactsQuantifiés;

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

    console.log("");
    console.log(`  Seed dossiers OK — ${SEED_DOSSIERS.length} dossiers`);
    console.log(`  Email : ${SEED_EMAIL}`);
    if (person?.access_code) {
      console.log(`  Login : ${ORIGIN}/?secret=${person.access_code}`);
    }
    console.log("");
  });
}
