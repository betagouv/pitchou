import { extname } from "node:path";
import byteSize from "byte-size";
import { HTTPError } from "ky";

import {
  makeFichierHash,
  storeNewFichier,
  findExistingFichiers,
} from "@pitchou/server/database/fichier.ts";

import downloadFichierDS from "./downloadFichierDS.ts";

import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { Knex } from "knex";

type FichierToDownload = {
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
 * Workaround for https://github.com/demarches-simplifiees/demarches-simplifiees.fr/issues/11175
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
 * This function starts the downloads, saves the files in the database
 * and returns the association between the dossier and the corresponding Fichier['id']
 */
export default async function downloadNewFichiers(
  candidateFichiers: Map<DossierDS88444["number"], DSFile[]>,
  transaction?: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]>> {
  const candidateFichiersDB: Map<DossierDS88444["number"], FichierToDownload[]> = new Map(
    [...candidateFichiers].map(([number, fichiers]) => {
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

  // Look up in the database the files we already have that resemble the candidates
  const fichiersAlreadyInDB = await findExistingFichiers(
    [...candidateFichiersDB.values()].flat(),
    transaction,
  );

  const fichierIdByHashAlreadyInDB = new Map(
    // @ts-ignore
    fichiersAlreadyInDB.map((f) => [makeFichierHash(f), f.id]),
  );

  //console.log('fichiersDéjaEnBDD', fichiersDéjaEnBDD)
  //console.log('candidateFichiersDB', candidateFichiersDB)

  // Filter the candidate list by removing the files already present in the database
  const fichiersToDownload: typeof candidateFichiersDB = new Map(
    // @ts-ignore
    [...candidateFichiersDB]
      .map(([number, fichiers]) => {
        return [
          number,
          fichiers.filter((f) => !fichierIdByHashAlreadyInDB.has(makeFichierHash(f))),
        ];
      })
      // @ts-ignore
      .filter(([_, fichiers]) => fichiers.length >= 1),
  );

  //console.log('fichiersÀTélécharger', fichiersÀTélécharger.size)

  type ReturnMapEntryData = [DossierDS88444["number"], FileId[]];

  // Download the files and put them directly into the database
  // @ts-ignore
  const retMapDataPs: Promise<ReturnMapEntryData | undefined>[] = [...fichiersToDownload].map(
    ([number, fichiers]) => {
      return Promise.all(
        fichiers.map(async (fichier) => {
          const { url } = fichier;
          const { DS_checksum, DS_createdAt, media_type, nom } = fichier;

          let buffer: Buffer;
          try {
            const { contenu } = await downloadFichierDS(url);
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
            const insertedFichier = await storeNewFichier(
              { nom, contenu: buffer, media_type, DS_checksum, DS_createdAt },
              transaction,
            );
            console.log(
              `Dossier DS`,
              number,
              `- Téléchargement et stockage fichier '${nom}'`,
              `(${byteSize(buffer.byteLength)})`,
            );
            return insertedFichier.id;
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
      ).then((downloadedFichiers) => {
        const successfullyDownloadedFichiers = downloadedFichiers.filter((f) => f !== undefined);

        if (successfullyDownloadedFichiers.length >= 1) {
          return [number, successfullyDownloadedFichiers];
        } else {
          return undefined;
        }
      });
    },
  );

  const newFichiersByDossier = new Map(
    (await Promise.all(retMapDataPs)).filter((x): x is ReturnMapEntryData => x !== undefined),
  );

  // For each dossier, we return the ids of all the files that concern it — whether they
  // were just downloaded or were already in the database (matched by hash). This lets the
  // consumer create the join edges in both cases.
  const fichiersByDossier = new Map<DossierDS88444["number"], FileId[]>();
  for (const [dossierNumber, candidates] of candidateFichiersDB) {
    const fichierIdsAlreadyInDB = candidates
      .map((c) => fichierIdByHashAlreadyInDB.get(makeFichierHash(c)))
      .filter((id): id is FileId => id !== undefined);

    const newFichierIds = newFichiersByDossier.get(dossierNumber) ?? [];

    const allIds = [...fichierIdsAlreadyInDB, ...newFichierIds];

    if (allIds.length >= 1) fichiersByDossier.set(dossierNumber, allIds);
  }

  return fichiersByDossier;
}
