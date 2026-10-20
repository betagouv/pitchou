import type File from "@pitchou/types/database/public/File.ts";
import type { DossierFull, FrontEndFichier } from "@pitchou/types/API_Pitchou.ts";
import type { AvisWithFiles } from "../fullQueries.ts";
import type CapDossier from "@pitchou/types/database/public/CapDossier.ts";

/**
 * The download routes authorize on the cap, so every file URL handed to the
 * browser carries the cap the dossier was fetched with — the same way the
 * capability URLs do.
 */
export function fichierUrl(route: string, id: File["id"], cap: CapDossier["cap"]): string {
  return `${route}/${id}?cap=${encodeURIComponent(cap)}`;
}

export function describeFichier(
  id: File["id"] | null | undefined,
  name: File["name"],
  media_type: File["media_type"],
  size: number | null,
  route: string,
  cap: CapDossier["cap"],
  created_at?: File["created_at"] | null,
): FrontEndFichier | undefined {
  return id
    ? {
        id,
        url: fichierUrl(route, id, cap),
        name: name as string,
        media_type: media_type as string,
        size,
        ...(created_at ? { created_at } : {}),
      }
    : undefined;
}

export function formatAvis(
  avisRows: AvisWithFiles[],
  cap: CapDossier["cap"],
): DossierFull["avisExpert"] {
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
        cap,
        avis_file_created_at,
      );
      const saisineFile = describeFichier(
        saisine_fichier,
        saisine_file_name,
        saisine_fichier_media_type,
        saisine_file_size,
        "/avis-expert/fichier",
        cap,
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
