import { extname } from "node:path";
import { formatFileSize } from "@pitchou/common/fileSize.ts";
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
  name: string;
  url: string;
  media_type: string | null;
  demarche_numerique_checksum: string | null;
  demarche_numerique_created_at: Date | null;
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
function demarcheNumeriqueContentTypeToActualMediaType({
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

export default async function downloadNewFichiers(
  candidateFichiers: Map<DossierDS88444["number"], DSFile[]>,
  transaction?: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]>> {
  const candidateFichiersDB: Map<DossierDS88444["number"], FichierToDownload[]> = new Map(
    [...candidateFichiers].map(([number, fichiers]): [number, FichierToDownload[]] => [
      number,
      fichiers.map(({ filename, contentType, checksum, createdAt, url }) => ({
        name: filename,
        media_type: demarcheNumeriqueContentTypeToActualMediaType({ filename, contentType }),
        demarche_numerique_checksum: checksum,
        demarche_numerique_created_at: new Date(createdAt),
        url,
      })),
    ]),
  );

  const fichiersAlreadyInDB = await findExistingFichiers(
    [...candidateFichiersDB.values()].flat(),
    transaction,
  );

  const fichierIdByHashAlreadyInDB = new Map(
    fichiersAlreadyInDB.map((f) => [makeFichierHash(f), f.id]),
  );

  const fichiersToDownload: typeof candidateFichiersDB = new Map(
    [...candidateFichiersDB]
      .map(([number, fichiers]): [number, FichierToDownload[]] => [
        number,
        fichiers.filter((f) => !fichierIdByHashAlreadyInDB.has(makeFichierHash(f))),
      ])
      .filter(([, fichiers]) => fichiers.length > 0),
  );

  const downloadCandidates = [...fichiersToDownload].flatMap(([number, fichiers]) =>
    fichiers.map((fichier) => ({ number, fichier })),
  );
  const newFichiersByDossier = new Map<DossierDS88444["number"], FileId[]>();
  // Bound buffered downloads and serialize storage calls sharing the transaction.
  const downloadBatchSize = 5;
  for (let index = 0; index < downloadCandidates.length; index += downloadBatchSize) {
    const downloadedFichiers = await Promise.all(
      downloadCandidates
        .slice(index, index + downloadBatchSize)
        .map(async ({ number, fichier }) => ({
          number,
          fichier,
          buffer: await downloadFichier(fichier, number),
        })),
    );
    for (const { number, fichier, buffer } of downloadedFichiers) {
      if (!buffer) continue;
      const fileId = await storeFichier(fichier, buffer, number, transaction);
      if (fileId === undefined) continue;
      const fileIds = newFichiersByDossier.get(number) ?? [];
      fileIds.push(fileId);
      newFichiersByDossier.set(number, fileIds);
    }
  }

  const fichiersByDossier = new Map<DossierDS88444["number"], FileId[]>();
  for (const [dossierNumber, candidates] of candidateFichiersDB) {
    const fichierIdsAlreadyInDB = candidates
      .map((c) => fichierIdByHashAlreadyInDB.get(makeFichierHash(c)))
      .filter((id): id is FileId => id !== undefined);

    const newFichierIds = newFichiersByDossier.get(dossierNumber) ?? [];

    const allIds = [...fichierIdsAlreadyInDB, ...newFichierIds];

    if (allIds.length > 0) fichiersByDossier.set(dossierNumber, allIds);
  }

  return fichiersByDossier;
}

async function downloadFichier(fichier: FichierToDownload, number: DossierDS88444["number"]) {
  const { url } = fichier;
  try {
    const { content } = await downloadFichierDS(url);
    return Buffer.from(content);
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
        err instanceof Error ? err.message : String(err),
        err instanceof Error && err.cause
          ? `cause: ${err.cause instanceof Error ? err.cause.message : String(err.cause)}`
          : "",
      );
    }
  }
}

async function storeFichier(
  fichier: FichierToDownload,
  buffer: Buffer,
  number: DossierDS88444["number"],
  transaction?: Knex.Transaction | Knex,
) {
  const { url, demarche_numerique_checksum, demarche_numerique_created_at, media_type, name } =
    fichier;
  try {
    const insertedFichier = await storeNewFichier(
      {
        name,
        content: buffer,
        media_type,
        demarche_numerique_checksum,
        demarche_numerique_created_at,
      },
      transaction,
    );
    console.log(
      `Dossier DS`,
      number,
      `- Téléchargement et stockage fichier '${name}'`,
      `(${formatFileSize(buffer.byteLength)})`,
    );
    return insertedFichier.id;
  } catch (err) {
    console.error(
      `Échec stockage fichier pour`,
      url,
      `dossier DS`,
      number,
      err instanceof Error ? err.message : String(err),
    );
  }
}
