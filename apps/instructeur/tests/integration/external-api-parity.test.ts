import { expect, test } from "vitest";
import { createApiKey } from "@pitchou/server/database/externalApi/keys.ts";
import { dossierReadScope } from "@pitchou/types/externalApi.ts";
import { createDossier, createInstructeurWithDossier } from "../factories/index.ts";
import { fetchAuthenticated, sessionUserId } from "../helpers/auth.ts";
import {
  readExternalApi as read,
  readExternalApiJson as readJson,
} from "../helpers/externalApi.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

test("a personal key reproduces dossier list and follower information at the holder's access level", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  const id = sessionUserId(cap);
  const restricted = await createDossier(db);
  const [file] = await db("file").insert({ name: "Espèces.ods", size: "0" }).returning("id");
  await db("impact_espece").insert({
    dossier: dossier.id,
    source_file: file.id,
    cd_ref: "123",
    classification: "oiseau",
  });
  await db("dossier")
    .where({ id: dossier.id })
    .update({
      departments: JSON.stringify(["75", "92"]),
      enjeu: true,
      next_due_date: db.raw("?::date", ["2026-08-02"]),
    });
  await db("commentaire").insert([
    { dossier: dossier.id, personne: id, content: "Commentaire de mon groupe" },
    { dossier: restricted.id, personne: id, content: "Commentaire hors de mon groupe" },
  ]);
  await db("edge_personne_follows_dossier").insert({ dossier: dossier.id, personne: id });
  const { secret } = await createApiKey(
    { user_id: id },
    { label: "Dossiers", scopes: [dossierReadScope], days: 30 },
    db,
  );
  const listResponse = await fetchAuthenticated(cap, INTEGRATION_BASE_URL + "/dossiers");
  expect(listResponse.status).toBe(200);
  const uiDossiers = await listResponse.json();
  const { dossiers } = await readJson(secret, "/dossiers");
  expect(dossiers.map(({ id }: { id: number }) => id)).toEqual(
    uiDossiers.map(({ id }: { id: number }) => id).sort((a: number, b: number) => a - b),
  );
  const ui = uiDossiers.find((row: { id: number }) => row.id === dossier.id);
  expect(dossiers.find((row: { id: number }) => row.id === dossier.id)).toMatchObject({
    access: "full",
    departments: ui.departments,
    enjeu: ui.enjeu,
    next_due_date: "2026-08-02",
    followed: true,
    impacted_espece_cd_refs: ui.especesImpacteesCD_REF,
    latest_comment: ui.latestCommentaire,
  });
  const restrictedSummary = dossiers.find((row: { id: number }) => row.id === restricted.id);
  expect(restrictedSummary.access).toBe("restricted");
  expect(restrictedSummary).not.toHaveProperty("latest_comment");

  const candidateResponse = await fetchAuthenticated(
    cap,
    `${INTEGRATION_BASE_URL}/dossier/${dossier.id}/followers`,
  );
  expect(candidateResponse.status).toBe(200);
  const candidates = await readJson(secret, `/dossiers/${dossier.id}/follower-candidates`);
  expect(
    candidates.map(
      (candidate: {
        email: string;
        first_names: string | null;
        last_name: string | null;
        followed: boolean;
      }) => ({
        email: candidate.email,
        firstNames: candidate.first_names,
        lastName: candidate.last_name,
        followsDossier: candidate.followed,
      }),
    ),
  ).toEqual(await candidateResponse.json());
  expect((await read(secret, `/dossiers/${restricted.id}/follower-candidates`)).status).toBe(404);
});

test("preserves dossier calendar dates and the permitted attribution of phase events", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db);
  const id = sessionUserId(cap);
  const restricted = await createDossier(db);
  const day = "2026-08-02";
  const calendarDay = db.raw("?::date", [day]);
  const time = "2026-08-02T14:24:00.000Z";
  const dossierDates = {
    intervention_start_date: calendarDay,
    intervention_end_date: calendarDay,
    next_due_date: calendarDay,
    commissioning_date: calendarDay,
    public_consultation_start_date: calendarDay,
    public_consultation_end_date: calendarDay,
  };
  await db("dossier")
    .where({ id: dossier.id })
    .update({
      ...dossierDates,
      ddep_depot_date: calendarDay,
    });
  await db("evenement_phase_dossier").insert(
    [dossier.id, restricted.id].map((dossier) => ({
      dossier,
      phase: "Instruction",
      timestamp: time,
      demarche_numerique_agent_email: "agent@example.test",
      demarche_numerique_motivation: "Import Démarches Numériques",
    })),
  );
  const size = 2 ** 31;
  const [file] = await db("file")
    .insert({ name: "Annexe", size: String(size) })
    .returning("id");
  await db("edge_dossier__fichier_pieces_jointes_petitionnaire").insert({
    dossier: dossier.id,
    fichier: file.id,
  });
  await db("other_attachment").insert({
    dossier: dossier.id,
    fichier: file.id,
    type: "Autre",
    attachment_date: calendarDay,
  });
  await db("avis_expert").insert({
    dossier: dossier.id,
    expert: "CNPN",
    avis_date: calendarDay,
    saisine_date: calendarDay,
    saisine_fichier: file.id,
  });
  const [decision] = await db("decision_administrative")
    .insert({
      dossier: dossier.id,
      signature_date: calendarDay,
      obligations_end_date: calendarDay,
      fichier: file.id,
    })
    .returning("id");
  const [prescription] = await db("prescription")
    .insert({ decision_administrative: decision.id, due_date: calendarDay })
    .returning("id");
  await db("controle").insert({
    prescription: prescription.id,
    controle_date: time,
    post_controle_action_date: calendarDay,
    next_due_date: calendarDay,
  });
  const { secret } = await createApiKey(
    { user_id: id },
    { label: "Dossiers", scopes: [dossierReadScope], days: 30 },
    db,
  );
  const path = `/dossiers/${dossier.id}`;
  expect(await readJson(secret, path)).toMatchObject({
    ...Object.fromEntries(Object.keys(dossierDates).map((field) => [field, day])),
    ddep_submission_date: day,
  });
  const resources = {
    "avis-experts": { avis_date: day, saisine_date: day },
    decisions: { signature_date: day, obligations_end_date: day },
    prescriptions: { due_date: day },
    controles: { controle_date: time, post_controle_action_date: day, next_due_date: day },
    "phase-events": {
      status: "instruction",
      status_changed_at: time,
      author_email: "agent@example.test",
      author_type: "instructeur",
      demarche_numerique_reason: "Import Démarches Numériques",
    },
  };
  for (const [resource, expected] of Object.entries(resources)) {
    expect(await readJson(secret, `${path}/${resource}`), resource).toEqual([
      expect.objectContaining(expected),
    ]);
  }
  expect(await readJson(secret, `${path}/pieces-jointes`)).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: file.id, piece_date: day, size })]),
  );
  const browser = await fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/dossier/${dossier.id}`);
  expect(browser.status).toBe(200);
  expect((await browser.json()).piecesJointesPetitionnaires).toEqual([
    expect.objectContaining({ id: file.id, size }),
  ]);
  expect(await readJson(secret, `/dossiers/${restricted.id}/phase-events`)).toEqual([
    { status: "instruction", status_changed_at: time },
  ]);
});
