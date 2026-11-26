import { Readable } from "node:stream";
import { error } from "@sveltejs/kit";
import { loadFichierContent, loadStoredFichier } from "@pitchou/server/database/fichier.ts";
import type File from "@pitchou/types/database/public/File.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export async function downloadFichierResponse(fileId: FileId): Promise<Response> {
  const fichier = await loadFichierContent(fileId);
  if (!fichier) {
    error(404, "Fichier non trouvé");
  }
  return fichierResponse(fichier);
}

export async function downloadStoredFichierResponse(
  file: Pick<File, "id" | "name" | "media_type" | "size">,
  headOnly: boolean,
): Promise<Response> {
  const fichier = headOnly ? file : await loadStoredFichier(file);
  return fichierResponse({
    ...fichier,
    media_type: fichier.media_type || "application/octet-stream",
  });
}

function fichierResponse(fichier: {
  name: string;
  media_type: string | null;
  size?: string | number;
  body?: Readable;
}): Response {
  const asciiName = fichier.name
    .normalize("NFD")
    // strip diacritics
    .replaceAll(/[\u0300-\u036F]/gu, "")
    // Keep printable ASCII in the header fallback.
    .replaceAll(/[^\u0020-\u007E]/gu, "")
    .replaceAll(/["\\]/gu, "\\$&");
  const encodedName = encodeURIComponent(fichier.name).replaceAll(
    /['()*]/gu,
    (character) => `%${character.codePointAt(0)!.toString(16).toUpperCase()}`,
  );

  const headers = new Headers();
  headers.set(
    "content-disposition",
    `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
  );
  if (fichier.media_type) {
    headers.set("content-type", fichier.media_type);
  }
  if (fichier.size !== undefined && fichier.size !== "") {
    headers.set("content-length", String(fichier.size));
  }

  if (!fichier.body) return new Response(null, { headers });
  const body =
    fichier.body instanceof Readable
      ? (Readable.toWeb(fichier.body) as ReadableStream)
      : (fichier.body as unknown as BodyInit);

  return new Response(body, { headers });
}
