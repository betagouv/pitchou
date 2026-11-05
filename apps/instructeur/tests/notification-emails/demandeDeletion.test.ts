import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { createDemande } from "@pitchou/server/database/dossierDemandes.ts";
import { deleteDossiersWithPersonnesPhysiques } from "@pitchou/server/database/personne_physique.ts";
import { dossiersAccessibleToUser } from "@pitchou/server/database/dossier/access.ts";
import { recalculateAssignments } from "@pitchou/server/dossierRouting.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import type { UserId } from "@pitchou/types/permissions.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

test("deleting a demande recalculates remaining routing while preserving shared direct grants", async () => {
  const actor = await createInstructeurWithDossier(db);
  const first = actor.dossier.id as DossierId;
  const [reader] = await db("auth_user").insert({ email: "direct@example.test" }).returning("id");
  await db("auth_permission_bundle").insert({ user_id: reader.id, bundle: "instructeur" });
  await db("dossier_user_access").insert({
    dossier: first,
    user_id: reader.id,
    access_level: "read",
  });
  const second = await createDemande(first, "Second", actor.id as UserId, db);
  const [group] = await db("groupe_instructeurs")
    .insert({ name: "Only 71", active: true })
    .returning("id");
  await db("groupe_departement").insert({ groupe_instructeurs: group.id, department: "71" });
  await db.transaction(async (trx) => {
    await trx("dossier").where({ id: first }).update({ primary_department: "71" });
    await trx("dossier").where({ id: second }).update({ primary_department: "21" });
    await recalculateAssignments(trx, { dossiers: [first, second] });
  });
  expect(
    await db("edge_groupe_instructeurs__dossier").where({ groupe_instructeurs: group.id }),
  ).toHaveLength(2);
  await db.transaction((trx) =>
    deleteDossiersWithPersonnesPhysiques(trx("dossier").where({ id: first }), trx),
  );
  expect(
    await db("edge_groupe_instructeurs__dossier").where({ groupe_instructeurs: group.id }),
  ).toEqual([]);
  expect((await dossiersAccessibleToUser(second, reader.id)).get(second)).toBe("lecture_complete");
  expect(await db("dossier_projet")).toHaveLength(1);
  await db.transaction((trx) =>
    deleteDossiersWithPersonnesPhysiques(trx("dossier").where({ id: second }), trx),
  );
  expect(await db("dossier_projet")).toEqual([]);
});
