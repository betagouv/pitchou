import { expect, test } from "vitest";
import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import { createDossierFromAdmin } from "@pitchou/server/database/dossier_admin.ts";
import { setupArrival } from "./arrivalFixtures.ts";
import { dispatch } from "./fixtures.ts";

test("native admin creation queues arrivals only when its outer transaction commits", async () => {
  const { member } = await setupArrival();
  await db("groupe_departement").insert({ groupe_instructeurs: member.groupeId, department: "75" });
  const created = await db.transaction(async (trx) => {
    const dossier = await createDossierFromAdmin(
      {
        name: "Dossier natif",
        columns: { primary_department: "75" },
        depot_date: new Date(),
        phase: "Accompagnement amont",
        relations: {
          identites: [],
          demandeur_type: "personne_physique",
          demandeur_personne_morale: null,
          demandeur_personne_physique: {
            first_names: "Sam",
            last_name: "Martin",
            email: null,
            address: null,
            phone: null,
            role: null,
          },
        },
      },
      "admin@test.fr",
      trx,
    );
    expect(await trx("email_notification_outbox")).toHaveLength(0);
    return dossier;
  });
  expect(await db("email_notification_outbox").where({ dossier: created.id })).toHaveLength(2);
  const result = await dispatch(new Date());
  expect(result.send).toHaveBeenCalledTimes(2);
  expect(result.send.mock.calls[0][0].subject).toBe(
    `Nouveau dossier: ${created.id} - Dossier natif`,
  );
});
