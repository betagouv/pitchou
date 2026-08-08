import { expect, type Page } from "@playwright/test";
import type { Knex } from "knex";
import {
  attachDossierToGroupe,
  createDossier,
  createInstructeurWithCapToGroup,
  DEFAULT_NUMERO_DEMARCHE,
} from "../factories/index.ts";
import { attachPersonneSuitDossier, createNotification } from "../factories/notification.ts";

export const MES_DOSSIERS_CODE = "abyssin";

export async function setupMesDossiers(db: Knex) {
  const { id: personneId, groupeId } = await createInstructeurWithCapToGroup(db, {
    email: "jane@doe.fr",
    codeAcces: MES_DOSSIERS_CODE,
  });
  const dates = ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"].map((d) => new Date(d));
  const noNotificationOld = await createDossier(db, {
    name: "Dossier ancien sans notification",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: dates[0],
  });
  const viewedRecent = await createDossier(db, {
    name: "Dossier récent déjà consulté",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: dates[1],
  });
  const unviewedOld = await createDossier(db, {
    name: "Recherche scientifique sur les chats",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: dates[2],
  });
  const unviewedRecent = await createDossier(db, {
    name: "Parc photovoltaïque à Anglet",
    demarche_number: DEFAULT_NUMERO_DEMARCHE,
    depot_date: dates[3],
    enjeu: true,
  });
  for (const dossier of [noNotificationOld, viewedRecent, unviewedOld, unviewedRecent]) {
    await attachDossierToGroupe(db, dossier.id, groupeId);
    await attachPersonneSuitDossier(db, personneId, dossier.id);
  }
  await createNotification(db, {
    personneId,
    dossierId: viewedRecent.id,
    vue: true,
    date: new Date("2024-05-01"),
  });
  await createNotification(db, {
    personneId,
    dossierId: unviewedOld.id,
    vue: false,
    date: new Date("2024-05-02"),
  });
  await createNotification(db, {
    personneId,
    dossierId: unviewedRecent.id,
    vue: false,
    date: new Date("2024-05-03"),
  });
  return {
    unviewedRecent: { id: unviewedRecent.id, name: unviewedRecent.name! },
    unviewedOld: { id: unviewedOld.id, name: unviewedOld.name! },
    viewedRecent: { id: viewedRecent.id, name: viewedRecent.name! },
    noNotificationOld: { id: noNotificationOld.id, name: noNotificationOld.name! },
  };
}

export async function gotoMesDossiers(page: Page): Promise<void> {
  await page.goto(`/?secret=${MES_DOSSIERS_CODE}`);
  await expect(page.getByRole("heading", { level: 1, name: "Mes dossiers" })).toBeVisible();
}
