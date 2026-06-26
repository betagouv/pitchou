import type { Knex } from "knex";

import { SEED_DEMARCHE_NUMBER } from "./06_users.ts";
import {
  SEED_DOSSIERS,
  SEED_AVIS_EXPERTS,
  SEED_DÉCISIONS_ADMINISTRATIVES,
  SEED_ÉVÈNEMENTS_PHASE_DOSSIER,
  SEED_PRESCRIPTIONS,
  SEED_CONTRÔLES,
} from "../fixtures/dossiers.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

const JSON_COLUMNS = [
  "communes",
  "départements",
  "régions",
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

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    const person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    const devCap = person?.code_accès
      ? await transaction("cap_dossier").where({ personne_cap: person.code_accès }).first()
      : null;

    // Step 1 — dossiers + groupe junction

    const dossierIdMap: Record<string, number> = {};
    // personneId (as string) → list of seed dossier DB ids they can see, used later for random follow
    const agentVisibleDossiers = new Map<string, number[]>();

    for (const { groupe_instructeur, ...dossierData } of SEED_DOSSIERS) {
      const label = `dossier "${dossierData.nom}" (${dossierData.number_demarches_simplifiées})`;
      try {
        let dossier = await transaction("dossier")
          .where({ number_demarches_simplifiées: dossierData.number_demarches_simplifiées })
          .first();

        if (!dossier) {
          const [inserted] = await transaction("dossier")
            .insert(serializeJsonColumns({ ...dossierData, numéro_démarche: SEED_DEMARCHE_NUMBER }))
            .returning("id");
          dossier = inserted;
        }

        dossierIdMap[dossierData.number_demarches_simplifiées!] = dossier.id;

        const group = await transaction("groupe_instructeurs")
          .where({ nom: groupe_instructeur })
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
    for (const { dossier: dsNumber, ...avisData } of SEED_AVIS_EXPERTS) {
      const dossierId = dossierIdMap[dsNumber];
      if (!dossierId) {
        console.warn(`  ⚠ avis_expert ${avisData.id} — dossier DS ${dsNumber} non résolu`);
        continue;
      }

      try {
        const existing = await transaction("avis_expert").where({ id: avisData.id }).first();
        if (!existing) {
          await transaction("avis_expert").insert({ ...avisData, dossier: dossierId });
        }
      } catch (err) {
        console.error(
          `\n  ✗ Erreur insertion avis_expert ${avisData.id} (dossier DB id ${dossierId})`,
        );
        throw err;
      }
    }

    // Step 4 — décisions administratives
    for (const { dossier: dsNumber, ...daData } of SEED_DÉCISIONS_ADMINISTRATIVES) {
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
          await transaction("décision_administrative").insert({ ...daData, dossier: dossierId });
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

    console.log("");
    console.log(`  Seed dossiers OK — ${SEED_DOSSIERS.length} dossiers`);
    console.log(`  Email : ${SEED_EMAIL}`);
    if (person?.code_accès) {
      console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    }
    console.log("");
  });
}
