import type { Knex } from "knex";
import { byteFormat } from "@pitchou/common/typeFormat.ts";
import { directDatabaseConnection } from "../database.ts";
import { getDossiersForGeoMCE } from "./geomce_dossiers.ts";
import type Dossier from "@pitchou/types/database/public/Dossier.ts";
import type { DossierForGeoMCE, GeoMceMessage } from "@pitchou/types/geomce.ts";

function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, "YYYY-MM-DD".length) : null;
}

export function generateMessagesGeoMCE(dossier: DossierForGeoMCE): GeoMceMessage {
  return {
    projet: {
      ref: `PITCHOU-${dossier.id}`,
      nom: dossier.name || `Dossier Pitchou #${dossier.id}`,
      description: dossier.description || "",
      // @ts-expect-error Database communes carry an INSEE code.
      localisations: dossier.communes?.map(({ code }) => code),
      avancement: "Autorisé",
      typologies: null,
      maitrise_ouvrage:
        dossier.demandeur_personne_morale !== null
          ? [{ siret: dossier.demandeur_personne_morale }]
          : null,
      emprises: null,
    },
    procedure: {
      num_dossier: `PITCHOU-${dossier.id}`,
      type: "En Attente de GeoMCE Dérogation Espèces Protégées",
      description: dossier.description || "",
      references: [`PITCHOU-${dossier.id}`],
      date_decision: formatDate(dossier.signature_date),
      instructeurs: dossier.instructeurs,
      autorite_decisionnaire: null,
      specimens_faunes: dossier.specimens_faunes,
      specimens_flores: dossier.specimens_flores,
      emprises: null,
    },
    mesures: [],
  };
}

async function listDossiersForDeclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex,
): Promise<Dossier["id"][]> {
  const dossiers = await databaseConnection("dossier")
    .select("dossier.id")
    .join("decision_administrative", { "decision_administrative.dossier": "dossier.id" })
    .where({ "decision_administrative.type": "Arrêté dérogation" })
    .whereNotNull("decision_administrative.signature_date")
    .whereNotNull("dossier.especes_impactees");
  return dossiers.map(({ id }) => id);
}

export async function generateDeclarationGeoMCE(
  databaseConnection: Knex.Transaction | Knex = directDatabaseConnection,
) {
  const ids = await listDossiersForDeclarationGeoMCE(databaseConnection);
  console.log(`${ids.length} dossiers trouvés\n`);
  const dossiers = ((await getDossiersForGeoMCE(ids, databaseConnection)) || []).filter(Boolean);
  const messages = dossiers.map(generateMessagesGeoMCE);
  console.log("messagesGeoMCE", messages.length);
  console.log("taille en JSON", byteFormat.format(JSON.stringify(messages).length));
  return messages;
}
