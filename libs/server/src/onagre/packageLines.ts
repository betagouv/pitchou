import { StringDecoder } from "node:string_decoder";
import { createGunzip } from "node:zlib";
import { Readable } from "node:stream";

export async function* packageLines(stream: AsyncIterable<Uint8Array>, compressed: boolean) {
  const input = Readable.from(stream);
  const decoded = compressed ? input.pipe(createGunzip()) : input;
  const decoder = new StringDecoder("utf8");
  let pending = "";
  let size = 0;
  const forwardError = (error: Error) => decoded.destroy(error);
  input.on("error", forwardError);
  try {
    for await (const chunk of decoded) {
      size += chunk.length;
      if (size > 2 * 1024 ** 3) throw new Error("Le contenu décompressé dépasse 2 Go.");
      pending += decoder.write(chunk);
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) {
        if (end > 64 * 1024 ** 2) throw new Error("Bloc de données trop volumineux.");
        yield pending.slice(0, end);
        pending = pending.slice(end + 1);
      }
      if (pending.length > 64 * 1024 ** 2) throw new Error("Bloc de données trop volumineux.");
    }
    pending += decoder.end();
    if (pending) yield pending;
  } finally {
    input.off("error", forwardError);
    input.destroy();
    decoded.destroy();
  }
}
