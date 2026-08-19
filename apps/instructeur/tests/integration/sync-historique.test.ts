import { expect, test } from "vitest";

import { db } from "../setup/db.ts";
import { createDossier } from "../factories/dossier.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { attachPersonneSuitDossier, createNotification } from "../factories/notification.ts";
import { dumpDossiers } from "@pitchou/server/database/dossier.ts";
import { markDossiersUnreadForFollowers } from "@pitchou/server/database/notification.ts";
import type { DossierForUpdate } from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";

// The synchronization has to say exactly which champs the pétitionnaire changed:
// the historique of the dossier is built from that, and so is the unread badge.

function update(number: string, dossier: Record<string, unknown>): DossierForUpdate {
  return {
    dossier: { demarche_numerique_number: number, ...dossier },
    evenement_phase_dossier: [],
    decision_administrative: [],
  } as unknown as DossierForUpdate;
}

function actionsOf(dossierId: number) {
  return db("action_dossier").where({ dossier: dossierId }).orderBy("created_at");
}

test("chaque champ modifié par le pétitionnaire donne une entrée d'historique nommée", async () => {
  const dossier = await createDossier(db, {
    name: "Nom initial",
    description: "Description initiale",
    demarche_numerique_number: "920001",
  });

  const changed = await dumpDossiers(
    [],
    [
      update("920001", {
        name: "Nom corrigé",
        description: "Description initiale",
        urgent_contact_phone: "0102030405",
      }),
    ],
    db,
  );

  const actions = await actionsOf(dossier.id);
  expect(actions.map(({ data }) => data.field).sort()).toEqual([
    "Nom du projet",
    "Téléphone en cas de demande urgente",
  ]);
  // The unchanged champ is not reported, and the old value is kept alongside the new one.
  const renamed = actions.find(({ data }) => data.field === "Nom du projet");
  expect(renamed.data).toMatchObject({ from: "Nom initial", to: "Nom corrigé" });
  expect(renamed.author_petitionnaire).toBe(true);

  expect([...changed]).toEqual([dossier.id]);
});

test("un champ hors de la liste des libellés est tout de même tracé", async () => {
  const dossier = await createDossier(db, {
    demarche_numerique_number: "920002",
    eolien_turbines_count: 3,
  });

  await dumpDossiers([], [update("920002", { eolien_turbines_count: 5 })], db);

  const actions = await actionsOf(dossier.id);
  expect(actions).toHaveLength(1);
  expect(actions[0].data).toMatchObject({ field: "Nombre d'éoliennes", from: "3", to: "5" });
});

test("une synchronisation sans changement ne produit ni historique ni nouveauté", async () => {
  const dossier = await createDossier(db, {
    name: "Nom stable",
    demarche_numerique_number: "920003",
  });

  const changed = await dumpDossiers([], [update("920003", { name: "Nom stable" })], db);

  await expect(actionsOf(dossier.id)).resolves.toEqual([]);
  expect(changed.size).toBe(0);
});

test("les annotations d'instruction renvoyées par DN ne sont pas des changements du pétitionnaire", async () => {
  const dossier = await createDossier(db, {
    demarche_numerique_number: "920004",
    free_comment: "",
    onagre_demande_identifier: "",
  });

  const changed = await dumpDossiers(
    [],
    [
      update("920004", {
        free_comment: "Note ajoutée par l'instructrice",
        onagre_demande_identifier: "2026-01-00042",
        enjeu: true,
      }),
    ],
    db,
  );

  await expect(actionsOf(dossier.id)).resolves.toEqual([]);
  expect(changed.size).toBe(0);
});

test("seuls les dossiers réellement modifiés repassent en non lu", async () => {
  const instructeur = await createInstructeurWithDossier(db, {
    email: "instr@notification-sync.fr",
  });
  const modifie = await createDossier(db, {
    name: "Dossier modifié",
    demarche_numerique_number: "920006",
  });
  const inchange = await createDossier(db, {
    name: "Dossier stable",
    demarche_numerique_number: "920005",
  });
  await attachPersonneSuitDossier(db, instructeur.id, modifie.id);
  await attachPersonneSuitDossier(db, instructeur.id, inchange.id);
  await createNotification(db, {
    personneId: instructeur.id,
    dossierId: modifie.id,
    vue: true,
    date: new Date("2026-01-01"),
  });
  await createNotification(db, {
    personneId: instructeur.id,
    dossierId: inchange.id,
    vue: true,
    date: new Date("2026-01-01"),
  });

  const changed = await dumpDossiers(
    [],
    [
      update("920006", { name: "Nom changé par le pétitionnaire" }),
      update("920005", { name: "Dossier stable" }),
    ],
    db,
  );
  await markDossiersUnreadForFollowers(new Map([...changed].map((id) => [id, new Date()])), db);

  const notifications = await db("notification").where({ personne: instructeur.id });
  const byDossier = new Map(notifications.map((n) => [n.dossier, n.viewed]));
  expect(byDossier.get(modifie.id)).toBe(false);
  // Nothing changed for the other one: its badge must stay as the instructeur left it.
  expect(byDossier.get(inchange.id)).toBe(true);
});
