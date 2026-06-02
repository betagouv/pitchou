import { expect, test } from "vitest";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { stockerNouveauFichier } from "$server/database/fichier.js";

async function readS3Body(key: string): Promise<Buffer> {
  const { client, bucket } = await getTestS3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Buffer[] = [];
  for await (const c of res.Body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

test("stockerNouveauFichier insère file + fichier et stocke l'objet sur S3", async () => {
  const bytes = Buffer.from("hello s3 happy path");
  const fichier = await stockerNouveauFichier(
    { nom: "saisine.pdf", contenu: bytes, media_type: "application/pdf" },
    db,
  );

  const files = await db("file").select("*");
  expect(files).toHaveLength(1);
  expect(files[0].nom).toBe("saisine.pdf");
  expect(files[0].media_type).toBe("application/pdf");
  expect(String(files[0].taille)).toBe(String(bytes.byteLength));

  const fichiers = await db("fichier").select("*").where({ id: fichier.id });
  expect(fichiers).toHaveLength(1);
  expect(fichiers[0].contenu).toBeNull();
  expect(fichiers[0].file_id).toBe(files[0].id);

  const onS3 = await readS3Body(`files/${files[0].id}`);
  expect(onS3.equals(bytes)).toBe(true);
});

test("stockerNouveauFichier propage le content-type sur l'objet S3", async () => {
  const fichier = await stockerNouveauFichier(
    { nom: "image.png", contenu: Buffer.from("PNG"), media_type: "image/png" },
    db,
  );
  const file = await db("file")
    .select("id")
    .where({ id: db("fichier").select("file_id").where({ id: fichier.id }) })
    .first();

  const { client, bucket } = await getTestS3();
  const head = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `files/${file.id}` }));
  expect(head.ContentType).toBe("image/png");
});
