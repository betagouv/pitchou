import type { RequestHandler } from "./$types";
import { requestPrefillingLink } from "@pitchou/server/demarche-numerique/demanderLienPreremplissage.ts";
import { encryptDossiersAdditionalData } from "@pitchou/server/demarche-numerique/chiffrerDechiffrerDonneesSupplementaires.ts";
import _schema88444 from "../../../../../data/demarche-numerique/schema-DS/derogation-especes-protegees.json" with { type: "json" };
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";

const schema88444 = _schema88444 as unknown as SchemaDemarcheSimplifiee;

export const POST: RequestHandler = async ({ request }) => {
  const prefillingData = (await request.json()) as Partial<DossierDemarcheNumerique88444>;

  const dossiersAdditionalData =
    prefillingData["NE PAS MODIFIER - Données techniques associées à votre dossier"];

  if (dossiersAdditionalData) {
    prefillingData["NE PAS MODIFIER - Données techniques associées à votre dossier"] =
      await encryptDossiersAdditionalData(dossiersAdditionalData);
  }

  const { dossier_url } = (await requestPrefillingLink(
    prefillingData,
    schema88444,
  )) as { dossier_url: string };

  return new Response(dossier_url, { headers: { "content-type": "text/plain" } });
};
