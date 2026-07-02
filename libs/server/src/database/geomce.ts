import { join } from "node:path";
import { readFile } from "node:fs/promises";

import memoize from "just-memoize";
import type { Knex } from "knex";

import { byteFormat } from "@pitchou/common/typeFormat.ts";
import { directDatabaseConnection } from "../database.ts";
import {
  construireActivitésMéthodesMoyensDePoursuite,
  importDescriptionMenacesEspècesFromOdsArrayBuffer,
} from "@pitchou/common/outils-espèces.ts";
import { getEspecesProtegees, dbRowToEspeceProtegee } from "@pitchou/server/especeProtegee.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { GeoMceMessage, DossierPourGeoMCE } from "@pitchou/types/geomce.ts";
import type { PitchouState } from "@pitchou/types/pitchou-state.ts";
import type { EspèceProtégée, DescriptionMenacesEspèces } from "@pitchou/types/especes.d.ts";

const DATA_DIR = join(import.meta.dirname, "../../../../data");

const chargerActivitésMéthodesMoyensDePoursuite: () => Promise<
  NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>
> = memoize(async function chargerActivitésMéthodesMoyensDePoursuite() {
  const activitésBuffer = await readFile(
    join(DATA_DIR, "activites-methodes-moyens-de-poursuite.ods"),
  );
  return await construireActivitésMéthodesMoyensDePoursuite(activitésBuffer);
});

type EspèceParCD_REF = Map<EspèceProtégée["CD_REF"], EspèceProtégée>;

// Cached per connection so the public endpoint does not re-query every espèce on
// each request, while a different connection gets its own entry.
const espèceParCD_REFParConnexion = new WeakMap<
  Knex.Transaction | Knex,
  Promise<EspèceParCD_REF>
>();

function chargerListeEspèceParCD_REF(
  databaseConnection: Knex.Transaction | Knex,
): Promise<EspèceParCD_REF> {
  let espèceByCD_REFP = espèceParCD_REFParConnexion.get(databaseConnection);

  if (!espèceByCD_REFP) {
    espèceByCD_REFP = getEspecesProtegees(databaseConnection)
      .then(
        (lignes) => new Map(lignes.map((ligne) => [ligne.cd_ref, dbRowToEspeceProtegee(ligne)])),
      )
      .catch((error) => {
        // Don't keep a rejected promise cached
        espèceParCD_REFParConnexion.delete(databaseConnection);
        throw error;
      });
    espèceParCD_REFParConnexion.set(databaseConnection, espèceByCD_REFP);
  }

  return espèceByCD_REFP;
}

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, "YYYY-MM-DD".length) : null;
}

async function récupérerDossiersParIds(
  idDossiers: Dossier["id"][] | Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierPourGeoMCE[] | undefined> {
  if (!Array.isArray(idDossiers)) {
    idDossiers = [idDossiers];
  }

  const dossiersP = databaseConnection("dossier")
    .select([
      "dossier.*",
      "fichier.contenu as fichier_contenu",
      "fichier.media_type as fichier_media_type",
      "décision_administrative.date_signature",
    ])
    .leftJoin("décision_administrative", { "décision_administrative.dossier": "dossier.id" })
    .leftJoin("fichier", { "fichier.id": "dossier.espèces_impactées" })
    .where({ "décision_administrative.type": "Arrêté dérogation" })
    .whereIn("dossier.id", idDossiers)
    .orderBy("décision_administrative.date_signature", "asc")
    .then((dossiers) => {
      // Cette requête retourne plusieurs lignes par dossier s'il y a plusieurs décision_administrative
      // La fonction actuelle filtre pour n'avoir qu'une seule ligne
      const idDéjàVus = new Set();

      return dossiers.filter((d) => {
        const id = d.id;
        if (idDéjàVus.has(id)) {
          return false;
        } else {
          idDéjàVus.add(id);
          return true;
        }
      });
    });

  const instructeursDossierP = databaseConnection("arête_personne_suit_dossier")
    .select(["personne.email as email", "arête_personne_suit_dossier.dossier as dossier"])
    .join("personne", { "personne.id": "arête_personne_suit_dossier.personne" })
    .whereIn("arête_personne_suit_dossier.dossier", idDossiers);

  const instructeursByDossierIdP: Promise<Map<Dossier["id"], Personne["email"][]>> =
    instructeursDossierP.then((instructeursDossiers) => {
      const instructeursByDossier: Awaited<typeof instructeursByDossierIdP> = new Map();

      for (const { email, dossier } of instructeursDossiers) {
        const instructeurs = instructeursByDossier.get(dossier) || [];
        instructeurs.push(email);
        instructeursByDossier.set(dossier, instructeurs);
      }

      return instructeursByDossier;
    });

  const [
    espèceParCD_REF,
    { activités, méthodes, moyensDePoursuite },
    instructeursByDossierId,
    dossiers,
  ] = await Promise.all([
    chargerListeEspèceParCD_REF(databaseConnection),
    chargerActivitésMéthodesMoyensDePoursuite(),
    instructeursByDossierIdP,
    dossiersP,
  ]);

  // .ods (Pitchou template) and .xlsx are both parsed as impacted-espece files.
  const mediaTypesEspèces = new Set([
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);

  return await Promise.all(
    dossiers.map(async (dossier) => {
      let descriptionEspèces: DescriptionMenacesEspèces = {
        oiseau: [],
        "faune non-oiseau": [],
        flore: [],
      };

      if (mediaTypesEspèces.has(dossier.fichier_media_type)) {
        try {
          descriptionEspèces = await importDescriptionMenacesEspècesFromOdsArrayBuffer(
            dossier.fichier_contenu,
            espèceParCD_REF,
            activités,
            méthodes,
            moyensDePoursuite,
          );
        } catch (e) {
          // @ts-ignore
          if (e.cause === "format incorrect") {
            // ignorer
          } else {
            console.error("Erreur lors de la génération du message GeoMCE. Dossier", idDossiers);
            console.error("Dossier", dossier);
            console.error(e);
            process.exit();
          }
        }
      }

      const instructeurs = instructeursByDossierId.get(dossier.id) || [];

      return {
        instructeurs: instructeurs.map((email) => {
          return {
            email,
            date_from: formatDate(dossier.date_dépôt),
          };
        }),
        specimens_faunes: [
          ...new Set((descriptionEspèces.oiseau || []).map(({ espèce }) => espèce)),
          ...new Set((descriptionEspèces["faune non-oiseau"] || []).map(({ espèce }) => espèce)),
        ].map((espèce) => {
          return {
            nom_scientifique: espèce.nomsScientifiques.values().next().value,
          };
        }),
        specimens_flores: [
          ...new Set((descriptionEspèces.flore || []).map(({ espèce }) => espèce)),
        ].map((espèce) => {
          return {
            nom_scientifique: espèce.nomsScientifiques.values().next().value,
          };
        }),
        ...dossier,
      };
    }),
  );
}

export function genererMessagesGeoMCE(dossierPourGeoMCE: DossierPourGeoMCE): GeoMceMessage {
  return {
    projet: {
      ref: `PITCHOU-${dossierPourGeoMCE.id}`,
      nom: dossierPourGeoMCE.nom || `Dossier Pitchou #${dossierPourGeoMCE.id}`,
      description: dossierPourGeoMCE.description || "",
      // @ts-expect-error
      localisations: dossierPourGeoMCE.communes?.map(({ code }) => code),
      avancement: "Autorisé",
      typologies: null,
      maitrise_ouvrage:
        dossierPourGeoMCE.demandeur_personne_morale !== null
          ? [
              {
                siret: dossierPourGeoMCE.demandeur_personne_morale,
              },
            ]
          : null,
      emprises: null,
    },
    procedure: {
      num_dossier: `PITCHOU-${dossierPourGeoMCE.id}`,
      type: "En Attente de GeoMCE Dérogation Espèces Protégées",
      description: dossierPourGeoMCE.description || "",
      references: [`PITCHOU-${dossierPourGeoMCE.id}`],
      date_decision: formatDate(dossierPourGeoMCE.date_signature),
      instructeurs: dossierPourGeoMCE.instructeurs,
      autorite_decisionnaire: null,
      specimens_faunes: dossierPourGeoMCE.specimens_faunes,
      specimens_flores: dossierPourGeoMCE.specimens_flores,
      emprises: null,
    },
    mesures: [],
  };
}

async function listerDossiersPourDéclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"][]> {
  const dossiers = await databaseConnection("dossier")
    .select("dossier.id")
    .from("dossier")
    .join("décision_administrative", { "décision_administrative.dossier": "dossier.id" })
    .where({ "décision_administrative.type": "Arrêté dérogation" })
    .whereNotNull("décision_administrative.date_signature")
    .whereNotNull("dossier.espèces_impactées");

  // @ts-ignore
  return dossiers.map(({ id }) => id);
}

export async function générerDéclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossiers = await listerDossiersPourDéclarationGeoMCE(databaseConnection);
  console.log(`${dossiers.length} dossiers trouvés\n`);
  const dossiersPourGeoMCE = (
    (await récupérerDossiersParIds(dossiers, databaseConnection)) || []
  ).filter((d) => d !== undefined);

  const messagesGeoMCE = dossiersPourGeoMCE.map(genererMessagesGeoMCE);

  console.log("messagesGeoMCE", messagesGeoMCE.length);
  console.log("taille en JSON", byteFormat.format(JSON.stringify(messagesGeoMCE).length));
  return messagesGeoMCE;
}
