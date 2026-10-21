import type File from "@pitchou/types/database/public/File.ts";
import type { DossierFull, FrontEndFichier } from "@pitchou/types/API_Pitchou.ts";
import type { AvisWithFiles } from "../fullQueries.ts";

// Downloads authenticate through the session cookie. File links contain no credentials.
export function fichierUrl(route: string, id: File["id"]): string {
  return `${route}/${id}`;
}

export function describeFichier(
  id: File["id"] | null | undefined,
  name: File["name"],
  media_type: File["media_type"],
  size: number | null,
  route: string,
  created_at?: File["created_at"] | null,
): FrontEndFichier | undefined {
  return id
    ? {
        id,
        url: fichierUrl(route, id),
        name: name as string,
        media_type: media_type as string,
        size,
        ...(created_at ? { created_at } : {}),
      }
    : undefined;
}

export function formatAvis(avisRows: AvisWithFiles[]): DossierFull["avisExpert"] {
  return avisRows.map(
    ({
      avis_fichier,
      avis_file_name,
      avis_fichier_media_type,
      avis_file_size,
      avis_file_created_at,
      saisine_fichier,
      saisine_file_name,
      saisine_fichier_media_type,
      saisine_file_size,
      saisine_file_created_at,
      ...avis
    }) => {
      const avisFile = describeFichier(
        avis_fichier,
        avis_file_name,
        avis_fichier_media_type,
        avis_file_size,
        "/avis-expert/fichier",
        avis_file_created_at,
      );
      const saisineFile = describeFichier(
        saisine_fichier,
        saisine_file_name,
        saisine_fichier_media_type,
        saisine_file_size,
        "/avis-expert/fichier",
        saisine_file_created_at,
      );
      return {
        ...avis,
        avis_fichier_url: avisFile?.url,
        saisine_fichier_url: saisineFile?.url,
        avis_fichier_description: avisFile,
        saisine_fichier_description: saisineFile,
      };
    },
  );
}
