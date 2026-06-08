import type { DossierDS88444 } from "../../scripts/types/démarche-numérique/apiSchema.ts";
import type { Knex } from "knex";
import type { NotificationInitializer } from "../../scripts/types/database/public/Notification.ts";
import type { PersonneId } from "../../scripts/types/database/public/Personne.ts";
import type { DossierId } from "../../scripts/types/database/public/Dossier.ts";

export async function mettreÀjourNotification(
  dossiersDN: DossierDS88444[],
  dossierIdByDN_number: Map<DossierDS88444["number"], DossierId>,
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<any | void> {
  if (dossiersDN.length === 0) {
    return;
  }

  const dossierIds = [...dossierIdByDN_number.values()];

  // Pour chaque dossier, récupérer les personnes qui suivent ce dossiers.
  const rowsPersonneEtDossierSuivi: { personne: PersonneId; dossier: DossierId }[] =
    await laTransactionDeSynchronisationDS("arête_personne_suit_dossier")
      .select("*")
      .whereIn("dossier", dossierIds);

  const personnesSuivantDossierParDossier: Map<DossierId, { personne: PersonneId }[]> = Map.groupBy(
    rowsPersonneEtDossierSuivi,
    (row) => row.dossier,
  );

  // Pour chaque dossier, créer une notification pour chaque personne
  let notifications: NotificationInitializer[] = [];

  for (const dossierDN of dossiersDN) {
    const dossierId = dossierIdByDN_number.get(dossierDN.number);
    if (!dossierId) {
      throw new Error(
        `Dans la mise à jour de la table Notification, le dossier de Démarche numérique numéro ${dossierDN.number} n'a pas trouvé de correspondance parmi les id des dossiers Pitchou.`,
      );
    }
    const personnesSuivantCeDossier = personnesSuivantDossierParDossier.get(dossierId);

    if (personnesSuivantCeDossier && personnesSuivantCeDossier.length >= 1) {
      personnesSuivantCeDossier.forEach((personneSuivantCeDossier) =>
        notifications.push({
          dossier: dossierId,
          personne: personneSuivantCeDossier.personne,
          date_dernière_mise_à_jour: dossierDN.dateDerniereModification,
          vue: false,
        }),
      );
    }
  }

  if (notifications.length === 0) {
    return;
  }

  // Mettre à jour la table notification.
  // On n'écrase la notification existante que si la date de modification reçue est
  // STRICTEMENT plus récente que celle stockée. Une date différente mais plus ancienne
  // (ré-import, ou date de seed > date réelle du dossier) ne doit pas repasser "vue" à false.
  // Cas NULL : si la date stockée est NULL, toute date reçue non-NULL est considérée plus récente.
  return laTransactionDeSynchronisationDS("notification")
    .insert(notifications)
    .onConflict(["dossier", "personne"])
    .merge()
    .whereRaw(
      "(notification.date_dernière_mise_à_jour IS NULL OR EXCLUDED.date_dernière_mise_à_jour > notification.date_dernière_mise_à_jour)",
    );
}
