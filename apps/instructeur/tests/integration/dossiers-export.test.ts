import { expect, test } from "vitest";
import * as XLSX from "xlsx";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";
import {
  attachCapToGroupe,
  attachDossierToGroupe,
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithDossier,
  createPersonne,
  createCapDossier,
  createFichierS3,
} from "../factories/index.ts";
import { seedEspeceProtegeeReference } from "../factories/especeProtegeeReference.ts";
import { getTestS3 } from "../setup/s3.ts";
import { fetchAuthenticated } from "../helpers/auth.ts";

async function download(cap: string, scope = "service", format = "csv", extra = "") {
  return fetchAuthenticated(
    cap,
    `${INTEGRATION_BASE_URL}/dossiers/export?scope=${scope}&format=${format}${extra}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierIds: await db("dossier").pluck("id") }),
    },
  );
}

async function rows(response: Response): Promise<(string | number)[][]> {
  expect(response.status).toBe(200);
  const book = XLSX.read(await response.arrayBuffer(), { type: "array", raw: true });
  return XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: "" });
}

test("service and followed exports validate selected dossiers against the caller's services and ignore pagination", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@export.fr",
    nomGroupe: "Owner service",
  });
  const foreign = await createInstructeurWithDossier(db, {
    email: "foreign@export.fr",
    nomGroupe: "Foreign service",
  });
  const secondGroup = await createGroupeInstructeurs(db, { name: "Second service" });
  await attachCapToGroupe(db, owner.cap, secondGroup.id);
  await attachCapToGroupe(db, foreign.cap, secondGroup.id);
  const second = await createDossier(db);
  await attachDossierToGroupe(db, second.id, secondGroup.id);
  await createDossier(db, { name: "Orphan" });
  await db("dossier").where({ id: owner.dossier.id }).update({ demarche_numerique_number: "1234" });
  await db("edge_personne_follows_dossier").insert([
    { personne: owner.id, dossier: owner.dossier.id },
    { personne: owner.id, dossier: foreign.dossier.id },
    { personne: foreign.id, dossier: second.id },
  ]);
  for (const format of ["csv", "ods"]) {
    const response = await download(owner.cap, "service", format, "&page=2&pageSize=1");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain(`.${format}"`);
    const service = await rows(response);
    expect(service).toHaveLength(3);
    expect(service.slice(1).map((row) => row[0])).toEqual(["1234", String(second.id)]);
    expect(service[1][4]).toBe(owner.email);
    expect(service[2][4]).toBe(foreign.email);
    const followed = await rows(await download(owner.cap, "followed", format));
    expect(followed).toHaveLength(2);
    expect(followed[1][0]).toBe("1234");
  }
  await db("edge_personne_follows_dossier").where({ personne: owner.id }).delete();
  expect(await rows(await download(owner.cap, "followed"))).toHaveLength(1);
  await db("user_groupe").where({ user_id: owner.id }).delete();
  expect((await download(owner.cap)).status).toBe(403);
});

test("export includes enriched data, tagged species, expert stages and latest prescription conformity", async () => {
  const owner = await createInstructeurWithDossier(db);
  const colleague = await createPersonne(db, { email: "colleague@export.fr" });
  const colleagueSession = await createCapDossier(db, colleague.codeAcces);
  await attachCapToGroupe(db, colleagueSession.cap, owner.groupeId);
  await db("dossier")
    .where({ id: owner.dossier.id })
    .update({
      depot_date: "2026-09-01T10:00:00Z",
      main_activite: "Raw activity",
      primary_department: "75",
      communes: JSON.stringify([{ name: "Paris", code: "75056", postalCode: "75000" }]),
      departments: JSON.stringify(["75"]),
      regions: JSON.stringify(["Île-de-France"]),
      linked_to_ae_regime: true,
      ddep_required: false,
      er_mesures_sufficient: true,
      enjeu: true,
    });
  await attachDossierToGroupe(db, owner.dossier.id, owner.groupeId);
  await db("edge_personne_follows_dossier").insert([
    { personne: owner.id, dossier: owner.dossier.id },
    { personne: colleague.id, dossier: owner.dossier.id },
  ]);
  await db("evenement_phase_dossier").insert([
    {
      dossier: owner.dossier.id,
      phase: "Instruction",
      timestamp: "2026-09-01",
      caused_by_personne: owner.id,
    },
    { dossier: owner.dossier.id, phase: "Contrôle", timestamp: "2026-09-02" },
  ]);
  await seedEspeceProtegeeReference(
    [
      {
        cd_ref: "2437",
        classification: "oiseau",
        noms_scientifiques: ["Morus bassanus"],
        noms_vernaculaires: ["Fou de Bassan"],
        cd_type_statuts: ["PN"],
      },
    ],
    db,
  );
  await db("espece_protegee_modification").insert({
    cd_ref: "2437",
    espece_cnpn: true,
    espece_ministerielle: true,
  });
  const file = await createFichierS3(db, await getTestS3(), { name: "especes.ods" });
  await db("impact_espece").insert([
    {
      dossier: owner.dossier.id,
      cd_ref: "2437",
      classification: "oiseau",
      impact_type: "P-2-1",
      source_file: file.id,
    },
    {
      dossier: owner.dossier.id,
      cd_ref: "2437",
      classification: "oiseau",
      impact_type: "P-1",
      source_file: file.id,
    },
  ]);
  await db("avis_expert").insert([
    { dossier: owner.dossier.id, expert: "CNPN", saisine_date: "2026-09-01" },
    {
      dossier: owner.dossier.id,
      expert: "Ministre",
      saisine_date: "2026-09-01",
      avis: "Favorable",
    },
    { dossier: owner.dossier.id, expert: "CSRPN" },
  ]);
  const [decision] = await db("decision_administrative")
    .insert({
      dossier: owner.dossier.id,
      number: "AP-1",
      type: "Arrêté dérogation",
      signature_date: "2026-09-02",
    })
    .returning("id");
  const prescriptions = await db("prescription")
    .insert([0, 1, 2].map(() => ({ decision_administrative: decision.id })))
    .returning("id");
  await db("controle").insert([
    { prescription: prescriptions[0].id, controle_date: "2026-09-01", result: "Non conforme" },
    { prescription: prescriptions[0].id, controle_date: "2026-09-02", result: "Conforme" },
    { prescription: prescriptions[1].id, controle_date: "2026-09-01", result: "Non conforme" },
  ]);
  const [, row] = await rows(await download(owner.cap));
  expect(row).toHaveLength(21);
  expect(row[2]).toBe("Raw activity");
  expect(row[3]).toBe("01/09/2026");
  expect(String(row[4]).split(" ; ").sort()).toEqual([owner.email, colleague.email].sort());
  expect(row.slice(5, 7)).toEqual(["75", "Paris ; 75 ; Île-de-France"]);
  expect(row.slice(8)).toEqual([
    "Oui",
    "Contrôle",
    "Non car mesures ER suffisantes",
    "Oui",
    "Fou de Bassan (Morus bassanus)",
    "Fou de Bassan (Morus bassanus)",
    "Fou de Bassan (Morus bassanus)",
    "Oui CNPN ; Oui Ministre",
    "Oui Ministre",
    "AP-1 - Arrêté dérogation - 02/09/2026",
    "1",
    "2",
    "3",
  ]);
});
