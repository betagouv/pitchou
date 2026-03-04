//@ts-check

import parseArgs from 'minimist'
import {sub, format, formatDistanceToNow} from 'date-fns'
import { fr } from "date-fns/locale"

import {dumpEntreprises, closeDatabaseConnection, créerTransaction, addRésultatSynchronisationDS88444} from '../scripts/server/database.js'
import {dumpDossiers, getDossierIdsFromDS_Ids, dumpDossierMessages, deleteDossierByDSNumber, synchroniserDossierDansGroupeInstructeur} from '../scripts/server/database/dossier.js'
import {listAllPersonnes, créerPersonnes} from '../scripts/server/database/personne.js'
import {synchroniserGroupesInstructeurs} from '../scripts/server/database/groupe_instructeurs.js'
import { synchroniserFichiersEspècesImpactéesDepuisDS88444 } from '../scripts/server/database/espèces_impactées.js'

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/démarche-numérique/recupérerDossiersRécemmentModifiés.js'
import {recupérerGroupesInstructeurs} from '../scripts/server/démarche-numérique/recupérerGroupesInstructeurs.js'
import récupérerTousLesDossiersSupprimés from '../scripts/server/démarche-numérique/recupérerListeDossiersSupprimés.js'

import {isValidDate} from '../scripts/commun/typeFormat.js'

import {téléchargerNouveauxFichiersMotivation} from './synchronisation-ds/téléchargerNouveauxFichiersParType.js'
import { récupérerFichiersEspècesImpactées88444, récupérerPiècesJointesPétitionnaire88444 } from './synchronisation-ds/synchronisation-dossier-88444.js'

import { getDonnéesPersonnesEntreprises88444, makeDossiersPourSynchronisation } from './synchronisation-ds/makeDossiersPourSynchronisation.js'
import { makeColonnesCommunesDossierPourSynchro88444 } from './synchronisation-ds/makeColonnesCommunesDossierPourSynchro88444.js'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import {synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444} from '../scripts/server/database/arête_dossier__fichier_pièces_jointes_pétitionnaire.js'
import { mettreÀjourNotification } from './synchronisation-ds/synchronisation-notification.js'


/** @import {default as DatabaseDossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import {default as Personne, PersonneInitializer} from '../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../scripts/types/database/public/Entreprise.ts' */

/** @import {default as RésultatSynchronisationDS88444} from '../scripts/types/database/public/RésultatSynchronisationDS88444.ts' */
/** @import {default as Fichier} from '../scripts/types/database/public/Fichier.ts' */

/** @import {Message} from '../scripts/types/démarche-numérique/apiSchema.ts' */
/** @import {DossierDS88444} from '../scripts/types/démarche-numérique/apiSchema.ts' */
/** @import {SchemaDémarcheSimplifiée, ChampDescriptor} from '../scripts/types/démarche-numérique/schema.ts' */
/** @import {DossierEntreprisesPersonneInitializersPourInsert, DossierEntreprisesPersonneInitializersPourUpdate, DossierPourInsert, DossierPourUpdate} from '../scripts/types/démarche-numérique/DossierPourSynchronisation.ts' */
/** @import {DossierDemarcheNumerique88444, AnnotationsPriveesDemarcheNumerique88444} from '../scripts/types/démarche-numérique/Démarche88444.ts' */

/** @import {GetDonnéesPersonnesEntreprises} from './synchronisation-ds/makeDossiersPourSynchronisation.js'. */
/** @import {MakeColonnesCommunesDossierPourSynchro} from './synchronisation-ds/makeDossiersPourSynchronisation.js'. */
/** @import { ChampFormulaire88444 } from '../scripts/types/API_Pitchou.ts' */


// récups les données de DS

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const args = parseArgs(process.argv)

const ID_SCHEMA_DS = args.IdSchemaDS

if (!ID_SCHEMA_DS) {
    const liste_fichiers = await readdir(join(import.meta.dirname,`../data/démarche-numérique/schema-DS`))
    console.error(`
Aucun argument --IdSchemaDS n'a été fourni.
Voici la liste des ids des schémas DS disponibles :
  - ${liste_fichiers.map((fichier) => fichier.slice(0, -'.json'.length)).join('\n  - ')}
`)
    process.exit(1)
}

/** @type {Date} */
let lastModified;

if(typeof args.lastModified === 'string' && isValidDate(new Date(args.lastModified))){
    lastModified = new Date(args.lastModified)
}
else{
    lastModified = sub(new Date(), {hours: 12})
}
/** @type {SchemaDémarcheSimplifiée} */
const schema = (await import(`../data/démarche-numérique/schema-DS/${ID_SCHEMA_DS}.json`, {with: {type: 'json'}})).default

const DEMARCHE_NUMBER = schema.number


console.info(
    `Synchronisation des dossiers de la démarche`,
    DEMARCHE_NUMBER,
    'modifiés depuis le',
    format(lastModified, 'd MMMM yyyy (HH:mm O) ', {locale: fr}),
    `(${formatDistanceToNow(lastModified, {locale: fr})})`
)

const laTransactionDeSynchronisationDS = await créerTransaction()


const dossSuppP = récupérerTousLesDossiersSupprimés(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)

const groupesInstructeursSynchronisés = recupérerGroupesInstructeurs(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)
    .then(groupesInstructeurs => synchroniserGroupesInstructeurs(groupesInstructeurs, DEMARCHE_NUMBER, laTransactionDeSynchronisationDS));


/** @type {DossierDS88444[]} */
const dossiersDS = await recupérerDossiersRécemmentModifiés(
    DEMARCHE_SIMPLIFIEE_API_TOKEN,
    DEMARCHE_NUMBER,
    lastModified
)


console.info('Nombre de dossiers', dossiersDS.length)

//console.log('3 dossiers', dossiersDS.slice(0, 3))
// console.log('dossier', dossiersDS.find(d => d.number === 26544801))



// stocker les dossiers en BDD

/** @type {Map<keyof DossierDemarcheNumerique88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof DossierDemarcheNumerique88444 sont les schema88444.revision.champDescriptors.map(label)
const pitchouKeyToChampDS = new Map(schema.revision.champDescriptors.map(
    ({label, id}) => [label, id])
)

/** @type {Map<keyof AnnotationsPriveesDemarcheNumerique88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof AnnotationsPriveesDemarcheNumerique88444 sont les schema88444.revision.annotationDescriptors.map(label)
export const pitchouKeyToAnnotationDS = new Map(schema.revision.annotationDescriptors.map(
    ({label, id}) => [label, id])
)

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes(laTransactionDeSynchronisationDS);
// const allEntreprisesCurrentlyInDatabase = listAllEntreprises();

const dossiersDéjàExistantsEnBDD = await getDossierIdsFromDS_Ids(dossiersDS.map(d => d.id), laTransactionDeSynchronisationDS);
const dossierNumberToDossierId = new Map(dossiersDéjàExistantsEnBDD.map(d => [d.number_demarches_simplifiées, d.id]));

/** Télécharger les nouveaux fichiers 'motivation' */
/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersMotivationTéléchargésP = téléchargerNouveauxFichiersMotivation(
    dossiersDS,
    laTransactionDeSynchronisationDS
)

const fichiersMotivationTéléchargés = await fichiersMotivationTéléchargésP

const {
    getDonnéesPersonnesEntreprises,
    makeColonnesCommunesDossierPourSynchro
} = (() => {
    if (DEMARCHE_NUMBER === 88444) {
        return {
            /** @type {GetDonnéesPersonnesEntreprises} **/
            //@ts-ignore On ne peut pas créer des types qui dépendent d'un paramètre
            // ici, on voudrait que le type GetDonnéesPersonnesEntreprises soit fonction de keyof DossierDemarcheNumerique88444
            getDonnéesPersonnesEntreprises: getDonnéesPersonnesEntreprises88444,
            /** @type {MakeColonnesCommunesDossierPourSynchro} **/
            //@ts-ignore On ne peut pas créer des types qui dépendent d'un paramètre
            // ici, on voudrait que le type makeColonnesCommunesDossierPourSynchro88444 soit fonction de keyof AnnotationsPriveesDemarcheNumerique88444
            makeColonnesCommunesDossierPourSynchro: makeColonnesCommunesDossierPourSynchro88444
        }
    } else {
        throw new Error(`Les fonctions nécessaires pour asssocier les questions du formulaire de la démarche aux données Pitchou n'ont pas été trouvées pour la Démarche numéro ${DEMARCHE_NUMBER}.`)
    }
})()


const {dossiersAInitialiserPourSynchro, dossiersAModifierPourSynchro} = await makeDossiersPourSynchronisation(
    dossiersDS,
    DEMARCHE_NUMBER,
    dossierNumberToDossierId,
    fichiersMotivationTéléchargés,
    pitchouKeyToChampDS,
    pitchouKeyToAnnotationDS,
    getDonnéesPersonnesEntreprises,
    makeColonnesCommunesDossierPourSynchro
)

/*
    Créer toutes les personnes manquantes en BDD pour qu'elles aient toutes un id
*/

/** @type {Map<Personne['email'], Personne>} */
const personneByEmail = new Map()
const allPersonnesCurrentlyInDatabase = await allPersonnesCurrentlyInDatabaseP

for(const personne of allPersonnesCurrentlyInDatabase){
    if(personne.email){
        personneByEmail.set(personne.email, personne)
    }
}

/** @type {readonly (DossierEntreprisesPersonneInitializersPourInsert | DossierEntreprisesPersonneInitializersPourUpdate)[] } */
const dossiersPourSynchronisation = Object.freeze([...dossiersAInitialiserPourSynchro, ...dossiersAModifierPourSynchro])

/** @type {Map<PersonneInitializer['email'], PersonneInitializer>} */
const personnesInDossiersAvecEmail = new Map()
const personnesInDossiersSansEmail = new Map()

for (const {dossier: {déposant, demandeur_personne_physique}} of dossiersPourSynchronisation) {
    if (déposant) {
        if(déposant.email) {
            personnesInDossiersAvecEmail.set(déposant.email, déposant)
        } else {
            personnesInDossiersSansEmail.set(`${déposant.prénoms}|${déposant.nom}`, déposant)
        }
    }

    if (demandeur_personne_physique) {
        if(demandeur_personne_physique.email) {
            personnesInDossiersAvecEmail.set(demandeur_personne_physique.email, demandeur_personne_physique)
        } else {
            personnesInDossiersSansEmail.set(`${demandeur_personne_physique.prénoms}|${demandeur_personne_physique.nom}`, demandeur_personne_physique)
        }
    }

}

/**
 *
 * @param {Personne | undefined} descriptionPersonne
 * @returns {Personne['id'] | undefined}
 */
function getPersonneId(descriptionPersonne){
    if(!descriptionPersonne){
        return undefined
    }

    if(descriptionPersonne.id){
        return descriptionPersonne.id
    }

    if(descriptionPersonne.email){
        const personne = personneByEmail.get(descriptionPersonne.email)
        return personne && personne.id
    }

    const personneParNomPrénom = allPersonnesCurrentlyInDatabase.find(
        ({email, nom, prénoms}) => !email && descriptionPersonne.nom === nom && descriptionPersonne.prénoms === prénoms
    )

    return personneParNomPrénom && personneParNomPrénom.id
}

const personnesInDossiersWithoutId = [...personnesInDossiersAvecEmail.values(), ...personnesInDossiersSansEmail.values()].filter(p => !getPersonneId(p))

// console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

if(personnesInDossiersWithoutId.length >= 1){
    await créerPersonnes(personnesInDossiersWithoutId, laTransactionDeSynchronisationDS)
    .then((personneIds) => {
        personnesInDossiersWithoutId.forEach((p, i) => {
            p.id = personneIds[i].id
        })
    })
}

//console.log('personnesInDossiersWithoutId après', personnesInDossiersWithoutId)

/*
    Rajouter les entreprises demandeuses qui ne sont pas déjà en BDD
*/

/** @type {Map<Entreprise['siret'], Entreprise>} */
const entreprisesInDossiersBySiret = new Map()

for(const {dossier: {demandeur_personne_morale, id_demarches_simplifiées}} of dossiersPourSynchronisation){
    if (demandeur_personne_morale) {
        const {siret} = demandeur_personne_morale
        if(demandeur_personne_morale && !siret){
            throw new TypeError(`Siret manquant pour l'entreprise ${JSON.stringify(demandeur_personne_morale)} (id_DS: ${id_demarches_simplifiées})`)
        }

        // @ts-expect-error TS ne comprend pas que demandeur_personne_morale est forcément une Entreprise
        entreprisesInDossiersBySiret.set(siret, demandeur_personne_morale)
    }
}

if(entreprisesInDossiersBySiret.size >= 1){
    await dumpEntreprises([...entreprisesInDossiersBySiret.values()], laTransactionDeSynchronisationDS)
}

/*
 * Après avoir créé les entreprises et les personnes,
 * remplacer les objets Entreprise par leur siret
 * et les objets Personne par leur id
*/

/**
 * @overload
 * @param {DossierEntreprisesPersonneInitializersPourUpdate} dossierPourSynchronisation
 * @return {DossierPourUpdate}
 */
/**
 * @overload
 * @param {DossierEntreprisesPersonneInitializersPourInsert} dossierPourSynchronisation
 * @returns {DossierPourInsert}
 */
/**
 *
 * @param {DossierEntreprisesPersonneInitializersPourInsert | DossierEntreprisesPersonneInitializersPourUpdate} dossierPourSynchronisation
 * @returns {DossierPourInsert | DossierPourUpdate}
 */
function remplacerPersonneEntrepriseInitializerParId(dossierPourSynchronisation){
    const {
        dossier: {
            déposant,
            demandeur_personne_physique,
            demandeur_personne_morale,
            ...autresPropriétésDossiers
        },
        ...autresDonnéesTables
    } = dossierPourSynchronisation

    return {
        dossier: {
            //@ts-expect-error on fait un peu nimps entre l'objet déposant construit à partir de DS et l'identifiant de personne
            déposant: getPersonneId(déposant) || null,
            //@ts-expect-error on fait un peu nimps entre l'objet déposant construit à partir de DS et l'identifiant de personne
            demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
            demandeur_personne_morale:
                (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
            ...autresPropriétésDossiers,
        },
        ...autresDonnéesTables
    }
}

/** @type {DossierPourInsert[]} */
const dossiersAInitialiser = dossiersAInitialiserPourSynchro.map(remplacerPersonneEntrepriseInitializerParId)

/** @type {DossierPourUpdate[]} */
// @ts-ignore La signature de remplacerPersonneEntrepriseInitializerParId ne permet pas d'assurer que si en entrée on a un DossierEntreprisesPersonneInitializersPourUpdate alors en sortie on aura un DossierPourUpdate
const dossiersAModifier = dossiersAModifierPourSynchro.map(remplacerPersonneEntrepriseInitializerParId)


/** Télécharger les nouveaux fichiers espèces impactées */
/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersEspècesImpactéesTéléchargésP = (async () => {
    if (DEMARCHE_NUMBER === 88444) {
        return récupérerFichiersEspècesImpactées88444(
            dossiersDS,
            pitchouKeyToChampDS,
            laTransactionDeSynchronisationDS
        )
    } else {
        throw new Error(`La fonction pour récupérer les fichiers espèces impactées n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`)
    }
})()


/** @typedef {keyof DossierDemarcheNumerique88444} ChampFormulaire */
/** @type {ChampFormulaire88444[]} */
const champsAvecPiècesJointes88444 = [
    'Dépot du dossier complet de demande de dérogation', 
    'Si nécessaire, vous pouvez déposer ici des pièces jointes complétant votre demande',
    'Diagnostic écologique',
    'Déposez ici l\'argumentaire précis vous ayant permis de conclure à l\'absence de risque suffisament caractérisé pour les espèces protégées et leurs habitats.',
    'Joindre les pièces justifiant de la finalité de la demande',
    'Joindre le bilan des opérations antérieures',
    'Ajoutez un fichier décrivant ces mesures complémentaires :',
    'Plan des installations',
    `Joindre une carte du périmètre d'intervention si besoin`,
    'Pièces jointes décrivant précisément le protocole qui sera mis en place',
]

/** Télécharger les pièces jointes au dossier par le pétitionnaire*/
const fichiersPiècesJointesPétitionnaireTéléchargésP = (async () => {
    if (DEMARCHE_NUMBER === 88444) {
        return récupérerPiècesJointesPétitionnaire88444(
            dossiersDS,
            pitchouKeyToChampDS,
            champsAvecPiècesJointes88444,
            laTransactionDeSynchronisationDS
        )
    } else {
        throw new Error(`La fonction pour récupérer les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`)
    }
})()



/**
 * Synchronisation des dossiers
 */
let dossiersSynchronisés
if(dossiersAInitialiser.length >= 1 || dossiersAModifierPourSynchro.length >= 1){
    dossiersSynchronisés = dumpDossiers(dossiersAInitialiser, dossiersAModifier, laTransactionDeSynchronisationDS)
}

const dossiersSupprimés = dossSuppP.then( dossiersSupp => deleteDossierByDSNumber(dossiersSupp.map(({number}) => number)))

await Promise.all([
    dossiersSynchronisés,
    dossiersSupprimés
])

/**
 * Après synchronisation des dossiers
 *
 * Désormais, chaque dossier de la variable 'dossiers' avec un numéro de dossier DS
 * a aussi un identifiant de dossier pitchou
 */



/**
 * Synchronisation de toutes les choses qui ont besoin d'un Dossier['id']
 */

const dossierIds = await getDossierIdsFromDS_Ids(dossiersDS.map(d => d.id), laTransactionDeSynchronisationDS)
/** @type {Map<NonNullable<DossierDS88444['id']>, DatabaseDossier['id']>} */
const dossierIdByDS_id = new Map()
/** @type {Map<DossierDS88444['number'], DatabaseDossier['id']>} */
const dossierIdByDS_number = new Map()

for(const {id, id_demarches_simplifiées, number_demarches_simplifiées} of dossierIds){
    dossierIdByDS_id.set(id_demarches_simplifiées, id)
    dossierIdByDS_number.set(Number(number_demarches_simplifiées), id)
}



/** Synchronisation de la messagerie */

/** @type {Map<NonNullable<DatabaseDossier['id_demarches_simplifiées']>, Message[]>} */
const messagesÀMettreEnBDDAvecDossierId_DS = new Map(dossiersDS.map(
    ({id: id_DS, messages}) => [id_DS, messages])
)


let messagesSynchronisés;

/** @type {Map<DatabaseDossier['id'], Message[]>} */
const messagesÀMettreEnBDDAvecDossierId = new Map()
for(const [id_DS, messages] of messagesÀMettreEnBDDAvecDossierId_DS){
    const dossierId = dossierIdByDS_id.get(id_DS)

    // @ts-ignore
    messagesÀMettreEnBDDAvecDossierId.set(dossierId, messages)
}

if(messagesÀMettreEnBDDAvecDossierId.size >= 1){
    messagesSynchronisés = dumpDossierMessages(messagesÀMettreEnBDDAvecDossierId, laTransactionDeSynchronisationDS)
}


/** Synchronisation dossier dans groupeInstructeur */

let synchronisationDossierDansGroupeInstructeur;

if(dossiersDS.length >= 1){
    /** Synchronisation de l'information de quel dossier appartient à quel groupe_instructeurs */
    synchronisationDossierDansGroupeInstructeur = synchroniserDossierDansGroupeInstructeur(dossiersDS, laTransactionDeSynchronisationDS);
}

/** Synchronisation des fichiers espèces impactées téléchargés */
const fichiersEspècesImpactéesSynchronisés = fichiersEspècesImpactéesTéléchargésP.then(fichiersEspècesImpactéesTéléchargés => {
    if(fichiersEspècesImpactéesTéléchargés && fichiersEspècesImpactéesTéléchargés.size >= 1){

        return synchroniserFichiersEspècesImpactéesDepuisDS88444(
            fichiersEspècesImpactéesTéléchargés,
            laTransactionDeSynchronisationDS
        )
    }
})

/** Synchronisation des fichiers pièces jointes pétitionnaire téléchargés */
const fichiersPiècesJointesPétitionnaireSynchronisés = fichiersPiècesJointesPétitionnaireTéléchargésP.then(fichiersPiècesJointesPétitionnaireTéléchargés => {
    if (DEMARCHE_NUMBER !== 88444) {
        throw new Error(`La fonction pour synchroniser les pièces jointes du pétitionnaire n'a pas été trouvée pour la Démarche numéro ${DEMARCHE_NUMBER}.`)
    }

    const fichiersPiècesJointesPétitionnaireTéléchargésParDossierId = new Map(
        [...fichiersPiècesJointesPétitionnaireTéléchargés].map(([number, fichiers]) => {
            const id = dossierIdByDS_number.get(number)
            if(!id){
                console.log('dossierIdByDS_number', dossierIdByDS_number)
                throw `Id de dossier manquant pour dossier DS ${number}`
            }

            return  [id, fichiers]
        })
    )
    return synchroniserFichiersPiècesJointesPétitionnaireDepuisDS88444(
        fichiersPiècesJointesPétitionnaireTéléchargésParDossierId,
        dossiersDS,
        dossierIdByDS_number,
        pitchouKeyToChampDS,
        champsAvecPiècesJointes88444,
        laTransactionDeSynchronisationDS
    )
})


/*
    Mise à jour des notifications
*/
const mettreÀjourNotificationP = mettreÀjourNotification(dossiersDS, dossierIdByDS_number, laTransactionDeSynchronisationDS);


/** Fin de l'outil de synchronisation - fermeture */

Promise.all([
    groupesInstructeursSynchronisés,
    messagesSynchronisés,
    synchronisationDossierDansGroupeInstructeur,
    fichiersEspècesImpactéesSynchronisés,
    fichiersPiècesJointesPétitionnaireSynchronisés,
    mettreÀjourNotificationP
])
.then(() => {
    console.log('Sync terminé avec succès, commit de la transaction')
    /** @type {RésultatSynchronisationDS88444} */
    const résultatSynchro = {
        succès: true,
        horodatage: new Date(),
        erreur: null
    }

    return Promise.allSettled([
        addRésultatSynchronisationDS88444(résultatSynchro),
        laTransactionDeSynchronisationDS.commit()
    ])
})
.catch(err => {
    console.error('Sync échoué', err,  'rollback de la transaction')

    /** @type {RésultatSynchronisationDS88444} */
    const résultatSynchro = {
        succès: false,
        horodatage: new Date(),
        erreur: err.toString()
    }

    return Promise.allSettled([
        addRésultatSynchronisationDS88444(résultatSynchro),
        laTransactionDeSynchronisationDS.rollback()
    ])
})
.then(() => {
    console.log('Fin de la synchronisation, cloture de la connexion avec la base de données')
    return closeDatabaseConnection()
})
