import { arrayBuffer } from "node:stream/consumers";

import { parseFichierEspecesImpactees } from "@pitchou/common/impact_espece/parseFichierEspecesImpactees.ts";
import { directDatabaseConnection } from "@pitchou/server/database.ts";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import { loadEspeceByCD_REF } from "@pitchou/server/especeProtegee.ts";
import { getReferentielTypeImpactMethodeMoyenDePoursuite } from "@pitchou/server/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import type { AnomalieFichierEspeces } from "@pitchou/types/especesImpact.d.ts";
import { env as publicEnv } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

// Wraps a free-text value in quotes, so its commas, quotes and line breaks stay in one cell.
function quote(value: string | null): string {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

// Auth is enforced upstream by hooks.server.ts (session + isAdminEmail).
export const GET: RequestHandler = async () => {
  const dossiers = await directDatabaseConnection("dossier")
    .leftJoin("edge_groupe_instructeurs__dossier as edge_groupe", {
      "edge_groupe.dossier": "dossier.id",
    })
    .leftJoin("groupe_instructeurs", {
      "groupe_instructeurs.id": "edge_groupe.groupe_instructeurs",
    })
    .select(
      "dossier.id",
      "dossier.name",
      "dossier.demarche_numerique_number",
      "dossier.especes_impactees",
      "groupe_instructeurs.name as groupe_name",
    )
    .whereNotNull("dossier.especes_impactees")
    .orderBy("dossier.id");
  const especeByCD_REF = await loadEspeceByCD_REF();
  const referentiel = await getReferentielTypeImpactMethodeMoyenDePoursuite();

  const pitchouUrl = (publicEnv.PUBLIC_SITE_URL_PITCHOU ?? "").replace(/\/+$/, "");

  const lines = [
    "identifiant dossier Pitchou,numéro dossier Démarche Numérique,nom du dossier,groupe instructeurs,lien vers le dossier,anomalies",
  ];
  for (const dossier of dossiers) {
    let anomalies: AnomalieFichierEspeces[];
    try {
      const fichier = await loadFichierContent(dossier.especes_impactees);
      if (!fichier) throw new Error("fichier introuvable");
      const contenu = await arrayBuffer(fichier.body);
      ({ anomalies } = await parseFichierEspecesImpactees(contenu, especeByCD_REF, referentiel));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      anomalies = [{ message: `le fichier n’a pas pu être lu : ${reason}` }];
    }
    if (anomalies.length === 0) continue;

    const text = anomalies
      .map(({ classification, ligne, message }) =>
        classification && ligne
          ? `Feuille « ${classification} », ligne ${ligne} : ${message}`
          : message,
      )
      .join("\n");
    const numero = dossier.demarche_numerique_number ?? "";
    const lien = `${pitchouUrl}/dossier/${dossier.id}`;
    lines.push(
      [dossier.id, numero, quote(dossier.name), quote(dossier.groupe_name), lien, quote(text)].join(
        ",",
      ),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${today}-dossiers-anomalies-fichier-especes.csv"`,
    },
  });
};
