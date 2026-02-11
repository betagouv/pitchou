
/** @import { DossierDS88444 } from '../../scripts/types/démarche-numérique/apiSchema.ts' */
/** @import { Knex } from 'knex' */
/** @import { NotificationInitializer } from '../../scripts/types/database/public/Notification.ts' */
/** @import { PersonneId } from '../../scripts/types/database/public/Personne.ts' */
/** @import { DossierId } from '../../scripts/types/database/public/Dossier.ts' */

/**
 * 
 * @param {DossierDS88444[]} dossiersDN
 * @param {Map<number, DossierId>} dossierIdByDN_number
 * @param {Knex.Transaction | Knex} laTransactionDeSynchronisationDS
 * @returns {Promise<any | void>}
 */
export async function mettreÀjourNotification(dossiersDN, dossierIdByDN_number, laTransactionDeSynchronisationDS) {
    if (dossiersDN.length === 0) {
        return;
    }

    const dossierIds = [...dossierIdByDN_number.values()]

    // Pour chaque dossier, récupérer les personnes qui suivent ce dossiers.
    /** @type {{personne: PersonneId, dossier: DossierId}[]} */
    const rowsPersonneEtDossierSuivi = await laTransactionDeSynchronisationDS('arête_personne_suit_dossier').select('*').whereIn('dossier', dossierIds)

    /** @type {Map<DossierId, {personne: PersonneId}[]>} */
    const personnesSuivantDossierParDossier = Map.groupBy(rowsPersonneEtDossierSuivi, (row) => row.dossier)

    // Pour chaque dossier, créer une notification pour chaque personne
    /** @type {NotificationInitializer[]} */
    let notifications = []

    for (const dossierDN of dossiersDN) {
        const dossierId = dossierIdByDN_number.get(dossierDN.number)
        if (!dossierId) {
            throw new Error(`Dans la mise à jour de la table Notification, le dossier de Démarche numérique numéro ${dossierDN.number} n'a pas trouvé de correspondance parmi les id des dossiers Pitchou.`)
        }
        const personnesSuivantCeDossier =  personnesSuivantDossierParDossier.get(dossierId)

        if (personnesSuivantCeDossier && personnesSuivantCeDossier.length>=1) {
            personnesSuivantCeDossier.forEach((personneSuivantCeDossier) => notifications.push(
                {dossier: dossierId, personne: personneSuivantCeDossier.personne, updated_at: dossierDN.dateDerniereModification, vue: false}
            ))
        }
    }
    
    // Mettre à jour la table notification.
    // Si la date updated_at a changé, alors on écrase la notification existante.
    // Sinon, on ignore (on ne veut pas mettre à jour le champ "vue" si la modification a déjà été vue).
    return laTransactionDeSynchronisationDS('notification')
        .insert(notifications)
        .onConflict(['dossier', 'personne'])
        .merge()
        .whereRaw('notification.updated_at IS DISTINCT FROM EXCLUDED.updated_at');
}