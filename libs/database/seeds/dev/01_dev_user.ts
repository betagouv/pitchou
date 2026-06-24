import { randomBytes } from "node:crypto";

import type { Knex } from "knex";

import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";
import type { GroupeInstructeursInitializer } from "@pitchou/types/database/public/GroupeInstructeurs.ts";
import type { DossierInitializer } from "@pitchou/types/database/public/Dossier.ts";

const SEED_EMAIL = process.env.SEED_EMAIL || "dev@localhost.local";
const SEED_GROUP_NAME = "Groupe de démonstration (seed)";
const SEED_DEMARCHE_NUMBER = 999999;
const ORIGIN = process.env.SEED_ORIGIN || "http://localhost:5173";

type Commune = { name: string; code: string; postalCode: string };

type FakeDossier = Pick<DossierInitializer, "nom" | "number_demarches_simplifiées"> & {
  communes: Commune[];
  départements: string[];
};

const commune = (name: string, code: string, postalCode: string): Commune => ({
  name,
  code,
  postalCode,
});

// Localisations variées pour tester la recherche par commune : nom exact,
// saisie partielle (« cleyra » → « Cleyrac »), communes composées (avec tiret)
// et dossiers couvrant plusieurs communes / départements.
const FAKE_DOSSIERS: FakeDossier[] = [
  {
    nom: "Parc éolien des Hauteurs (démo)",
    number_demarches_simplifiées: "999000001",
    communes: [commune("Cleyrac", "33138", "33540"), commune("Mauriac", "33279", "33540")],
    départements: ["33"],
  },
  {
    nom: "Reconstruction pont sur la Loire (démo)",
    number_demarches_simplifiées: "999000002",
    communes: [
      commune("Saint-Florent-le-Vieil", "49301", "49410"),
      commune("Ancenis-Saint-Géréon", "44003", "44150"),
    ],
    départements: ["44", "49"],
  },
  {
    nom: "Carrière de granulats du Sud (démo)",
    number_demarches_simplifiées: "999000003",
    communes: [commune("Bordeaux", "33063", "33000"), commune("Pessac", "33318", "33600")],
    départements: ["33"],
  },
];

export async function seed(knex: Knex) {
  await knex.transaction(async (transaction) => {
    let person = await transaction("personne").where({ email: SEED_EMAIL }).first();
    if (!person) {
      const accessCode = randomBytes(16).toString("hex");
      const newPerson: PersonneInitializer = {
        email: SEED_EMAIL,
        nom: "Dev",
        prénoms: "Local",
        code_accès: accessCode,
      };
      const [inserted] = await transaction("personne")
        .insert(newPerson)
        .returning(["id", "code_accès"]);
      person = inserted;
    } else if (!person.code_accès) {
      const accessCode = randomBytes(16).toString("hex");
      await transaction("personne").where({ id: person.id }).update({ code_accès: accessCode });
      person.code_accès = accessCode;
    }

    let capability = await transaction("cap_dossier")
      .where({ personne_cap: person.code_accès })
      .first();
    if (!capability) {
      const [inserted] = await transaction("cap_dossier")
        .insert({ personne_cap: person.code_accès })
        .returning("cap");
      capability = inserted;
    }

    let group = await transaction("groupe_instructeurs").where({ nom: SEED_GROUP_NAME }).first();
    if (!group) {
      const newGroup: GroupeInstructeursInitializer = {
        nom: SEED_GROUP_NAME,
        numéro_démarche: SEED_DEMARCHE_NUMBER,
      };
      const [inserted] = await transaction("groupe_instructeurs").insert(newGroup).returning("id");
      group = inserted;
    }

    const groupLink = await transaction("arête_cap_dossier__groupe_instructeurs")
      .where({ cap_dossier: capability.cap, groupe_instructeurs: group.id })
      .first();
    if (!groupLink) {
      await transaction("arête_cap_dossier__groupe_instructeurs").insert({
        cap_dossier: capability.cap,
        groupe_instructeurs: group.id,
      });
    }

    for (const fakeDossier of FAKE_DOSSIERS) {
      let dossier = await transaction("dossier")
        .where({ number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées })
        .first();
      // Les colonnes `communes` / `départements` sont en JSON : on sérialise
      // explicitement, sinon le driver pg encoderait le tableau JS en tableau
      // PostgreSQL (`{…}`) au lieu de JSON.
      const localisation = {
        communes: JSON.stringify(fakeDossier.communes),
        départements: JSON.stringify(fakeDossier.départements),
      };

      if (!dossier) {
        const newDossier: DossierInitializer = {
          nom: fakeDossier.nom,
          number_demarches_simplifiées: fakeDossier.number_demarches_simplifiées,
          date_dépôt: new Date(),
          numéro_démarche: SEED_DEMARCHE_NUMBER,
          ...localisation,
        };
        const [inserted] = await transaction("dossier").insert(newDossier).returning("id");
        dossier = inserted;
      } else {
        // Rafraîchit la localisation des dossiers déjà semés lors d'une exécution précédente.
        await transaction("dossier").where({ id: dossier.id }).update(localisation);
      }

      const dossierLink = await transaction("arête_groupe_instructeurs__dossier")
        .where({ dossier: dossier.id })
        .first();
      if (!dossierLink) {
        await transaction("arête_groupe_instructeurs__dossier").insert({
          dossier: dossier.id,
          groupe_instructeurs: group.id,
        });
      } else if (dossierLink.groupe_instructeurs !== group.id) {
        await transaction("arête_groupe_instructeurs__dossier")
          .where({ dossier: dossier.id })
          .update({ groupe_instructeurs: group.id });
      }
    }

    console.log("");
    console.log("  Seed OK");
    console.log(`  Email : ${SEED_EMAIL}`);
    console.log(`  Login : ${ORIGIN}/?secret=${person.code_accès}`);
    console.log("");
  });
}
