import { expect, test } from "vitest";
import type { UserId } from "@pitchou/types/permissions.ts";
import { db } from "../setup/db.ts";
import { attachDossierToGroupe, createInstructeurWithCapToGroup } from "../factories/index.ts";
import {
  dumpDossiers,
  getDossierFull,
  getDossiersSummariesForUser,
  getEvenementsPhaseDossiers,
} from "@pitchou/server/database/dossier.ts";
import { getDossierDetailForAdmin } from "@pitchou/server/database/dossier_admin/detail.ts";
import { listDossiersForAdmin } from "@pitchou/server/database/dossier_admin/list.ts";
import type { DossierForInsert } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

test("imported phases retain history and current phase without importing followers or requiring an author", async () => {
  const user = await createInstructeurWithCapToGroup(db);
  const userId = user.id as UserId;
  const input: DossierForInsert = {
    dossier: {
      source: "demarche_numerique",
      name: "Imported history",
      demarche_numerique_number: "987654",
      demarche_number: 88444,
      depot_date: new Date("2025-01-01"),
    },
    evenement_phase_dossier: [
      { phase: "Instruction", timestamp: new Date("2025-02-01"), caused_by_personne: userId },
      {
        phase: "Contrôle",
        timestamp: new Date("2025-03-01"),
        caused_by_personne: 999999 as UserId,
      },
    ],
    avis_expert: [],
    decision_administrative: [],
    followers: [{ email: "external@example.org" }],
  };
  await dumpDossiers([input], [], db);
  const dossier = await db("dossier").where({ demarche_numerique_number: "987654" }).first();
  await attachDossierToGroupe(db, dossier.id, user.groupeId);
  const events = await db("evenement_phase_dossier")
    .where({ dossier: dossier.id })
    .orderBy("timestamp");
  expect(events.map(({ caused_by_personne }) => caused_by_personne)).toEqual([user.id, null]);
  expect(await db("auth_user")).toHaveLength(1);
  expect(await db("edge_personne_follows_dossier")).toHaveLength(0);

  const full = await getDossierFull(dossier.id, userId, db);
  expect(full?.evenementsPhase.map(({ phase }) => phase)).toEqual(["Contrôle", "Instruction"]);
  expect((await getDossiersSummariesForUser(userId, db))[0].phase).toBe("Contrôle");
  expect(await getEvenementsPhaseDossiers(userId, db)).toHaveLength(2);
  const admin = await getDossierDetailForAdmin(dossier.id, db);
  expect(admin.phase).toBe("Contrôle");
  expect(admin.evenementsPhase).toHaveLength(2);
  expect((await listDossiersForAdmin({ page: 1, pageSize: 10, phase: "Contrôle" }, db)).total).toBe(
    1,
  );
});
