//@ts-check

import parseArgs from 'minimist'
import {sub, format, formatDistanceToNow, isAfter} from 'date-fns'
import { fr } from "date-fns/locale"

import {dumpEntreprises, closeDatabaseConnection, créerTransaction, addRésultatSynchronisationDS88444} from '../scripts/server/database.js'
import {dumpDossiers, getDossierIdsFromDS_Ids, dumpDossierMessages, dumpDossierTraitements, synchroniserSuiviDossier, deleteDossierByDSNumber, synchroniserDossierDansGroupeInstructeur} from '../scripts/server/database/dossier.js'
import {listAllPersonnes, créerPersonnes} from '../scripts/server/database/personne.js'
import {synchroniserGroupesInstructeurs} from '../scripts/server/database/groupe_instructeurs.js'
import { ajouterFichiersEspècesImpactéesDepuisDS88444 } from '../scripts/server/database/espèces_impactées.js'

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/démarches-simplifiées/recupérerDossiersRécemmentModifiés.js'
import {recupérerGroupesInstructeurs} from '../scripts/server/démarches-simplifiées/recupérerGroupesInstructeurs.js'
import récupérerTousLesDossiersSupprimés from '../scripts/server/démarches-simplifiées/recupérerListeDossiersSupprimés.js'

import {isValidDate} from '../scripts/commun/typeFormat.js'

//import checkMemory from '../scripts/server/checkMemory.js'

import _schema88444 from '../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}
import {téléchargerNouveauxFichiersEspècesImpactées, téléchargerNouveauxFichiersAP_AM, téléchargerNouveauxFichiersMotivation} from './synchronisation-ds-88444/téléchargerNouveauxFichiersParType.js'
import { ajouterDécisionsAdministratives, miseÀJourDécisionsAdministrativesDepuisDS88444 } from '../scripts/server/database/décision_administrative.js'

import { getDossiersPourSynchronisation } from './synchronisation-ds-88444/getDossiersPourSynchronisation.js'

/** @import {default as DatabaseDossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import {default as Personne, PersonneInitializer} from '../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../scripts/types/database/public/Entreprise.ts' */
/** @import {default as DécisionAdministrative} from '../scripts/types/database/public/DécisionAdministrative.ts' */
/** @import {default as RésultatSynchronisationDS88444} from '../scripts/types/database/public/RésultatSynchronisationDS88444.ts' */
/** @import {default as Fichier} from '../scripts/types/database/public/Fichier.ts' */

/** @import {TypeDécisionAdministrative} from '../scripts/types/API_Pitchou.ts' */

/** @import {Message} from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {DossierDS88444} from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {SchemaDémarcheSimplifiée, ChampDescriptor} from '../scripts/types/démarches-simplifiées/schema.ts' */
/** @import {DécisionAdministrativeAnnotation88444, DossierPourSynchronisation} from '../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */
/** @import {DossierDemarcheSimplifiee88444, AnnotationsPriveesDemarcheSimplifiee88444} from '../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {DossierInitializer, DossierMutator} from '../scripts/types/database/public/Dossier.ts' */


// récups les données de DS

const DEMARCHE_SIMPLIFIEE_API_TOKEN = process.env.DEMARCHE_SIMPLIFIEE_API_TOKEN
if(!DEMARCHE_SIMPLIFIEE_API_TOKEN){
  throw new TypeError(`Variable d'environnement DEMARCHE_SIMPLIFIEE_API_TOKEN manquante`)
}

/** @type {number} */
const DEMARCHE_NUMBER = parseInt(process.env.DEMARCHE_NUMBER || "")
if(!DEMARCHE_NUMBER){
  throw new TypeError(`Variable d'environnement DEMARCHE_NUMBER manquante`)
}

const DATABASE_URL = process.env.DATABASE_URL
if(!DATABASE_URL){
  throw new TypeError(`Variable d'environnement DATABASE_URL manquante`)
}

const args = parseArgs(process.argv)

/** @type {Date} */
let lastModified;

if(typeof args.lastModified === 'string' && isValidDate(new Date(args.lastModified))){
    lastModified = new Date(args.lastModified)
}
else{
    lastModified = sub(new Date(), {hours: 12})
}

console.info(
    `Synchronisation des dossiers de la démarche`, 
    DEMARCHE_NUMBER, 
    'modifiés depuis le', 
    format(lastModified, 'd MMMM yyyy (HH:mm O) ', {locale: fr}),
    `(${formatDistanceToNow(lastModified, {locale: fr})})`
)

/** @type {SchemaDémarcheSimplifiée} */
// @ts-expect-error TS ne peut pas le savoir
const schema88444 = _schema88444

const laTransactionDeSynchronisationDS = await créerTransaction()


const dossSuppP = récupérerTousLesDossiersSupprimés(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)

const groupesInstructeursSynchronisés = recupérerGroupesInstructeurs(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)
    .then(groupesInstructeurs => synchroniserGroupesInstructeurs(groupesInstructeurs, laTransactionDeSynchronisationDS));


/** @type {DossierDS88444[]} */
const dossiersDS = await recupérerDossiersRécemmentModifiés(
    DEMARCHE_SIMPLIFIEE_API_TOKEN, 
    DEMARCHE_NUMBER, 
    lastModified
)


console.info('Nombre de dossiers', dossiersDS.length)

//console.log('3 dossiers', dossiersDS.slice(0, 3))
//console.log('dossier', dossiersDS.find(d => d.number === 25298686))



// stocker les dossiers en BDD

/** @type {Map<keyof DossierDemarcheSimplifiee88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof DossierDemarcheSimplifiee88444 sont les schema88444.revision.champDescriptors.map(label)
const pitchouKeyToChampDS = new Map(schema88444.revision.champDescriptors.map(
    ({label, id}) => [label, id])
)

/** @type {Map<keyof AnnotationsPriveesDemarcheSimplifiee88444, ChampDescriptor['id']>} */
//@ts-expect-error TS ne comprend pas que les clefs de keyof AnnotationsPriveesDemarcheSimplifiee88444 sont les schema88444.revision.annotationDescriptors.map(label)
const pitchouKeyToAnnotationDS = new Map(schema88444.revision.annotationDescriptors.map(
    ({label, id}) => [label, id])
)

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes();
// const allEntreprisesCurrentlyInDatabase = listAllEntreprises();



/** @type {Map<DatabaseDossier['number_demarches_simplifiées'], DécisionAdministrativeAnnotation88444>} */
const donnéesDécisionAdministrativeParNuméroDossier = new Map();

const dossiersDéjàExistantsEnBDD = await getDossierIdsFromDS_Ids(dossiersDS.map(d => d.id), laTransactionDeSynchronisationDS);
const idDSDossiersDéjàExistantsEnBDD = new Set(dossiersDéjàExistantsEnBDD.map(d => d.id_demarches_simplifiées));

const {dossiersAInitialiserPourSynchro, dossiersAModifierPourSynchro} = await getDossiersPourSynchronisation(dossiersDS, idDSDossiersDéjàExistantsEnBDD, pitchouKeyToChampDS, pitchouKeyToAnnotationDS, donnéesDécisionAdministrativeParNuméroDossier)

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

/** @type {readonly (Omit<DossierPourSynchronisation<DossierInitializer>, "demandeur_personne_physique"> | Omit<DossierPourSynchronisation<DossierMutator>, "demandeur_personne_physique">)[] } */
const dossiersPourSynchronisation = Object.freeze([...dossiersAInitialiserPourSynchro, ...dossiersAModifierPourSynchro])

/** @type {Map<PersonneInitializer['email'], PersonneInitializer>} */
const personnesInDossiersAvecEmail = new Map()
const personnesInDossiersSansEmail = new Map()

for (const {déposant, /** demandeur_personne_physique */} of dossiersPourSynchronisation) {
    if (déposant) {
        if(déposant.email) {
            personnesInDossiersAvecEmail.set(déposant.email, déposant)
        } else {
            personnesInDossiersSansEmail.set(`${déposant.prénoms}|${déposant.nom}`, déposant)
        }
    }

    /** if (demandeur_personne_physique) {
        if(demandeur_personne_physique.email) {
            personnesInDossiersAvecEmail.set(demandeur_personne_physique.email, demandeur_personne_physique)
        } else {
            personnesInDossiersSansEmail.set(`${demandeur_personne_physique.prénoms}|${demandeur_personne_physique.nom}`, demandeur_personne_physique)
        }
    } */

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
    await créerPersonnes(personnesInDossiersWithoutId)
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

for(const {demandeur_personne_morale, id_demarches_simplifiées} of dossiersPourSynchronisation){
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
    await dumpEntreprises([...entreprisesInDossiersBySiret.values()])
}

/*
 * Après avoir créé les entreprises et les personnes, 
 * remplacer les objets Entreprise par leur siret
 * et les objets Personne par leur id
*/

/** @type {DossierPourSynchronisation<DossierInitializer>[]} */
//@ts-ignore
const dossiersAInitialiser = dossiersAInitialiserPourSynchro.map(dossier => {
    const { 
        déposant,
        /** demandeur_personne_physique, */
        demandeur_personne_morale, 
        ...autresPropriétés
    } = dossier

    return {
        //@ts-expect-error on fait un peu nimps entre l'objet déposant construit à partir de DS et l'identifiant de personne
        déposant: getPersonneId(déposant) || null,
        //demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
        demandeur_personne_morale: 
            (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
        ...autresPropriétés,
    }
})

/** @type {DossierPourSynchronisation<DossierMutator>[]} */
//@ts-ignore
const dossiersAModifier = dossiersAModifierPourSynchro.map(dossier => {
    const { 
        déposant,
        /** demandeur_personne_physique, */
        demandeur_personne_morale, 
        ...autresPropriétés
    } = dossier

    return {
        //@ts-expect-error on fait un peu nimps entre l'objet déposant construit à partir de DS et l'identifiant de personne
        déposant: getPersonneId(déposant) || null,
        //demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
        demandeur_personne_morale: 
            (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
        ...autresPropriétés,
    }
})


/** Télécharger les nouveaux fichiers espèces impactées */
/** @type {ChampDescriptor['id'] | undefined} */
const fichierEspècesImpactéeChampId = pitchouKeyToChampDS.get('Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes')

if(!fichierEspècesImpactéeChampId){
    throw new Error('fichierEspècesImpactéeChampId is undefined')
}

/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersEspècesImpactéesTéléchargésP = téléchargerNouveauxFichiersEspècesImpactées(
    dossiersDS, 
    fichierEspècesImpactéeChampId, 
    laTransactionDeSynchronisationDS
)


/** Télécharger les nouveaux arrêtés préfectoraux et ministériels depuis les annotations privées */
/** @type {ChampDescriptor['id'] | undefined} */
const fichierAP_AMAnnotationId = pitchouKeyToAnnotationDS.get('AP/AM')

if(!fichierAP_AMAnnotationId){
    throw new Error('fichierAP_AMAnnotationId is undefined')
}

/** @type {Promise<Map<DossierDS88444['number'], Fichier['id'][]> | undefined>} */
const fichiersAP_AMTéléchargésP = téléchargerNouveauxFichiersAP_AM(
    dossiersDS, 
    fichierAP_AMAnnotationId, 
    laTransactionDeSynchronisationDS
)


//console.log('avec fichier motivation', dossiersDS.filter(d => d.motivationAttachment).map(d => d.number))

/** Télécharger les nouveaux fichiers 'motivation' */
/** @type {Promise<Map<DossierDS88444['number'], Fichier['id']> | undefined>} */
const fichiersMotivationTéléchargésP = téléchargerNouveauxFichiersMotivation(
    dossiersDS,
    laTransactionDeSynchronisationDS
)


/**
 * Synchronisation des dossiers
 */
let dossiersSynchronisés
if(dossiersAInitialiser.length >= 1 || dossiersAModifierPourSynchro.length >= 1){
    dossiersSynchronisés = dumpDossiers(dossiersAInitialiser, dossiersAModifier)
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

const dossierIds = await getDossierIdsFromDS_Ids(dossiersDS.map(d => d.id))
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
    messagesSynchronisés = dumpDossierMessages(messagesÀMettreEnBDDAvecDossierId)
}


/** Synchronisation suivi dossier et dossier dans groupeInstructeur */

let synchronisationSuiviDossier;
let synchronisationDossierDansGroupeInstructeur;

if(dossiersDS.length >= 1){
    /** Synchronisation de l'information des dossiers suivis */
    synchronisationSuiviDossier = synchroniserSuiviDossier(dossiersDS, laTransactionDeSynchronisationDS);

    /** Synchronisation de l'information de quel dossier appartient à quel groupe_instructeurs */
    synchronisationDossierDansGroupeInstructeur = synchroniserDossierDansGroupeInstructeur(dossiersDS, laTransactionDeSynchronisationDS);
}



/** Synchronisation des évènements de changement de phase */

/** @type {Map<NonNullable<DossierDS88444['number']>, DossierDS88444['traitements']>} */
const traitementsByNumberDS = new Map(dossiersDS.map(
    ({number, traitements}) => [number, traitements])
)


let traitementsSynchronisés;

/** @type {Map<DatabaseDossier['id'], DossierDS88444['traitements']>} */
const idToTraitements = new Map()

for(const [number, traitements] of traitementsByNumberDS){
    const dossierId = dossierIdByDS_number.get(number)

    if(!dossierId)
        throw new Error(`Dossier.id manquant pour dossier DS numéro ${number}`)

    idToTraitements.set(dossierId, traitements)
}

if(idToTraitements.size >= 1){
    traitementsSynchronisés = dumpDossierTraitements(idToTraitements, laTransactionDeSynchronisationDS)
}


/** Synchronisation des décisions administratives */
/*
    Les fichiers téléchargés correspondent à ceux qui n'avaient pas été téléchargés et donc sûrement à
    une nouvelle décision administrative qui n'est pas encore en BDD

    On utilise le dernier traitement du dossier pour déterminer le type de décision administrative (acceptation, refus)
*/
let décisionsAdministrativesSynchronisées = fichiersMotivationTéléchargésP.then(fichiersMotivationTéléchargés => {
    if(fichiersMotivationTéléchargés && fichiersMotivationTéléchargés.size >= 1){
        /** @type {Omit<DécisionAdministrative, 'id'>[]} */
        const décisionsAdministratives = []

        for(const [numéroDS, fichierMotivationId] of fichiersMotivationTéléchargés){
            /** @type {TypeDécisionAdministrative} */
            let type = 'Autre décision';

            const traitements = traitementsByNumberDS.get(numéroDS)
            if(!traitements){
                throw new Error(`Traitements manquants pour dossier DS numéro ${numéroDS}`)
            }

            let dernierTraitement = traitements[0];

            for(const traitement of traitements){
                if(isAfter(traitement.dateTraitement, dernierTraitement.dateTraitement)){
                    dernierTraitement = traitement
                }
            }

            if(dernierTraitement.state === 'accepte')
                type = 'Arrêté dérogation'

            if(dernierTraitement.state === 'refuse')
                type = 'Arrêté refus'

            const dossierId = dossierIdByDS_number.get(numéroDS)
            if(!dossierId){
                throw new Error(`Dossier id manquant pour dossier DS numéro ${numéroDS}`)
            }

            décisionsAdministratives.push({
                dossier: dossierId,
                fichier: fichierMotivationId,
                type,
                date_signature: null, // pas de remplissage par défaut
                numéro: null,
                date_fin_obligations: null
            })
        }
        
        return ajouterDécisionsAdministratives(décisionsAdministratives, laTransactionDeSynchronisationDS)
    }
})




/** Synchronisation des fichiers espèces impactées téléchargés */

const fichiersEspècesImpactéesSynchronisés = fichiersEspècesImpactéesTéléchargésP.then(fichiersEspècesImpactéesTéléchargés => {
    if(fichiersEspècesImpactéesTéléchargés && fichiersEspècesImpactéesTéléchargés.size >= 1){
        //checkMemory()

        return ajouterFichiersEspècesImpactéesDepuisDS88444(
            fichiersEspècesImpactéesTéléchargés,
            laTransactionDeSynchronisationDS
        )
    }
})


/** Synchronisation des fichiers AP/AM téléchargés */
const fichiersAP_AMSynchronisés = fichiersAP_AMTéléchargésP.then(fichiersAP_AMTéléchargés => {
    if(fichiersAP_AMTéléchargés && fichiersAP_AMTéléchargés.size >= 1){

        console.log('fichiersAP_AMTéléchargés', fichiersAP_AMTéléchargés.size)

        const dossiers = [...dossiersAInitialiser, ...dossiersAModifier]
        return miseÀJourDécisionsAdministrativesDepuisDS88444(
            fichiersAP_AMTéléchargés,
            //@ts-ignore
            dossiers,
            dossierIdByDS_number,
            donnéesDécisionAdministrativeParNuméroDossier,
            laTransactionDeSynchronisationDS
        )
    }
})



/** Fin de l'outil de synchronisation - fermeture */

Promise.all([
    groupesInstructeursSynchronisés,
    messagesSynchronisés,
    traitementsSynchronisés,
    décisionsAdministrativesSynchronisées,
    synchronisationSuiviDossier,
    synchronisationDossierDansGroupeInstructeur,
    fichiersEspècesImpactéesSynchronisés,
    fichiersAP_AMSynchronisés
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

