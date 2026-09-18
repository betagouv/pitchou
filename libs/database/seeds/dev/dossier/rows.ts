import type { Knex } from "knex";

import { SEED_DEMARCHE_NUMBER } from "../../fixtures/demarche_numerique.ts";
import { SEED_DOSSIERS } from "../../fixtures/dossiers.ts";
import type { seedDossierActors } from "./actors.ts";

type Actors = Awaited<ReturnType<typeof seedDossierActors>>;

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

export async function seedDossierRows(
  transaction: Knex.Transaction,
  actors: Pick<Actors, "devCap" | "personneIdByEmail" | "personneFixtureByEmail">,
) {
  const { devCap, personneIdByEmail, personneFixtureByEmail } = actors;
  const dossierIdMap: Record<string, number> = {};
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
        .where({
          demarche_numerique_number: dossierData.demarche_numerique_number,
          source: "demarche_numerique",
        })
        .first();

      const columns = serializeJsonColumns({
        ...dossierData,
        demarche_number: SEED_DEMARCHE_NUMBER,
        source: "demarche_numerique",
        demandeur_personne_physique: demandeur_personne_physique_email
          ? (personneIdByEmail.get(demandeur_personne_physique_email) ?? null)
          : null,
        deposant: deposant_email ? (personneIdByEmail.get(deposant_email) ?? null) : null,
      });

      if (dossier) {
        // Re-seeding realigns existing dev dossiers on the fixtures, so columns
        // added since the last seed are not left empty until the next data-reset.
        await transaction("dossier").where({ id: dossier.id }).update(columns);
      } else {
        const [inserted] = await transaction("dossier").insert(columns).returning("id");
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

  return { dossierIdMap, agentVisibleDossiers };
}
