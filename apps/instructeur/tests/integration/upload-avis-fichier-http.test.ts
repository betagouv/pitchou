import { fetchAuthenticated } from "../helpers/auth.ts";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import { putPendingUpload, readS3Body, s3HasKey } from "../helpers/fileStorage.ts";

function postAvis(cap: string, body: unknown) {
  return fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/avis-expert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("POST /avis-expert avec saisine + avis enregistre les deux fichiers envoyés au stockage et les lie en BDD", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const saisine = await putPendingUpload("SAISINE-PDF", "saisine.pdf");
  const avis = await putPendingUpload("AVIS-PDF", "avis.pdf");

  const res = await postAvis(cap, {
    dossier: dossier.id,
    expert: "CSRPN",
    avis: "Favorable",
    saisine_date: new Date("2026-04-01").toISOString(),
    avis_date: new Date("2026-05-01").toISOString(),
    saisine_fichier_upload: saisine,
    avis_fichier_upload: avis,
  });

  expect(res.status, await res.text()).toBe(204);

  const rows = await db("avis_expert").select("*").where({ dossier: dossier.id });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ saisine_fichier: saisine.id, avis_fichier: avis.id });

  // the objects moved from pending/ to files/, and the rows carry storage's size + type
  for (const [upload, bytes] of [
    [saisine, "SAISINE-PDF"],
    [avis, "AVIS-PDF"],
  ] as const) {
    expect(await readS3Body(`files/${upload.id}`)).toBe(bytes);
    expect(await s3HasKey(`pending/${upload.id}`)).toBe(false);
    expect(await db("file").where({ id: upload.id }).first()).toMatchObject({
      name: upload.name,
      media_type: "application/pdf",
      size: String(bytes.length),
    });
  }
});

test("POST /avis-expert rejette une date invalide", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await postAvis(cap, {
    dossier: dossier.id,
    expert: "CSRPN",
    saisine_date: "date-invalide",
  });

  expect(res.status).toBe(400);
  expect(await db("avis_expert").where({ dossier: dossier.id })).toHaveLength(0);
});

test("POST /avis-expert refuse un fichier jamais reçu par le stockage sans créer l'avis", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await postAvis(cap, {
    dossier: dossier.id,
    expert: "CSRPN",
    avis_fichier_upload: { id: "0f4b1e3c-7d2a-4c5e-9b1f-2a3c4d5e6f70", name: "avis.pdf" },
  });

  expect(res.status).toBe(400);
  expect(await res.text()).toMatch(/n'a pas été reçu/);
  expect(await db("avis_expert").where({ dossier: dossier.id })).toHaveLength(0);
  expect(await db("file")).toHaveLength(0);
});

test("POST /avis-expert refuse une référence de fichier malformée", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email: "instr@test.fr" });

  const res = await postAvis(cap, {
    dossier: dossier.id,
    expert: "CSRPN",
    avis_fichier_upload: { id: "../files/other", name: "avis.pdf" },
  });

  expect(res.status).toBe(400);
});
