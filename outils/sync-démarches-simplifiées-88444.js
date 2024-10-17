//@ts-check

import parseArgs from 'minimist'
import {sub, format, formatDistanceToNow} from 'date-fns'
import { fr } from "date-fns/locale"

import {dumpEntreprises, closeDatabaseConnection} from '../scripts/server/database.js'
import {dumpDossiers, getDossierIdsFromDS_Ids, dumpDossierMessages, synchroniserSuiviDossier, deleteDossierByDSNumber} from '../scripts/server/database/dossier.js'
import {listAllPersonnes, créerPersonnes} from '../scripts/server/database/personne.js'
import {synchroniserGroupesInstructeurs} from '../scripts/server/database/groupe_instructeurs.js'
import {recupérerDossiersRécemmentModifiés} from '../scripts/server/démarches-simplifiées/recupérerDossiersRécemmentModifiés.js'
import {recupérerGroupesInstructeurs} from '../scripts/server/démarches-simplifiées/recupérerGroupesInstructeurs.js'
import récupérerTousLesDossiersSupprimés from '../scripts/server/démarches-simplifiées/recupérerListeDossiersSupprimés.js'

import {isValidDate} from '../scripts/commun/typeFormat.js'

/** @import {default as Dossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import {default as Personne, PersonneInitializer} from '../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../scripts/types/database/public/Entreprise.ts' */
/** @import {default as Message} from '../scripts/types/database/public/Message.ts' */
/** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444} from '../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {DémarchesSimpliféesCommune, BaseChampDS, ChampDSCommunes, ChampDSDépartements, ChampDSRégions, Dossier as DossierDS } from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {DossierPourSynchronisation} from '../scripts/types/démarches-simplifiées/DossierPourSynchronisation.ts' */

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

console.log(
    `Synchronisation des dossiers de la démarche`, 
    DEMARCHE_NUMBER, 
    'modifiés depuis le', 
    format(lastModified, 'd MMMM yyyy (HH:mm O) ', {locale: fr}),
    `(${formatDistanceToNow(lastModified, {locale: fr})})`
)



const dossSuppP = récupérerTousLesDossiersSupprimés(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)


const groupesInstructeursSynchronisés = recupérerGroupesInstructeurs(DEMARCHE_SIMPLIFIEE_API_TOKEN, DEMARCHE_NUMBER)
    .then(synchroniserGroupesInstructeurs);


/** @type {DossierDS<BaseChampDS>[]} */
const dossiersDS = await recupérerDossiersRécemmentModifiés(
    DEMARCHE_SIMPLIFIEE_API_TOKEN, 
    DEMARCHE_NUMBER, 
    lastModified
)


//console.log('démarche', démarche)
console.log('Nombre de dossiers', dossiersDS.length)
//console.log('3 dossiers', démarche.dossiers.nodes.slice(0, 3))
//console.log('champs', démarche.dossiers.nodes[0].champs)
//console.log('un dossier', JSON.stringify(dossiersDS[3], null, 2))
//console.log(`messages d'un dossier`, JSON.stringify(dossiersDS[3].messages))


// stocker les dossiers en BDD

const pitchouKeyToChampDS = {
    "SIRET": "Q2hhbXAtMzg5NzM5NA==",
    "Nom du projet": "Q2hhbXAtNDE0OTExNQ==",
    "espèces_protégées_concernées": 'Q2hhbXAtMzg5NzQwNQ==',
    "communes": 'Q2hhbXAtNDA0MTQ0MQ==',
    "départements" : 'Q2hhbXAtNDA0MTQ0NQ==',
    "régions" : 'Q2hhbXAtNDA0MTQ0OA==',
    "Le projet se situe au niveau…": 'Q2hhbXAtMzg5NzQwOA==',
    "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?" : "Q2hhbXAtNDA4MzAxMQ==",
}

/*

Avec l'aide de 
 await fetch('https://www.demarches-simplifiees.fr/preremplir/derogation-especes-protegees/schema')
    .then(r => r.json())
    .then(schema => JSON.stringify(Object.fromEntries(schema.revision.annotationDescriptors
        .filter(c => c.__typename !== 'HeaderSectionChampDescriptor')
        .map(({id, label}) => [label, id])), null, 4
    )) 

 */

/** @type {Record<keyof AnnotationsPriveesDemarcheSimplifiee88444, string>}  */
const pitchouKeyToAnnotationDS = {
    "Nom du porteur de projet": "Q2hhbXAtNDM3OTk5Mg==",
    "Localisation du projet": "Q2hhbXAtNDM3OTk5NA==",
    "DDEP nécessaire ?": "Q2hhbXAtNDM2MTc3Ng==",
    "Dossier en attente de": "Q2hhbXAtNDM3NDc2Nw==",
    "Enjeu écologique": "Q2hhbXAtNDAwMTQ3MQ==",
    "Enjeu politique": "Q2hhbXAtNDA5ODY5NQ==",
    "Commentaires sur les enjeux et la procédure": "Q2hhbXAtNDA5ODY5Ng==",
    "Date de réception DDEP": "Q2hhbXAtNDE0NzgzMg==",
    "Commentaires libre sur l'état de l'instruction": "Q2hhbXAtNDM4OTkxMg==",
    // Pour l'instant, on ne gère pas le champ `PieceJustificativeChampDescriptor`
    // "Dernière contribution en lien avec l'instruction DDEP": "Q2hhbXAtNDE0NzkzMg==",
    "Date d'envoi de la dernière contribution en lien avec l'instruction DDEP": "Q2hhbXAtNDE0NzgzMw==",
    // Pour l'instant, on ne gère pas le champ `PieceJustificativeChampDescriptor`
    //"Autres documents relatifs au dossier": "Q2hhbXAtNDI0ODE4Nw==",
    "N° Demande ONAGRE": "Q2hhbXAtNDE0NzgzMQ==",
    // Pour l'instant, on ne gère pas le champ `PieceJustificativeChampDescriptor`
    //"Saisine de l'instructeur": "Q2hhbXAtNDI2NDUwMQ==",
    "Date saisine CSRPN": "Q2hhbXAtNDE0ODM2Nw==",
    "Date saisine CNPN": "Q2hhbXAtNDI2MDQ3Ng==",
    "Date avis CSRPN": "Q2hhbXAtNDE0ODM2OQ==",
    "Date avis CNPN": "Q2hhbXAtNDI2MDQ3Nw==",
    "Avis CSRPN/CNPN": "Q2hhbXAtNDE0ODk0NQ==",
    "Date de début de la consultation du public ou enquête publique": "Q2hhbXAtNDE0MTM0Mg==",
    "Décision": "Q2hhbXAtNDE0MTk1Ng==",
    "Date de signature de l'AP": "Q2hhbXAtNDE0MTk1Mg==",
    "Référence de l'AP": "Q2hhbXAtNDE0MTk1Mw==",
    "Date de l'AM": "Q2hhbXAtNDE0MTk1NA==",
    "Référence de l'AM": "Q2hhbXAtNDE0MTk1NQ==",
    // Pour l'instant, on ne gère pas le champ `PieceJustificativeChampDescriptor`
    //"AP/AM": "Q2hhbXAtNDE0ODk0Nw=="
}

const allPersonnesCurrentlyInDatabaseP = listAllPersonnes();
// const allEntreprisesCurrentlyInDatabase = listAllEntreprises();

/** @type {DossierPourSynchronisation[]} */
const dossiersPourSynchronisation = dossiersDS.map((
{
    id: id_demarches_simplifiées,
    number,
    dateDepot: date_dépôt, 
    state: statut, 
    demandeur,
    champs,
    annotations
}) => {
    /**
     * Meta données
     */
    const number_demarches_simplifiées = number

    /*
        Déposant 

        Le déposant est la personne qui dépose le dossier sur DS
        Dans certaines situations, cette personne est différente du demandeur (personne morale ou physique 
        qui demande la dérogation), par exemple, si un bureau d'étude mandaté par une personne morale dépose 
        le dossier
        Le déposant n'est pas forcément représentant interne (point de contact principale) du demandeur

        Dans la nomenclature DS, ce que nous appelons "déposant" se trouve dans la propriété "demandeur" 
        (qui est différent de notre "demandeur")

    */
    /** @type {PersonneInitializer} */
    let déposant;
    {
        const {prenom: prénoms, nom, email} = demandeur
        déposant = {
            prénoms,
            nom,
            email: email === '' ? undefined : email
        }
    }

    /** 
     * Champs 
     */
    /** @type {Map<string, any>} */
    const champById = new Map()
    for(const champ of champs){
        champById.set(champ.id, champ)
    }

    const nom = champById.get(pitchouKeyToChampDS['Nom du projet'])?.stringValue
    const espèces_protégées_concernées = champById.get(pitchouKeyToChampDS['espèces_protégées_concernées'])?.stringValue


    /* localisation */
    /** @type {DossierDemarcheSimplifiee88444['Le projet se situe au niveau…'] | ''} */
    const projetSitué = champById.get(pitchouKeyToChampDS["Le projet se situe au niveau…"]).stringValue
    /** @type {ChampDSCommunes} */
    const champCommunes = champById.get(pitchouKeyToChampDS["communes"])
    /** @type {ChampDSDépartements} */
    const champDépartements = champById.get(pitchouKeyToChampDS["départements"])
    /** @type {ChampDSRégions} */
    const champRégions = champById.get(pitchouKeyToChampDS["régions"])

    /** @type {DémarchesSimpliféesCommune[] | undefined} */
    let communes;
    let départements;
    let régions;

    if(projetSitué === `d'une ou plusieurs communes` && champCommunes){
        communes = champCommunes.rows.map(c => c.champs[0].commune).filter(x => !!x)
        
        if(Array.isArray(communes) && communes.length >= 1){
            départements = [... new Set(champCommunes.rows.map(c => c.champs[0].departement.code))]
        }
    }
    else{
        if(projetSitué === `d'un ou plusieurs départements` && champDépartements){
            départements = [... new Set(champDépartements.rows.map(c => c.champs[0].departement.code))]
        }
        else{
            if(projetSitué === `d'une ou plusieurs régions` && champRégions){
                régions = [... new Set(champRégions.rows.map(c => c.champs[0].stringValue))]
            }
            else{
                if(projetSitué === 'de toute la France'){
                    // ignorer
                }
                else{
                    if(projetSitué === ''){
                        // ignorer
                    }
                    else{
                        console.log('localisation manquante', projetSitué, champs)
                        process.exit(1)
                    }
                }
            }
        }
    }


    /*
        Demandeur
     
        Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */

    /** @type {PersonneInitializer | undefined} */
    let demandeur_personne_physique = undefined;
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined
 
    const SIRETChamp = champById.get(pitchouKeyToChampDS["SIRET"])
    if(!SIRETChamp){
        demandeur_personne_physique = déposant;
    }
    else{
        const etablissement = SIRETChamp.etablissement
        if(etablissement){
            const { siret, address = {}, entreprise = {}} = etablissement
            const {streetAddress, postalCode, cityName} = address
            const {raisonSociale} = entreprise


            demandeur_personne_morale = {
                siret,
                raison_sociale: raisonSociale,
                adresse: `${streetAddress} ${postalCode} ${cityName}`
            }
        }
    }

    /** Régime AE */
    const rattaché_au_régime_ae = champById.get(pitchouKeyToChampDS["Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?"]).checked

    /**
     * Annotations privées
     */
    /** @type {Map<string, any>} */
    const annotationById = new Map()
    for(const annotation of annotations){
        annotationById.set(annotation.id, annotation)
    }

    const historique_nom_porteur = annotationById.get(pitchouKeyToAnnotationDS["Nom du porteur de projet"])?.stringValue
    const historique_localisation = annotationById.get(pitchouKeyToAnnotationDS["Localisation du projet"])?.stringValue
    const ddep_nécessaire = annotationById.get(pitchouKeyToAnnotationDS["DDEP nécessaire ?"])?.stringValue
    const en_attente_de = annotationById.get(pitchouKeyToAnnotationDS["Dossier en attente de"])?.stringValue

    const enjeu_écologique = annotationById.get(pitchouKeyToAnnotationDS["Enjeu écologique"]).checked
    const enjeu_politique = annotationById.get(pitchouKeyToAnnotationDS["Enjeu politique"]).checked
    const commentaire_enjeu = annotationById.get(pitchouKeyToAnnotationDS["Commentaires sur les enjeux et la procédure"]).stringValue

    const historique_date_réception_ddep = annotationById.get(pitchouKeyToAnnotationDS["Date de réception DDEP"]).date
    
    const commentaire_libre = annotationById.get(pitchouKeyToAnnotationDS["Commentaires libre sur l'état de l'instruction"]) ?
        annotationById.get(pitchouKeyToAnnotationDS["Commentaires libre sur l'état de l'instruction"]).stringValue :
        undefined;
        
    const historique_date_envoi_dernière_contribution = annotationById.get(pitchouKeyToAnnotationDS["Date d'envoi de la dernière contribution en lien avec l'instruction DDEP"]).date
    const historique_identifiant_demande_onagre = annotationById.get(pitchouKeyToAnnotationDS["N° Demande ONAGRE"]).stringValue

    const historique_date_saisine_csrpn = annotationById.get(pitchouKeyToAnnotationDS["Date saisine CSRPN"]).date

    const historique_date_saisine_cnpn = annotationById.get(pitchouKeyToAnnotationDS["Date saisine CNPN"]) ?
        annotationById.get(pitchouKeyToAnnotationDS["Date saisine CNPN"]).date : 
        undefined
    
    
    const date_avis_csrpn = annotationById.get(pitchouKeyToAnnotationDS["Date avis CSRPN"]).date
    
    const date_avis_cnpn = annotationById.get(pitchouKeyToAnnotationDS["Date avis CNPN"]) ?
        annotationById.get(pitchouKeyToAnnotationDS["Date avis CNPN"]).date : 
        undefined



    const avis_csrpn_cnpn = annotationById.get(pitchouKeyToAnnotationDS["Avis CSRPN/CNPN"]).stringValue

    const date_consultation_public = annotationById.get(pitchouKeyToAnnotationDS["Date de début de la consultation du public ou enquête publique"]).date

    const historique_décision = annotationById.get(pitchouKeyToAnnotationDS["Décision"]).stringValue
    const historique_date_signature_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS["Date de signature de l'AP"]).date
    const historique_référence_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS["Référence de l'AP"]).stringValue
    const historique_date_signature_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS["Date de l'AM"]).date
    const historique_référence_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS["Référence de l'AM"]).stringValue

    return {
        // méta-données
        id_demarches_simplifiées,
        number_demarches_simplifiées,
        nom,
        statut,
        date_dépôt,

        // demandeur/déposant
        demandeur_personne_physique,
        demandeur_personne_morale,
        déposant,
        //représentant,

        // champs
        espèces_protégées_concernées,
        // https://knexjs.org/guide/schema-builder.html#json
        communes: JSON.stringify(communes),
        départements: JSON.stringify(départements),
        régions: JSON.stringify(régions),
        rattaché_au_régime_ae,

        // annotations privées
        historique_nom_porteur,
        historique_localisation,
        ddep_nécessaire,
        en_attente_de,

        enjeu_écologique,
        enjeu_politique,
        commentaire_enjeu,
        
        historique_date_réception_ddep,
        commentaire_libre,
        historique_date_envoi_dernière_contribution,
        historique_identifiant_demande_onagre,
        historique_date_saisine_csrpn,
        historique_date_saisine_cnpn,
        date_avis_csrpn,
        date_avis_cnpn,
        avis_csrpn_cnpn,
        date_consultation_public,
        historique_décision,
        historique_date_signature_arrêté_préfectoral,
        historique_référence_arrêté_préfectoral,
        historique_date_signature_arrêté_ministériel,
        historique_référence_arrêté_ministériel,
    }
    
})

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

/** @type {Personne[]} */
// @ts-expect-error TS ne comprend pas que le `filter` filtre les `null` et les `undefined` 
const personnesInDossiers = [...new Set(dossiersPourSynchronisation.map(({déposant, demandeur_personne_physique}) => [déposant, demandeur_personne_physique].filter(p => !!p)).flat())]

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

const personnesInDossiersWithoutId = personnesInDossiers.filter(p => !getPersonneId(p))

//console.log('personnesInDossiersWithoutId', personnesInDossiersWithoutId)

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

/** @type {Omit<Dossier, "id"|"phase"|"prochaine_action_attendue"|"prochaine_action_attendue_par">[]} */
const dossiers = dossiersPourSynchronisation.map(dossier => {
    const { 
        déposant,
        demandeur_personne_physique,
        demandeur_personne_morale, 
        ...autresPropriétés
    } = dossier

    return {
        déposant: (déposant && déposant.id) || null,
        demandeur_personne_physique: 
            (demandeur_personne_physique && demandeur_personne_physique.id) || null,
        demandeur_personne_morale: 
            (demandeur_personne_morale && demandeur_personne_morale.siret) || null,
        ...autresPropriétés,
    }
})

let dossiersSynchronisés
if(dossiers.length >= 1){
    dossiersSynchronisés = dumpDossiers(dossiers)
    .catch(err => {
        console.error('sync démarche simplifiée database error', err)
        process.exit(1)
    })
}

const dossiersSupprimés = dossSuppP.then( dossiersSupp => deleteDossierByDSNumber(dossiersSupp.map(({number}) => number)))

await Promise.all([
    dossiersSynchronisés,
    dossiersSupprimés
])

/** Synchronisation de la messagerie */

/** @type {Map<string, any[]>} // Map<id_DS, MessageAPI_DS> */
const messagesÀMettreEnBDDAvecDossierId_DS = new Map(dossiersDS.map(
    ({id: id_DS, messages}) => [id_DS, messages])
)


const messagesÀMettreEnBDDAvecDossierIdP = getDossierIdsFromDS_Ids([...messagesÀMettreEnBDDAvecDossierId_DS.keys()])
    .then(dossierIds => {
        /** @type {Map<string, Dossier['id']>} */
        const idDSToId = new Map()
        for(const {id, id_demarches_simplifiées} of dossierIds){
            //@ts-ignore
            idDSToId.set(id_demarches_simplifiées, id)
        }

        /** @type {Map<number, Message[]>} */
        const idToMessages = new Map()
        for(const [id_DS, messages] of messagesÀMettreEnBDDAvecDossierId_DS){
            const dossierId = idDSToId.get(id_DS)

            //@ts-ignore
            idToMessages.set(dossierId, messages)
        }

        return idToMessages
    });


/** Synchronisation de l'information des dossiers suivis */
const synchronisationSuiviDossier = synchroniserSuiviDossier(dossiersDS);


Promise.all([
    groupesInstructeursSynchronisés,
    messagesÀMettreEnBDDAvecDossierIdP.then(messagesÀMettreEnBDDAvecDossierId => {
        if(messagesÀMettreEnBDDAvecDossierId.size >= 1)
            // @ts-ignore
            dumpDossierMessages(messagesÀMettreEnBDDAvecDossierId)
    }),
    synchronisationSuiviDossier
])
.then(closeDatabaseConnection)
