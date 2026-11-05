import { promisify } from "node:util";
import { constants, gzip } from "node:zlib";

const gzipAsync = promisify(gzip);
const minimumCompressionBytes = 16 * 1024;

function encodingWeights(acceptEncoding: string | null): Map<string, number> {
  const weights = new Map<string, number>();
  for (const item of acceptEncoding?.split(",") ?? []) {
    const [coding, ...parameters] = item.trim().toLowerCase().split(";");
    const parameter = parameters.find((value) => value.trim().startsWith("q="));
    const value = parameter?.trim().slice(2).trim();
    const quality =
      value === undefined
        ? 1
        : /^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/u.test(value)
          ? Number(value)
          : 0;
    weights.set(coding.trim(), Math.max(weights.get(coding.trim()) ?? 0, quality));
  }
  return weights;
}

/** Keep the complete searchable dossier payload private and compress only negotiated responses. */
export async function dossierListResponse(
  data: unknown,
  acceptEncoding: string | null,
): Promise<Response> {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "private, no-store",
    vary: "Accept-Encoding",
  });
  const weights = encodingWeights(acceptEncoding);
  const gzipWeight = weights.get("gzip") ?? weights.get("*") ?? 0;
  const identityWeight = weights.get("identity") ?? (weights.get("*") === 0 ? 0 : 1);
  if (gzipWeight === 0 && identityWeight === 0) {
    return new Response(null, { status: 406, headers });
  }

  let body = new TextEncoder().encode(JSON.stringify(data));
  const prefersGzip =
    gzipWeight > 0 && (weights.get("identity") === undefined || gzipWeight >= identityWeight);
  if (prefersGzip && (body.byteLength >= minimumCompressionBytes || identityWeight === 0)) {
    // Await compression so errors reach the normal HTTP error handler before any body is sent.
    // The asynchronous zlib API keeps this CPU work off the request's JavaScript thread.
    body = new Uint8Array(await gzipAsync(body, { level: constants.Z_BEST_SPEED }));
    headers.set("content-encoding", "gzip");
  }
  headers.set("content-length", String(body.byteLength));
  return new Response(body, { headers });
}
