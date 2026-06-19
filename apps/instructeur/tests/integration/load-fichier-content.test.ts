import { Readable } from "node:stream";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createFichier, createFichierS3 } from "../factories/fichier.ts";
import { loadFichierContent } from "@pitchou/server/database/fichier.ts";
import type { FichierId } from "@pitchou/types/database/public/Fichier.ts";

async function readToBuffer(body: Buffer | Readable): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  const chunks: Buffer[] = [];
  for await (const c of body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

test("loadFichierContent renvoie le blob bytea pour un fichier legacy", async () => {
  const bytes = Buffer.from("legacy blob bytes");
  const fichier = await createFichier(db, { nom: "old.pdf", contenu: bytes });

  const content = await loadFichierContent(fichier.id, db);

  expect(content).not.toBeNull();
  expect(content!.nom).toBe("old.pdf");
  expect(content!.media_type).toBe("application/pdf");
  expect(Buffer.isBuffer(content!.body)).toBe(true);
  expect((await readToBuffer(content!.body)).equals(bytes)).toBe(true);
  expect(content!.taille).toBe(bytes.byteLength);
});

test("loadFichierContent renvoie le stream S3 pour un fichier stocké via file_id", async () => {
  const s3 = await getTestS3();
  const bytes = Buffer.from("bytes living on S3");
  const fichier = await createFichierS3(db, s3, { nom: "s3.pdf", bytes });

  const content = await loadFichierContent(fichier.id, db);

  expect(content).not.toBeNull();
  expect(content!.nom).toBe("s3.pdf");
  expect(content!.media_type).toBe("application/pdf");
  expect(content!.body).toBeInstanceOf(Readable);
  expect((await readToBuffer(content!.body)).equals(bytes)).toBe(true);
  expect(content!.taille).toBe(bytes.byteLength);
});

test("loadFichierContent renvoie null pour un fichier inexistant", async () => {
  const result = await loadFichierContent("00000000-0000-0000-0000-000000000000" as FichierId, db);
  expect(result).toBeNull();
});
