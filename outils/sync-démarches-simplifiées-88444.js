//@ts-check

import parseArgs from 'minimist'
import {sub, format, formatDistanceToNow} from 'date-fns'
import { fr } from "date-fns/locale"

import {dumpEntreprises, closeDatabaseConnection, créerTransaction} from '../scripts/server/database.js'
import {dumpDossiers, getDossierIdsFromDS_Ids, dumpDossierMessages, dumpDossierTraitements, synchroniserSuiviDossier, deleteDossierByDSNumber, synchroniserDossierDansGroupeInstructeur} from '../scripts/server/database/dossier.js'
import {listAllPersonnes, créerPersonnes} from '../scripts/server/database/personne.js'
import {synchroniserGroupesInstructeurs} from '../scripts/server/database/groupe_instructeurs.js'
import { ajouterFichiersEspèces } from '../scripts/server/database/espèces_impactées.js'

import {recupérerDossiersRécemmentModifiés} from '../scripts/server/démarches-simplifiées/recupérerDossiersRécemmentModifiés.js'
import {recupérerGroupesInstructeurs} from '../scripts/server/démarches-simplifiées/recupérerGroupesInstructeurs.js'
import récupérerTousLesDossiersSupprimés from '../scripts/server/démarches-simplifiées/recupérerListeDossiersSupprimés.js'

import {isValidDate} from '../scripts/commun/typeFormat.js'

import checkMemory from '../scripts/server/checkMemory.js'

import _schema88444 from '../data/démarches-simplifiées/schema-DS-88444.json' with {type: 'json'}
import téléchargerNouveauxFichiersEspècesImpactées from './synchronisation-ds-88444/téléchargerNouveauxFichiersEspècesImpactées.js'


/** @import {default as DatabaseDossier} from '../scripts/types/database/public/Dossier.ts' */
/** @import {default as Personne, PersonneInitializer} from '../scripts/types/database/public/Personne.ts' */
/** @import {default as Entreprise} from '../scripts/types/database/public/Entreprise.ts' */
/** @import {default as EspècesImpactées} from '../scripts/types/database/public/EspècesImpactées.ts' */

/** @import {AnnotationsPriveesDemarcheSimplifiee88444, DossierDemarcheSimplifiee88444} from '../scripts/types/démarches-simplifiées/DémarcheSimplifiée88444.ts' */
/** @import {DémarchesSimpliféesCommune, ChampDSCommunes, ChampDSDépartements, ChampDSRégions, DossierDS88444, Traitement, Message, ChampDSDépartement, DémarchesSimpliféesDépartement, ChampDSPieceJustificative} from '../scripts/types/démarches-simplifiées/apiSchema.ts' */
/** @import {SchemaDémarcheSimplifiée, ChampDescriptor} from '../scripts/types/démarches-simplifiées/schema.ts' */
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


//console.log('démarche', démarche)
console.log('Nombre de dossiers', dossiersDS.length)
//console.log('3 dossiers', démarche.dossiers.nodes.slice(0, 3))
//console.log('champs', démarche.dossiers.nodes[0].champs)
//console.log('un dossier', JSON.stringify(dossiersDS[3], null, 2))
//console.log(`messages d'un dossier`, JSON.stringify(dossiersDS[3].messages))


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

/** @type {Omit<DossierPourSynchronisation, "demandeur_personne_physique">[]} */
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
    /** @type {Map<string | undefined, any>} */
    const champById = new Map()
    for(const champ of champs){
        champById.set(champ.id, champ)
    }

    const nom = champById.get(pitchouKeyToChampDS.get('Nom du projet'))?.stringValue
    const activité_principale = champById.get(pitchouKeyToChampDS.get('Activité principale'))?.stringValue


    /* localisation */
    /** @type {DossierDemarcheSimplifiee88444['Le projet se situe au niveau…'] | ''} */    
    const projetSitué = champById.get(pitchouKeyToChampDS.get('Le projet se situe au niveau…'))?.stringValue
    /** @type {ChampDSCommunes} */
    const champCommunes = champById.get(pitchouKeyToChampDS.get('Commune(s) où se situe le projet'))
    /** @type {ChampDSDépartements} */
    const champDépartements = champById.get(pitchouKeyToChampDS.get('Département(s) où se situe le projet'))
    /** @type {ChampDSDépartement} */
    const champDépartementPrincipal = champById.get(pitchouKeyToChampDS.get('Dans quel département se localise majoritairement votre projet ?'))
    /** @type {ChampDSRégions} */
    const champRégions = champById.get(pitchouKeyToChampDS.get('Région(s) où se situe le projet'))


    /** @type {DémarchesSimpliféesCommune[] | undefined} */
    let communes;

    /** @type {DémarchesSimpliféesDépartement['code'][] | undefined} */
    let départements;
    let régions;

    if(projetSitué === `d'une ou plusieurs communes` && champCommunes){
        communes = champCommunes.rows.map(c => c.champs[0].commune).filter(x => !!x)
        
        if(Array.isArray(communes) && communes.length >= 1){
            départements = [...new Set(champCommunes.rows.map(c => c.champs[0].departement?.code).filter(x => !!x))]
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
                    if(!projetSitué){
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

    // Si la localisation avec les champs dédiés (surtout communes et départements) a échoué,
    // se rabattre sur le champ du département principal s'il est présent
    if(champDépartementPrincipal && (!départements || départements.length === 0)){
        départements = [champDépartementPrincipal.departement.code]
    }


    /*
        Demandeur
     
        Personne physique ou morale qui formule la demande de dérogation espèces protégées
    */

    /** @type {PersonneInitializer | undefined} */
    /** let demandeur_personne_physique = undefined; */
    /** @type {Entreprise | undefined} */
    let demandeur_personne_morale = undefined
 
    const SIRETChamp = champById.get(pitchouKeyToChampDS.get('Numéro de SIRET'))
    if(SIRETChamp){
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
    // le champ AE a changé d'une checkbox à un Oui/Non à un Oui/Non/Ne sait pas encore
    // et donc, on gère les différentes valeurs pour les différentes version du formulaire

    const rattaché_régime_ae_champ = champById.get(
        pitchouKeyToChampDS.get("Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?")
    )

    const rattaché_au_régime_ae_stringValue = rattaché_régime_ae_champ?.stringValue

    // null signifie "ne sait pas encore" et c'est la valeur par défaut
    let rattaché_au_régime_ae = null;

    if(rattaché_au_régime_ae_stringValue === 'Oui' || rattaché_au_régime_ae_stringValue === 'true'){
        rattaché_au_régime_ae = true;
    }
    if(rattaché_au_régime_ae_stringValue === 'Non' || rattaché_au_régime_ae_stringValue === 'false'){
        rattaché_au_régime_ae = false
    }


    /**
     * Annotations privées
     */
    /** @type {Map<string | undefined, any>} */
    const annotationById = new Map()
    for(const annotation of annotations){
        annotationById.set(annotation.id, annotation)
    }

    const historique_nom_porteur = annotationById.get(pitchouKeyToAnnotationDS.get("Nom du porteur de projet"))?.stringValue
    const historique_localisation = annotationById.get(pitchouKeyToAnnotationDS.get("Localisation du projet"))?.stringValue
    const ddep_nécessaire = annotationById.get(pitchouKeyToAnnotationDS.get("DDEP nécessaire ?"))?.stringValue
    const en_attente_de = annotationById.get(pitchouKeyToAnnotationDS.get("Dossier en attente de"))?.stringValue

    const enjeu_écologique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu écologique")).checked
    const enjeu_politique = annotationById.get(pitchouKeyToAnnotationDS.get("Enjeu politique")).checked
    const commentaire_enjeu = annotationById.get(pitchouKeyToAnnotationDS.get("Commentaires sur les enjeux et la procédure")).stringValue

    const historique_date_réception_ddep = annotationById.get(pitchouKeyToAnnotationDS.get("Date de réception DDEP")).date
    
    const commentaire_libre = annotationById.get(pitchouKeyToAnnotationDS.get("Commentaires libre sur l'état de l'instruction")) ?
        annotationById.get(pitchouKeyToAnnotationDS.get("Commentaires libre sur l'état de l'instruction")).stringValue :
        undefined;
        
    const historique_date_envoi_dernière_contribution = annotationById.get(pitchouKeyToAnnotationDS.get("Date d'envoi de la dernière contribution en lien avec l'instruction DDEP")).date
    const historique_identifiant_demande_onagre = annotationById.get(pitchouKeyToAnnotationDS.get("N° Demande ONAGRE")).stringValue

    const historique_date_saisine_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CSRPN")).date

    const historique_date_saisine_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN")) ?
        annotationById.get(pitchouKeyToAnnotationDS.get("Date saisine CNPN")).date : 
        undefined
    
    
    const date_avis_csrpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CSRPN")).date
    
    const date_avis_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN")) ?
        annotationById.get(pitchouKeyToAnnotationDS.get("Date avis CNPN")).date : 
        undefined



    const avis_csrpn_cnpn = annotationById.get(pitchouKeyToAnnotationDS.get("Avis CSRPN/CNPN")).stringValue

    const date_consultation_public = annotationById.get(pitchouKeyToAnnotationDS.get("Date de début de la consultation du public ou enquête publique")).date

    const historique_décision = annotationById.get(pitchouKeyToAnnotationDS.get("Décision")).stringValue
    const historique_date_signature_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS.get("Date de signature de l'AP")).date
    const historique_référence_arrêté_préfectoral = annotationById.get(pitchouKeyToAnnotationDS.get("Référence de l'AP")).stringValue
    const historique_date_signature_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS.get("Date de l'AM")).date
    const historique_référence_arrêté_ministériel = annotationById.get(pitchouKeyToAnnotationDS.get("Référence de l'AM")).stringValue

    return {
        // méta-données
        id_demarches_simplifiées,
        number_demarches_simplifiées,
        nom,
        statut,
        date_dépôt,

        // demandeur/déposant
        // demandeur_personne_physique,
        demandeur_personne_morale,
        déposant,
        //représentant,

        // champs
        activité_principale,
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

/** @type {Omit<DatabaseDossier, "id"|"phase"|"prochaine_action_attendue_par"| "demandeur_personne_physique">[]} */
const dossiers = dossiersPourSynchronisation.map(dossier => {
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


/** Télécharger les fichiers espèces impactées */

// @ts-ignore
const candidatsFichiersImpactées = new Map(dossiersDS.map(({number, champs}) => {
    const fichierEspècesImpactéesChampId = pitchouKeyToChampDS.get('Déposez ici le fichier téléchargé après remplissage sur https://pitchou.beta.gouv.fr/saisie-especes')

    /** @type {ChampDSPieceJustificative | undefined} */
    // @ts-ignore
    const champFichierEspècesImpactées = champs.find(c => c.id === fichierEspècesImpactéesChampId)

    const descriptionFichierEspècesImpactées = champFichierEspècesImpactées?.files[0]

    return [
        number,
        descriptionFichierEspècesImpactées
    ]
}).filter(([_, des]) => des !== undefined))

//console.log('candidatsFichiersImpactées', candidatsFichiersImpactées)

checkMemory()

/** @type {Promise<Map<DossierDS88444['number'], Partial<EspècesImpactées>>> | Promise<void> } */
let fichiersEspècesImpactéesTéléchargésP = Promise.resolve() 
if(candidatsFichiersImpactées.size >= 1){
    fichiersEspècesImpactéesTéléchargésP = téléchargerNouveauxFichiersEspècesImpactées(candidatsFichiersImpactées, laTransactionDeSynchronisationDS)
}

//let fichiersTéléchargés = await téléchargerNouveauxFichiersEspècesImpactées(candidatsFichiersImpactées, laTransactionDeSynchronisationDS)

fichiersEspècesImpactéesTéléchargésP.then(fichiersTéléchargés => {
    console.log('fichiersTéléchargés', fichiersTéléchargés)
    checkMemory()
    //process.exit(1)
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
    synchronisationSuiviDossier = synchroniserSuiviDossier(dossiersDS);

    /** Synchronisation de l'information de quel dossier appartient à quel groupe_instructeurs */
    synchronisationDossierDansGroupeInstructeur = synchroniserDossierDansGroupeInstructeur(dossiersDS);
}



/** Synchronisation des évènements de changement de phase */

/** @type {Map<NonNullable<DatabaseDossier['id_demarches_simplifiées']>, Traitement[]>} */
const évènementsPhaseDossierById_DS = new Map(dossiersDS.map(
    ({id: id_DS, traitements}) => [id_DS, traitements])
)


let traitementsSynchronisés;

/** @type {Map<DatabaseDossier['id'], Traitement[]>} */
const idToTraitements = new Map()
for(const [id_DS, traitements] of évènementsPhaseDossierById_DS){
    const dossierId = dossierIdByDS_id.get(id_DS)

    //@ts-ignore
    idToTraitements.set(dossierId, traitements)
}

if(idToTraitements.size >= 1){
    traitementsSynchronisés = dumpDossierTraitements(idToTraitements)
}


/** Synchronisation des fichiers téléchargés */

const fichiersEspècesImpactéesSynchronisés = fichiersEspècesImpactéesTéléchargésP.then(fichiersEspècesImpactéesTéléchargés => {
    if(fichiersEspècesImpactéesTéléchargés){
        for(const [number, fichierEspècesImpactées] of fichiersEspècesImpactéesTéléchargés){
            const dossierId = dossierIdByDS_number.get(number)
    
            fichierEspècesImpactées.dossier = dossierId
        }
    
        return ajouterFichiersEspèces(
            [...fichiersEspècesImpactéesTéléchargés.values()],
            laTransactionDeSynchronisationDS
        )
    }
})



/** Fin de l'outil de synchronisation - fermeture */

Promise.all([
    groupesInstructeursSynchronisés,
    messagesSynchronisés,
    traitementsSynchronisés,
    synchronisationSuiviDossier,
    synchronisationDossierDansGroupeInstructeur,
    fichiersEspècesImpactéesSynchronisés
])
.then(laTransactionDeSynchronisationDS.commit)
.catch(laTransactionDeSynchronisationDS.rollback)
.then(closeDatabaseConnection)

