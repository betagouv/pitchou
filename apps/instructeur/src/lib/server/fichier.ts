import { Readable } from "node:stream";
import { error } from "@sveltejs/kit";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export async function downloadFichierResponse(fileId: FileId): Promise<Response> {
  const fichier = await loadFichierContent(fileId);
  if (!fichier) {
    error(404, "Fichier non trouvé");
  }

  const nomAscii = fichier.name
    .normalize("NFD")
    // strip diacritics
    .replaceAll(/[\u0300-\u036F]/gu, "")
    // Keep printable ASCII in the header fallback.
    .replaceAll(/[^\u0020-\u007E]/gu, "");

  const headers = new Headers();
  headers.set(
    "content-disposition",
    `attachment; filename="${nomAscii}"; filename*=UTF-8''${encodeURI(fichier.name)}`,
  );
  if (fichier.media_type) {
    headers.set("content-type", fichier.media_type);
  }
  if (fichier.size !== undefined) {
    headers.set("content-length", String(fichier.size));
  }

  const body =
    fichier.body instanceof Readable
      ? (Readable.toWeb(fichier.body) as ReadableStream)
      : (fichier.body as unknown as BodyInit);

  return new Response(body, { headers });
}
