import { Readable } from "node:stream";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichierS3 } from "../factories/fichier.ts";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

async function readToBuffer(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

test("loadFichierContent renvoie le stream S3 pour un fichier stocké via file", async () => {
  const s3 = await getTestS3();
  const bytes = Buffer.from("bytes living on S3");
  const fichier = await createFichierS3(db, s3, { name: "s3.pdf", bytes });

  const content = await loadFichierContent(fichier.id, db);

  expect(content).not.toBeNull();
  expect(content!.name).toBe("s3.pdf");
  expect(content!.media_type).toBe("application/pdf");
  expect(content!.body).toBeInstanceOf(Readable);
  expect((await readToBuffer(content!.body)).equals(bytes)).toBe(true);
  expect(content!.size).toBe(bytes.byteLength);
});

test("loadFichierContent renvoie null pour un fichier inexistant", async () => {
  const result = await loadFichierContent("00000000-0000-0000-0000-000000000000" as FileId, db);
  expect(result).toBeNull();
});
