import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createDossier, createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { readS3Body, s3HasKey } from "../helpers/fileStorage.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requestUploadUrls(cap: string, body: unknown) {
  return fetch(`${INTEGRATION_BASE_URL}/fichier/upload-url?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("le navigateur obtient une URL signée, y envoie le fichier, puis l'API l'enregistre", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const bytes = Buffer.from("%PDF-1.4 signed upload");

  const res = await requestUploadUrls(cap, {
    dossier: dossier.id,
    files: [{ size: bytes.length }],
  });
  expect(res.status, await res.clone().text()).toBe(200);
  const [upload] = (await res.json()) as { id: string; url: string }[];
  expect(upload.id).toMatch(UUID);
  expect(new URL(upload.url).pathname).toContain(`/pending/${upload.id}`);

  // The same PUT the browser performs, without any app credentials.
  const put = await fetch(upload.url, {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": "application/pdf" },
  });
  expect(put.status, await put.text()).toBe(200);
  expect(await s3HasKey(`pending/${upload.id}`)).toBe(true);

  const save = await fetch(`${INTEGRATION_BASE_URL}/decision-administrative?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dossier: dossier.id,
      type: "Arrêté dérogation",
      fichier_upload: { id: upload.id, name: "arrete.pdf" },
    }),
  });
  expect(save.status, await save.clone().text()).toBe(200);

  const decision = await db("decision_administrative").where({ dossier: dossier.id }).first();
  expect(decision.fichier).toBe(upload.id);
  expect(await readS3Body(`files/${upload.id}`)).toBe(bytes.toString());
  expect(await s3HasKey(`pending/${upload.id}`)).toBe(false);
});

test("la signature couvre la taille : un corps d'une autre taille est refusé par le stockage", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await requestUploadUrls(cap, { dossier: dossier.id, files: [{ size: 5 }] });
  const [upload] = (await res.json()) as { id: string; url: string }[];

  const put = await fetch(upload.url, { method: "PUT", body: Buffer.from("more than five bytes") });
  expect(put.status).toBe(403);
  expect(await s3HasKey(`pending/${upload.id}`)).toBe(false);
});

test("une demande pour plusieurs fichiers renvoie une URL distincte par fichier", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await requestUploadUrls(cap, {
    dossier: dossier.id,
    files: [{ size: 1 }, { size: 2 }],
  });
  const uploads = (await res.json()) as { id: string; url: string }[];
  expect(uploads).toHaveLength(2);
  expect(new Set(uploads.map((upload) => upload.id)).size).toBe(2);
});

test("refuse un fichier au-delà de la taille maximale", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await requestUploadUrls(cap, {
    dossier: dossier.id,
    files: [{ size: 1024 * 1024 * 1024 + 1 }],
  });
  expect(res.status).toBe(413);
});

test.each([
  ["sans fichier", { files: [] }],
  ["avec une taille nulle", { files: [{ size: 0 }] }],
  ["avec une taille non entière", { files: [{ size: 1.5 }] }],
  ["avec une propriété inconnue", { files: [{ size: 1, name: "x" }] }],
])("refuse une demande %s", async (_label, body) => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await requestUploadUrls(cap, { dossier: dossier.id, ...body });
  expect(res.status).toBe(400);
});

test("refuse une cap sans accès complet au dossier", async () => {
  const { cap } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });
  const otherDossier = await createDossier(db);

  const res = await requestUploadUrls(cap, { dossier: otherDossier.id, files: [{ size: 1 }] });
  expect(res.status).toBe(403);
});
