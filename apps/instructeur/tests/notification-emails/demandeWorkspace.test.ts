import type { UserId } from "@pitchou/types/permissions.ts";
import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import {
  createDemande,
  getDossierWorkspace,
  linkDemande,
} from "@pitchou/server/database/dossierDemandes.ts";
import {
  getDemandeVersion,
  listDemandeRevisions,
} from "@pitchou/server/database/demandeHistory.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { dossierAccessSql } from "@pitchou/server/dossierRouting/access.ts";
import { getDossiersSummariesForUser } from "@pitchou/server/database/dossier/summary.ts";
import { buildDemandeComparison, compareDemandes } from "@pitchou/common/demandeComparison.ts";
import { createInstructeurWithDossier, createPersonne } from "../factories/index.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

test("a new demande shares dossier access and keeps its own phase and decisions", async () => {
  const actor = await createInstructeurWithDossier(db);
  const firstId = actor.dossier.id as DossierId;
  await db("evenement_phase_dossier").insert({
    dossier: firstId,
    phase: "Contrôle",
    timestamp: new Date(),
  });
  await db("decision_administrative").insert({ dossier: firstId, number: "Original" });
  const secondId = await createDemande(firstId, "Deuxième demande", actor.id as UserId, db);
  const workspace = await getDossierWorkspace(secondId, actor.id as UserId);
  expect(workspace?.access).toBe("complet");
  expect(workspace?.demandes).toMatchObject([
    { id: firstId, phase: "Contrôle" },
    { id: secondId, phase: "Accompagnement amont" },
  ]);
  expect(await db("decision_administrative").where({ dossier: secondId })).toEqual([]);
  expect(
    (await dossiersAccessibleToUser([firstId, secondId], actor.id as UserId)).get(secondId),
  ).toBe("complet");
  const { rows } = await db.raw(
    `SELECT ${dossierAccessSql("d.id", "u.id")} as access FROM dossier d CROSS JOIN auth_user u WHERE d.id = ? AND u.id = ?`,
    [secondId, actor.id as UserId],
  );
  expect(rows[0].access).toBe("complet");
  const summaries = await getDossiersSummariesForUser(actor.id as UserId);
  expect(summaries.find(({ id }) => id === firstId)?.projet?.id).toBe(
    summaries.find(({ id }) => id === secondId)?.projet?.id,
  );
  expect(summaries.find(({ id }) => id === secondId)?.projet?.count).toBe(2);
});

test("current data and its latest frozen state compare equally, including dates", async () => {
  const actor = await createInstructeurWithDossier(db);
  const id = actor.dossier.id as DossierId;
  await db.transaction(async (trx) => {
    const siret = "12345678900001";
    await trx("entreprise").insert({
      siret,
      legal_name: "Historical company",
      creation_date: "2010-07-15",
    });
    const [porteur] = await trx("porteur_de_projet")
      .insert({ personne_morale: siret })
      .returning("id");
    await trx("dossier").where({ id }).update({
      porteur_de_projet: porteur.id,
      source: "onagre",
      ddep_depot_date: "2026-07-15",
      intervention_start_date: "2026-07-16",
    });
    await trx("commentaire").insert({
      dossier: id,
      personne: actor.id as UserId,
      content: "Un commentaire complet",
    });
    await trx("decision_administrative").insert({
      dossier: id,
      type: "Arrêté dérogation",
      signature_date: "2026-07-20",
    });
    const [file] = await trx("file")
      .insert({ name: "Avis.pdf", size: "123", media_type: "application/pdf" })
      .returning("id");
    await trx("avis_expert").insert({
      dossier: id,
      expert: "CNPN",
      avis: "Favorable",
      avis_date: "2026-07-21",
      avis_fichier: file.id,
    });
  });
  const revisions = await listDemandeRevisions(id, actor.id as UserId);
  const current = await getDemandeVersion(id, null, actor.id as UserId);
  const historical = await getDemandeVersion(id, revisions![0].id, actor.id as UserId);
  const serialized = (value: unknown) => JSON.parse(JSON.stringify(value));
  expect(
    compareDemandes(
      buildDemandeComparison(serialized(current)),
      buildDemandeComparison(serialized(historical)),
    ),
  ).toEqual([]);
  expect(serialized(historical).dossier.ddep_depot_date).toBe("2026-07-15");
});

test("restricted readers cannot read history or join someone else's demande", async () => {
  const owner = await createInstructeurWithDossier(db, {
    email: "owner@example.test",
    nomGroupe: "Owner",
  });
  const other = await createInstructeurWithDossier(db, {
    email: "other@example.test",
    nomGroupe: "Other",
  });
  const ownerId = owner.dossier.id as DossierId;
  const otherId = other.dossier.id as DossierId;
  expect(await listDemandeRevisions(otherId, owner.id as UserId)).toBeUndefined();
  await expect(linkDemande(ownerId, otherId, owner.id as UserId, db)).rejects.toThrow(
    "inaccessible",
  );
  expect(await db("dossier_demande")).toEqual([]);
  const stranger = await createPersonne(db, { email: "stranger@example.test" });
  expect(await getDossierWorkspace(ownerId, stranger.id as UserId)).toBeUndefined();
});

test("a historical state cannot be addressed through another demande", async () => {
  const actor = await createInstructeurWithDossier(db);
  const firstId = actor.dossier.id as DossierId;
  const secondId = await createDemande(firstId, "Second", actor.id as UserId, db);
  const revisions = await listDemandeRevisions(firstId, actor.id as UserId);
  expect(await getDemandeVersion(secondId, revisions![0].id, actor.id as UserId)).toBeUndefined();
});
