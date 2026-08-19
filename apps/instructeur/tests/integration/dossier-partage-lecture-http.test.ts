import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import {
  createFichierS3,
  createInstructeurWithCapToGroup,
  createInstructeurWithDossier,
  shareDossierWithGroupe,
} from "../factories/index.ts";
import { getTestS3 } from "../setup/s3.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";

const COMMENTAIRE = "Commentaire interne au service instructeur";
const PRESCRIPTION = "Prescription à ne pas partager";

async function createFile(name: string) {
  const { id } = await createFichierS3(db, await getTestS3(), { name });
  return id;
}

/**
 * A dossier a first service instructs, shared in read-only mode with a second
 * one — the situation the whole feature exists for.
 */
async function shareDossierWithSecondService() {
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
  const { cap: capLecture, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "instructeur@service-invite.fr",
    nomGroupe: "Service invité",
  });
  await shareDossierWithGroupe(db, dossier.id, groupeId);

  return {
    capProprietaire,
    capLecture,
    groupeProprietaire,
    dossierId: dossier.id,
    files: { saisine, avis },
  };
}

test("le service invité ne reçoit que la partie partagée, sans le demander", async () => {
  const { capLecture, dossierId } = await shareDossierWithSecondService();

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
});

test("le service propriétaire garde le dossier entier", async () => {
  const { capProprietaire, dossierId } = await shareDossierWithSecondService();

  const response = await fetch(
    `${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${capProprietaire}`,
  );
  const dossier: DossierFull = await response.json();

  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toHaveLength(1);
});

test("le service invité ne peut rien écrire sur le dossier partagé", async () => {
  const { capLecture, dossierId } = await shareDossierWithSecondService();

  const writes: [string, RequestInit][] = [
    [
      `/dossier/${dossierId}?cap=${capLecture}`,
      { method: "POST", body: JSON.stringify({ enjeu: true }) },
    ],
    [
      `/dossier/${dossierId}/commentaires?cap=${capLecture}`,
      { method: "POST", body: JSON.stringify({ content: "Bonjour" }) },
    ],
    [
      `/decision-administrative?cap=${capLecture}`,
      {
        method: "POST",
        body: JSON.stringify({ dossier: dossierId, type: "Arrêté dérogation" }),
      },
    ],
    [
      `/dossier/${dossierId}/historique?cap=${capLecture}`,
      { method: "POST", body: JSON.stringify({ documents: ["doc"] }) },
    ],
  ];

  for (const [path, init] of writes) {
    const response = await fetch(`${INTEGRATION_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status, `écriture sur ${path}`).toBeGreaterThanOrEqual(400);
    expect(response.status, `écriture sur ${path}`).toBeLessThan(500);
  }

  // Nothing was written.
  await expect(db("commentaire").where({ dossier: dossierId })).resolves.toHaveLength(1);
  await expect(db("decision_administrative").where({ dossier: dossierId })).resolves.toHaveLength(
    1,
  );
});

test("le service invité n'accède ni à l'historique ni aux commentaires", async () => {
  const { capLecture, dossierId } = await shareDossierWithSecondService();

  for (const path of [
    `/dossier/${dossierId}/historique?cap=${capLecture}`,
    `/dossier/${dossierId}/commentaires?cap=${capLecture}`,
  ]) {
    const response = await fetch(`${INTEGRATION_BASE_URL}${path}`);
    expect(response.status, path).toBe(403);
  }
});

test("le service invité ne télécharge que les fichiers partagés", async () => {
  const { capLecture, files } = await shareDossierWithSecondService();

  // The official avis is shared; the saisine that produced it is not — and the
  // invited service never asked for read-only mode, its cap decided.
  const avis = await fetch(
    `${INTEGRATION_BASE_URL}/avis-expert/fichier/${files.avis}?cap=${capLecture}`,
  );
  expect(avis.status).toBe(200);

  const saisine = await fetch(
    `${INTEGRATION_BASE_URL}/avis-expert/fichier/${files.saisine}?cap=${capLecture}`,
  );
  expect(saisine.status).toBe(404);
});

test("un dossier à la fois partagé et instruit garde l'accès le plus permissif", async () => {
  const { capLecture, groupeProprietaire, dossierId } = await shareDossierWithSecondService();

  // The invited instructeur later joins the service instructing the dossier, so
  // their cap reaches it both ways at once.
  await db("edge_cap_dossier__groupe_instructeurs").insert({
    cap_dossier: capLecture,
    groupe_instructeurs: groupeProprietaire,
  });

  const response = await fetch(`${INTEGRATION_BASE_URL}/dossier/${dossierId}?cap=${capLecture}`);
  const dossier: DossierFull = await response.json();
  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
});
