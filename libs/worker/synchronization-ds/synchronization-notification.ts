import { markDossiersUnreadForFollowers } from "@pitchou/server/database/notification.ts";

import type { DossierDS88444 } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { Knex } from "knex";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

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
): Promise<void> {
  if (dossiersDN.length === 0 || changedDossiers.size === 0) {
    return;
  }

  const modifiedAtByDossier = new Map<DossierId, Date>();
  for (const dossierDN of dossiersDN) {
    const dossierId = dossierIdByDN_number.get(dossierDN.number);
    if (!dossierId) {
      throw new Error(
        `Dans la mise à jour de la table Notification, le dossier de Démarche numérique numéro ${dossierDN.number} n'a pas trouvé de correspondance parmi les id des dossiers Pitchou.`,
      );
    }
    if (!changedDossiers.has(dossierId)) continue;
    modifiedAtByDossier.set(dossierId, dossierDN.dateDerniereModification);
  }

  await markDossiersUnreadForFollowers(modifiedAtByDossier, synchronizationTransactionDS);
}
