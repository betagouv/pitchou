import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";
import type { NotificationInitializer } from "@pitchou/types/database/public/Notification.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type EdgePersonneFollowsDossier from "@pitchou/types/database/public/EdgePersonneFollowsDossier.ts";

/**
 * Marks a dossier unread for the instructeurs following it. Only the dossiers
 * whose pétitionnaire data the synchronization actually found changed are
 * notified: Démarche Numérique moves its own modification date for anything,
 * including the annotations Pitchou itself wrote back, which is not news for
 * anybody. What did change is recorded in the historique of the dossier.
 */
export async function updateNotification(
  dossiersDN: DossierDS88444[],
  dossierIdByDN_number: Map<DossierDS88444["number"], DossierId>,
  changedDossiers: Set<DossierId>,
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<any | void> {
  if (dossiersDN.length === 0 || changedDossiers.size === 0) {
    return;
  }

  const dossierIds = [...dossierIdByDN_number.values()];

  // For each dossier, retrieve the personnes who follow this dossier.
  const rowsPersonneAndDossierSuivi: EdgePersonneFollowsDossier[] =
    await synchronizationTransactionDS("edge_personne_follows_dossier")
      .select("*")
      .whereIn("dossier", dossierIds);

  const personnesFollowingDossierByDossier: Map<DossierId, { personne: PersonneId }[]> =
    Map.groupBy(rowsPersonneAndDossierSuivi, (row) => row.dossier);

  // For each dossier, create a notification for each personne
  let notifications: NotificationInitializer[] = [];

  for (const dossierDN of dossiersDN) {
    const dossierId = dossierIdByDN_number.get(dossierDN.number);
    if (!dossierId) {
      throw new Error(
        `Dans la mise à jour de la table Notification, le dossier de Démarche numérique numéro ${dossierDN.number} n'a pas trouvé de correspondance parmi les id des dossiers Pitchou.`,
      );
    }
    if (!changedDossiers.has(dossierId)) continue;
    const personnesFollowingThisDossier = personnesFollowingDossierByDossier.get(dossierId);

    if (personnesFollowingThisDossier && personnesFollowingThisDossier.length >= 1) {
      personnesFollowingThisDossier.forEach((personneFollowingThisDossier) =>
        notifications.push({
          dossier: dossierId,
          personne: personneFollowingThisDossier.personne,
          updated_at: dossierDN.dateDerniereModification,
          viewed: false,
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
  // (re-import, or seed date > actual dossier date) must not reset "viewed" back to false.
  // NULL case: if the stored date is NULL, any non-NULL received date is considered more recent.
  return synchronizationTransactionDS("notification")
    .insert(notifications)
    .onConflict(["dossier", "personne"])
    .merge()
    .whereRaw("(notification.updated_at IS NULL OR EXCLUDED.updated_at > notification.updated_at)");
}
