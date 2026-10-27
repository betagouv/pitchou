import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import { createDossier } from "../factories/index.ts";
import { registerActiviteLabels } from "@pitchou/server/database/activite.ts";

const photovoltaic = "Production énergie renouvelable - Photovoltaïque";

test("editing routing rules silently baselines existing dossiers but normal arrivals still queue", async () => {
  const { dossier, member } = await setupArrival();
  await db("dossier")
    .where({ id: dossier.id })
    .update({ primary_department: "75", main_activite: photovoltaic });
  await db("groupe_regle").insert({
    groupe_instructeurs: member.groupeId,
    departments: ["75"],
    communes: [],
    activites: ["energie-photovoltaique"],
  });
  expect(await db("edge_groupe_instructeurs__dossier").where({ dossier: dossier.id })).toHaveLength(
    1,
  );
  expect(await db("email_notification_groupe_arrival").where({ dossier: dossier.id })).toHaveLength(
    1,
  );
  expect(await db("email_notification_outbox")).toHaveLength(0);
  const newDossier = await createDossier(db, {
    primary_department: "75",
    main_activite: photovoltaic,
  });
  expect(
    await db("email_notification_outbox").where({ dossier: newDossier.id, kind: "arrival" }),
  ).toHaveLength(2);
  await db("groupe_regle")
    .where({ groupe_instructeurs: member.groupeId })
    .update({ departments: ["69"] });
  expect(
    await db("email_notification_outbox").where({ dossier: newDossier.id, status: "pending" }),
  ).toHaveLength(0);
  await db("groupe_regle")
    .where({ groupe_instructeurs: member.groupeId })
    .update({ departments: ["75"] });
  expect(
    await db("email_notification_outbox").where({ dossier: newDossier.id, status: "pending" }),
  ).toHaveLength(0);
});

test("pending activity registration in a synchronization transaction does not silence ordinary arrivals", async () => {
  const { member } = await setupArrival();
  const label = "Routing notification unknown label";
  try {
    await db("groupe_regle").insert({ groupe_instructeurs: member.groupeId, activites: ["autre"] });
    await db.transaction(async (trx) => {
      await registerActiviteLabels([label], trx);
      await createDossier(trx, { main_activite: label });
    });
    expect(
      await db("email_notification_outbox").where({ kind: "arrival", status: "pending" }),
    ).toHaveLength(2);
  } finally {
    await db("activite_label").where({ label }).delete();
  }
});

test("manual additions notify the group, exclusions cancel pending arrivals and restoring auto can notify again", async () => {
  const { dossier, member } = await setupArrival();
  const key = { dossier: dossier.id, groupe_instructeurs: member.groupeId };
  await db("groupe_dossier_override").insert({ ...key, mode: "include" });
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(2);
  await db("groupe_dossier_override").where(key).update({ mode: "exclude" });
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(0);
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  await db("groupe_departement").insert({ groupe_instructeurs: member.groupeId, department: "75" });
  expect(await db("edge_groupe_instructeurs__dossier").where(key)).toHaveLength(0);
  await db("groupe_dossier_override").where(key).delete();
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(2);
});

test("a rule edit does not silence a new dossier arriving later in the same transaction", async () => {
  const { member, dossier } = await setupArrival();
  await db("dossier").where({ id: dossier.id }).update({ primary_department: "75" });
  const newcomer = await db.transaction(async (trx) => {
    await trx("groupe_departement").insert({
      groupe_instructeurs: member.groupeId,
      department: "75",
    });
    return createDossier(trx, { primary_department: "75" });
  });
  expect(await db("email_notification_outbox").where({ dossier: dossier.id })).toHaveLength(0);
  expect(
    await db("email_notification_outbox").where({
      dossier: newcomer.id,
      kind: "arrival",
      status: "pending",
    }),
  ).toHaveLength(2);
});
