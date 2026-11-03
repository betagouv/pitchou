import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { registerActiviteLabels } from "@pitchou/server/database/activite.ts";
import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import { expect, test } from "vitest";
import { createDossier } from "../factories/index.ts";
import { setupArrival } from "./arrivalFixtures.ts";

const photovoltaic = "Production énergie renouvelable - Photovoltaïque";

test("editing routing rules silently baselines existing dossiers but normal arrivals still queue", async () => {
  const { dossier, member } = await setupArrival();
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier")
      .where({ id: dossier.id })
      .update({ primary_department: "75", main_activite: photovoltaic }),
  );
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("group_routing_rule").insert({
        groupe_instructeurs: member.groupeId,
        departments: ["75"],
        communes: [],
        activites: ["energie-photovoltaique"],
      }),
    { silent: true },
  );
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
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("group_routing_rule")
        .where({ groupe_instructeurs: member.groupeId })
        .update({ departments: ["69"] }),
    { silent: true },
  );
  expect(
    await db("email_notification_outbox").where({ dossier: newDossier.id, status: "pending" }),
  ).toHaveLength(0);
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("group_routing_rule")
        .where({ groupe_instructeurs: member.groupeId })
        .update({ departments: ["75"] }),
    { silent: true },
  );
  expect(
    await db("email_notification_outbox").where({ dossier: newDossier.id, status: "pending" }),
  ).toHaveLength(0);
});

test("pending activity registration in a synchronization transaction does not silence ordinary arrivals", async () => {
  const { member } = await setupArrival();
  const label = "Routing notification unknown label";
  try {
    await changeAssignments(
      db,
      (routingTrx) =>
        routingTrx("group_routing_rule").insert({
          groupe_instructeurs: member.groupeId,
          activites: ["autre"],
        }),
      { silent: true },
    );
    await db.transaction(async (trx) => {
      await registerActiviteLabels([label], trx);
      await createDossier(trx, { main_activite: label });
    });
    expect(
      await db("email_notification_outbox").where({ kind: "arrival", status: "pending" }),
    ).toHaveLength(2);
  } finally {
    await changeAssignments(
      db,
      (routingTrx) => routingTrx("activite_label").where({ label }).delete(),
      { silent: true },
    );
  }
});

test("manual additions notify the group, exclusions cancel pending arrivals and restoring auto can notify again", async () => {
  const { dossier, member } = await setupArrival();
  const key = { dossier: dossier.id, groupe_instructeurs: member.groupeId };
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").insert({ ...key, mode: "include" }),
  );
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(2);
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").where(key).update({ mode: "exclude" }),
  );
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(0);
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier").where({ id: dossier.id }).update({ primary_department: "75" }),
  );
  await changeAssignments(
    db,
    (routingTrx) =>
      routingTrx("groupe_departement").insert({
        groupe_instructeurs: member.groupeId,
        department: "75",
      }),
    { silent: true },
  );
  expect(await db("edge_groupe_instructeurs__dossier").where(key)).toHaveLength(0);
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier_group_override").where(key).delete(),
  );
  expect(await db("email_notification_outbox").where({ status: "pending" })).toHaveLength(2);
});

test("a rule edit does not silence a new dossier arriving later in the same transaction", async () => {
  const { member, dossier } = await setupArrival();
  await changeAssignments(db, (routingTrx) =>
    routingTrx("dossier").where({ id: dossier.id }).update({ primary_department: "75" }),
  );
  const newcomer = await db.transaction(async (trx) => {
    await changeAssignments(
      trx,
      (routingTrx) =>
        routingTrx("groupe_departement").insert({
          groupe_instructeurs: member.groupeId,
          department: "75",
        }),
      { silent: true },
    );
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
