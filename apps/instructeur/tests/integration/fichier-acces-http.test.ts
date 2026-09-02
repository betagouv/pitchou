import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createFichierS3,
  createInstructeurWithDossier,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

/** Real bytes on S3, so an authorized download actually serves something. */
async function createFileRow(name: string) {
  const { id } = await createFichierS3(db, await getTestS3(), { name });
  return id;
}

/** A dossier with one file of every kind the app serves. */
async function createDossierWithFiles(email: string) {
  const { cap, dossier } = await createInstructeurWithDossier(db, { email });

  const avis = await createFileRow("avis-cnpn.pdf");
  const saisine = await createFileRow("saisine-cnpn.pdf");
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: "CNPN",
    avis_fichier: avis,
    saisine_fichier: saisine,
  });

  const avisAutre = await createFileRow("avis-autre.pdf");
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: "Autre expert",
    avis_fichier: avisAutre,
  });

  const decision = await createFileRow("arrete.pdf");
  await db("decision_administrative").insert({
    dossier: dossier.id,
    type: "Arrêté dérogation",
    fichier: decision,
  });

  const attachment = await createFileRow("piece-interne.pdf");
  await db("other_attachment").insert({ dossier: dossier.id, fichier: attachment, type: "Autre" });

  const pieceJointe = await createFileRow("ddep.pdf");
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: dossier.id,
    fichier: pieceJointe,
  });

  const especes = await createFileRow("especes.ods");
  await db("dossier").where({ id: dossier.id }).update({ especes_impactees: especes });

  return {
    cap,
    dossierId: dossier.id,
    files: { avis, saisine, avisAutre, decision, attachment, pieceJointe, especes },
  };
}

const ROUTES = {
  avis: "/avis-expert/fichier",
  saisine: "/avis-expert/fichier",
  avisAutre: "/avis-expert/fichier",
  decision: "/decision-administrative/fichier",
  attachment: "/attachment-autre/fichier",
  pieceJointe: "/piece-jointe-petitionnaire/fichier",
  especes: "/especes-impactees",
} as const;

function download(route: string, fileId: string, query = "") {
  return fetch(`${INTEGRATION_BASE_URL}${route}/${fileId}${query}`);
}

test("un fichier n'est pas téléchargeable sans cap", async () => {
  const { files } = await createDossierWithFiles("instr@fichier-sans-cap.fr");

  for (const [kind, route] of Object.entries(ROUTES)) {
    const response = await download(route, files[kind as keyof typeof files]);
    expect(response.status, `${kind} sans cap`).toBe(400);
  }
});

test("un fichier n'est pas téléchargeable avec la cap d'un autre groupe", async () => {
  const { files } = await createDossierWithFiles("instr@fichier-proprietaire.fr");
  // Another instructeur, with a cap on a groupe that holds no dossier.
  const { cap: otherCap } = await createInstructeurWithCapToGroup(db, {
    email: "instr@autre-groupe.fr",
    nomGroupe: "Autre groupe",
  });

  for (const [kind, route] of Object.entries(ROUTES)) {
    const response = await download(route, files[kind as keyof typeof files], `?cap=${otherCap}`);
    expect(response.status, `${kind} avec une cap étrangère`).toBe(404);
  }
});

test("une route ne sert que les fichiers de son propre type", async () => {
  const { cap, files } = await createDossierWithFiles("instr@fichier-type.fr");

  // The décision route must not serve an avis, the avis route must not serve an
  // « Autres » attachment, and so on — the path is not decorative.
  const mismatches: [string, string][] = [
    [ROUTES.decision, files.avis],
    [ROUTES.avis, files.decision],
    [ROUTES.avis, files.attachment],
    [ROUTES.attachment, files.pieceJointe],
    [ROUTES.pieceJointe, files.especes],
    [ROUTES.especes, files.decision],
  ];
  for (const [route, fileId] of mismatches) {
    const response = await download(route, fileId, `?cap=${cap}`);
    expect(response.status, `${route} servant un fichier d'un autre type`).toBe(404);
  }
});

test("un fichier inexistant répond 404 comme un fichier interdit", async () => {
  const { cap } = await createDossierWithFiles("instr@fichier-inexistant.fr");

  // Same answer either way: a probe cannot tell them apart.
  expect((await download(ROUTES.avis, randomUUID(), `?cap=${cap}`)).status).toBe(404);
  expect((await download(ROUTES.avis, "pas-un-uuid", `?cap=${cap}`)).status).toBe(404);
});

test("un instructeur du groupe télécharge tous les fichiers de son dossier", async () => {
  const { cap, files } = await createDossierWithFiles("instr@fichier-autorise.fr");

  for (const [kind, route] of Object.entries(ROUTES)) {
    const response = await download(route, files[kind as keyof typeof files], `?cap=${cap}`);
    expect(response.status, `${kind} avec la bonne cap`).toBe(200);
  }
});

test("en lecture seule, seuls les fichiers partagés sont téléchargeables", async () => {
  const { cap, files } = await createDossierWithFiles("instr@fichier-lecture.fr");

  const shared = ["avis", "decision", "pieceJointe", "especes"] as const;
  for (const kind of shared) {
    const response = await download(ROUTES[kind], files[kind], `?cap=${cap}&lecture=1`);
    expect(response.status, `${kind} en lecture seule`).toBe(200);
  }

  // A saisine, an « Autres » attachment and the avis of a non-official expert are
  // withheld from the read-only payload, so they must not be downloadable either.
  const withheld = ["saisine", "attachment", "avisAutre"] as const;
  for (const kind of withheld) {
    const response = await download(ROUTES[kind], files[kind], `?cap=${cap}&lecture=1`);
    expect(response.status, `${kind} en lecture seule`).toBe(404);
  }
});

test("les URL de fichiers du dossier portent la cap", async () => {
  const { cap, dossierId } = await createDossierWithFiles("instr@fichier-urls.fr");

  const dossier = await (
    await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${cap}`)
  ).json();

  const urls = [
    dossier.avisExpert[0].avis_fichier_url,
    dossier.avisExpert[0].saisine_fichier_url,
    dossier.decisionsAdministratives[0].fichier_url,
    dossier.otherAttachments[0].fichier_url,
    dossier.piecesJointesPetitionnaires[0].url,
    dossier.especesImpactees.url,
  ];
  for (const url of urls) {
    expect(url).toContain(`cap=${cap}`);
    // And the URL works as handed out, without the client adding anything.
    expect((await fetch(`${INTEGRATION_BASE_URL}${url}`)).status).toBe(200);
  }
});
