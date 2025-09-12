import { directDatabaseConnection } from '../scripts/server/database';

/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import { GeoMceMessage, DossierPourGeoMCE } from '../scripts/types/geomce.ts' */


/**
 *
 * @param {Date | null} date
 * @returns {string | null}
 */
function formatDate(date) {
    return date ? date.toISOString().slice(0, 'YYYY-MM-DD'.length) : null
}

/**
 * @param {Dossier['id']} idDossier
 * @returns {Promise<DossierPourGeoMCE | undefined>}
 */
async function récupérerDossierParId(idDossier) {
    const dossierP = directDatabaseConnection('dossier')
        .select('dossier.*, décision_administrative.date_signature')
        .join('décision_administrative', {'décision_administrative.dossier': 'dossier.id'})
        .where({ id: idDossier, 'décision_administrative.type': 'Arrêté dérogation' })
        .orderBy('décision_administrative.date_signature', 'asc')
        .first()

    const instructeursP = directDatabaseConnection('arête_personne_suit_dossier')
        .select('personne.*')
        .join('personne', {'personne.id': 'arête_personne_suit_dossier.personne'})
        .where({'arête_personne_suit_dossier.dossier': idDossier})

    const [dossier, instructeurs] = await Promise.all([dossierP, instructeursP])

    return {
        instructeurs: instructeurs.map(({ email }) => {
            return {
                email,
                date_from: formatDate(dossier.date_dépôt)
            }
        }),
        ...dossier
    }
}

/**
 * @param {Dossier['id']} idDossier
 * @returns {Promise<GeoMceMessage>}
 */
async function genererMessageGeoMCE(idDossier) {
    const dossier = await récupérerDossierParId(idDossier)

    if (dossier === undefined) {
        throw new Error(`Le dossier avec l'id ${idDossier} n'a pas pu être trouvé.`)
    }

    return {
        projet: {
            ref: `PITCHOU-${dossier.id}`,
            nom: dossier.nom || `Dossier Pitchou #${dossier.id}`,
            description: dossier.description || '',
            // @ts-expect-error
            localisations: dossier.communes?.map(({ code }) => code),
            avancement: "Autorisé",
            typologies: null,
            maitrise_ouvrage: dossier.demandeur_personne_morale !== null ? [{
                siret: dossier.demandeur_personne_morale
            }] : null,
            emprise: null
        },
        procedure: {
            num_dossier: `PITCHOU-${dossier.id}`,
            type: "En Attente de GeoMCE Dérogation Espèces Protégées",
            description: dossier.description || '',
            references: [ `PITCHOU-${dossier.id}` ],
            date_decision: formatDate(dossier.date_signature)

        }
    }
}
