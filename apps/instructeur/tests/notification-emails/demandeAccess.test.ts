import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { createDemande } from "@pitchou/server/database/dossierDemandes.ts";
import { listDemandeRevisions } from "@pitchou/server/database/demandeHistory.ts";
import { saveDossierUserAccess } from "@pitchou/server/administration/dossierAccess.ts";
import {
  saveDossierAssignment,
  listDossierAssignments,
} from "@pitchou/server/administration/groups/assignments.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

test("a manual access change on one demande applies to the whole dossier and its history", async () => {
  const actor = await createInstructeurWithDossier(db);
  const actorId = actor.id as UserId;
  await db("auth_permission_bundle").insert({ user_id: actorId, bundle: "administrateur" });
  const first = actor.dossier.id as DossierId;
  const second = await createDemande(first, "Second", actorId, db);
  const [reader] = await db("auth_user").insert({ email: "reader@example.test" }).returning("id");
  await db("auth_permission_bundle").insert({ user_id: reader.id, bundle: "instructeur" });
  await saveDossierUserAccess(actorId, first, reader.id, "read");
  expect([...(await dossiersAccessibleToUser([first, second], reader.id)).values()]).toEqual([
    "lecture_complete",
    "lecture_complete",
  ]);
  expect(await listDemandeRevisions(second, reader.id)).not.toBeUndefined();
  await saveDossierUserAccess(actorId, second, reader.id, null);
  expect((await dossiersAccessibleToUser([first, second], reader.id)).size).toBe(0);
  expect(await listDemandeRevisions(first, reader.id)).toBeUndefined();
});

test("routing explanations include other demandes and group exclusions apply across the dossier", async () => {
  const actor = await createInstructeurWithDossier(db);
  const actorId = actor.id as UserId;
  await db("auth_permission_bundle").insert({ user_id: actorId, bundle: "administrateur" });
  const first = actor.dossier.id as DossierId;
  await db("dossier_user_access").insert({
    dossier: first,
    user_id: actorId,
    access_level: "instruct",
  });
  const second = await createDemande(first, "Second", actorId, db);
  const [group] = await db("groupe_instructeurs")
    .insert({ name: "Department 71", active: true })
    .returning("id");
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "71" });
  await db("dossier").where({ id: first }).update({ primary_department: "21" });
  await db("dossier").where({ id: second }).update({ primary_department: "71" });
  const assignment = (await listDossierAssignments(first)).find((item) => item.id === group.id);
  expect(assignment).toMatchObject({ automatic: true, assigned: true, departments: ["71"] });
  await saveDossierAssignment(actorId, first, group.id, "exclude");
  expect((await listDossierAssignments(second)).find((item) => item.id === group.id)).toMatchObject(
    { assigned: false, mode: "exclude" },
  );
  expect(await db("dossier_group_override").where({ groupe_instructeurs: group.id })).toHaveLength(
    2,
  );
  const third = await createDemande(second, "Third", actorId, db);
  expect((await listDossierAssignments(third)).find((item) => item.id === group.id)).toMatchObject({
    assigned: false,
    mode: "exclude",
  });
});
