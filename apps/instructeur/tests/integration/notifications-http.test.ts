import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

function setNotification(cap: string, dossierId: number, viewed: boolean) {
  return fetch(`${INTEGRATION_BASE_URL}/dossiers/notifications?cap=${cap}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dossier: dossierId, viewed }),
  });
}

test("POST /dossiers/notifications marque le dossier lu puis non lu", async () => {
  const { cap, dossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@notification.fr",
  });

  expect((await setNotification(cap, dossier.id, true)).status).toBe(204);
  const lu = await db("notification").where({ dossier: dossier.id }).first();
  expect(lu?.viewed).toBe(true);
  expect(lu?.viewed_at).toBeInstanceOf(Date);
  // Reading a dossier does not date a modification of it: `updated_at` belongs
  // to the synchronization and drives « Modifié le … » in the list.
  expect(lu?.updated_at).toBeNull();

  expect((await setNotification(cap, dossier.id, false)).status).toBe(204);
  const nonLu = await db("notification").where({ dossier: dossier.id }).first();
  expect(nonLu?.viewed).toBe(false);
  expect(nonLu?.updated_at).toBeNull();
});

test("POST /dossiers/notifications refuse un dossier hors de la cap", async () => {
  const { cap } = await createInstructeurWithDossier(db, {
    email: "instructeur@notification-cap.fr",
  });
  const { dossier: autreDossier } = await createInstructeurWithDossier(db, {
    email: "instructeur@notification-autre-service.fr",
    nomGroupe: "Autre service",
  });

  expect((await setNotification(cap, autreDossier.id, false)).status).toBe(403);
  await expect(db("notification").where({ dossier: autreDossier.id })).resolves.toHaveLength(0);
});
