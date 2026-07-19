import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { arrayBuffer } from "node:stream/consumers";

import memoize from "just-memoize";
import type { Knex } from "knex";

import { byteFormat } from "@pitchou/common/typeFormat.ts";
import { directDatabaseConnection } from "../database.ts";
import { loadFichierContent } from "./fichier.ts";
import {
  buildActivitesMethodesMoyensDePoursuite,
  importDescriptionMenacesEspecesFromOdsArrayBuffer,
} from "@pitchou/common/especesUtils.ts";
import { getEspecesProtegees, dbRowToEspeceProtegee } from "@pitchou/server/especeProtegee.ts";

import type { default as Dossier } from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { default as Personne } from "@pitchou/types/database/public/Personne.ts";
import type { GeoMceMessage, DossierForGeoMCE } from "@pitchou/types/geomce.ts";
import type { PitchouState } from "@pitchou/types/pitchouState.ts";
import type { EspeceProtegee, DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";

const DATA_DIR = join(import.meta.dirname, "../../../../data");

const loadActivitesMethodesMoyensDePoursuite: () => Promise<
  NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>
> = memoize(async function loadActivitesMethodesMoyensDePoursuite() {
  const activitesBuffer = await readFile(
    join(DATA_DIR, "activites-methodes-moyens-de-poursuite.ods"),
  );
  return await buildActivitesMethodesMoyensDePoursuite(activitesBuffer);
});

type EspeceByCD_REF = Map<EspeceProtegee["CD_REF"], EspeceProtegee>;

// Cached per connection so the public endpoint does not re-query every espèce on
// each request, while a different connection gets its own entry.
const especeByCD_REFByConnexion = new WeakMap<Knex.Transaction | Knex, Promise<EspeceByCD_REF>>();

function loadEspeceListByCD_REF(
  databaseConnection: Knex.Transaction | Knex,
): Promise<EspeceByCD_REF> {
  let especeByCD_REFP = especeByCD_REFByConnexion.get(databaseConnection);

  if (!especeByCD_REFP) {
    especeByCD_REFP = getEspecesProtegees(databaseConnection)
      .then((rows) => new Map(rows.map((row) => [row.cd_ref, dbRowToEspeceProtegee(row)])))
      .catch((error) => {
        // Don't keep a rejected promise cached
        especeByCD_REFByConnexion.delete(databaseConnection);
        throw error;
      });
    especeByCD_REFByConnexion.set(databaseConnection, especeByCD_REFP);
  }

  return especeByCD_REFP;
}

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, "YYYY-MM-DD".length) : null;
}

async function getDossiersByIds(
  dossierIds: Dossier["id"][] | Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierForGeoMCE[] | undefined> {
  if (!Array.isArray(dossierIds)) {
    dossierIds = [dossierIds];
  }

  const dossiersP = databaseConnection("dossier")
    .select(["dossier.*", "decision_administrative.signature_date"])
    .leftJoin("decision_administrative", { "decision_administrative.dossier": "dossier.id" })
    .where({ "decision_administrative.type": "Arrêté dérogation" })
    .whereIn("dossier.id", dossierIds)
    .orderBy("decision_administrative.signature_date", "asc")
    .then((dossiers) => {
      // This query returns several rows per dossier if there are several administrative decisions.
      // The current function filters to keep only a single row
      const seenIds = new Set();

      return dossiers.filter((d) => {
        const id = d.id;
        if (seenIds.has(id)) {
          return false;
        } else {
          seenIds.add(id);
          return true;
        }
      });
    });

  const instructeursDossierP = databaseConnection("edge_personne_follows_dossier")
    .select(["personne.email as email", "edge_personne_follows_dossier.dossier as dossier"])
    .join("personne", { "personne.id": "edge_personne_follows_dossier.personne" })
    .whereIn("edge_personne_follows_dossier.dossier", dossierIds);

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
    especeByCD_REF,
    { activités: activites, méthodes: methodes, moyensDePoursuite },
    instructeursByDossierId,
    dossiers,
  ] = await Promise.all([
    loadEspeceListByCD_REF(databaseConnection),
    loadActivitesMethodesMoyensDePoursuite(),
    instructeursByDossierIdP,
    dossiersP,
  ]);

  // .ods (Pitchou template) and .xlsx are both parsed as impacted-espece files.
  const mediaTypesEspeces = new Set([
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);

  return await Promise.all(
    dossiers.map(async (dossier) => {
      let descriptionEspeces: DescriptionMenacesEspeces = {
        oiseau: [],
        "faune non-oiseau": [],
        flore: [],
      };

      const especesImpacteesFileId = dossier.especes_impactees as FileId | null;
      const especesImpacteesFile = especesImpacteesFileId
        ? await loadFichierContent(especesImpacteesFileId, databaseConnection)
        : null;

      if (
        especesImpacteesFile?.media_type &&
        mediaTypesEspeces.has(especesImpacteesFile?.media_type)
      ) {
        try {
          descriptionEspeces = await importDescriptionMenacesEspecesFromOdsArrayBuffer(
            await arrayBuffer(especesImpacteesFile.body),
            especeByCD_REF,
            activites,
            methodes,
            moyensDePoursuite,
          );
        } catch (e) {
          // @ts-ignore
          if (e.cause === "format incorrect") {
            // ignore
          } else {
            console.error("Erreur lors de la génération du message GeoMCE. Dossier", dossierIds);
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
            date_from: formatDate(dossier.depot_date),
          };
        }),
        specimens_faunes: [
          ...new Set((descriptionEspeces.oiseau || []).map(({ espèce: espece }) => espece)),
          ...new Set(
            (descriptionEspeces["faune non-oiseau"] || []).map(({ espèce: espece }) => espece),
          ),
        ].map((espece) => {
          return {
            nom_scientifique: espece.nomsScientifiques.values().next().value,
          };
        }),
        specimens_flores: [
          ...new Set((descriptionEspeces.flore || []).map(({ espèce: espece }) => espece)),
        ].map((espece) => {
          return {
            nom_scientifique: espece.nomsScientifiques.values().next().value,
          };
        }),
        ...dossier,
      };
    }),
  );
}

export function generateMessagesGeoMCE(dossierForGeoMCE: DossierForGeoMCE): GeoMceMessage {
  return {
    projet: {
      ref: `PITCHOU-${dossierForGeoMCE.id}`,
      nom: dossierForGeoMCE.name || `Dossier Pitchou #${dossierForGeoMCE.id}`,
      description: dossierForGeoMCE.description || "",
      // @ts-expect-error
      localisations: dossierForGeoMCE.communes?.map(({ code }) => code),
      avancement: "Autorisé",
      typologies: null,
      maitrise_ouvrage:
        dossierForGeoMCE.demandeur_personne_morale !== null
          ? [
              {
                siret: dossierForGeoMCE.demandeur_personne_morale,
              },
            ]
          : null,
      emprises: null,
    },
    procedure: {
      num_dossier: `PITCHOU-${dossierForGeoMCE.id}`,
      type: "En Attente de GeoMCE Dérogation Espèces Protégées",
      description: dossierForGeoMCE.description || "",
      references: [`PITCHOU-${dossierForGeoMCE.id}`],
      date_decision: formatDate(dossierForGeoMCE.signature_date),
      instructeurs: dossierForGeoMCE.instructeurs,
      autorite_decisionnaire: null,
      specimens_faunes: dossierForGeoMCE.specimens_faunes,
      specimens_flores: dossierForGeoMCE.specimens_flores,
      emprises: null,
    },
    mesures: [],
  };
}

async function listDossiersForDeclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<Dossier["id"][]> {
  const dossiers = await databaseConnection("dossier")
    .select("dossier.id")
    .from("dossier")
    .join("decision_administrative", { "decision_administrative.dossier": "dossier.id" })
    .where({ "decision_administrative.type": "Arrêté dérogation" })
    .whereNotNull("decision_administrative.signature_date")
    .whereNotNull("dossier.especes_impactees");

  // @ts-ignore
  return dossiers.map(({ id }) => id);
}

export async function generateDeclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const dossiers = await listDossiersForDeclarationGeoMCE(databaseConnection);
  console.log(`${dossiers.length} dossiers trouvés\n`);
  const dossiersForGeoMCE = ((await getDossiersByIds(dossiers, databaseConnection)) || []).filter(
    (d) => d !== undefined,
  );

  const messagesGeoMCE = dossiersForGeoMCE.map(generateMessagesGeoMCE);

  console.log("messagesGeoMCE", messagesGeoMCE.length);
  console.log("taille en JSON", byteFormat.format(JSON.stringify(messagesGeoMCE).length));
  return messagesGeoMCE;
}
