import type { RequestHandler } from "./$types";
import { demanderLienPréremplissage } from "$server/démarche-numérique/demanderLienPréremplissage.ts";
import { chiffrerDonnéesSupplémentairesDossiers } from "$server/démarche-numérique/chiffrerDéchiffrerDonnéesSupplémentaires.ts";
import _schema88444 from "../../../data/démarche-numérique/schema-DS/derogation-especes-protegees.json" with { type: "json" };
import type { DossierDemarcheNumerique88444 } from "$types/démarche-numérique/Démarche88444.js";
import type { SchemaDémarcheSimplifiée } from "$types/démarche-numérique/schema.js";

const schema88444 = _schema88444 as unknown as SchemaDémarcheSimplifiée;

export const POST: RequestHandler = async ({ request }) => {
  const donneesPreRemplissage = (await request.json()) as Partial<DossierDemarcheNumerique88444>;

  const donneesSupplementairesDossiers =
    donneesPreRemplissage["NE PAS MODIFIER - Données techniques associées à votre dossier"];

  if (donneesSupplementairesDossiers) {
    donneesPreRemplissage["NE PAS MODIFIER - Données techniques associées à votre dossier"] =
      await chiffrerDonnéesSupplémentairesDossiers(donneesSupplementairesDossiers);
  }

  const { dossier_url } = (await demanderLienPréremplissage(
    donneesPreRemplissage,
    schema88444,
  )) as { dossier_url: string };

  return new Response(dossier_url, { headers: { "content-type": "text/plain" } });
};
