import ky from "ky";
import pLimit from "p-limit";

const TIMEOUT_DELAY = 20 * 1000; // ms

async function _telechargerFichierDS(
  url: string,
): Promise<{ mediaType: string | null; contenu: ArrayBuffer }> {
  try {
    const reponseSansBody = await ky.get(url, {
      timeout: TIMEOUT_DELAY,
    });

    const mediaType = reponseSansBody?.headers?.get("Content-Type");

    const reponse = await reponseSansBody.arrayBuffer();

    return {
      mediaType,
      contenu: reponse,
    };
  } catch (err) {
    // @ts-ignore
    if (err.name === "TimeoutError") {
      const message = `\nTimeout d'une requête HTTP vers DS après ${TIMEOUT_DELAY / 1000} secondes\n\n`;
      const erreurSimple = new Error(message);
      console.error(message);
      throw erreurSimple;
    }

    throw err;
  }
}

/**
 * In order not to overload DS, we limit the number of simultaneous downloads
 * A small number is more accommodating for DS,
 * but reduces our performance
 * A large number increases our parallelism and probably our performance (up to a limit),
 * but overloads DS more
 *
 */
const NOMBRE_MAX_TELECHARGEMENTS_SIMULTANES = 6;
const fenetre = pLimit(NOMBRE_MAX_TELECHARGEMENTS_SIMULTANES);

export default async function telechargerFichierDS(
  url: string,
): Promise<{ mediaType: string | null; contenu: ArrayBuffer }> {
  return fenetre(() => _telechargerFichierDS(url));
}
