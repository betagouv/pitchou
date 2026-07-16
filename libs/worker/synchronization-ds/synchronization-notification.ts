import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";
import type { NotificationInitializer } from "@pitchou/types/database/public/Notification.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

export async function updateNotification(
  dossiersDN: DossierDS88444[],
  dossierIdByDN_number: Map<DossierDS88444["number"], DossierId>,
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<any | void> {
  if (dossiersDN.length === 0) {
    return;
  }

  const dossierIds = [...dossierIdByDN_number.values()];

  // For each dossier, retrieve the personnes who follow this dossier.
  const rowsPersonneAndDossierSuivi: { personne: PersonneId; dossier: DossierId }[] =
    await synchronizationTransactionDS("arête_personne_suit_dossier")
      .select("*")
      .whereIn("dossier", dossierIds);

  const personnesFollowingDossierByDossier: Map<DossierId, { personne: PersonneId }[]> = Map.groupBy(
    rowsPersonneAndDossierSuivi,
    (row) => row.dossier,
  );

  // For each dossier, create a notification for each personne
  let notifications: NotificationInitializer[] = [];

  for (const dossierDN of dossiersDN) {
    const dossierId = dossierIdByDN_number.get(dossierDN.number);
    if (!dossierId) {
      throw new Error(
        `Dans la mise à jour de la table Notification, le dossier de Démarche numérique numéro ${dossierDN.number} n'a pas trouvé de correspondance parmi les id des dossiers Pitchou.`,
      );
    }
    const personnesFollowingThisDossier = personnesFollowingDossierByDossier.get(dossierId);

    if (personnesFollowingThisDossier && personnesFollowingThisDossier.length >= 1) {
      personnesFollowingThisDossier.forEach((personneFollowingThisDossier) =>
        notifications.push({
          dossier: dossierId,
          personne: personneFollowingThisDossier.personne,
          date_dernière_mise_à_jour: dossierDN.dateDerniereModification,
          vue: false,
        }),
      );
    }
  }

  if (notifications.length === 0) {
    return;
  }

  // Update the notification table.
  // We only overwrite the existing notification if the received modification date is
  // STRICTLY more recent than the stored one. A different but older date
  // (re-import, or seed date > actual dossier date) must not reset "vue" back to false.
  // NULL case: if the stored date is NULL, any non-NULL received date is considered more recent.
  return synchronizationTransactionDS("notification")
    .insert(notifications)
    .onConflict(["dossier", "personne"])
    .merge()
    .whereRaw(
      "(notification.date_dernière_mise_à_jour IS NULL OR EXCLUDED.date_dernière_mise_à_jour > notification.date_dernière_mise_à_jour)",
    );
}
