import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createFichierS3,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
} from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

const COMMENTAIRE = "Commentaire interne au service instructeur";
const PRESCRIPTION = "Prescription interne au service instructeur";

async function createFile(name: string) {
  const { id } = await createFichierS3(db, await getTestS3(), { name });
  return id;
}

/** A dossier owned by one service and a reader from another service. */
async function createDossierWithSecondService() {
  const {
    cap: capProprietaire,
    dossier,
    groupeId: groupeProprietaire,
  } = await createInstructeurWithDossier(db, {
    email: "instructeur@service-proprietaire.fr",
    nomGroupe: "Service propriétaire",
  });

  await db("commentaire").insert({
    dossier: dossier.id,
    personne: null,
    content: COMMENTAIRE,
    created_at: new Date(),
  });

  const saisine = await createFile("saisine-cnpn.pdf");
  const avis = await createFile("avis-cnpn.pdf");
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: "CNPN",
    avis: "Favorable",
    saisine_fichier: saisine,
    avis_fichier: avis,
  });

  const [decision] = await db("decision_administrative")
    .insert({
      dossier: dossier.id,
      type: "Arrêté dérogation",
      number: "AP-001",
      fichier: await createFile("arrete.pdf"),
    })
    .returning(["id"]);
  await db("prescription").insert({
    decision_administrative: decision.id,
    article_number: "2",
    description: PRESCRIPTION,
  });

  // The second service: its own groupe, holding no dossier of its own.
  const { cap: capLecture } = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@service-lecteur.fr",
    nomGroupe: "Service lecteur",
  });

  return {
    capProprietaire,
    capLecture,
    groupeProprietaire,
    dossierId: dossier.id,
    files: { saisine, avis },
  };
}

test("un autre service reçoit la projection en lecture seule sans partage explicite", async () => {
  const { capLecture, dossierId } = await createDossierWithSecondService();

  // No `lecture=1`: the cap alone must narrow the payload.
  const response = await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${capLecture}`);
  expect(response.status).toBe(200);

  const body = await response.text();
  expect(body).not.toContain(COMMENTAIRE);
  expect(body).not.toContain(PRESCRIPTION);

  const dossier: DossierFull = JSON.parse(body);
  expect(dossier.access).toBe("lecture");
  expect(dossier.latestCommentaire).toBeNull();
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toBeUndefined();
  expect(dossier.avisExpert[0]!.saisine_fichier_url).toBeUndefined();

  const summaries: DossierSummary[] = await (
    await fetch(`${INTEGRATION_BASE_URL}/dossiers?cap=${capLecture}`)
  ).json();
  const summary = summaries.find(({ id }) => id === dossierId)!;
  expect(summary.access).toBe("lecture");
  expect(summary).not.toHaveProperty("latestCommentaire");
  expect(summary.avisExperts).toEqual([{ expert: "CNPN", hasAvisFile: true }]);
  expect(summary.decisionsAdministratives).toMatchObject([{ number: "AP-001", hasFile: true }]);
});

test("le service propriétaire garde le dossier entier", async () => {
  const { capProprietaire, dossierId } = await createDossierWithSecondService();

  const response = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${capProprietaire}`,
  );
  const dossier: DossierFull = await response.json();

  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toHaveLength(1);

  const summaries: DossierSummary[] = await (
    await fetch(`${INTEGRATION_BASE_URL}/dossiers?cap=${capProprietaire}`)
  ).json();
  expect(summaries.find(({ id }) => id === dossierId)).toMatchObject({
    access: "complet",
    latestCommentaire: COMMENTAIRE,
    avisExperts: [{ expert: "CNPN", hasAvisFile: true, hasSaisineFile: true }],
  });
});

test("un autre service ne peut rien écrire sur le dossier", async () => {
  const { capLecture, dossierId } = await createDossierWithSecondService();

  const writes: [string, Record<string, unknown>][] = [
    [`/dossier/${dossierId}?cap=${capLecture}`, { enjeu: true }],
    [`/dossier/${dossierId}/commentaires?cap=${capLecture}`, { content: "Bonjour" }],
    [
      `/decision-administrative?cap=${capLecture}`,
      { dossier: dossierId, type: "Arrêté dérogation" },
    ],
    [`/dossier/${dossierId}/historique?cap=${capLecture}`, { documents: ["doc"] }],
  ];

  for (const [path, body] of writes) {
    const response = await fetch(`${INTEGRATION_BASE_URL}${path}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status, `écriture sur ${path}`).toBeGreaterThanOrEqual(400);
    expect(response.status, `écriture sur ${path}`).toBeLessThan(500);
    if (path.startsWith("/decision-administrative?")) {
      // This route uses 400 for ownership denial too; rule out a validation error.
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: `La capability ${capLecture} ne permet pas d'avoir accès au dossier ${dossierId}`,
      });
    }
  }

  // Nothing was written.
  await expect(db("commentaire").where({ dossier: dossierId })).resolves.toHaveLength(1);
  await expect(db("decision_administrative").where({ dossier: dossierId })).resolves.toHaveLength(
    1,
  );
});

test("un autre service n'accède ni à l'historique ni aux commentaires", async () => {
  const { capLecture, dossierId } = await createDossierWithSecondService();

  for (const path of [
    `/dossier/${dossierId}/historique?cap=${capLecture}`,
    `/dossier/${dossierId}/commentaires?cap=${capLecture}`,
  ]) {
    const response = await fetch(`${INTEGRATION_BASE_URL}${path}`);
    expect(response.status, path).toBe(403);
  }
});

test.each(["avis", "saisine"] as const)("lecture seule du fichier %s", async (kind) => {
  const { capLecture, files } = await createDossierWithSecondService();

  // Readers can download the official avis, but not its internal saisine.
  const response = await fetch(
    `${INTEGRATION_BASE_URL}/avis-expert/fichier/${files[kind]}?cap=${capLecture}`,
  );
  expect(response.status).toBe(kind === "avis" ? 200 : 404);
});

test("l'appartenance à un groupe propriétaire donne priorité à l'accès complet", async () => {
  const { capLecture, groupeProprietaire, dossierId } = await createDossierWithSecondService();

  // Joining the owning service upgrades the instructeur's access to full.
  await db("edge_cap_dossier__groupe_instructeurs").insert({
    cap_dossier: capLecture,
    groupe_instructeurs: groupeProprietaire,
  });

  const response = await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${capLecture}`);
  const dossier: DossierFull = await response.json();
  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
});
