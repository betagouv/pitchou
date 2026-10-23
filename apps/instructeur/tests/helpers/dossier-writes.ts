import { randomUUID } from "node:crypto";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";

export async function dossierWriteFixture() {
  const instructeur = await createInstructeurWithDossier(db);
  const dossier = instructeur.dossier.id;
  const [comment] = await db("commentaire")
    .insert({
      dossier,
      personne: instructeur.id,
      content: "Commentaire initial",
      created_at: new Date(),
    })
    .returning("id");
  const [avis] = await db("avis_expert").insert({ dossier, expert: "CNPN" }).returning("id");
  const [decision] = await db("decision_administrative")
    .insert({
      dossier,
      type: "Arrêté dérogation",
      number: "AP-001",
    })
    .returning("id");
  const [prescription] = await db("prescription")
    .insert({
      decision_administrative: decision.id,
      description: "Prescription initiale",
    })
    .returning("id");
  const [controle] = await db("controle").insert({ prescription: prescription.id }).returning("id");
  return { instructeur, dossier, comment, avis, decision, prescription, controle };
}

export function dossierWriteCases(fixture: Awaited<ReturnType<typeof dossierWriteFixture>>) {
  const { dossier, comment, avis, decision, prescription, controle } = fixture;
  const file = { id: randomUUID(), name: "piece.pdf" };
  return [
    { path: `/dossier/${dossier}`, method: "POST", body: { enjeu: true } },
    { path: `/dossier/${dossier}/commentaires`, method: "POST", body: { content: "Nouveau" } },
    {
      path: `/dossier/${dossier}/commentaires`,
      method: "PUT",
      body: { id: comment.id, content: "Modifié" },
    },
    { path: `/dossier/${dossier}/commentaires`, method: "DELETE", body: { id: comment.id } },
    { path: `/dossier/${dossier}/historique`, method: "POST", body: { documents: ["Courrier"] } },
    {
      path: "/prescription",
      method: "POST",
      body: { id: prescription.id, description: "Modifiée" },
    },
    { path: `/prescription/${prescription.id}`, method: "DELETE" },
    {
      path: "/prescriptions-et-controles",
      method: "POST",
      body: [{ decision_administrative: decision.id, controles: [] }],
    },
    { path: "/controle", method: "POST", body: { id: controle.id, result: "Conforme" } },
    { path: `/controle/${controle.id}`, method: "DELETE" },
    { path: "/avis-expert", method: "POST", body: { dossier, id: avis.id, avis: "Favorable" } },
    {
      path: "/avis-expert",
      method: "POST",
      body: { dossier, id: avis.id, avis_fichier_upload: file },
    },
    { path: `/avis-expert/${avis.id}`, method: "DELETE" },
    {
      path: "/decision-administrative",
      method: "POST",
      status: 400,
      body: {
        dossier,
        id: decision.id,
        number: "AP-002",
        type: "Arrêté dérogation",
        signature_date: "2026-10-23",
        obligations_end_date: "2027-10-23",
      },
    },
    { path: `/decision-administrative/${decision.id}`, method: "DELETE" },
    { path: "/attachment-autre", method: "POST", body: { dossier, type: "Autre", files: [file] } },
    {
      path: "/piece-jointe",
      method: "DELETE",
      body: { dossier, type: "avis", entityId: avis.id, fileId: file.id },
    },
    { path: "/dossiers/notifications", method: "POST", body: { dossier, arrival: true } },
  ];
}

export async function dossierWriteSnapshot(dossier: number) {
  const tables = [
    "dossier",
    "commentaire",
    "avis_expert",
    "decision_administrative",
    "prescription",
    "controle",
    "other_attachment",
    "file",
    "action_dossier",
    "notification",
  ];
  return Promise.all(
    tables.map((table) =>
      table === "dossier" ? db(table).where({ id: dossier }) : db(table).select("*"),
    ),
  );
}
