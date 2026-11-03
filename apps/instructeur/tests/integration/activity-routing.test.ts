import { changeAssignments } from "@pitchou/server/dossierRouting.ts";
import { expect, test } from "vitest";
import { createDossier } from "../factories/index.ts";
import { admin, saveGroup } from "../helpers/administration.ts";
import { db } from "../setup/db.ts";

const ownership = (dossier: number) =>
  db("edge_groupe_instructeurs__dossier")
    .where({ dossier })
    .orderBy("groupe_instructeurs")
    .pluck("groupe_instructeurs");

test("activity mappings recalculate routing, pending labels resolve to autre and missing activity stays unmatched", async () => {
  const actor = await admin();
  const label = "Routing test unclassified activity";
  try {
    await changeAssignments(
      db,
      (routingTrx) =>
        routingTrx("activite_label").insert({ label, activite_code: "autre", needs_review: true }),
      { silent: true },
    );
    const other = await (
      await saveGroup(actor.token, {
        name: "Other",
        active: true,
        members: [],
        rules: [{ departments: [], communes: [], activites: ["autre"] }],
      })
    ).json();
    const solar = await (
      await saveGroup(actor.token, {
        name: "Solar",
        active: true,
        members: [],
        rules: [{ departments: [], communes: [], activites: ["energie-photovoltaique"] }],
      })
    ).json();
    const dossier = await createDossier(db, { main_activite: label });
    expect(await ownership(dossier.id)).toEqual([other.id]);
    await changeAssignments(
      db,
      (routingTrx) =>
        routingTrx("activite_label")
          .where({ label })
          .update({ activite_code: "energie-photovoltaique", needs_review: false }),
      { silent: true },
    );
    expect(await ownership(dossier.id)).toEqual([solar.id]);
    await changeAssignments(db, (routingTrx) =>
      routingTrx("dossier").where({ id: dossier.id }).update({ main_activite: null }),
    );
    expect(await ownership(dossier.id)).toEqual([]);
  } finally {
    await changeAssignments(
      db,
      (routingTrx) => routingTrx("activite_label").where({ label }).delete(),
      { silent: true },
    );
  }
});
