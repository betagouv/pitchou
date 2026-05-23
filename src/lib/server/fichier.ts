import { error } from "@sveltejs/kit";
import { getFichier } from "$server/database/fichier.js";
import type Fichier from "$types/database/public/Fichier.ts";

export async function téléchargementFichierResponse(fichierId: Fichier["id"]): Promise<Response> {
  const fichier = await getFichier(fichierId);
  if (!fichier) {
    error(404, "Fichier non trouvé");
  }

  const nomAscii = fichier.nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\x00-\x7F]/g, ""); // strip remaining non-ASCII

  const headers = new Headers();
  // both content-disposition forms kept for browser compatibility
  // https://developer.mozilla.org/fr/docs/Web/HTTP/Reference/Headers/Content-Disposition
  headers.append("content-disposition", `attachment; filename="${nomAscii}"`);
  headers.append("content-disposition", `attachment; filename*=UTF-8''${encodeURI(fichier.nom)}`);
  if (fichier.media_type) {
    headers.set("content-type", fichier.media_type);
  }

  return new Response(fichier.contenu as BodyInit, { headers });
}
