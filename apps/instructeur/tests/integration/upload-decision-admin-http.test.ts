import { expect, test } from "vitest";
import { GetObjectCommand, HeadObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { db } from "../setup/db.ts";
import { getTestS3 } from "../setup/s3.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

async function s3HasKey(key: string): Promise<boolean> {
  const { client, bucket } = await getTestS3();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    if (e instanceof S3ServiceException && (e.name === "NotFound" || e.name === "NoSuchKey")) {
      return false;
    }
    throw e;
  }
}

async function readKey(key: string): Promise<Buffer> {
  const { client, bucket } = await getTestS3();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks: Buffer[] = [];
  for await (const c of res.Body as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  }
  return Buffer.concat(chunks);
}

test("POST /decision-administrative crée la décision et stocke le PDF sur S3", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const pdfBytes = Buffer.from("DECISION-PDF-V1");

  const res = await fetch(`${INTEGRATION_BASE_URL}/decision-administrative?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      numéro: "AP-001",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_base64: {
        name: "arrete.pdf",
        media_type: "application/pdf",
        contenuBase64: pdfBytes.toString("base64"),
      },
    }),
  });
  expect(res.status).toBe(200);

  const decisions = await db("decision_administrative").select("*").where({ dossier: dossier.id });
  expect(decisions).toHaveLength(1);
  const decision = decisions[0];
  expect(decision.fichier).not.toBeNull();

  const onS3 = await readKey(`files/${decision.fichier}`);
  expect(onS3.equals(pdfBytes)).toBe(true);
});

test("POST /decision-administrative en modification remplace le PDF S3 (best-effort cleanup ancien objet)", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const v1 = Buffer.from("DECISION-V1");
  const v2 = Buffer.from("DECISION-V2-DIFFERENT");

  // initial creation
  const res1 = await fetch(`${INTEGRATION_BASE_URL}/decision-administrative?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      numéro: "AP-002",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_base64: {
        name: "v1.pdf",
        media_type: "application/pdf",
        contenuBase64: v1.toString("base64"),
      },
    }),
  });
  expect(res1.status).toBe(200);
  const decision1 = await db("decision_administrative")
    .select("*")
    .where({ dossier: dossier.id })
    .first();
  const v1Key = `files/${decision1.fichier}`;

  // modification
  const res2 = await fetch(`${INTEGRATION_BASE_URL}/decision-administrative?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: decision1.id,
      dossier: dossier.id,
      numéro: "AP-002",
      type: "Arrêté dérogation",
      signature_date: new Date("2026-04-15").toISOString(),
      obligations_end_date: new Date("2031-04-15").toISOString(),
      fichier_base64: {
        name: "v2.pdf",
        media_type: "application/pdf",
        contenuBase64: v2.toString("base64"),
      },
    }),
  });
  expect(res2.status).toBe(200);

  const decision2 = await db("decision_administrative")
    .select("*")
    .where({ id: decision1.id })
    .first();
  expect(decision2.fichier).not.toBe(decision1.fichier);
  const v2Key = `files/${decision2.fichier}`;

  expect((await readKey(v2Key)).equals(v2)).toBe(true);
  // old object should have been swept
  expect(await s3HasKey(v1Key)).toBe(false);
});
