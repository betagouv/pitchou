import { extname } from "node:path";
import byteSize from "byte-size";
import { HTTPError } from "ky";

import {
  makeFichierHash,
  stockerNouveauFichier,
  trouverFichiersExistants,
} from "@pitchou/server/database/fichier.ts";

import téléchargerFichierDS from "./téléchargerFichierDS.ts";

import type { DossierDS88444, DSFile } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { Knex } from "knex";

type FichierÀTélécharger = {
  nom: string;
  url: string;
  media_type: string | null;
  DS_checksum: string | null;
  DS_createdAt: Date | null;
};

const openDocumentTypes = new Map([
  [".odt", "application/vnd.oasis.opendocument.text"],
  [".ott", "application/vnd.oasis.opendocument.text-template"],
  [".ods", "application/vnd.oasis.opendocument.spreadsheet"],
  [".ots", "application/vnd.oasis.opendocument.spreadsheet-template"],
  [".odp", "application/vnd.oasis.opendocument.presentation"],
  [".otp", "application/vnd.oasis.opendocument.presentation-template"],
  [".odg", "application/vnd.oasis.opendocument.graphics"],
  [".otg", "application/vnd.oasis.opendocument.graphics-template"],
  [".odf", "application/vnd.oasis.opendocument.formula"],
  [".odm", "application/vnd.oasis.opendocument.text-master"],
  [".odb", "application/vnd.oasis.opendocument.database"],
  [".odi", "application/vnd.oasis.opendocument.image"],
  [".odc", "application/vnd.oasis.opendocument.chart"],
  [".otf", "application/vnd.oasis.opendocument.formula-template"],
  [".oth", "application/vnd.oasis.opendocument.text-web"],
]);

/**
 * Contournement de https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/11175
 */
function DScontentTypeToActualMediaType({
  contentType,
  filename,
}: Pick<DSFile, "contentType" | "filename">): string {
  const extension = extname(filename);

  if (contentType === "application/zip") {
    const type = openDocumentTypes.get(extension);
    if (type) return type;
  }

  return contentType;
}

/**
 * Cette fonction lance les téléchargements, sauvegade les fichiers en base de données
 * et retourne l'association entre le dossier et les Fichier['id'] correspondants
 */
export default async function téléchargerNouveauxFichiers(
  candidatsFichiers: Map<DossierDS88444["number"], DSFile[]>,
  transaction?: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]>> {
  const candidatsFichiersBDD: Map<DossierDS88444["number"], FichierÀTélécharger[]> = new Map(
    [...candidatsFichiers].map(([number, fichiers]) => {
      return [
        number,
        fichiers.map(({ filename, contentType, checksum, createdAt, url }) => ({
          nom: filename,
          media_type: DScontentTypeToActualMediaType({ filename, contentType }),
          DS_checksum: checksum,
          DS_createdAt: new Date(createdAt),
          url,
        })),
      ];
    }),
  );

  // Chercher dans la base de données les fichiers que nous avons déjà et qui ressemblent aux candidats
  const fichiersDéjaEnBDD = await trouverFichiersExistants(
    [...candidatsFichiersBDD.values()].flat(),
    transaction,
  );

  const fichierIdParHashDéjàEnBDD = new Map(
    // @ts-ignore
    fichiersDéjaEnBDD.map((f) => [makeFichierHash(f), f.id]),
  );

  //console.log('fichiersDéjaEnBDD', fichiersDéjaEnBDD)
  //console.log('candidatsFichiersBDD', candidatsFichiersBDD)

  // Filtrer la liste des candidats en enlevant les fichiers déjà présents en base de données
  const fichiersÀTélécharger: typeof candidatsFichiersBDD = new Map(
    // @ts-ignore
    [...candidatsFichiersBDD]
      .map(([number, fichiers]) => {
        return [number, fichiers.filter((f) => !fichierIdParHashDéjàEnBDD.has(makeFichierHash(f)))];
      })
      // @ts-ignore
      .filter(([_, fichiers]) => fichiers.length >= 1),
  );

  //console.log('fichiersÀTélécharger', fichiersÀTélécharger.size)

  type ReturnMapEntryData = [DossierDS88444["number"], FileId[]];

  // Télécharger les fichiers et les mettre directement en base de données
  // @ts-ignore
  const retMapDataPs: Promise<ReturnMapEntryData | undefined>[] = [...fichiersÀTélécharger].map(
    ([number, fichiers]) => {
      return Promise.all(
        fichiers.map(async (fichier) => {
          const { url } = fichier;
          const { DS_checksum, DS_createdAt, media_type, nom } = fichier;

          let buffer: Buffer;
          try {
            const { contenu } = await téléchargerFichierDS(url);
            buffer = Buffer.from(contenu);
          } catch (err) {
            if (err instanceof HTTPError) {
              console.error(
                `Erreur HTTP ${err.response.status} lors du téléchagement de l'url`,
                url,
                `dossier DS`,
                number,
              );
            } else {
              console.error(
                `Erreur lors du téléchargement d'un fichier`,
                url,
                `dossier DS`,
                number,
                // @ts-ignore
                err.message,
                // @ts-ignore
                err.cause ? `cause: ${err.cause?.message}` : "",
              );
            }
            return undefined;
          }

          try {
            const fichierInséré = await stockerNouveauFichier(
              { nom, contenu: buffer, media_type, DS_checksum, DS_createdAt },
              transaction,
            );
            console.log(
              `Dossier DS`,
              number,
              `- Téléchargement et stockage fichier '${nom}'`,
              `(${byteSize(buffer.byteLength)})`,
            );
            return fichierInséré.id;
          } catch (err) {
            console.error(
              `Échec stockage fichier pour`,
              url,
              `dossier DS`,
              number,
              // @ts-ignore
              err.message,
            );
            return undefined;
          }
        }),
      ).then((fichiersTéléchargés) => {
        const fichiersTéléchargésAvecSuccès = fichiersTéléchargés.filter((f) => f !== undefined);

        if (fichiersTéléchargésAvecSuccès.length >= 1) {
          return [number, fichiersTéléchargésAvecSuccès];
        } else {
          return undefined;
        }
      });
    },
  );

  const nouveauxFichiersParDossier = new Map(
    (await Promise.all(retMapDataPs)).filter((x): x is ReturnMapEntryData => x !== undefined),
  );

  // Pour chaque dossier, on retourne les ids de tous les fichiers qui le concernent — qu'ils
  // viennent d'être téléchargés ou qu'ils étaient déjà en BDD (matchés par hash). Le consommateur
  // peut ainsi créer les arêtes de jointure dans les deux cas.
  const fichiersParDossier = new Map<DossierDS88444["number"], FileId[]>();
  for (const [numéroDossier, candidats] of candidatsFichiersBDD) {
    const idsFichiersDéjàEnBDD = candidats
      .map((c) => fichierIdParHashDéjàEnBDD.get(makeFichierHash(c)))
      .filter((id): id is FileId => id !== undefined);

    const idsFichiersNouveaux = nouveauxFichiersParDossier.get(numéroDossier) ?? [];

    const tousLesIds = [...idsFichiersDéjàEnBDD, ...idsFichiersNouveaux];

    if (tousLesIds.length >= 1) fichiersParDossier.set(numéroDossier, tousLesIds);
  }

  return fichiersParDossier;
}
