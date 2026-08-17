import { arrayBuffer } from "node:stream/consumers";
import type { Knex } from "knex";
import { importDescriptionMenacesEspecesFromOdsArrayBuffer } from "@pitchou/common/especesUtils.ts";
import { directDatabaseConnection } from "../database.ts";
import { loadEspeceByCD_REF } from "../especeProtegee.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "../referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { loadFichierContent } from "./fichier.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especes.d.ts";
import type { DossierForGeoMCE } from "@pitchou/types/geomce.ts";

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, "YYYY-MM-DD".length) : null;
}

export async function getDossiersForGeoMCE(
  dossierIds: Dossier["id"][] | Dossier["id"],
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
): Promise<DossierForGeoMCE[] | undefined> {
  const ids = Array.isArray(dossierIds) ? dossierIds : [dossierIds];
  const dossiersP = databaseConnection("dossier")
    .select(["dossier.*", "decision_administrative.signature_date"])
    .leftJoin("decision_administrative", { "decision_administrative.dossier": "dossier.id" })
    .where({ "decision_administrative.type": "Arrêté dérogation" })
    .whereIn("dossier.id", ids)
    .orderBy("decision_administrative.signature_date", "asc")
    .then((rows) => {
      const seen = new Set();
      return rows.filter(({ id }) => !seen.has(id) && Boolean(seen.add(id)));
    });
  const instructeursP: Promise<Map<Dossier["id"], Personne["email"][]>> = databaseConnection(
    "edge_personne_follows_dossier",
  )
    .select(["personne.email as email", "edge_personne_follows_dossier.dossier as dossier"])
    .join("personne", { "personne.id": "edge_personne_follows_dossier.personne" })
    .whereIn("edge_personne_follows_dossier.dossier", ids)
    .then((rows) => {
      const byDossier = new Map();
      for (const { email, dossier } of rows) {
        const instructeurs = byDossier.get(dossier) || [];
        instructeurs.push(email);
        byDossier.set(dossier, instructeurs);
      }
      return byDossier;
    });
  const [especes, maps, instructeurs, dossiers] = await Promise.all([
    loadEspeceByCD_REF(databaseConnection),
    getReferentielTypeImpactMethodeMoyenDePoursuite(databaseConnection),
    instructeursP,
    dossiersP,
  ]);
  const mediaTypes = new Set([
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  return Promise.all(
    dossiers.map(async (dossier) => {
      let description: DescriptionMenacesEspeces = {
        oiseau: [],
        "faune non-oiseau": [],
        flore: [],
      };
      const fileId = dossier.especes_impactees as FileId | null;
      const file = fileId ? await loadFichierContent(fileId, databaseConnection) : null;
      if (file?.media_type && mediaTypes.has(file.media_type)) {
        try {
          description = await importDescriptionMenacesEspecesFromOdsArrayBuffer(
            await arrayBuffer(file.body),
            especes,
            maps.activités,
            maps.méthodes,
            maps.moyensDePoursuite,
          );
        } catch (error) {
          // @ts-ignore Error causes are not narrowed here.
          if (error.cause !== "format incorrect") {
            console.error("Erreur lors de la génération du message GeoMCE. Dossier", ids);
            console.error("Dossier", dossier);
            console.error(error);
            process.exit();
          }
        }
      }
      return {
        instructeurs: (instructeurs.get(dossier.id) || []).map((email) => ({
          email,
          date_from: formatDate(dossier.depot_date),
        })),
        specimens_faunes: [
          ...new Set([
            ...(description.oiseau || []).map(({ espèce }) => espèce),
            ...(description["faune non-oiseau"] || []).map(({ espèce }) => espèce),
          ]),
        ].map((espece) => ({ nom_scientifique: espece.nomsScientifiques.values().next().value })),
        specimens_flores: [...new Set((description.flore || []).map(({ espèce }) => espèce))].map(
          (espece) => ({ nom_scientifique: espece.nomsScientifiques.values().next().value }),
        ),
        ...dossier,
      };
    }),
  );
}
