import ky from "ky";
import pLimit from "p-limit";

const TIMEOUT_DELAY = 20 * 1000; // ms

async function _downloadFichierDS(
  url: string,
): Promise<{ mediaType: string | null; content: ArrayBuffer }> {
  try {
    const responseWithoutBody = await ky.get(url, {
      timeout: TIMEOUT_DELAY,
    });

    const mediaType = responseWithoutBody?.headers?.get("Content-Type");

    const response = await responseWithoutBody.arrayBuffer();

    return {
      mediaType,
      content: response,
    };
  } catch (err) {
    // @ts-ignore
    if (err.name === "TimeoutError") {
      const message = `\nTimeout d'une requête HTTP vers DS après ${TIMEOUT_DELAY / 1000} secondes\n\n`;
      const simpleError = new Error(message);
      console.error(message);
      throw simpleError;
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
const MAX_SIMULTANEOUS_DOWNLOADS = 6;
const concurrencyLimit = pLimit(MAX_SIMULTANEOUS_DOWNLOADS);

export default async function downloadFichierDS(
  url: string,
): Promise<{ mediaType: string | null; content: ArrayBuffer }> {
  return concurrencyLimit(() => _downloadFichierDS(url));
}
