import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createFichierS3, createInstructeurWithDossier } from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

function download(route: string, fileId: string, cap: string, lecture = false) {
  return fetch(
    `${INTEGRATION_BASE_URL}/${route}/fichier/${fileId}?cap=${cap}${lecture ? "&lecture=1" : ""}`,
  );
}

test("a deduplicated saisine is downloadable by the second dossier's owner, but not in read-only", async () => {
  const first = await createInstructeurWithDossier(db, { nomGroupe: "First service" });
  const second = await createInstructeurWithDossier(db, { nomGroupe: "Second service" });
  const reader = await createInstructeurWithDossier(db, { nomGroupe: "Reader service" });
  const file = await createFichierS3(db, await getTestS3());
  for (const { dossier } of [first, second]) {
    await db("avis_expert").insert({
      dossier: dossier.id,
      expert: "CNPN",
      saisine_fichier: file.id,
    });
  }

  for (const { cap } of [first, second]) {
    const response = await download("avis-expert", file.id, cap);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(file.bytes);
    expect((await download("avis-expert", file.id, cap, true)).status).toBe(404);
  }
  expect((await download("avis-expert", file.id, reader.cap)).status).toBe(404);
});

test("read-only accepts a later official avis even on the same dossier", async () => {
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner service" });
  const reader = await createInstructeurWithDossier(db, { nomGroupe: "Reader service" });
  const file = await createFichierS3(db, await getTestS3());
  for (const expert of ["Autre expert", "CNPN"]) {
    await db("avis_expert").insert({
      dossier: owner.dossier.id,
      expert,
      avis_fichier: file.id,
    });
  }

  expect((await download("avis-expert", file.id, reader.cap)).status).toBe(200);
  expect((await download("avis-expert", file.id, owner.cap, true)).status).toBe(200);
});

test("route, dossier access and read-only policy must all allow the same attachment", async () => {
  const foreign = await createInstructeurWithDossier(db, { nomGroupe: "Foreign service" });
  const owner = await createInstructeurWithDossier(db, { nomGroupe: "Owner service" });
  const file = await createFichierS3(db, await getTestS3());
  await db("avis_expert").insert({
    dossier: foreign.dossier.id,
    expert: "CNPN",
    saisine_fichier: file.id,
  });
  await db("other_attachment").insert({
    dossier: owner.dossier.id,
    fichier: file.id,
    type: "Autre",
  });
  await db("decision_administrative").insert({
    dossier: foreign.dossier.id,
    fichier: file.id,
    type: "Arrêté dérogation",
  });

  // Owning the other attachment must not unlock the foreign saisine's route.
  expect((await download("avis-expert", file.id, owner.cap)).status).toBe(404);
  expect((await download("attachment-autre", file.id, owner.cap)).status).toBe(200);
  expect((await download("attachment-autre", file.id, owner.cap, true)).status).toBe(404);
  expect((await download("attachment-autre", file.id, foreign.cap)).status).toBe(404);

  // Global read access allows the decision, not every relation to the same bytes.
  expect((await download("decision-administrative", file.id, owner.cap)).status).toBe(200);
  expect((await download("decision-administrative", file.id, owner.cap, true)).status).toBe(200);
  expect((await download("avis-expert", file.id, owner.cap, true)).status).toBe(404);
  expect((await download("piece-jointe-petitionnaire", file.id, owner.cap)).status).toBe(404);
});
