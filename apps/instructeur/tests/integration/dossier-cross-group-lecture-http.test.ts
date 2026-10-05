import { sessionUserId } from "../helpers/auth.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";
import { expect, test } from "vitest";

import { db } from "../setup/db.ts";

import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

import type { DossierFull, DossierSummary } from "@pitchou/types/API_Pitchou.ts";

import {
  COMMENTAIRE,
  PRESCRIPTION,
  createDossierWithSecondService,
} from "../helpers/cross-group-dossier.ts";

test("un autre service reçoit la projection en lecture seule sans partage explicite", async () => {
  const { capLecture, dossierId } = await createDossierWithSecondService();

  // No `lecture=1`: the cap alone must narrow the payload.
  const response = await fetchAuthenticated(
    capLecture,
    `${INTEGRATION_BASE_URL}/dossier/${dossierId}`,
  );
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
    await fetchAuthenticated(capLecture, `${INTEGRATION_BASE_URL}/dossiers`)
  ).json();
  const summary = summaries.find(({ id }) => id === dossierId)!;
  expect(summary.access).toBe("lecture");
  expect(summary).not.toHaveProperty("latestCommentaire");
  expect(summary.avisExperts).toEqual([{ expert: "CNPN", hasAvisFile: true }]);
  expect(summary.decisionsAdministratives).toMatchObject([{ number: "AP-001", hasFile: true }]);
});

test("le service propriétaire garde le dossier entier", async () => {
  const { capProprietaire, dossierId } = await createDossierWithSecondService();

  const response = await fetchAuthenticated(
    capProprietaire,
    `${INTEGRATION_BASE_URL}/dossier/${dossierId}`,
  );
  const dossier: DossierFull = await response.json();

  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
  expect(dossier.decisionsAdministratives![0]!.prescriptions).toHaveLength(1);

  const summaries: DossierSummary[] = await (
    await fetchAuthenticated(capProprietaire, `${INTEGRATION_BASE_URL}/dossiers`)
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
    [`/dossier/${dossierId}`, { enjeu: true }],
    [`/dossier/${dossierId}/commentaires`, { content: "Bonjour" }],
    [
      `/decision-administrative`,
      {
        dossier: dossierId,
        type: "Arrêté dérogation",
        number: "AP-002",
        signature_date: "2026-04-15",
        obligations_end_date: "2031-04-15",
      },
    ],
    [`/dossier/${dossierId}/historique`, { documents: ["doc"] }],
  ];

  for (const [path, body] of writes) {
    const response = await fetchAuthenticated(capLecture, `${INTEGRATION_BASE_URL}${path}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    expect(response.status, `écriture sur ${path}`).toBeGreaterThanOrEqual(400);
    expect(response.status, `écriture sur ${path}`).toBeLessThan(500);
    if (path.startsWith("/decision-administrative")) {
      // This route uses 400 for ownership denial too; rule out a validation error.
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        message: `Accès au dossier ${dossierId} refusé`,
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

  for (const path of [`/dossier/${dossierId}/historique`, `/dossier/${dossierId}/commentaires`]) {
    const response = await fetchAuthenticated(capLecture, `${INTEGRATION_BASE_URL}${path}`);
    expect(response.status, path).toBe(403);
  }
});

test.each(["avis", "saisine"] as const)("lecture seule du fichier %s", async (kind) => {
  const { capLecture, files } = await createDossierWithSecondService();

  // Readers can download the official avis, but not its internal saisine.
  const response = await fetchAuthenticated(
    capLecture,
    `${INTEGRATION_BASE_URL}/avis-expert/fichier/${files[kind]}`,
  );
  expect(response.status).toBe(kind === "avis" ? 200 : 404);
});

test("l'appartenance à un groupe propriétaire donne priorité à l'accès complet", async () => {
  const { capLecture, groupeProprietaire, dossierId } = await createDossierWithSecondService();

  // Joining the owning service upgrades the instructeur's access to full.
  await db("user_groupe").insert({
    user_id: sessionUserId(capLecture),
    groupe_instructeurs: groupeProprietaire,
  });

  const response = await fetchAuthenticated(
    capLecture,
    `${INTEGRATION_BASE_URL}/dossier/${dossierId}`,
  );
  const dossier: DossierFull = await response.json();
  expect(dossier.access).toBe("complet");
  expect(dossier.latestCommentaire).toBe(COMMENTAIRE);
});
