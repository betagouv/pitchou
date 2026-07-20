import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { GetObjectCommand } from "@aws-sdk/client-s3";

async function readKey(key: string): Promise<Buffer> {
  const { client, bucket } = await getTestS3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Buffer[] = [];
  for await (const c of res.Body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

test("POST /avis-expert avec saisine + avis envoie les deux fichiers sur S3 et les lie en BDD", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const saisineBytes = Buffer.from("SAISINE-PDF");
  const avisBytes = Buffer.from("AVIS-PDF");

  const form = new FormData();
  form.set("dossier", JSON.stringify(dossier.id));
  form.set("expert", "CSRPN");
  form.set("avis", "Favorable");
  form.set("saisine_date", new Date("2026-04-01").toISOString());
  form.set("avis_date", new Date("2026-05-01").toISOString());
  form.set(
    "blobFichierSaisine",
    new File([saisineBytes], "saisine.pdf", { type: "application/pdf" }),
  );
  form.set("blobFichierAvis", new File([avisBytes], "avis.pdf", { type: "application/pdf" }));

  const res = await fetch(`${INTEGRATION_BASE_URL}/avis-expert?cap=${cap}`, {
    method: "POST",
    headers: { Origin: new URL(INTEGRATION_BASE_URL).origin },
    body: form,
  });

  expect(res.status, await res.text()).toBe(204);

  const rows = await db("avis_expert").select("*").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  const ae = rows[0];
  expect(ae.saisine_fichier).not.toBeNull();
  expect(ae.avis_fichier).not.toBeNull();

  // the bytes on S3 must match what was uploaded
  const fileIdToBytes = new Map([
    [ae.saisine_fichier, saisineBytes],
    [ae.avis_fichier, avisBytes],
  ]);
  for (const [fileId, expectedBytes] of fileIdToBytes) {
    const onS3 = await readKey(`files/${fileId}`);
    expect(onS3.equals(expectedBytes)).toBe(true);
  }
});

test("POST /avis-expert rejette une date invalide", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const form = new FormData();
  form.set("dossier", JSON.stringify(dossier.id));
  form.set("expert", "CSRPN");
  form.set("saisine_date", "date-invalide");

  const res = await fetch(`${INTEGRATION_BASE_URL}/avis-expert?cap=${cap}`, {
    method: "POST",
    headers: { Origin: new URL(INTEGRATION_BASE_URL).origin },
    body: form,
  });

  expect(res.status).toBe(400);
  expect(await db("avis_expert").where({ dossier: dossier.id })).toHaveLength(0);
});
