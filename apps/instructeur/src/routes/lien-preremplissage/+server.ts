import type { RequestHandler } from "./$types";
import { demanderLienPreremplissage } from "@pitchou/server/demarche-numerique/demanderLienPreremplissage.ts";
import { chiffrerDonneesSupplementairesDossiers } from "@pitchou/server/demarche-numerique/chiffrerDechiffrerDonneesSupplementaires.ts";
import _schema88444 from "../../../../../data/demarche-numerique/schema-DS/derogation-especes-protegees.json" with { type: "json" };
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";

const schema88444 = _schema88444 as unknown as SchemaDemarcheSimplifiee;

export const POST: RequestHandler = async ({ request }) => {
  const donneesPreRemplissage = (await request.json()) as Partial<DossierDemarcheNumerique88444>;

  const donneesSupplementairesDossiers =
    donneesPreRemplissage["NE PAS MODIFIER - Données techniques associées à votre dossier"];

  if (donneesSupplementairesDossiers) {
    donneesPreRemplissage["NE PAS MODIFIER - Données techniques associées à votre dossier"] =
      await chiffrerDonneesSupplementairesDossiers(donneesSupplementairesDossiers);
  }

  const { dossier_url } = (await demanderLienPreremplissage(
    donneesPreRemplissage,
    schema88444,
  )) as { dossier_url: string };

  return new Response(dossier_url, { headers: { "content-type": "text/plain" } });
};
