import type { RequestHandler } from "./$types";
import { demanderLienPréremplissage } from "@pitchou/server/démarche-numérique/demanderLienPréremplissage.ts";
import { chiffrerDonnéesSupplémentairesDossiers } from "@pitchou/server/démarche-numérique/chiffrerDéchiffrerDonnéesSupplémentaires.ts";
import _schema88444 from "../../../../../data/démarche-numérique/schema-DS/derogation-especes-protegees.json" with { type: "json" };
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/démarche-numérique/Démarche88444.ts";
import type { SchemaDémarcheSimplifiée } from "@pitchou/types/démarche-numérique/schema.ts";

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
