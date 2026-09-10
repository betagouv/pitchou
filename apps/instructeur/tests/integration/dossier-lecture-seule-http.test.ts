import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const COMMENTAIRE = "Commentaire interne au service";
const FREE_COMMENT = "Ancien commentaire libre";
const PRESCRIPTION = "Prescription à ne pas partager";
const CONTROLE_COMMENT = "Contrôle interne";

async function createFileRow(name: string) {
  const id = randomUUID();
  await db("file").insert({ id, name, media_type: "application/pdf", size: "1024" });
  return id;
}

/**
 * A dossier carrying one of everything read-only mode is meant to withhold, next
 * to what it is meant to share.
 */
async function createDossierWithEverything() {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instr@lecture-seule.fr",
  });

  await db("dossier").where({ id: dossier.id }).update({ free_comment: FREE_COMMENT });
  await db("commentaire").insert({
    dossier: dossier.id,
    personne: null,
    content: COMMENTAIRE,
    created_at: new Date(),
  });

  await db("avis_expert").insert([
    {
      dossier: dossier.id,
      expert: "CNPN",
      avis: "Favorable",
      avis_date: new Date("2026-03-01"),
      avis_fichier: await createFileRow("avis-cnpn.pdf"),
      saisine_date: new Date("2026-02-01"),
      saisine_fichier: await createFileRow("saisine-cnpn.pdf"),
    },
    {
      dossier: dossier.id,
      expert: "Autre expert",
      avis: "Réservé",
      avis_date: new Date("2026-03-02"),
      avis_fichier: await createFileRow("avis-autre.pdf"),
      saisine_date: new Date("2026-02-02"),
      saisine_fichier: await createFileRow("saisine-autre.pdf"),
    },
  ]);

  const [decision] = await db("decision_administrative")
    .insert({
      dossier: dossier.id,
      type: "Arrêté dérogation",
      number: "AP-001",
      fichier: await createFileRow("arrete.pdf"),
    })
    .returning(["id"]);
  const [prescription] = await db("prescription")
    .insert({
      decision_administrative: decision.id,
      article_number: "2",
      description: PRESCRIPTION,
    })
    .returning(["id"]);
  await db("controle").insert({ prescription: prescription.id, comment: CONTROLE_COMMENT });

  await db("other_attachment").insert({
    dossier: dossier.id,
    fichier: await createFileRow("piece-interne.pdf"),
    type: "Autre",
  });

  return { cap, dossierId: dossier.id };
}

function getDossier(cap: string, dossierId: number, readOnly: boolean) {
  const suffix = readOnly ? "&lecture=1" : "";
  return fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${cap}${suffix}`, {
    headers: { Accept: "application/json" },
  });
}

test("GET /dossier/:id?lecture=1 n'envoie rien qui soit interne au service", async () => {
  const { cap, dossierId } = await createDossierWithEverything();

  const response = await getDossier(cap, dossierId, true);
  expect(response.status).toBe(200);

  // What the browser actually receives, before any parsing: nothing withheld may
  // appear anywhere in it, however deeply nested.
  const body = await response.text();
  for (const withheld of [
    COMMENTAIRE,
    FREE_COMMENT,
    PRESCRIPTION,
    CONTROLE_COMMENT,
    "Autre expert",
    "saisine-cnpn.pdf",
    "saisine-autre.pdf",
    "avis-autre.pdf",
    "piece-interne.pdf",
  ]) {
    expect(body).not.toContain(withheld);
  }

  const dossier: DossierFull = JSON.parse(body);
  expect(dossier.avisExpert.map(({ expert }) => expert)).toEqual(["CNPN"]);
  expect(dossier.avisExpert[0]!.saisine_date).toBeNull();
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toBeUndefined();
  expect(dossier.otherAttachments).toEqual([]);
});

test("GET /dossier/:id?lecture=1 envoie ce qui est partagé", async () => {
  const { cap, dossierId } = await createDossierWithEverything();

  const response = await getDossier(cap, dossierId, true);
  const dossier: DossierFull = await response.json();

  expect(dossier.id).toBe(dossierId);
  // The avis of the CNPN and the décision administrative, both downloadable.
  expect(dossier.avisExpert[0]!.avis).toBe("Favorable");
  expect(dossier.avisExpert[0]!.avis_fichier_url).toBeTruthy();
  expect(dossier.decisionsAdministratives).toHaveLength(1);
  expect(dossier.decisionsAdministratives![0]!.number).toBe("AP-001");
  expect(dossier.decisionsAdministratives![0]!.fichier_url).toBeTruthy();
});

test("GET /dossier/:id sans le paramètre envoie le dossier entier", async () => {
  const { cap, dossierId } = await createDossierWithEverything();

  const response = await getDossier(cap, dossierId, false);
  const dossier: DossierFull = await response.json();

  // Without `lecture`, an instructeur keeps everything — the projection is the
  // only thing that withholds it, so this is what proves the test above.
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
  expect(dossier.free_comment).toBe(FREE_COMMENT);
  expect(dossier.avisExpert).toHaveLength(2);
  expect(dossier.avisExpert.every(({ saisine_date }) => saisine_date)).toBe(true);
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toHaveLength(1);
  expect(dossier.decisionsAdministratives![0]!.prescriptions![0]!.description).toBe(PRESCRIPTION);
  expect(dossier.otherAttachments).toHaveLength(1);
});
