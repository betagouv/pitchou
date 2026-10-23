import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import { db } from "../setup/db.ts";
import { createDossier } from "../factories/index.ts";
import { putPendingUpload } from "./fileStorage.ts";
import { validCreation } from "../../../admin/src/lib/server/dossierValidation/creationFixture.ts";

const changelog = {
  version_major: 1,
  version_minor: 0,
  version_patch: 0,
  date: "2026-10-23",
  titre: "Test",
  contenu: "Texte initial",
  published: false,
};

export async function adminWriteFixture() {
  const dossier = await createDossier(db, { source: "pitchou" });
  const groupe = await db("activite_groupe").first();
  const activite = await db("activite").first();
  const label = await db("activite_label").first();
  const [entry] = await db("changelog")
    .insert({ ...changelog, updated_by: "admin@test.fr" })
    .returning("id");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["CD_REF"], [123]]), "Oiseau");
  const species = await putPendingUpload(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    "especes.xlsx",
  );
  const attachment = await putPendingUpload("Contenu", "piece.pdf");
  return {
    dossier: dossier.id,
    groupe,
    activite,
    label,
    entry: entry.id,
    species,
    attachment,
  };
}

export function adminWriteCases(fixture: Awaited<ReturnType<typeof adminWriteFixture>>) {
  const { dossier, groupe, activite, label, entry, species, attachment } = fixture;
  return [
    {
      method: "POST",
      path: "/activites",
      body: { label: "Revoked activity", groupeCode: groupe.code },
    },
    { method: "PUT", path: `/activites/${activite.code}`, body: { label: "Renamed activity" } },
    {
      method: "PUT",
      path: "/activites/labels",
      body: { label: label.label, activiteCode: activite.code },
    },
    {
      method: "PUT",
      path: `/activites/groupes/${groupe.code}`,
      body: { label: "Renamed group", color: "#123456" },
    },
    {
      method: "PUT",
      path: "/especes-protegees/modifications/123",
      body: { classification: "oiseau" },
    },
    { method: "DELETE", path: "/especes-protegees/modifications/123" },
    { method: "POST", path: "/changelog", body: { ...changelog, version_patch: 1 } },
    { method: "PUT", path: `/changelog/${entry}`, body: { ...changelog, titre: "Modifié" } },
    { method: "DELETE", path: `/changelog/${entry}` },
    { method: "POST", path: `/changelog/${entry}/media`, body: { file: attachment } },
    { method: "DELETE", path: `/changelog/${entry}/media` },
    { method: "POST", path: "/fichiers/upload-url", body: { files: [{ size: 10 }] } },
    { method: "POST", path: "/synchronisation-dn", body: { lastModified: "2026-01-01" } },
    {
      method: "POST",
      path: "/dossiers/minimal",
      body: {
        name: "Nouveau",
        primary_department: "75",
        porteur_de_projet: { type: "personne_physique", first_names: "Sam", last_name: "Martin" },
      },
    },
    {
      method: "POST",
      path: "/dossiers",
      body: {
        ...validCreation,
        uploads: { speciesFile: species, completeDossierAttachments: [attachment] },
      },
    },
    { method: "PUT", path: `/dossiers/${dossier}`, body: { columns: { name: "Modifié" } } },
    {
      method: "PUT",
      path: `/dossiers/${dossier}`,
      body: {
        columns: { name: "Modifié" },
        uploads: { attachments: [attachment], speciesFile: species },
      },
    },
    { method: "DELETE", path: `/dossiers/${dossier}` },
    { method: "POST", path: `/dossiers/${dossier}/pieces-jointes`, body: { file: attachment } },
    { method: "DELETE", path: `/dossiers/${dossier}/pieces-jointes/${randomUUID()}` },
    { method: "POST", path: `/dossiers/${dossier}/especes-impactees`, body: { file: species } },
    { method: "DELETE", path: `/dossiers/${dossier}/especes-impactees` },
  ];
}

export async function adminWriteSnapshot() {
  const tables = [
    "activite",
    "activite_label",
    "activite_groupe",
    "espece_protegee_modification",
    "changelog",
    "dossier",
    "file",
    "evenement_phase_dossier",
    "edge_dossier__fichier_pieces_jointes_petitionnaire",
    "action_dossier",
    "notification",
  ];
  return Promise.all(tables.map((table) => db(table).select("*")));
}
